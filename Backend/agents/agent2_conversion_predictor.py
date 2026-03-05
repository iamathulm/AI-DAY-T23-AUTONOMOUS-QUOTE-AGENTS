"""Agent 2 — Conversion Predictor (CatBoost).

Predicts bind probability and converts it to a 0-100 bind_score.
Returns explanations from all 4 methods: SHAP, LIME, Anchors, DiCE.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from Backend.pipeline.state import QuoteState

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ML" / "models"

_model = None
_explainer = None
_feature_config = None
_ordinal_maps = None
_label_encoders = None
_xai_bundle = None
_comparison_bundle = None
_scaler = None
_prediction_threshold = 0.5
_lime_explainer = None
_anchor_explainer = None
_dice_exp = None

RISK_TIER_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}


def _load_models():
    global _model, _explainer, _feature_config, _ordinal_maps, _label_encoders
    global _xai_bundle, _comparison_bundle, _scaler, _prediction_threshold
    if _model is None:
        _model = joblib.load(_MODEL_DIR / "conversion_model.joblib")
        _explainer = joblib.load(_MODEL_DIR / "conversion_explainer.joblib")
        _feature_config = joblib.load(_MODEL_DIR / "feature_config.joblib")
        _ordinal_maps = joblib.load(_MODEL_DIR / "ordinal_maps.joblib")
        _label_encoders = joblib.load(_MODEL_DIR / "label_encoders.joblib")
        _xai_bundle = joblib.load(_MODEL_DIR / "conversion_xai_bundle.joblib")
        try:
            _comparison_bundle = joblib.load(_MODEL_DIR / "conversion_model_comparison_bundle.joblib")
        except Exception:
            _comparison_bundle = {}
        try:
            _scaler = joblib.load(_MODEL_DIR / "conversion_scaler.joblib")
        except Exception:
            _scaler = None
        _prediction_threshold = float(_xai_bundle.get("prediction_threshold", 0.5))
        logger.info("Agent 2: Loaded conversion model + explainer + XAI bundle")


def _init_lime():
    """Lazy-init LIME explainer (first call only)."""
    global _lime_explainer
    if _lime_explainer is not None:
        return
    from lime.lime_tabular import LimeTabularExplainer

    bundle = _xai_bundle
    _lime_explainer = LimeTabularExplainer(
        bundle["train_data"],
        feature_names=bundle["feature_names"],
        class_names=bundle["class_names"],
        mode="classification",
        random_state=42,
    )
    logger.info("Agent 2: LIME explainer initialised")


def _init_anchor():
    """Lazy-init Anchor explainer (first call only)."""
    global _anchor_explainer
    if _anchor_explainer is not None:
        return
    from alibi.explainers import AnchorTabular

    bundle = _xai_bundle
    _anchor_explainer = AnchorTabular(
        predictor=_model.predict,
        feature_names=bundle["feature_names"],
    )
    _anchor_explainer.fit(bundle["train_data"], disc_perc=(25, 50, 75))
    logger.info("Agent 2: Anchor explainer initialised")


def _init_dice():
    """Lazy-init DiCE explainer (first call only)."""
    global _dice_exp
    if _dice_exp is not None:
        return
    import dice_ml

    thresh = float(_prediction_threshold)

    class _ModelWrapper:
        def __init__(self, model, feature_names, categorical_features):
            self.model = model
            self.feature_names = feature_names
            self.categorical_features = categorical_features

        def predict_proba(self, X):
            if isinstance(X, np.ndarray):
                X = pd.DataFrame(X, columns=self.feature_names)
            df = X.copy()
            for col in self.categorical_features:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
            return self.model.predict_proba(df)

        def predict(self, X):
            return (self.predict_proba(X)[:, 1] >= thresh).astype(int)

    bundle = _xai_bundle
    cat_feats = bundle.get("dice_categorical_features", [])
    wrapper = _ModelWrapper(_model, bundle["feature_names"], cat_feats)
    d = dice_ml.Data(
        dataframe=bundle["dice_train_df"],
        continuous_features=bundle["dice_continuous_features"],
        categorical_features=cat_feats,
        outcome_name=bundle["dice_outcome_name"],
    )
    m = dice_ml.Model(model=wrapper, backend="sklearn", model_type="classifier")
    _dice_exp = dice_ml.Dice(d, m, method="genetic")
    logger.info("Agent 2: DiCE explainer initialised")


def _safe_encode_label(col_name: str, value: str) -> int:
    """Encode a categorical value, falling back to 0 for unseen labels."""
    try:
        return int(_label_encoders[col_name].transform([value])[0])
    except (ValueError, KeyError):
        return 0


def _prepare_features(raw: dict, state: QuoteState, features: list[str]) -> pd.DataFrame:
    maps = _ordinal_maps
    eps = 1e-6
    row = {
        "Re_Quote_enc": 1 if raw.get("Re_Quote") == "Yes" else 0,
        "urgency_days": state.get("urgency_days", 59),
        "Coverage_enc": maps["COVERAGE_MAP"].get(raw.get("Coverage", ""), 0),
        "Agent_Type_enc": maps["AGENT_TYPE_MAP"].get(raw.get("Agent_Type", ""), 0),
        "Region_enc": _safe_encode_label("Region", raw.get("Region", "A")),
        "Sal_Range_enc": maps["SAL_MAP"].get(raw.get("Sal_Range", ""), 0),
        "HH_Drivers": raw.get("HH_Drivers", 1),
        "HH_Vehicles": raw.get("HH_Vehicles", 1),
        "Quoted_Premium": raw.get("Quoted_Premium", 700.0),
        "Vehicl_Cost_enc": maps["VEHICLE_COST_MAP"].get(
            raw.get("Vehicl_Cost_Range", ""), 0
        ),
        "Driver_Age": raw.get("Driver_Age", 35),
        "Driving_Exp": raw.get("Driving_Exp", 15),
        "Prev_Accidents": raw.get("Prev_Accidents", 0),
        "Prev_Citations": raw.get("Prev_Citations", 0),
        "Gender_enc": _safe_encode_label("Gender", raw.get("Gender", "Male")),
        "Marital_Status_enc": _safe_encode_label(
            "Marital_Status", raw.get("Marital_Status", "Single")
        ),
        "Education_enc": _safe_encode_label(
            "Education", raw.get("Education", "Bachelors")
        ),
        "risk_tier_enc": RISK_TIER_MAP.get(state.get("risk_tier", "MEDIUM"), 1),
    }

    # Domain features from notebook 04 (pure-ML setup, no hardcoded scoring rules).
    if "affordability_ratio" in features:
        row["affordability_ratio"] = (row["Sal_Range_enc"] / 4.0) - (row["Coverage_enc"] / 2.0)
    if "hh_need" in features:
        row["hh_need"] = float(np.clip(row["HH_Drivers"] - 1, 0, 3) / 3.0)
    if "risk_coverage_fit" in features:
        row["risk_coverage_fit"] = row["risk_tier_enc"] + row["Coverage_enc"]

    # Extended features used by the comparison notebook (26-feature CatBoost path).
    if "premium_to_salary" in features:
        sal_proxy = (row["Sal_Range_enc"] + 1) * 10000
        row["premium_to_salary"] = float(np.log1p(row["Quoted_Premium"] / (sal_proxy + eps)))
    if "log_premium" in features:
        row["log_premium"] = float(np.log1p(row["Quoted_Premium"]))
    if "risk_prev_interaction" in features:
        row["risk_prev_interaction"] = row["risk_tier_enc"] * (
            row["Prev_Accidents"] + row["Prev_Citations"] + 1
        )
    if "urgency_coverage" in features:
        row["urgency_coverage"] = (row["urgency_days"] / 30.0) * (row["Coverage_enc"] + 1)
    if "requote_risk" in features:
        row["requote_risk"] = row["Re_Quote_enc"] * row["risk_tier_enc"]

    return pd.DataFrame([row])[features]


def _prepare_model_input(raw: dict, state: QuoteState) -> pd.DataFrame:
    """Build model-ready features aligned with the trained CatBoost schema."""
    model_features = (_comparison_bundle or {}).get("feature_names") or _xai_bundle.get(
        "feature_names", _feature_config["AGENT2_FEATURES"]
    )
    X_named = _prepare_features(raw, state, model_features).fillna(0)

    # If scaler exists and is compatible, feed the scaled matrix expected by the model.
    if _scaler is not None and getattr(_scaler, "n_features_in_", None) == X_named.shape[1]:
        X_scaled = _scaler.transform(X_named)
        model_cols = list(getattr(_model, "feature_names_", []))
        if len(model_cols) != X_named.shape[1]:
            model_cols = [str(i) for i in range(X_named.shape[1])]
        return pd.DataFrame(X_scaled, columns=model_cols)

    # Fallback: preserve ordering and rename columns when model uses numeric names ("0".."n").
    model_cols = list(getattr(_model, "feature_names_", []))
    if len(model_cols) == X_named.shape[1]:
        X_named.columns = model_cols
    return X_named


def _compute_urgency(raw: dict) -> int:
    """Days remaining until quote expires."""
    try:
        created = datetime.strptime(raw["Q_Creation_DT"], "%Y/%m/%d")
        valid = datetime.strptime(raw["Q_Valid_DT"], "%Y/%m/%d")
        return max(0, (valid - created).days)
    except (KeyError, ValueError, TypeError):
        return 59


def _compute_shap(X, features):
    """SHAP top-5 features for bind (positive class)."""
    try:
        sv = _explainer.shap_values(X)
        if isinstance(sv, list):
            bind_shap_vals = sv[1][0]
        else:
            bind_shap_vals = sv[0]
        paired = sorted(
            zip(features, bind_shap_vals), key=lambda p: abs(p[1]), reverse=True
        )
        return {name: round(float(val), 4) for name, val in paired[:5]}
    except Exception as e:
        logger.warning(f"SHAP failed: {e}")
        return {}


def _compute_lime(instance_values):
    """LIME local explanation for bind prediction."""
    try:
        _init_lime()
        exp = _lime_explainer.explain_instance(
            instance_values,
            _model.predict_proba,
            num_features=8,
            top_labels=2,
        )
        available = list(exp.local_exp.keys())
        label = 1 if 1 in available else available[0]
        return {feat: round(weight, 4) for feat, weight in exp.as_list(label=label)}
    except Exception as e:
        logger.warning(f"LIME failed: {e}")
        return {}


def _compute_anchors(instance_values):
    """Anchor IF-THEN rule for bind prediction."""
    try:
        _init_anchor()
        explanation = _anchor_explainer.explain(instance_values, threshold=0.75)
        rule = (
            " AND ".join(explanation.anchor)
            if explanation.anchor
            else "No stable rule found"
        )
        return {
            "rule": rule,
            "precision": round(float(explanation.precision), 4),
            "coverage": round(float(explanation.coverage), 4),
        }
    except Exception as e:
        logger.warning(f"Anchors failed: {e}")
        return {"rule": "Explanation unavailable", "precision": 0, "coverage": 0}


def _compute_dice(instance_df, pred):
    """DiCE counterfactuals: what would need to change for the quote to convert (or not)?"""
    try:
        _init_dice()
        cat_feats = _xai_bundle.get("dice_categorical_features", [])
        instance_for_dice = instance_df.copy()
        for col in cat_feats:
            if col in instance_for_dice.columns:
                instance_for_dice[col] = instance_for_dice[col].astype(int).astype(str)
        permitted_range = {
            col: sorted(_xai_bundle["dice_train_df"][col].dropna().astype(str).unique().tolist())
            for col in cat_feats if col in _xai_bundle["dice_train_df"].columns
        }
        desired = 1 if pred == 0 else 0
        cf = _dice_exp.generate_counterfactuals(
            instance_for_dice, total_CFs=3, desired_class=desired, permitted_range=permitted_range
        )
        cfs_df = cf.cf_examples_list[0].final_cfs_df
        if cfs_df is not None and len(cfs_df) > 0:
            return cfs_df.drop(
                columns=[_xai_bundle["dice_outcome_name"]], errors="ignore"
            ).to_dict(orient="records")
        return []
    except Exception as e:
        logger.warning(f"DiCE failed: {e}")
        return []


def agent2_conversion_predictor(state: QuoteState) -> QuoteState:
    """LangGraph node — enriches state with bind_score, probability, and all XAI explanations."""
    _load_models()
    xai_features = _xai_bundle.get("feature_names", _feature_config["AGENT2_FEATURES"])
    raw = state.get("raw_features", {})

    urgency = _compute_urgency(raw)
    state["urgency_days"] = urgency

    X = _prepare_model_input(raw, state)
    X_xai = _prepare_features(raw, state, xai_features)

    # Pure-ML probability (threshold learned/tuned in notebook 04).
    prob = float(np.clip(_model.predict_proba(X)[0, 1], 0.0, 1.0))
    bind_score = int(round(prob * 100))
    pred = int(prob >= float(_prediction_threshold))

    # --- SHAP (always, fast) ---
    bind_shap = _compute_shap(X_xai, xai_features)

    # --- LIME ---
    bind_lime = _compute_lime(X_xai.iloc[0].values)

    # --- Anchors ---
    bind_anchors = _compute_anchors(X_xai.iloc[0].values)

    # --- DiCE ---
    bind_counterfactuals = _compute_dice(X_xai, pred)

    state["bind_score"] = bind_score
    state["bind_probability"] = round(prob, 4)
    state["bind_shap"] = bind_shap
    state["bind_lime"] = bind_lime
    state["bind_anchors"] = bind_anchors
    state["bind_counterfactuals"] = bind_counterfactuals
    state["urgency_days"] = urgency

    state["confidence"] = min(
        state.get("confidence", 1.0),
        max(prob, 1 - prob),
    )
    return state

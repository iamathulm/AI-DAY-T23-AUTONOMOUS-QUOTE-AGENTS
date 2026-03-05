"""Agent 1 — Risk Profiler (CatBoost).

Loads the trained CatBoost model, SHAP explainer, and XAI bundle.
Predicts risk_tier (LOW/MEDIUM/HIGH) and returns explanations from
all 4 methods: SHAP, LIME, Anchors, DiCE.
"""

from __future__ import annotations

import logging
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
_xai_bundle = None
_lime_explainer = None
_anchor_explainer = None
_dice_exp = None

TIER_NAMES = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

MILES_RISK = {
    "<= 7.5 K": 0,
    "> 7.5 K & <= 15 K": 1,
    "> 15 K & <= 25 K": 2,
    "> 25 K & <= 35 K": 3,
    "> 35 K & <= 45 K": 4,
    "> 45 K & <= 55 K": 5,
    "> 55 K": 6,
}
USAGE_RISK = {"Pleasure": 0, "Commute": 5, "Business": 10}


def _load_models():
    global _model, _explainer, _feature_config, _xai_bundle
    if _model is None:
        _model = joblib.load(_MODEL_DIR / "risk_model.joblib")
        _explainer = joblib.load(_MODEL_DIR / "risk_explainer.joblib")
        _feature_config = joblib.load(_MODEL_DIR / "feature_config.joblib")
        _xai_bundle = joblib.load(_MODEL_DIR / "risk_xai_bundle.joblib")
        logger.info("Agent 1: Loaded risk model + explainer + XAI bundle")


def _init_lime():
    """Lazy-init LIME explainer (first call only)."""
    global _lime_explainer
    if _lime_explainer is not None:
        return
    from lime.lime_tabular import LimeTabularExplainer

    bundle = _xai_bundle
    _lime_explainer = LimeTabularExplainer(
        bundle["train_data_numeric"],
        feature_names=bundle["feature_names"],
        class_names=bundle["class_names"],
        categorical_features=bundle["cat_indices"],
        mode="classification",
        random_state=42,
    )
    logger.info("Agent 1: LIME explainer initialised")


def _init_anchor():
    """Lazy-init Anchor explainer (first call only)."""
    global _anchor_explainer
    if _anchor_explainer is not None:
        return
    from alibi.explainers import AnchorTabular

    bundle = _xai_bundle
    _anchor_explainer = AnchorTabular(
        predictor=_anchor_predict_fn,
        feature_names=bundle["feature_names"],
        categorical_names=bundle["anchor_categorical_names"],
    )
    _anchor_explainer.fit(bundle["train_data_numeric"], disc_perc=(25, 50, 75))
    logger.info("Agent 1: Anchor explainer initialised")


def _init_dice():
    """Lazy-init DiCE explainer (first call only)."""
    global _dice_exp
    if _dice_exp is not None:
        return
    import dice_ml

    bundle = _xai_bundle

    class _CatBoostWrapper:
        def __init__(self, model, cat_indices, features, cat_value_maps):
            self.model = model
            self.cat_indices = cat_indices
            self.features = features
            self.cat_value_maps = cat_value_maps

        def _to_catboost_df(self, X):
            if isinstance(X, np.ndarray):
                X = pd.DataFrame(X, columns=self.features)
            df_temp = X.copy()
            for col in [self.features[i] for i in self.cat_indices]:
                reverse_map = self.cat_value_maps[col]
                df_temp[col] = (
                    df_temp[col]
                    .round()
                    .astype(int)
                    .map(reverse_map)
                    .fillna(list(reverse_map.values())[0])
                )
            return df_temp

        def predict_proba(self, X):
            from catboost import Pool

            df_temp = self._to_catboost_df(X)
            pool = Pool(df_temp, cat_features=self.cat_indices)
            return self.model.predict_proba(pool)

        def predict(self, X):
            probs = self.predict_proba(X)
            return np.argmax(probs, axis=1)

    wrapper = _CatBoostWrapper(
        _model,
        bundle["cat_indices"],
        bundle["feature_names"],
        bundle["cat_value_maps"],
    )

    dice_train_df = bundle["dice_train_df"].copy()
    dice_cats = bundle.get("dice_categorical_features", [])
    for col in dice_cats:
        if col in dice_train_df.columns:
            dice_train_df[col] = dice_train_df[col].astype(int).astype(str)

    d = dice_ml.Data(
        dataframe=dice_train_df,
        continuous_features=bundle["dice_continuous_features"],
        categorical_features=dice_cats,
        outcome_name=bundle["dice_outcome_name"],
    )
    m = dice_ml.Model(model=wrapper, backend="sklearn", model_type="classifier")
    _dice_exp = dice_ml.Dice(d, m, method="random")
    logger.info("Agent 1: DiCE explainer initialised")


def _predict_for_numeric(X_numeric):
    """LIME predict wrapper: numeric array -> CatBoost probas."""
    from catboost import Pool

    bundle = _xai_bundle
    features = bundle["feature_names"]
    cat_indices = bundle["cat_indices"]
    cat_features = [features[i] for i in cat_indices]
    cat_value_maps = bundle["cat_value_maps"]

    df_temp = pd.DataFrame(X_numeric, columns=features)
    for col in cat_features:
        reverse_map = cat_value_maps[col]
        df_temp[col] = (
            df_temp[col]
            .round()
            .astype(int)
            .map(reverse_map)
            .fillna(list(reverse_map.values())[0])
        )
    pool = Pool(df_temp, cat_features=cat_indices)
    return _model.predict_proba(pool)


def _anchor_predict_fn(X):
    """Anchor predict wrapper: numeric array -> class labels."""
    from catboost import Pool

    bundle = _xai_bundle
    features = bundle["feature_names"]
    cat_indices = bundle["cat_indices"]
    cat_features = [features[i] for i in cat_indices]
    cat_value_maps = bundle["cat_value_maps"]

    results = []
    for row in X:
        df_temp = pd.DataFrame([row], columns=features)
        for col in cat_features:
            reverse_map = cat_value_maps[col]
            df_temp[col] = (
                df_temp[col]
                .round()
                .astype(int)
                .map(reverse_map)
                .fillna(list(reverse_map.values())[0])
            )
        pool = Pool(df_temp, cat_features=cat_indices)
        pred = int(_model.predict(pool).flatten()[0])
        results.append(pred)
    return np.array(results)


def _prepare_features(raw: dict, features: list[str]) -> pd.DataFrame:
    """Build a single-row DataFrame with the feature columns the model expects."""
    row = {
        "Prev_Accidents": raw.get("Prev_Accidents", 0),
        "Prev_Citations": raw.get("Prev_Citations", 0),
        "Driver_Age": raw.get("Driver_Age", 35),
        "Driving_Exp": raw.get("Driving_Exp", 15),
        "HH_Vehicles": raw.get("HH_Vehicles", 1),
        "HH_Drivers": raw.get("HH_Drivers", 1),
        "Annual_Miles_Range": raw.get("Annual_Miles_Range", "<= 7.5 K"),
        "Veh_Usage": raw.get("Veh_Usage", "Commute"),
    }
    return pd.DataFrame([row])[features]


def _prepare_numeric_row(raw: dict, features: list[str]) -> np.ndarray:
    """Build a single numeric row for LIME/Anchors (cats encoded as ints)."""
    cat_value_maps = _xai_bundle["cat_value_maps"]
    row = _prepare_features(raw, features).iloc[0].copy()
    for col in _xai_bundle.get("feature_names", []):
        if col in cat_value_maps:
            reverse = cat_value_maps[col]
            forward = {v: k for k, v in reverse.items()}
            row[col] = forward.get(str(row[col]), 0)
    return row.values.astype(float)


def _compute_shap(X, features, pred_class):
    """SHAP top-3 features for predicted class."""
    try:
        shap_values = _explainer.shap_values(X)
        if isinstance(shap_values, list):
            class_shap = shap_values[pred_class][0]
        else:
            class_shap = shap_values[0, :, pred_class]
        paired = sorted(
            zip(features, class_shap), key=lambda p: abs(p[1]), reverse=True
        )
        return {name: round(float(val), 4) for name, val in paired[:5]}
    except Exception as e:
        logger.warning(f"SHAP failed: {e}")
        return {}


def _compute_lime(numeric_row, pred_class):
    """LIME local explanation for predicted class."""
    try:
        _init_lime()
        exp = _lime_explainer.explain_instance(
            numeric_row,
            _predict_for_numeric,
            num_features=6,
            top_labels=3,
        )
        available = list(exp.local_exp.keys())
        label = pred_class if pred_class in available else available[0]
        return {feat: round(weight, 4) for feat, weight in exp.as_list(label=label)}
    except Exception as e:
        logger.warning(f"LIME failed: {e}")
        return {}


def _compute_anchors(numeric_row, pred_class):
    """Anchor IF-THEN rule for the prediction."""
    try:
        _init_anchor()
        explanation = _anchor_explainer.explain(numeric_row, threshold=0.75)
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


def _compute_dice(numeric_row_df, pred_class):
    """DiCE counterfactuals: what minimal changes would change the tier?"""
    try:
        _init_dice()
        cat_feats = _xai_bundle.get("dice_categorical_features", [])
        instance_for_dice = numeric_row_df.copy()
        for col in cat_feats:
            if col in instance_for_dice.columns:
                instance_for_dice[col] = instance_for_dice[col].astype(int).astype(str)

        permitted_range = {
            col: sorted(
                _xai_bundle["dice_train_df"][col]
                .dropna()
                .astype(int)
                .astype(str)
                .unique()
                .tolist()
            )
            for col in cat_feats
            if col in _xai_bundle["dice_train_df"].columns
        }

        desired = 0 if pred_class != 0 else 2
        cf = _dice_exp.generate_counterfactuals(
            instance_for_dice,
            total_CFs=3,
            desired_class=desired,
            permitted_range=permitted_range,
        )
        cfs_df = cf.cf_examples_list[0].final_cfs_df
        if cfs_df is not None and len(cfs_df) > 0:
            return cfs_df.drop(columns=[_xai_bundle["dice_outcome_name"]], errors="ignore").to_dict(orient="records")
        return []
    except Exception as e:
        logger.warning(f"DiCE failed: {e}")
        return []


def agent1_risk_profiler(state: QuoteState) -> QuoteState:
    """LangGraph node — enriches state with risk_tier and all XAI explanations."""
    _load_models()
    features = _feature_config["AGENT1_FEATURES"]
    raw = state.get("raw_features", {})

    X = _prepare_features(raw, features)
    from catboost import Pool

    cat_indices = _xai_bundle["cat_indices"]
    pool = Pool(X, cat_features=cat_indices)

    pred_class = int(_model.predict(pool).flatten()[0])
    risk_tier = TIER_NAMES[pred_class]

    probas = _model.predict_proba(pool)[0]
    confidence = float(np.max(probas))

    # --- SHAP (always, fast) ---
    risk_shap = _compute_shap(X, features, pred_class)

    # --- Numeric row for LIME/Anchors ---
    numeric_row = _prepare_numeric_row(raw, features)

    # --- LIME ---
    risk_lime = _compute_lime(numeric_row, pred_class)

    # --- Anchors ---
    risk_anchors = _compute_anchors(numeric_row, pred_class)

    # --- DiCE ---
    numeric_row_df = pd.DataFrame([numeric_row], columns=features)
    for col in _xai_bundle.get("dice_categorical_features", []):
        if col in numeric_row_df.columns:
            numeric_row_df[col] = numeric_row_df[col].astype(int)
    risk_counterfactuals = _compute_dice(numeric_row_df, pred_class)

    state["risk_tier"] = risk_tier
    state["risk_score"] = round(confidence, 4)
    state["risk_shap"] = risk_shap
    state["risk_lime"] = risk_lime
    state["risk_anchors"] = risk_anchors
    state["risk_counterfactuals"] = risk_counterfactuals
    state["confidence"] = confidence
    return state

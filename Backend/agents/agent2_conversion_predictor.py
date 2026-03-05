"""Agent 2 — Conversion Predictor (LightGBM).

Predicts bind probability and converts it to a 0-100 bind_score.
Handles the urgency signal from quote validity dates.
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

RISK_TIER_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}


def _load_models():
    global _model, _explainer, _feature_config, _ordinal_maps, _label_encoders
    if _model is None:
        _model = joblib.load(_MODEL_DIR / "conversion_model.joblib")
        _explainer = joblib.load(_MODEL_DIR / "conversion_explainer.joblib")
        _feature_config = joblib.load(_MODEL_DIR / "feature_config.joblib")
        _ordinal_maps = joblib.load(_MODEL_DIR / "ordinal_maps.joblib")
        _label_encoders = joblib.load(_MODEL_DIR / "label_encoders.joblib")
        logger.info("Agent 2: Loaded conversion model + explainer")


def _safe_encode_label(col_name: str, value: str) -> int:
    """Encode a categorical value, falling back to 0 for unseen labels."""
    try:
        return int(_label_encoders[col_name].transform([value])[0])
    except (ValueError, KeyError):
        return 0


def _prepare_features(raw: dict, state: QuoteState, features: list[str]) -> pd.DataFrame:
    maps = _ordinal_maps
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
    return pd.DataFrame([row])[features]


def _compute_urgency(raw: dict) -> int:
    """Days remaining until quote expires."""
    try:
        created = datetime.strptime(raw["Q_Creation_DT"], "%Y/%m/%d")
        valid = datetime.strptime(raw["Q_Valid_DT"], "%Y/%m/%d")
        return max(0, (valid - created).days)
    except (KeyError, ValueError, TypeError):
        return 59  # median fallback


def agent2_conversion_predictor(state: QuoteState) -> QuoteState:
    """LangGraph node — enriches state with bind_score, bind_probability, and SHAP."""
    _load_models()
    features = _feature_config["AGENT2_FEATURES"]
    raw = state.get("raw_features", {})

    urgency = _compute_urgency(raw)
    state["urgency_days"] = urgency

    X = _prepare_features(raw, state, features)

    prob = float(_model.predict_proba(X)[0, 1])
    bind_score = int(round(prob * 100))

    # SHAP explanation for bind (positive class)
    try:
        sv = _explainer.shap_values(X)
        bind_shap_vals = sv[1][0]
        paired = sorted(
            zip(features, bind_shap_vals), key=lambda p: abs(p[1]), reverse=True
        )
        bind_shap = {name: round(float(val), 4) for name, val in paired[:3]}
    except Exception as e:
        logger.warning(f"SHAP failed for quote {state.get('quote_num')}: {e}")
        bind_shap = {}

    state["bind_score"] = bind_score
    state["bind_probability"] = round(prob, 4)
    state["bind_shap"] = bind_shap

    # Update overall confidence as the minimum of agent confidences
    state["confidence"] = min(
        state.get("confidence", 1.0),
        max(prob, 1 - prob),  # confidence = how sure the model is
    )
    return state

"""Agent 1 — Risk Profiler (XGBoost).

Loads the trained XGBoost model and SHAP explainer, predicts risk_tier
(LOW/MEDIUM/HIGH) for a given quote, and returns the top 3 SHAP feature
contributions.
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

TIER_NAMES = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

# Same maps used during training — kept in sync via feature_config.joblib
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
    global _model, _explainer, _feature_config
    if _model is None:
        _model = joblib.load(_MODEL_DIR / "risk_model.joblib")
        _explainer = joblib.load(_MODEL_DIR / "risk_explainer.joblib")
        _feature_config = joblib.load(_MODEL_DIR / "feature_config.joblib")
        logger.info("Agent 1: Loaded risk model + explainer")


def _prepare_features(raw: dict, features: list[str]) -> pd.DataFrame:
    """Build a single-row DataFrame with the feature columns the model expects."""
    row = {
        "Prev_Accidents": raw.get("Prev_Accidents", 0),
        "Prev_Citations": raw.get("Prev_Citations", 0),
        "Driver_Age": raw.get("Driver_Age", 35),
        "Driving_Exp": raw.get("Driving_Exp", 15),
        "HH_Vehicles": raw.get("HH_Vehicles", 1),
        "HH_Drivers": raw.get("HH_Drivers", 1),
        "Annual_Miles_enc": MILES_RISK.get(raw.get("Annual_Miles_Range", ""), 2),
        "Veh_Usage_enc": USAGE_RISK.get(raw.get("Veh_Usage", ""), 3),
    }
    return pd.DataFrame([row])[features]


def agent1_risk_profiler(state: QuoteState) -> QuoteState:
    """LangGraph node — enriches state with risk_tier and SHAP values."""
    _load_models()
    features = _feature_config["AGENT1_FEATURES"]
    raw = state.get("raw_features", {})

    X = _prepare_features(raw, features)

    pred_class = int(_model.predict(X)[0])
    risk_tier = TIER_NAMES[pred_class]

    # SHAP: top 3 feature contributions for the predicted class
    try:
        shap_values = _explainer.shap_values(X)
        class_shap = shap_values[pred_class][0]
        paired = sorted(
            zip(features, class_shap), key=lambda p: abs(p[1]), reverse=True
        )
        risk_shap = {name: round(float(val), 4) for name, val in paired[:3]}
    except Exception as e:
        logger.warning(f"SHAP failed for quote {state.get('quote_num')}: {e}")
        risk_shap = {}

    probas = _model.predict_proba(X)[0]
    confidence = float(np.max(probas))

    state["risk_tier"] = risk_tier
    state["risk_score"] = round(confidence, 4)
    state["risk_shap"] = risk_shap
    state["confidence"] = confidence
    return state

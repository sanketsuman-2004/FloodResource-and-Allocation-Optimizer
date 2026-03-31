"""
Model Loader & Inference Engine
--------------------------------
Loads your saved LSTM .keras model if it exists at:
    backend/models/chennai_flood_models/lstm_model.keras

Falls back to a physics-informed simulation when the file is absent.
Set env var MODELS_DIR to override the default models/ path.
"""

from __future__ import annotations

import math
import os
from datetime import date
from pathlib import Path

import numpy as np

MODELS_DIR = Path(os.getenv("MODELS_DIR", "models/"))


def _try_load_models():
    """Try to load the LSTM .keras file. Returns (lstm, None) or (None, None)."""
    keras_path = MODELS_DIR / "chennai_flood_models" / "lstm_model.keras"

    if not keras_path.exists():
        print(f"[model_loader] No model found at {keras_path} — using simulation")
        return None, None

    try:
        import tensorflow as tf
        lstm = tf.keras.models.load_model(str(keras_path))
        print(f"[model_loader] LSTM loaded successfully from {keras_path}")
        return lstm, None
    except Exception as e:
        print(f"[model_loader] Could not load model: {e} — using simulation")
        return None, None


_LSTM_MODEL, _RF_MODEL = _try_load_models()
_USING_REAL_MODELS = _LSTM_MODEL is not None

print(f"[model_loader] Using {'REAL LSTM' if _USING_REAL_MODELS else 'SIMULATED'} models")


def _monsoon_flag(d: date) -> float:
    if d.month in (10, 11, 12):
        return 1.0
    if d.month in (6, 7, 8, 9):
        return 0.5
    return 0.0


def _cyclical_month(d: date) -> tuple[float, float]:
    angle = 2 * math.pi * (d.month - 1) / 12
    return math.sin(angle), math.cos(angle)


def _river_danger_pct(adyar: float, cooum: float, kosa: float) -> float:
    adyar_pct = min(adyar / 400, 1.0)
    cooum_pct = min(cooum / 120, 1.0)
    kosa_pct  = min(kosa  / 200, 1.0)
    return (adyar_pct * 0.50 + cooum_pct * 0.30 + kosa_pct * 0.20) * 100


def _simulate_lstm_probability(features: dict) -> float:
    rain    = features["rainfall_mm"]
    roll3   = features["rolling_3d_mm"]
    roll7   = features["rolling_7d_mm"]
    adyar   = features["adyar_discharge_m3s"]
    cooum   = features["cooum_discharge_m3s"]
    kosa    = features["kosasthalaiyar_m3s"]
    soil_m  = features["soil_moisture"]
    monsoon = features["monsoon_flag"]

    rain_score   = (min(rain  / 150, 1.0) * 0.35
                  + min(roll3 / 300, 1.0) * 0.25
                  + min(roll7 / 500, 1.0) * 0.15)
    river_score  = min(_river_danger_pct(adyar, cooum, kosa) / 100, 1.0) * 0.15
    soil_score   = soil_m * 0.07
    season_score = monsoon * 0.03

    raw  = rain_score + river_score + soil_score + season_score
    prob = 1 / (1 + math.exp(-8 * (raw - 0.45)))
    return round(min(max(prob, 0.0), 1.0), 4)


def _simulate_rf_zone_probability(zone: dict, city_prob: float, river_danger: float) -> float:
    static_norm = zone["static_risk_score"] / 100
    river_norm  = river_danger / 100
    combined = (city_prob * 0.40) + (static_norm * 0.35) + (river_norm * 0.25)
    return round(min(max(combined, 0.0), 1.0), 4)


def predict_city_flood(features: dict) -> tuple[float, float]:
    features["monsoon_flag"] = _monsoon_flag(features["date"])
    features["month_sin"], features["month_cos"] = _cyclical_month(features["date"])

    if _LSTM_MODEL is not None:
        try:
            feature_values = [
                features["rainfall_mm"],
                features["rolling_3d_mm"],
                features["rolling_7d_mm"],
                features["adyar_discharge_m3s"],
                features["cooum_discharge_m3s"],
                features["kosasthalaiyar_m3s"],
                features["soil_moisture"],
                features["temperature_c"],
                features["humidity_pct"],
                features["wind_speed_kmh"],
                features["pressure_hpa"],
                features["monsoon_flag"],
                features["month_sin"],
                features["month_cos"],
            ]
            expected_features = _LSTM_MODEL.input_shape[-1]
            if len(feature_values) < expected_features:
                feature_values += [0.0] * (expected_features - len(feature_values))
            else:
                feature_values = feature_values[:expected_features]

            seq = np.array([feature_values] * 30, dtype=np.float32)
            seq = seq.reshape(1, 30, expected_features)
            lstm_prob = float(_LSTM_MODEL.predict(seq, verbose=0)[0][0])
            lstm_prob = round(min(max(lstm_prob, 0.0), 1.0), 4)
        except Exception as e:
            print(f"[model_loader] LSTM inference error: {e} — falling back to simulation")
            lstm_prob = _simulate_lstm_probability(features)
    else:
        lstm_prob = _simulate_lstm_probability(features)

    rf_prob = round(min(max(lstm_prob * 0.85, 0.0), 1.0), 4)
    return lstm_prob, rf_prob


def predict_zone_risks(city_lstm_prob: float, features: dict, zones: list[dict]) -> list[dict]:
    river_danger = _river_danger_pct(
        features["adyar_discharge_m3s"],
        features["cooum_discharge_m3s"],
        features["kosasthalaiyar_m3s"],
    )

    results = []
    for zone in zones:
        zone_prob = _simulate_rf_zone_probability(zone, city_lstm_prob, river_danger)
        combined  = zone_prob * 100

        if combined >= 70:
            severity, risk_level = "severe",   "CRITICAL"
        elif combined >= 50:
            severity, risk_level = "moderate", "HIGH"
        elif combined >= 30:
            severity, risk_level = "minor",    "MEDIUM"
        else:
            severity, risk_level = "no_flood", "LOW"

        results.append({
            "zone_id":             zone["zone_id"],
            "zone_name":           zone["name"],
            "flood_probability":   zone_prob,
            "risk_level":          risk_level,
            "severity":            severity,
            "combined_risk_score": round(combined, 2),
            "river_danger_pct":    round(river_danger, 2),
            "population_at_risk":  int(zone["population"] * zone_prob),
        })

    results.sort(key=lambda x: x["combined_risk_score"], reverse=True)
    return results
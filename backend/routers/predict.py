"""
POST /api/predict-risk
-----------------------
Accepts current weather/hydrological inputs, runs LSTM + Random Forest
ensemble, returns city-level and zone-level flood predictions.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.models import (
    PredictRequest,
    PredictResponse,
    ZonePrediction,
    RiskLevel,
    FloodSeverity,
)
from utils.model_loader import predict_city_flood, predict_zone_risks
from utils.zone_data import CHENNAI_ZONES, ZONE_MAP

router = APIRouter()


def _city_risk_label(prob: float) -> tuple[RiskLevel, FloodSeverity, str]:
    if prob >= 0.70:
        return (
            RiskLevel.CRITICAL,
            FloodSeverity.SEVERE,
            "🔴 CRITICAL ALERT: Severe flood risk detected. "
            "Immediate evacuation of high-risk zones recommended. "
            "Deploy all available rescue resources.",
        )
    elif prob >= 0.45:
        return (
            RiskLevel.HIGH,
            FloodSeverity.MODERATE,
            "🟠 HIGH ALERT: Moderate flood risk. "
            "Pre-position rescue teams in Velachery, Adyar, and Saidapet. "
            "Issue public advisory.",
        )
    elif prob >= 0.20:
        return (
            RiskLevel.MEDIUM,
            FloodSeverity.MINOR,
            "🟡 WATCH: Minor flood risk in low-lying zones. "
            "Monitor Adyar and Cooum discharge levels closely.",
        )
    else:
        return (
            RiskLevel.LOW,
            FloodSeverity.NONE,
            "🟢 NORMAL: No significant flood risk. Routine monitoring active.",
        )


@router.post(
    "/predict-risk",
    response_model=PredictResponse,
    summary="Predict flood risk for Chennai",
    description=(
        "Runs the LSTM + Random Forest ensemble on today's meteorological and "
        "hydrological inputs. Returns city-wide probability, risk level, "
        "and zone-by-zone predictions sorted by risk."
    ),
)
async def predict_risk(req: PredictRequest):
    features = {
        "date":                 req.date,
        "rainfall_mm":          req.rainfall_mm,
        "rolling_3d_mm":        req.rolling_3d_mm,
        "rolling_7d_mm":        req.rolling_7d_mm,
        "adyar_discharge_m3s":  req.adyar_discharge_m3s,
        "cooum_discharge_m3s":  req.cooum_discharge_m3s,
        "kosasthalaiyar_m3s":   req.kosasthalaiyar_m3s,
        "soil_moisture":        req.soil_moisture,
        "temperature_c":        req.temperature_c,
        "humidity_pct":         req.humidity_pct,
        "wind_speed_kmh":       req.wind_speed_kmh,
        "pressure_hpa":         req.pressure_hpa,
    }

    try:
        lstm_prob, rf_prob = predict_city_flood(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference error: {e}")

    # Ensemble city probability (LSTM weighted higher due to better recall)
    city_prob = round(lstm_prob * 0.60 + rf_prob * 0.40, 4)

    risk_level, severity, alert_msg = _city_risk_label(city_prob)

    # Zone-level predictions
    # If a specific zone_id was requested, filter; otherwise predict all 15
    if req.zone_id:
        zone_id = req.zone_id.upper()
        if zone_id not in ZONE_MAP:
            raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")
        target_zones = [ZONE_MAP[zone_id]]
    else:
        target_zones = CHENNAI_ZONES

    zone_preds_raw = predict_zone_risks(lstm_prob, features, target_zones)

    zone_predictions = [
        ZonePrediction(
            zone_id=z["zone_id"],
            zone_name=z["zone_name"],
            flood_probability=z["flood_probability"],
            risk_level=RiskLevel(z["risk_level"]),
            severity=FloodSeverity(z["severity"]),
            combined_risk_score=z["combined_risk_score"],
            river_danger_pct=z["river_danger_pct"],
            population_at_risk=z["population_at_risk"],
        )
        for z in zone_preds_raw
    ]

    # Confidence: higher when models agree
    model_agreement = 1 - abs(lstm_prob - rf_prob)
    confidence = round(0.70 + model_agreement * 0.30, 4)

    return PredictResponse(
        date=req.date,
        city_flood_probability=city_prob,
        city_risk_level=risk_level,
        predicted_severity=severity,
        lstm_probability=lstm_prob,
        rf_probability=rf_prob,
        zones=zone_predictions,
        alert_message=alert_msg,
        confidence=confidence,
        model_used="LSTM (30-day sequence) + Random Forest Ensemble",
    )
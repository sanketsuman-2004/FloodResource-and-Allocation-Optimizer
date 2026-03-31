# Chennai Flood Risk Prediction — FastAPI Backend

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

---

## Optional: Use Real Trained Models

Place `chennai_flood_models.zip` in `backend/models/` and set:

```bash
export MODELS_DIR=/path/to/backend/models/
```

The zip must contain:
- `lstm_model/` — SavedModel directory
- `rf_model.pkl` — Pickled Random Forest

Without these files the system uses a physics-informed simulation that
mirrors real model behaviour (same feature engineering, same thresholds).

---

## API Reference

### GET /health
Health check.

---

### GET /api/zones
All 15 Chennai zones with geographic + risk data.

Optional filter: `?risk_class=CRITICAL`

---

### GET /api/zones/{zone_id}
Single zone. Zone IDs: VEL, ADY, TAM, MUD, SAI, KOL, PER, TNG, SHO, MAR, POR, ANN, AMB, ALW, NUN

---

### GET /api/zones/historical/events
Documented flood events 2000–2023.

---

### POST /api/predict-risk

**Request:**
```json
{
  "date": "2024-11-28",
  "rainfall_mm": 180.5,
  "rolling_3d_mm": 320.0,
  "rolling_7d_mm": 410.0,
  "adyar_discharge_m3s": 310.0,
  "cooum_discharge_m3s": 85.0,
  "kosasthalaiyar_m3s": 140.0,
  "soil_moisture": 0.82,
  "temperature_c": 29.5,
  "humidity_pct": 91.0,
  "wind_speed_kmh": 28.0,
  "pressure_hpa": 1004.2
}
```

**Response:**
```json
{
  "date": "2024-11-28",
  "city_flood_probability": 0.7812,
  "city_risk_level": "CRITICAL",
  "predicted_severity": "severe",
  "lstm_probability": 0.8234,
  "rf_probability": 0.7201,
  "zones": [
    {
      "zone_id": "VEL",
      "zone_name": "Velachery",
      "flood_probability": 0.81,
      "risk_level": "CRITICAL",
      "severity": "severe",
      "combined_risk_score": 81.4,
      "river_danger_pct": 72.3,
      "population_at_risk": 149850
    }
  ],
  "alert_message": "🔴 CRITICAL ALERT: ...",
  "confidence": 0.94,
  "model_used": "LSTM (30-day sequence) + Random Forest Ensemble"
}
```

---

### POST /api/estimate-resources

**Request:**
```json
{
  "zones": [
    {
      "zone_id": "VEL",
      "zone_name": "Velachery",
      "population": 185000,
      "flood_probability": 0.81,
      "risk_factor": 0.833
    },
    {
      "zone_id": "ADY",
      "zone_name": "Adyar Riverbank",
      "population": 142000,
      "flood_probability": 0.74,
      "risk_factor": 0.770
    }
  ]
}
```

**Response:**
```json
{
  "total_displaced": 174231,
  "total_food_tonnes": 348.46,
  "total_boats": 59,
  "total_medical_kits": 4356,
  "total_rescue_teams": 35,
  "zone_demands": [...],
  "estimation_basis": "NDMA Guidelines 2023"
}
```

---

### POST /api/optimize-allocation

**Request:**
```json
{
  "zone_demands": [ ... ],
  "available_resources": {
    "food_tonnes": 200.0,
    "boats": 40,
    "medical_kits": 3000,
    "rescue_teams": 20
  }
}
```

**Response:**
```json
{
  "zone_allocations": [
    {
      "zone_id": "VEL",
      "zone_name": "Velachery",
      "priority_rank": 1,
      "risk_level": "CRITICAL",
      "allocated_food_t": 112.4,
      "allocated_boats": 22,
      "allocated_medical": 1680,
      "allocated_teams": 11,
      "food_coverage_pct": 87.3,
      ...
    }
  ],
  "summary": [...],
  "unmet_zones": ["Kolathur", "Perambur"],
  "optimization_method": "Risk-Weighted Priority Allocation (NDMA 2023)",
  "recommendation": "⚠️ Moderate resource gap. ..."
}
```

---

## Project Architecture

```
backend/
├── main.py                  ← FastAPI app, CORS, routers
├── requirements.txt
├── routers/
│   ├── health.py            ← GET /health
│   ├── zones.py             ← GET /api/zones, /api/zones/{id}
│   ├── predict.py           ← POST /api/predict-risk
│   └── resources.py         ← POST /api/estimate-resources
│                              POST /api/optimize-allocation
├── schemas/
│   └── models.py            ← All Pydantic request/response models
├── utils/
│   ├── zone_data.py         ← Static data for 15 Chennai zones
│   ├── model_loader.py      ← LSTM + RF inference (real or simulated)
│   └── resource_engine.py   ← NDMA demand estimation + allocation
└── models/
    └── chennai_flood_models.zip  ← (place your trained models here)
```
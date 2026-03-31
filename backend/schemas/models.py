"""
Pydantic schemas — request & response validation for all API endpoints.
"""

from __future__ import annotations

from datetime import date as Date
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Enums ─────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class FloodSeverity(str, Enum):
    NONE     = "no_flood"
    MINOR    = "minor"
    MODERATE = "moderate"
    SEVERE   = "severe"


# ── Zone ──────────────────────────────────────────────────────────────────────

class ZoneBase(BaseModel):
    zone_id:     str
    name:        str
    latitude:    float
    longitude:   float


class ZoneDetail(ZoneBase):
    population:         int
    area_sqkm:          float
    elevation_m:        float
    drainage_capacity:  float   = Field(description="Drainage capacity score 0–10")
    soil_type:          str
    static_risk_score:  float   = Field(ge=0, le=100, description="Static risk 0–100")
    risk_class:         RiskLevel
    nearest_stations:   List[str]
    rivers_nearby:      List[str]

    model_config = {"from_attributes": True}


# ── Predict ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    date:                   Date    = Field(description="Forecast date (YYYY-MM-DD)")
    rainfall_mm:            float   = Field(ge=0, description="Daily rainfall in mm")
    rolling_3d_mm:          float   = Field(ge=0, description="3-day cumulative rainfall mm")
    rolling_7d_mm:          float   = Field(ge=0, description="7-day cumulative rainfall mm")
    adyar_discharge_m3s:    float   = Field(ge=0, description="Adyar river discharge m³/s")
    cooum_discharge_m3s:    float   = Field(ge=0, description="Cooum river discharge m³/s")
    kosasthalaiyar_m3s:     float   = Field(ge=0, description="Kosasthalaiyar river discharge m³/s")
    soil_moisture:          float   = Field(ge=0, le=1,   description="Soil moisture 0–1")
    temperature_c:          float   = Field(description="Temperature °C")
    humidity_pct:           float   = Field(ge=0, le=100, description="Relative humidity %")
    wind_speed_kmh:         float   = Field(ge=0, description="Wind speed km/h")
    pressure_hpa:           float   = Field(description="Atmospheric pressure hPa")
    zone_id:                Optional[str] = Field(None, description="Optional — zone-level prediction")

    @field_validator("rainfall_mm", "rolling_3d_mm", "rolling_7d_mm", mode="before")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("Rainfall values must be ≥ 0")
        return v


class ZonePrediction(BaseModel):
    zone_id:            str
    zone_name:          str
    flood_probability:  float   = Field(ge=0, le=1)
    risk_level:         RiskLevel
    severity:           FloodSeverity
    combined_risk_score: float  = Field(ge=0, le=100)
    river_danger_pct:   float   = Field(ge=0, le=100)
    population_at_risk: int


class PredictResponse(BaseModel):
    date:                   Date
    city_flood_probability: float       = Field(ge=0, le=1)
    city_risk_level:        RiskLevel
    predicted_severity:     FloodSeverity
    lstm_probability:       float       = Field(ge=0, le=1, description="LSTM model output")
    rf_probability:         float       = Field(ge=0, le=1, description="Random Forest output")
    zones:                  List[ZonePrediction]
    alert_message:          str
    confidence:             float       = Field(ge=0, le=1)
    model_used:             str         = "LSTM + Random Forest Ensemble"


# ── Resources ─────────────────────────────────────────────────────────────────

class ZoneDemand(BaseModel):
    zone_id:            str
    zone_name:          str
    population:         int
    flood_probability:  float   = Field(ge=0, le=1)
    risk_factor:        float   = Field(ge=0, le=1, description="Zone-specific static risk factor 0–1")

    @field_validator("flood_probability", "risk_factor", mode="before")
    @classmethod
    def clamp(cls, v):
        return max(0.0, min(1.0, float(v)))


class ResourceDemand(BaseModel):
    zone_id:            str
    zone_name:          str
    displaced_persons:  int
    food_tonnes_day:    float
    boats_required:     int
    medical_kits:       int
    rescue_teams:       int
    priority_rank:      int


class EstimateResourcesRequest(BaseModel):
    zones: List[ZoneDemand] = Field(min_length=1, description="List of zone demand inputs")


class EstimateResourcesResponse(BaseModel):
    total_displaced:        int
    total_food_tonnes:      float
    total_boats:            int
    total_medical_kits:     int
    total_rescue_teams:     int
    zone_demands:           List[ResourceDemand]
    estimation_basis:       str = "NDMA Guidelines 2023"


# ── Allocation ────────────────────────────────────────────────────────────────

class AvailableResources(BaseModel):
    food_tonnes:    float   = Field(ge=0, description="Available food stock in tonnes")
    boats:          int     = Field(ge=0, description="Available boats")
    medical_kits:   int     = Field(ge=0, description="Available medical kits")
    rescue_teams:   int     = Field(ge=0, description="Available rescue teams")


class ZoneAllocation(BaseModel):
    zone_id:            str
    zone_name:          str
    priority_rank:      int
    risk_level:         RiskLevel
    allocated_food_t:   float
    allocated_boats:    int
    allocated_medical:  int
    allocated_teams:    int
    demand_food_t:      float
    demand_boats:       int
    demand_medical:     int
    demand_teams:       int
    food_coverage_pct:  float
    boats_coverage_pct: float
    medical_coverage_pct: float
    teams_coverage_pct: float


class OptimizeAllocationRequest(BaseModel):
    zone_demands:       List[ResourceDemand]
    available_resources: AvailableResources


class AllocationSummary(BaseModel):
    resource:           str
    total_demand:       float
    total_available:    float
    total_allocated:    float
    overall_coverage_pct: float


class OptimizeAllocationResponse(BaseModel):
    zone_allocations:   List[ZoneAllocation]
    summary:            List[AllocationSummary]
    unmet_zones:        List[str]
    optimization_method: str = "Risk-Weighted Priority Allocation"
    recommendation:     str


# ── Historical Events ─────────────────────────────────────────────────────────

class FloodEvent(BaseModel):
    year:           int
    month:          str
    peak_rainfall_mm: float
    deaths:         int
    displaced:      int
    severity:       FloodSeverity
    description:    str
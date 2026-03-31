"""
POST /api/estimate-resources   — compute NDMA demand per zone
POST /api/optimize-allocation  — optimally allocate available resources
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.models import (
    EstimateResourcesRequest,
    EstimateResourcesResponse,
    OptimizeAllocationRequest,
    OptimizeAllocationResponse,
    ResourceDemand,
    ZoneAllocation,
    AllocationSummary,
    RiskLevel,
)
from utils.resource_engine import (
    estimate_demand,
    priority_rank_zones,
    risk_weighted_allocation,
)
from utils.zone_data import ZONE_MAP

router = APIRouter()


# ── POST /api/estimate-resources ─────────────────────────────────────────────

@router.post(
    "/estimate-resources",
    response_model=EstimateResourcesResponse,
    summary="Estimate resource demand per zone (NDMA guidelines)",
    description=(
        "Given zone-level flood probabilities and populations, computes "
        "the number of displaced persons, food (tonnes/day), boats, "
        "medical kits, and rescue teams required per zone."
    ),
)
async def estimate_resources(req: EstimateResourcesRequest):
    if not req.zones:
        raise HTTPException(status_code=422, detail="Provide at least one zone.")

    demands_raw = []
    for zone_input in req.zones:
        demand = estimate_demand(
            population=zone_input.population,
            flood_probability=zone_input.flood_probability,
            risk_factor=zone_input.risk_factor,
        )
        demands_raw.append({
            "zone_id":           zone_input.zone_id,
            "zone_name":         zone_input.zone_name,
            **demand,
        })

    ranked = priority_rank_zones(demands_raw)

    zone_demands = [
        ResourceDemand(
            zone_id=z["zone_id"],
            zone_name=z["zone_name"],
            displaced_persons=z["displaced_persons"],
            food_tonnes_day=z["food_tonnes_day"],
            boats_required=z["boats_required"],
            medical_kits=z["medical_kits"],
            rescue_teams=z["rescue_teams"],
            priority_rank=z["priority_rank"],
        )
        for z in ranked
    ]

    return EstimateResourcesResponse(
        total_displaced=sum(z.displaced_persons for z in zone_demands),
        total_food_tonnes=round(sum(z.food_tonnes_day for z in zone_demands), 2),
        total_boats=sum(z.boats_required for z in zone_demands),
        total_medical_kits=sum(z.medical_kits for z in zone_demands),
        total_rescue_teams=sum(z.rescue_teams for z in zone_demands),
        zone_demands=zone_demands,
        estimation_basis="NDMA Guidelines 2023",
    )


# ── POST /api/optimize-allocation ────────────────────────────────────────────

@router.post(
    "/optimize-allocation",
    response_model=OptimizeAllocationResponse,
    summary="Optimally allocate available emergency resources across zones",
    description=(
        "Takes zone-level demand and currently available resources. "
        "Applies risk-weighted priority allocation — highest risk zones "
        "served first, surplus redistributed to lower-priority zones."
    ),
)
async def optimize_allocation(req: OptimizeAllocationRequest):
    if not req.zone_demands:
        raise HTTPException(status_code=422, detail="Provide at least one zone demand.")

    demands_as_dicts = [z.model_dump() for z in req.zone_demands]
    available = req.available_resources.model_dump()

    allocations, summary = risk_weighted_allocation(demands_as_dicts, available)

    # Build zone allocations with risk level (from ZONE_MAP if available)
    zone_allocs = []
    for a in allocations:
        zone_meta  = ZONE_MAP.get(a["zone_id"], {})
        risk_class = zone_meta.get("risk_class", RiskLevel.MEDIUM)
        if hasattr(risk_class, "value"):
            risk_class = RiskLevel(risk_class.value)

        zone_allocs.append(
            ZoneAllocation(
                zone_id=a["zone_id"],
                zone_name=a["zone_name"],
                priority_rank=a["priority_rank"],
                risk_level=risk_class,
                allocated_food_t=round(a["allocated_food_t"], 2),
                allocated_boats=int(a["allocated_boats"]),
                allocated_medical=int(a["allocated_medical"]),
                allocated_teams=int(a["allocated_teams"]),
                demand_food_t=a["demand_food_t"],
                demand_boats=a["demand_boats"],
                demand_medical=a["demand_medical"],
                demand_teams=a["demand_teams"],
                food_coverage_pct=a["food_coverage_pct"],
                boats_coverage_pct=a["boats_coverage_pct"],
                medical_coverage_pct=a["medical_coverage_pct"],
                teams_coverage_pct=a["teams_coverage_pct"],
            )
        )

    # Summary list
    resource_labels = {
        "food":          "Food (tonnes/day)",
        "boats":         "Rescue Boats",
        "medical_kits":  "Medical Kits",
        "rescue_teams":  "Rescue Teams",
    }
    summaries = []
    for key, label in resource_labels.items():
        s = summary.get(key, {})
        demand    = float(s.get("total_demand", 0))
        available_qty = float(s.get("total_available", 0))
        allocated = float(s.get("total_allocated", 0))
        coverage  = round(allocated / demand * 100, 1) if demand > 0 else 100.0
        summaries.append(AllocationSummary(
            resource=label,
            total_demand=demand,
            total_available=available_qty,
            total_allocated=allocated,
            overall_coverage_pct=coverage,
        ))

    # Identify zones with < 60% overall coverage
    unmet_zones = [
        a.zone_name for a in zone_allocs
        if (
            a.food_coverage_pct < 60
            or a.boats_coverage_pct < 60
            or a.medical_coverage_pct < 60
        )
    ]

    min_coverage = min(
        (s.overall_coverage_pct for s in summaries), default=100.0
    )

    if min_coverage < 50:
        recommendation = (
            "⚠️ Severe resource shortage. Immediately request mutual aid from "
            "neighbouring districts (Kancheepuram, Chengalpattu). "
            "Prioritise boats and rescue teams for critical zones."
        )
    elif min_coverage < 80:
        recommendation = (
            "ℹ️ Moderate resource gap. Pre-position additional stocks at "
            "Velachery and Adyar evacuation centres. "
            "Coordinate with NDRF for supplementary teams."
        )
    else:
        recommendation = (
            "✅ Resources sufficient for projected demand. "
            "Maintain standby reserve of 20% for unexpected surge. "
            "Continue real-time monitoring via TNSDMA dashboard."
        )

    return OptimizeAllocationResponse(
        zone_allocations=zone_allocs,
        summary=summaries,
        unmet_zones=unmet_zones,
        optimization_method="Risk-Weighted Priority Allocation (NDMA 2023)",
        recommendation=recommendation,
    )
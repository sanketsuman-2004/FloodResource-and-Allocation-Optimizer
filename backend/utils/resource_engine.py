"""
Resource Allocation Engine
---------------------------
Implements NDMA 2023 guideline-based demand estimation and
risk-weighted priority allocation across Chennai's 15 zones.
"""

from __future__ import annotations

import math

# ── NDMA Guideline Constants ──────────────────────────────────────────────────
FOOD_KG_PER_PERSON_PER_DAY  = 2.0        # kg
PERSONS_PER_BOAT             = 3_000      # rescue capacity per boat
MEDICAL_KIT_RATIO            = 0.025     # kits per displaced person
PERSONS_PER_RESCUE_TEAM      = 5_000     # team handles this many displaced


def estimate_demand(
    population:        int,
    flood_probability: float,
    risk_factor:       float,
) -> dict:
    """
    Estimate resource demand for a single zone.

    Args:
        population:        Total zone population
        flood_probability: LSTM-derived flood probability (0–1)
        risk_factor:       Zone static risk factor (0–1)

    Returns:
        Dict with displaced, food_tonnes, boats, medical_kits, rescue_teams
    """
    # Expected displaced persons
    displaced = int(population * flood_probability * risk_factor)

    food_tonnes    = round(displaced * FOOD_KG_PER_PERSON_PER_DAY / 1000, 2)
    boats          = math.ceil(displaced / PERSONS_PER_BOAT)   if displaced > 0 else 0
    medical_kits   = math.ceil(displaced * MEDICAL_KIT_RATIO)  if displaced > 0 else 0
    rescue_teams   = math.ceil(displaced / PERSONS_PER_RESCUE_TEAM) if displaced > 0 else 0

    return {
        "displaced_persons": displaced,
        "food_tonnes_day":   food_tonnes,
        "boats_required":    boats,
        "medical_kits":      medical_kits,
        "rescue_teams":      rescue_teams,
    }


def priority_rank_zones(zone_demands: list[dict]) -> list[dict]:
    """
    Assign priority rank (1 = highest) based on displaced persons.
    Ties broken by food demand.
    """
    sorted_zones = sorted(
        zone_demands,
        key=lambda x: (x["displaced_persons"], x["food_tonnes_day"]),
        reverse=True,
    )
    for rank, zone in enumerate(sorted_zones, start=1):
        zone["priority_rank"] = rank
    return sorted_zones


def risk_weighted_allocation(
    zone_demands:  list[dict],
    available:     dict,
) -> tuple[list[dict], dict]:
    """
    Allocate resources to zones using risk-weighted priority.

    Algorithm:
        1. Sort zones by priority_rank
        2. Compute weight for each zone = displaced / total_displaced
        3. Initial allocation = weight × available resource
        4. Cap at demand (no zone gets more than it needs)
        5. Redistribute saved resources to under-served zones

    Args:
        zone_demands:  Output of priority_rank_zones()
        available:     Dict with food_tonnes, boats, medical_kits, rescue_teams

    Returns:
        (allocations_list, summary_dict)
    """
    if not zone_demands:
        return [], {}

    total_displaced = max(sum(z["displaced_persons"] for z in zone_demands), 1)

    # Compute weights
    weights = [z["displaced_persons"] / total_displaced for z in zone_demands]

    resources = ["food_tonnes_day", "boats_required", "medical_kits", "rescue_teams"]
    avail_keys = ["food_tonnes",    "boats",           "medical_kits", "rescue_teams"]
    alloc_keys = [
        "allocated_food_t",
        "allocated_boats",
        "allocated_medical",
        "allocated_teams",
    ]

    allocations = [{**z} for z in zone_demands]

    for res, avail_key, alloc_key in zip(resources, avail_keys, alloc_keys):
        pool = float(available.get(avail_key, 0))
        remainder = pool

        # Pass 1: weighted allocation capped at demand
        for i, zone in enumerate(allocations):
            demand  = float(zone.get(res, 0))
            share   = weights[i] * pool
            granted = min(share, demand)
            zone[alloc_key] = granted
            remainder -= granted

        # Pass 2: distribute remainder to zones with unmet demand (by priority)
        if remainder > 1e-6:
            for zone in sorted(allocations, key=lambda x: x["priority_rank"]):
                unmet = float(zone.get(res, 0)) - zone[alloc_key]
                if unmet > 0:
                    extra = min(remainder, unmet)
                    zone[alloc_key] += extra
                    remainder -= extra
                if remainder < 1e-6:
                    break

        # Round integers
        if alloc_key != "allocated_food_t":
            for zone in allocations:
                zone[alloc_key] = math.floor(zone[alloc_key])

    # Compute coverage percentages
    for zone in allocations:
        zone["food_coverage_pct"]    = _pct(zone["allocated_food_t"],    zone["food_tonnes_day"])
        zone["boats_coverage_pct"]   = _pct(zone["allocated_boats"],     zone["boats_required"])
        zone["medical_coverage_pct"] = _pct(zone["allocated_medical"],   zone["medical_kits"])
        zone["teams_coverage_pct"]   = _pct(zone["allocated_teams"],     zone["rescue_teams"])

        # Copy demand fields for response schema
        zone["demand_food_t"]   = zone["food_tonnes_day"]
        zone["demand_boats"]    = zone["boats_required"]
        zone["demand_medical"]  = zone["medical_kits"]
        zone["demand_teams"]    = zone["rescue_teams"]

    # Summary
    summary = _build_summary(allocations, available)

    return allocations, summary


def _pct(allocated: float, demand: float) -> float:
    if demand <= 0:
        return 100.0
    return round(min(allocated / demand * 100, 100.0), 1)


def _build_summary(allocations: list[dict], available: dict) -> dict:
    return {
        "food": {
            "total_demand":    round(sum(z["food_tonnes_day"] for z in allocations), 2),
            "total_available": available.get("food_tonnes", 0),
            "total_allocated": round(sum(z["allocated_food_t"] for z in allocations), 2),
        },
        "boats": {
            "total_demand":    sum(z["boats_required"] for z in allocations),
            "total_available": available.get("boats", 0),
            "total_allocated": sum(z["allocated_boats"] for z in allocations),
        },
        "medical_kits": {
            "total_demand":    sum(z["medical_kits"] for z in allocations),
            "total_available": available.get("medical_kits", 0),
            "total_allocated": sum(z["allocated_medical"] for z in allocations),
        },
        "rescue_teams": {
            "total_demand":    sum(z["rescue_teams"] for z in allocations),
            "total_available": available.get("rescue_teams", 0),
            "total_allocated": sum(z["allocated_teams"] for z in allocations),
        },
    }
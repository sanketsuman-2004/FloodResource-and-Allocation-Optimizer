"""
GET /api/zones            — all 15 Chennai zones with static data
GET /api/zones/{zone_id}  — single zone detail
GET /api/zones/historical — documented flood events
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from schemas.models import ZoneDetail, FloodEvent, RiskLevel
from utils.zone_data import CHENNAI_ZONES, ZONE_MAP, HISTORICAL_EVENTS

router = APIRouter()


@router.get(
    "/zones",
    response_model=List[ZoneDetail],
    summary="Get all Chennai flood zones",
    description=(
        "Returns all 15 Chennai zones with geographic, demographic, and "
        "static risk attributes sourced from GCC, Census 2011, CMDA, and TNSDMA."
    ),
)
async def get_zones(
    risk_class: Optional[RiskLevel] = Query(None, description="Filter by risk class"),
):
    zones = CHENNAI_ZONES
    if risk_class:
        zones = [z for z in zones if z["risk_class"] == risk_class]

    return [_format_zone(z) for z in zones]


@router.get(
    "/zones/{zone_id}",
    response_model=ZoneDetail,
    summary="Get a single zone by ID",
)
async def get_zone(zone_id: str):
    zone_id = zone_id.upper()
    if zone_id not in ZONE_MAP:
        valid = ", ".join(ZONE_MAP.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Zone '{zone_id}' not found. Valid IDs: {valid}",
        )
    return _format_zone(ZONE_MAP[zone_id])


@router.get(
    "/zones/historical/events",
    response_model=List[FloodEvent],
    summary="Historical documented flood events in Chennai",
)
async def get_historical_events():
    return HISTORICAL_EVENTS


def _format_zone(z: dict) -> dict:
    """Ensure risk_class is returned as string value for Pydantic."""
    return {**z, "risk_class": z["risk_class"].value if hasattr(z["risk_class"], "value") else z["risk_class"]}
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health", summary="API Health Check")
async def health():
    return {
        "status":    "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service":   "Chennai Flood Risk Prediction API",
        "version":   "1.0.0",
    }
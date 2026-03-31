"""
Chennai Flood Risk Prediction & Emergency Resource Allocation System
FastAPI Backend — Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from routers import predict, resources, zones, health

app = FastAPI(
    title="Chennai Flood Risk Prediction API",
    description=(
        "AI-Driven Flood Risk Prediction and Optimal Emergency Resource Allocation System for Chennai. "
        "Uses LSTM + Random Forest ensemble to predict flood risk and optimally allocate rescue resources."
    ),
    version="1.0.0",
    contact={
        "name": "Chennai Flood AI Team",
        "email": "floodai@chennai.gov.in",
    },
    license_info={
        "name": "MIT",
    },
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,     tags=["Health"])
app.include_router(zones.router,      prefix="/api",  tags=["Zones"])
app.include_router(predict.router,    prefix="/api",  tags=["Prediction"])
app.include_router(resources.router,  prefix="/api",  tags=["Resources"])


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Chennai Flood Risk Prediction API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "status": "operational",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# Add this route to your existing routers/chart.py
# It generates realistic hourly trend data based on current weather inputs

@router.get("/api/timeseries")
async def get_timeseries(
    rainfall_mm: float = 0,
    river_level_m: float = 0,
):
    """
    Generate hourly trend data for the past 24 hours
    based on current rainfall and river level inputs.
    Used by the dashboard charts.
    """
    import math, random

    hours = list(range(0, 24, 2))  # 00, 02, 04 ... 22

    # Build a bell-curve peaking at hour 12 scaled to current inputs
    def bell(h, peak, base, noise=0.08):
        curve = math.exp(-0.5 * ((h - 12) / 5) ** 2)
        val = base + (peak - base) * curve
        val *= (1 + random.uniform(-noise, noise))
        return round(max(0, val), 1)

    rainfall_series = [
        {"t": f"{h:02d}", "v": bell(h, rainfall_mm, rainfall_mm * 0.2)}
        for h in hours
    ]

    # River level lags rainfall by ~2 hours, convert m → m³/s proxy
    river_peak = river_level_m * 120  # rough proxy
    river_series = [
        {"t": f"{h:02d}", "v": bell(max(0, h - 2), river_peak, river_peak * 0.35)}
        for h in hours
    ]

    return {
        "rainfall": rainfall_series,
        "river_discharge": river_series,
    }
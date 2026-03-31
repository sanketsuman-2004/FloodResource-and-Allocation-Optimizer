# Flood Resource and Allocation Optimizer 

A dark, industrial-aesthetic React dashboard for the Chennai Flood Risk Prediction & Emergency Resource Allocation system.

## Prerequisites
- Node.js 18+
- Backend running on `http://localhost:8000`

## Setup

```bash
cd chennai-flood-frontend
npm install
npm start
```

Opens at http://localhost:3000

## File Structure

```
src/
├── index.js              # React entry point
├── index.css             # Global styles & CSS variables (dark theme)
├── App.jsx               # Root component — tab routing, API orchestration
├── api.js                # Axios service layer → FastAPI backend
├── utils.js              # Risk helpers, formatters, zone coords/names
└── components/
    ├── InputPanel.jsx     # Sidebar: rainfall/river/date inputs + Predict button
    ├── ZoneSidebar.jsx    # Sidebar: scrollable zone list with risk bars
    ├── CityGauge.jsx      # SVG arc gauge for city-level risk score
    ├── FloodMap.jsx       # Leaflet map with dark tiles + risk circle markers
    ├── ZoneTable.jsx      # Full zone breakdown table with prediction data
    ├── ZoneRiskChart.jsx  # Recharts bar chart — all 15 zones by score
    ├── ResourcePanel.jsx  # Resource config + optimized allocation table
    └── HistoricalEvents.jsx # Timeline of 5 documented flood events
```

## Tabs

| Tab | What it shows |
|-----|---------------|
| **Dashboard** | Stats row, city gauge, risk chart, top-5 zones |
| **Risk Map** | Leaflet choropleth with zone markers |
| **Zones** | Chart + full sortable zone table |
| **Resources** | NDMA allocation config + optimized breakdown |
| **History** | 2000–2023 flood event timeline |

## API Integration

All calls proxy through `http://localhost:8000`:

- `GET /health` → API status indicator in nav
- `GET /api/zones` → Zone list + base risk scores
- `GET /api/zones/historical/events` → History tab
- `POST /api/predict-risk` → LSTM inference → updates all tabs
- `POST /api/optimize-allocation` → Resource tab

## Notes

- The `"proxy": "http://localhost:8000"` in package.json handles CORS in dev
- Leaflet markers use `ZONE_COORDS` in `utils.js` (approx lat/lng per zone)
- Risk colors: Critical #ef4444 · High #f97316 · Medium #eab308 · Low #22c55e
- Theme: Dark industrial, Syne display font, JetBrains Mono for data

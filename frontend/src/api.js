import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
});
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// ── Health ──────────────────────────────────────────────
export const checkHealth = () => API.get('/health');

// ── Zones ───────────────────────────────────────────────
export const fetchZones = () => API.get('/api/zones');
export const fetchZone  = (zoneId) => API.get(`/api/zones/${zoneId}`);
export const fetchHistoricalEvents = () => API.get('/api/zones/historical/events');

// ── Predict Risk ─────────────────────────────────────────
// Payload shape (all optional — backend fills defaults):
// {
//   rainfall_mm: number,          // last 24h
//   river_level_m: number,        // Adyar / Cooum
//   date: "YYYY-MM-DD",
//   temperature_c: number,
//   humidity_pct: number,
//   wind_speed_kmh: number,
//   previous_day_rainfall_mm: number,
//   cyclone_proximity: boolean,
//   tide_level_m: number
// }
export const predictRisk = (payload) => API.post('/api/predict-risk', payload);

// ── Resources ────────────────────────────────────────────
// estimateResources payload: { zone_predictions: [...], population_data?: {...} }
export const estimateResources = (payload) => API.post('/api/estimate-resources', payload);

// optimizeAllocation payload:
// { zone_predictions: [...], available_resources: { boats:n, teams:n, shelters:n, medical_units:n } }
export const optimizeAllocation = (payload) => API.post('/api/optimize-allocation', payload);

export default API;
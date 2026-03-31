// Risk level helpers
export const getRiskLevel = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const getRiskColor = (score) => {
  if (score >= 75) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
};

export const getRiskLabel = (score) => {
  if (score >= 75) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
};

// Number formatters
export const fmtPct = (v, digits = 1) =>
  v !== undefined && v !== null ? `${(v * 100).toFixed(digits)}%` : '—';

export const fmtNum = (v, digits = 0) =>
  v !== undefined && v !== null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—';

export const fmtScore = (v) =>
  v !== undefined && v !== null ? Number(v).toFixed(1) : '—';

// Date helpers
export const todayISO = () => new Date().toISOString().split('T')[0];

// Chennai zone approximate lat/lng centers (for Leaflet markers)
export const ZONE_COORDS = {
  VEL: [12.9783, 80.2209],  // Velachery
  ADY: [13.0012, 80.2565],  // Adyar Riverbank
  TAM: [12.9249, 80.1000],  // Tambaram
  MUD: [12.8891, 80.0931],  // Mudichur
  SAI: [13.0201, 80.2237],  // Saidapet
  KOL: [13.1177, 80.2134],  // Kolathur
  PER: [13.0891, 80.2313],  // Perambur
  TNG: [13.0418, 80.2341],  // T.Nagar
  SHO: [12.9010, 80.2279],  // Sholinganallur
  MAR: [13.0563, 80.2820],  // Marina North
  POR: [13.0358, 80.1567],  // Porur
  ANN: [13.0900, 80.2101],  // Anna Nagar
  AMB: [13.1140, 80.1548],  // Ambattur
  ALW: [13.0340, 80.2563],  // Alwarpet
  NUN: [13.0569, 80.2425],  // Nungambakkam
};

export const ZONE_FULL_NAMES = {
  VEL: 'Velachery',
  ADY: 'Adyar Riverbank',
  TAM: 'Tambaram',
  MUD: 'Mudichur',
  SAI: 'Saidapet',
  KOL: 'Kolathur',
  PER: 'Perambur',
  TNG: 'T.Nagar',
  SHO: 'Sholinganallur',
  MAR: 'Marina North',
  POR: 'Porur',
  ANN: 'Anna Nagar',
  AMB: 'Ambattur',
  ALW: 'Alwarpet',
  NUN: 'Nungambakkam',
};

// Derive color from Leaflet polygon fill (for choropleth)
export const choroplethColor = (score) => {
  if (score == null) return '#1e3a4a';
  const s = Math.min(100, Math.max(0, score));
  if (s >= 75) return 'rgba(239,68,68,0.75)';
  if (s >= 60) return 'rgba(249,115,22,0.65)';
  if (s >= 40) return 'rgba(234,179,8,0.55)';
  return 'rgba(34,197,94,0.45)';
};
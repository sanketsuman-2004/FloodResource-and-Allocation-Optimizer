import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ZONE_COORDS, ZONE_FULL_NAMES, getRiskColor, getRiskLabel, fmtScore } from '../utils';

// Force dark tile — CartoDB dark matter
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© OpenStreetMap © CARTO';

function ZoneMarkers({ zones, predictions, selectedZone, onSelect }) {
  // Build a lookup: zoneId → predicted score
  const predMap = {};
  if (predictions?.zones) {
    predictions.zones.forEach(z => {
      predMap[z.zone_id] = z.combined_risk_score ?? (z.flood_probability * 100);
    });
  }

  return (
    <>
      {zones.map(zone => {
        const id     = zone.zone_id;
        const coords = ZONE_COORDS[id];
        if (!coords) return null;

        const score = predMap[id] ?? zone.base_risk_score ?? zone.risk_score ?? 30;
        const color = getRiskColor(score);
        const level = getRiskLabel(score);
        const isSelected = selectedZone === id;

        return (
          <CircleMarker
            key={id}
            center={coords}
            radius={isSelected ? 18 : 12}
            pathOptions={{
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.65,
              color: isSelected ? '#fff' : color,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect(id) }}
          >
            <Tooltip permanent={isSelected} direction="top" offset={[0, -8]}>
              <div style={{
                background: '#0b1117',
                border: `1px solid ${color}55`,
                borderRadius: 6,
                padding: '6px 10px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: '#e8f4fd',
                minWidth: 130,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 3, color }}>{id} — {ZONE_FULL_NAMES[id]}</div>
                <div>Score: <span style={{ color }}>{fmtScore(score)}</span></div>
                <div>Level: <span style={{ color }}>{level}</span></div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function MapBounds() {
  const map = useMap();
  useEffect(() => {
    map.setView([13.0143, 80.2092], 11);
  }, [map]);
  return null;
}

export default function FloodMap({ zones, predictions, selectedZone, onSelectZone }) {
  // Risk level counts for legend
  const predMap = {};
  if (predictions?.zones) {
    predictions.zones.forEach(z => {
      predMap[z.zone_id] = z.combined_risk_score ?? (z.flood_probability * 100);
    });
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  zones.forEach(z => {
    const score = predMap[z.zone_id] ?? z.base_risk_score ?? z.risk_score ?? 30;
    const l = getRiskLabel(score).toLowerCase();
    if (counts[l] !== undefined) counts[l]++;
  });

  return (
    <div className="card map-container" style={{ height: 440, position: 'relative' }}>
      <div className="card-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, background: 'rgba(11,17,23,0.85)', backdropFilter: 'blur(8px)' }}>
        <span className="card-title">Chennai Flood Risk Map</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          {zones.length} ZONES MONITORED
        </span>
      </div>

      <MapContainer
        center={[13.0143, 80.2092]}
        zoom={11}
        style={{ height: '100%', width: '100%', background: '#060a0f' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <MapBounds />
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <ZoneMarkers
          zones={zones}
          predictions={predictions}
          selectedZone={selectedZone}
          onSelect={onSelectZone}
        />
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Risk Level</div>
        {[
          { key: 'critical', label: 'Critical', color: '#ef4444' },
          { key: 'high',     label: 'High',     color: '#f97316' },
          { key: 'medium',   label: 'Medium',   color: '#eab308' },
          { key: 'low',      label: 'Low',      color: '#22c55e' },
        ].map(({ key, label, color }) => (
          <div className="legend-row" key={key}>
            <div className="legend-swatch" style={{ background: color }} />
            <span>{label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', paddingLeft: 8 }}>{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
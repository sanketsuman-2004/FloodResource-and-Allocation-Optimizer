import React from 'react';
import { getRiskColor, getRiskLabel, fmtScore, ZONE_FULL_NAMES } from '../utils';

export default function ZoneSidebar({ zones, predictions, selectedZone, onSelectZone }) {
  const predMap = {};
  if (predictions?.zones) {
    predictions.zones.forEach(z => { predMap[z.zone_id] = z; });
  }

  const rows = zones
    .map(zone => {
      const pred = predMap[zone.zone_id];
      const score = pred?.combined_risk_score ?? (pred ? pred.flood_probability * 100 : null) ?? zone.base_risk_score ?? zone.risk_score ?? 30;
      return { ...zone, score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Zones ({zones.length})</span>
        {predictions && (
          <span style={{ color: 'var(--accent-flood)', fontSize: 9 }}>● PREDICTED</span>
        )}
      </div>
      <div className="zone-list">
        {rows.map(zone => {
          const color = getRiskColor(zone.score);
          const isSelected = selectedZone === zone.zone_id;

          return (
            <div
              key={zone.zone_id}
              className={`zone-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectZone(zone.zone_id === selectedZone ? null : zone.zone_id)}
            >
              <div className="zone-id">{zone.zone_id}</div>
              <div className="zone-name">{ZONE_FULL_NAMES[zone.zone_id] || zone.zone_id}</div>
              <div className="zone-bar-wrap">
                <div
                  className="zone-bar"
                  style={{ width: `${zone.score}%`, background: color }}
                />
              </div>
              <div className="zone-score" style={{ color }}>{fmtScore(zone.score)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
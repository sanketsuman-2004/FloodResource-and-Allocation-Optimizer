import React from 'react';
import { getRiskColor, getRiskLabel, fmtScore, fmtPct, ZONE_FULL_NAMES } from '../utils';

export default function ZoneTable({ zones, predictions, selectedZone, onSelectZone }) {
  // Build prediction lookup
  const predMap = {};
  if (predictions?.zones) {
    predictions.zones.forEach(z => { predMap[z.zone_id] = z; });
  }

  // Merge zones with predictions and sort by score desc
  const rows = zones.map(zone => {
    const pred = predMap[zone.zone_id];
    const score = pred?.combined_risk_score ?? (pred ? pred.flood_probability * 100 : null) ?? zone.base_risk_score ?? zone.risk_score ?? 30;
    return { ...zone, pred, score };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Zone Risk Breakdown</span>
        {predictions && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            LSTM PREDICTION ACTIVE
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="resource-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Risk Score</th>
              <th>Level</th>
              <th>Flood Prob</th>
              <th>River Danger</th>
              <th>Population</th>
              <th>Score Bar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const color = getRiskColor(row.score);
              const level = getRiskLabel(row.score);
              const isSelected = selectedZone === row.zone_id;

              return (
                <tr
                  key={row.zone_id}
                  onClick={() => onSelectZone(row.zone_id)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(14,165,233,0.06)' : undefined,
                    borderLeft: isSelected ? '2px solid var(--accent-flood)' : '2px solid transparent',
                  }}
                >
                  <td>
                    <div className="td-zone-name">{ZONE_FULL_NAMES[row.zone_id] || row.zone_id}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{row.zone_id}</div>
                  </td>
                  <td style={{ color, fontWeight: 600, fontSize: 13 }}>{fmtScore(row.score)}</td>
                  <td>
                    <span className={`risk-badge ${level.toLowerCase()}`}>{level}</span>
                  </td>
                  <td>{row.pred ? fmtPct(row.pred.flood_probability) : fmtPct(row.flood_probability)}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: row.river_danger_level === 'danger' ? 'var(--risk-critical)'
                           : row.river_danger_level === 'warning' ? 'var(--risk-high)'
                           : 'var(--text-muted)',
                    }}>
                      {(row.pred?.river_danger_level || row.river_danger_level || 'normal').toUpperCase()}
                    </span>
                  </td>
                  <td>{row.population ? row.population.toLocaleString('en-IN') : '—'}</td>
                  <td className="resource-bar-cell" style={{ minWidth: 80 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>
                      {fmtScore(row.score)}
                    </div>
                    <div className="resource-mini-bar">
                      <div
                        className="resource-mini-fill"
                        style={{ width: `${row.score}%`, background: color }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
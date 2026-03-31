import React from 'react';
import { getRiskColor, getRiskLabel, fmtScore } from '../utils';

function GaugeSVG({ value, size = 180 }) {
  const pct   = Math.min(1, Math.max(0, value / 100));
  const r     = 70;
  const cx    = size / 2;
  const cy    = size / 2 + 10;
  const start = Math.PI * 0.75;
  const end   = Math.PI * 0.25 + Math.PI;
  const span  = (Math.PI * 2 - (start - end)) % (Math.PI * 2);
  const arc   = pct * (Math.PI * 1.5);

  const polarX = (angle) => cx + r * Math.cos(angle);
  const polarY = (angle) => cy + r * Math.sin(angle);

  // Background arc path
  const bgPath = [
    `M ${polarX(start)} ${polarY(start)}`,
    `A ${r} ${r} 0 1 1 ${polarX(start + Math.PI * 1.5)} ${polarY(start + Math.PI * 1.5)}`
  ].join(' ');

  // Foreground arc
  const filled = start + arc;
  const large = arc > Math.PI ? 1 : 0;
  const fgPath = arc > 0 ? [
    `M ${polarX(start)} ${polarY(start)}`,
    `A ${r} ${r} 0 ${large} 1 ${polarX(filled)} ${polarY(filled)}`
  ].join(' ') : '';

  const color = getRiskColor(value);

  // Tick marks
  const ticks = [0, 25, 50, 75, 100].map(v => {
    const a = start + (v / 100) * Math.PI * 1.5;
    const inner = r - 8;
    const outer = r - 2;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy + outer * Math.sin(a),
      label: v,
      lx: cx + (r - 18) * Math.cos(a),
      ly: cy + (r - 18) * Math.sin(a),
    };
  });

  return (
    <svg className="gauge-svg" width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
      {/* Background track */}
      <path
        d={bgPath}
        fill="none"
        stroke="#1a2d3d"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Color fill */}
      {fgPath && (
        <path
          d={fgPath}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      )}
      {/* Tick marks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a4a5e" strokeWidth="1.5" />
          <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle"
            fill="#3d6278" fontSize="7" fontFamily="JetBrains Mono, monospace">
            {t.label}
          </text>
        </g>
      ))}
      {/* Center value */}
      <text x={cx} y={cy - 8} className="gauge-value" style={{ fill: color, transition: 'fill 0.4s' }}>
        {fmtScore(value)}
      </text>
      <text x={cx} y={cy + 14} className="gauge-label">Risk Score</text>
    </svg>
  );
}

export default function CityGauge({ prediction }) {
  if (!prediction) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">City-Level Risk</span>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🏙️</div>
          <div className="empty-title">No Prediction Yet</div>
          <div className="empty-sub">Set parameters and run the LSTM model to see risk scores</div>
        </div>
      </div>
    );
  }

  const score = prediction.city_risk_score ?? (prediction.flood_probability * 100);
  const level = getRiskLabel(score);
  const color = getRiskColor(score);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">City-Level Flood Risk</span>
        <span className={`risk-badge ${level.toLowerCase()}`}>
          {level}
        </span>
      </div>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="gauge-wrap" style={{ padding: 0 }}>
          <GaugeSVG value={score} />
          <div
            className="gauge-alert"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}40`,
              color,
            }}
          >
            {level === 'CRITICAL' && '⚠️ EVACUATE — Imminent flooding risk'}
            {level === 'HIGH' && '🔴 HIGH ALERT — Deploy rescue teams now'}
            {level === 'MEDIUM' && '🟡 MODERATE — Monitor closely'}
            {level === 'LOW' && '🟢 LOW RISK — Routine monitoring'}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'LSTM Probability', val: prediction.lstm_probability != null ? `${(prediction.lstm_probability * 100).toFixed(1)}%` : '—' },
            { label: 'RF Probability', val: prediction.rf_probability != null ? `${(prediction.rf_probability * 100).toFixed(1)}%` : '—' },
            { label: 'Ensemble Score', val: prediction.ensemble_probability != null ? `${(prediction.ensemble_probability * 100).toFixed(1)}%` : '—' },
            { label: 'Model Used', val: prediction.model_used ?? 'LSTM + Simulation' },
            { label: 'Prediction Time', val: prediction.prediction_timestamp ? new Date(prediction.prediction_timestamp).toLocaleTimeString() : '—' },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dim)', paddingBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
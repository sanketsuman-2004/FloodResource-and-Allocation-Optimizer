import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart,
  RadialBar, ReferenceLine,
} from 'recharts';
import { getRiskColor, getRiskLabel, fmtScore, ZONE_FULL_NAMES } from '../utils';

// ── Colour System ─────────────────────────────────────────
const C = {
  critical: '#ff4d4d',
  high:     '#ff8c42',
  medium:   '#f5c542',
  low:      '#4ade80',
  accent:   '#38bdf8',
  accentDim:'#0ea5e9',
  bg:       '#060d14',
  card:     '#0c1a26',
  cardBorder:'#112233',
  surface:  '#0f2030',
  text:     '#dff0fc',
  muted:    '#4d7a99',
  subtler:  '#1e3a52',
};

const riskColor = score =>
  score >= 75 ? C.critical : score >= 60 ? C.high : score >= 40 ? C.medium : C.low;

const riskLabel = score =>
  score >= 75 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

// ── Custom Tooltips ───────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 8, padding: '8px 12px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.text,
    }}>
      <div style={{ color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ color: riskColor(val * 100), fontWeight: 700 }}>
        {(val * 100).toFixed(1)}% flood risk
      </div>
    </div>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.cardBorder}`,
      borderRadius: 8, padding: '8px 12px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    }}>
      <span style={{ color: payload[0].payload.color, fontWeight: 700 }}>
        {payload[0].name}
      </span>
      <span style={{ color: C.muted }}> — {payload[0].value} zones</span>
    </div>
  );
};

// ── Section Header ────────────────────────────────────────
const SectionHead = ({ label, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontFamily: "'Exo 2', sans-serif", fontWeight: 700,
      fontSize: 13, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: C.accent,
    }}>{label}</div>
    {sub && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Card Wrapper ──────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 12,
    padding: '18px 20px',
    ...style,
  }}>
    {children}
  </div>
);

// ── Stat Pill ─────────────────────────────────────────────
const StatPill = ({ label, value, color, sub }) => (
  <div style={{
    background: `${color}10`, border: `1px solid ${color}30`,
    borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 100,
  }}>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted, marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 22, color }}>{value}</div>
    {sub && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Flood Probability Bar Chart ───────────────────────────
function ZoneBarChart({ zones }) {
  const data = zones
    .slice()
    .sort((a, b) => (b.flood_probability ?? 0) - (a.flood_probability ?? 0))
    .map(z => {
      const prob = parseFloat((z.flood_probability ?? 0).toFixed(4));
      return {
        name: z.zone_id ?? '?',
        fullName: z.zone_name ?? z.zone_id ?? '?',
        prob,
        fill: riskColor(prob * 100),
      };
    });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.subtler} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: C.muted }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: C.muted }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(56,189,248,0.04)' }} />
        <ReferenceLine y={0.5} stroke={C.medium} strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={0.75} stroke={C.critical} strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="prob" radius={[3, 3, 0, 0]} isAnimationActive>
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Risk Distribution Donut ───────────────────────────────
function RiskDonut({ zones }) {
  const counts = zones.reduce((acc, z) => {
    const p = z.flood_probability * 100;
    const key = p >= 75 ? 'Critical' : p >= 60 ? 'High' : p >= 40 ? 'Medium' : 'Low';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const data = [
    { name: 'Critical', value: counts.Critical || 0, color: C.critical },
    { name: 'High',     value: counts.High     || 0, color: C.high     },
    { name: 'Medium',   value: counts.Medium   || 0, color: C.medium   },
    { name: 'Low',      value: counts.Low      || 0, color: C.low      },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <PieChart width={130} height={130}>
        <Pie
          data={data}
          cx={65} cy={65}
          innerRadius={38} outerRadius={58}
          dataKey="value"
          strokeWidth={0}
          paddingAngle={3}
        >
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={<PieTip />} />
      </PieChart>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.muted, minWidth: 52 }}>{d.name}</span>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Model Comparison Bar ──────────────────────────────────
function ModelCompare({ lstm, rf, ensemble }) {
  const bars = [
    { label: 'LSTM', value: lstm, color: '#818cf8' },
    { label: 'Random Forest', value: rf, color: '#34d399' },
    { label: 'Ensemble', value: ensemble, color: C.accent },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bars.map(b => (
        <div key={b.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted }}>{b.label}</span>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: b.color }}>
              {(b.value * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 6, background: C.subtler, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${b.value * 100}%`,
              background: b.color, borderRadius: 3,
              boxShadow: `0 0 6px ${b.color}80`,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Zone Heat Grid ────────────────────────────────────────
function ZoneHeatGrid({ zones }) {
  const sorted = [...zones].sort((a, b) => (b.flood_probability ?? 0) - (a.flood_probability ?? 0));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 6,
    }}>
      {sorted.map(zone => {
        const pct = (zone.flood_probability ?? 0) * 100;
        const color = riskColor(pct);
        return (
          <div
            key={zone.zone_id}
            title={`${zone.zone_name}: ${pct.toFixed(1)}%`}
            style={{
              background: `${color}14`,
              border: `1px solid ${color}35`,
              borderRadius: 8, padding: '8px 8px 7px',
              cursor: 'default',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}28`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}14`}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color, letterSpacing: '0.08em' }}>{zone.zone_id}</div>
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 10, color: C.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {zone.zone_name ?? zone.zone_id ?? '?'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>
              {pct.toFixed(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── District Table ────────────────────────────────────────
function ZoneTable({ zones }) {
  const sorted = [...zones].sort((a, b) => (b.flood_probability ?? 0) - (a.flood_probability ?? 0));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
        <thead>
          <tr>
            {['Zone', 'Flood Prob', 'Risk Level', 'Severity', 'Score'].map(h => (
              <th key={h} style={{
                padding: '8px 10px', textAlign: 'left',
                color: C.muted, fontWeight: 600, fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderBottom: `1px solid ${C.subtler}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((zone, i) => {
            const pct = (zone.flood_probability ?? 0) * 100;
            const color = riskColor(pct);
            const label = riskLabel(pct);
            return (
              <tr
                key={zone.zone_id}
                style={{ borderBottom: `1px solid ${C.subtler}30` }}
                onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '9px 10px', color: C.text, fontWeight: 600 }}>
                  <span style={{ color, marginRight: 6, fontSize: 9 }}>●</span>
                  {zone.zone_name}
                </td>
                <td style={{ padding: '9px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color, fontWeight: 700, minWidth: 38 }}>{pct.toFixed(1)}%</span>
                    <div style={{ flex: 1, height: 4, background: C.subtler, borderRadius: 2, minWidth: 60 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '9px 10px' }}>
                  <span style={{
                    background: `${color}18`, border: `1px solid ${color}40`,
                    color, borderRadius: 5, padding: '2px 8px',
                    fontSize: 9, letterSpacing: '0.06em', fontWeight: 700,
                  }}>{zone.risk_level}</span>
                </td>
                <td style={{ padding: '9px 10px', color: C.muted, textTransform: 'capitalize' }}>{zone.severity}</td>
                <td style={{ padding: '9px 10px' }}>
                  <span style={{ color, fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13 }}>
                    {(zone.combined_risk_score ?? pct).toFixed(0)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Severity Badge ────────────────────────────────────────
const SEVER_COLOR = { minor: C.medium, moderate: C.high, severe: C.critical, extreme: C.critical };

// ── Main Dashboard ────────────────────────────────────────
export default function Dashboard({ zones = [], predictions }) {
  const apiZones = predictions?.zones ?? [];
  const displayZones = apiZones.length > 0 ? apiZones : zones;

  const cityProb    = predictions?.city_flood_probability ?? 0;
  const cityPct     = (cityProb * 100).toFixed(1);
  const cityColor   = riskColor(cityProb * 100);
  const cityLevel   = predictions?.city_risk_level ?? 'N/A';
  const severity    = predictions?.predicted_severity ?? 'N/A';
  const lstm        = predictions?.lstm_probability ?? 0;
  const rf          = predictions?.rf_probability ?? 0;
  const confidence  = predictions?.confidence ?? 0;
  const alertMsg    = predictions?.alert_message ?? '';
  const date        = predictions?.date ?? '';
  const modelUsed   = predictions?.model_used ?? '';

  return (
    <div style={{
      background: C.bg,
      minHeight: '100vh',
      padding: '24px 28px',
      fontFamily: "'Exo 2', sans-serif",
      color: C.text,
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600;700&display=swap');

        * { box-sizing: border-box; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${C.card}; }
        ::-webkit-scrollbar-thumb { background: ${C.subtler}; border-radius: 3px; }

        @keyframes pulse-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.08); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-card { animation: fade-in 0.4s ease both; }
      `}</style>

      {/* ── Top Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: cityColor,
              boxShadow: `0 0 0 4px ${cityColor}30`,
              animation: cityProb > 0.5 ? 'pulse-ring 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: '0.1em' }}>
              LIVE FEED · {date}
            </span>
          </div>
          <h1 style={{
            fontWeight: 900, fontSize: 26, letterSpacing: '-0.01em',
            margin: 0, color: C.text,
            fontFamily: "'Exo 2', sans-serif",
          }}>
            Chennai Flood Risk Monitor
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.muted, margin: '4px 0 0' }}>
            {modelUsed}
          </p>
        </div>

        {/* Alert banner */}
        {alertMsg && (
          <div style={{
            background: `${cityColor}10`, border: `1px solid ${cityColor}30`,
            borderLeft: `3px solid ${cityColor}`,
            borderRadius: 8, padding: '10px 16px', maxWidth: 460,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.text,
            lineHeight: 1.5,
          }}>
            {alertMsg}
          </div>
        )}
      </div>

      {/* ── Top Stat Row ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill
          label="City Flood Probability"
          value={`${cityPct}%`}
          color={cityColor}
          sub={`Risk: ${cityLevel}`}
        />
        <StatPill
          label="Predicted Severity"
          value={severity.toUpperCase()}
          color={SEVER_COLOR[severity] ?? C.muted}
        />
        <StatPill
          label="Model Confidence"
          value={`${(confidence * 100).toFixed(1)}%`}
          color={C.accent}
        />
        <StatPill
          label="Zones Monitored"
          value={displayZones.length}
          color="#a78bfa"
          sub={`${displayZones.filter(z => (z.flood_probability ?? 0) >= 0.5).length} above 50% risk`}
        />
      </div>

      {/* ── Row 1: Zone Bar Chart + Model Comparison + Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>

        {/* Bar chart */}
        <Card className="dash-card" style={{ animationDelay: '0.05s' }}>
          <SectionHead label="Zone Flood Probabilities" sub="All monitored zones, sorted by risk" />
          {displayZones.length > 0
            ? <ZoneBarChart zones={displayZones} />
            : <div style={{ color: C.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, textAlign: 'center', padding: '40px 0' }}>No zone data</div>
          }
        </Card>

        {/* Right column: model + donut */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card className="dash-card" style={{ animationDelay: '0.1s' }}>
            <SectionHead label="Model Breakdown" sub="LSTM · Random Forest · Ensemble" />
            <ModelCompare lstm={lstm} rf={rf} ensemble={cityProb} />
          </Card>

          <Card className="dash-card" style={{ animationDelay: '0.15s' }}>
            <SectionHead label="Risk Distribution" sub={`${displayZones.length} zones`} />
            <RiskDonut zones={displayZones} />
          </Card>
        </div>
      </div>

      {/* ── Row 2: Heat Grid + Table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
        <Card className="dash-card" style={{ animationDelay: '0.2s' }}>
          <SectionHead label="Zone Heat Map" sub="Score = flood prob × 100" />
          <ZoneHeatGrid zones={displayZones} />
        </Card>

        <Card className="dash-card" style={{ animationDelay: '0.25s' }}>
          <SectionHead label="District Risk Table" sub="Sorted by flood probability" />
          <ZoneTable zones={displayZones} />
        </Card>
      </div>

      {/* ── Footer line ── */}
      <div style={{
        borderTop: `1px solid ${C.subtler}`,
        paddingTop: 14, marginTop: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.muted, letterSpacing: '0.08em' }}>
          DATA · {date} · CONFIDENCE {(confidence * 100).toFixed(1)}%
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.subtler }}>
          CHENNAI FLOOD INTELLIGENCE SYSTEM
        </span>
      </div>
    </div>
  );
}
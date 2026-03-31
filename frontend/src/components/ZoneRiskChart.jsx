import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getRiskColor, ZONE_FULL_NAMES } from '../utils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = getRiskColor(d.score);
  return (
    <div style={{
      background: '#0f1820',
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color }}>{d.name}</div>
      <div style={{ color: '#7fa8c4' }}>Score: <span style={{ color }}>{d.score.toFixed(1)}</span></div>
      <div style={{ color: '#7fa8c4' }}>Prob: {(d.prob * 100).toFixed(1)}%</div>
    </div>
  );
};

export default function ZoneRiskChart({ zones, predictions }) {
  const predMap = {};
  if (predictions?.zones) {
    predictions.zones.forEach(z => { predMap[z.zone_id] = z; });
  }

  const data = zones
    .map(zone => {
      const pred = predMap[zone.zone_id];
      const score = pred?.combined_risk_score ?? (pred ? pred.flood_probability * 100 : null) ?? zone.base_risk_score ?? zone.risk_score ?? 30;
      return {
        id: zone.zone_id,
        name: ZONE_FULL_NAMES[zone.zone_id] || zone.zone_id,
        score: parseFloat(score.toFixed(1)),
        prob: pred?.flood_probability ?? zone.flood_probability ?? 0.3,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!data.length) return null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Zone Risk Scores</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>COMBINED SCORE</span>
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#182430" vertical={false} />
            <XAxis
              dataKey="id"
              tick={{ fill: '#3d6278', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: '#182430' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#3d6278', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14,165,233,0.04)' }} />
            <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'CRITICAL', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} />
            <ReferenceLine y={60} stroke="#f97316" strokeDasharray="4 3" strokeOpacity={0.35} />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={30}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={getRiskColor(entry.score)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
import React, { useState } from 'react';

const SEVERITY_COLOR = {
  extreme: '#ef4444',
  severe: '#f97316',
  moderate: '#eab308',
  minor: '#22c55e',
};

export default function HistoricalEvents({ events }) {
  const [expanded, setExpanded] = useState(null);

  if (!events?.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Historical Flood Events</span>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <div className="empty-title">Loading Events…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Historical Flood Events</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          2000–2023 · {events.length} EVENTS
        </span>
      </div>

      <div className="event-timeline">
        {events.map((ev, i) => {
          const year = ev.year ?? (ev.date ? new Date(ev.date).getFullYear() : '—');
          const isOpen = expanded === i;
          const color = SEVERITY_COLOR[ev.severity?.toLowerCase()] ?? '#0ea5e9';

          return (
            <div
              className="event-item"
              key={i}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <div className="event-year-col">
                <div className="event-year" style={{ color }}>{year}</div>
                <div className="event-dot" style={{ background: color, boxShadow: `0 0 10px ${color}55` }} />
                {i < events.length - 1 && <div className="event-line" />}
              </div>

              <div className="event-content">
                <div className="event-name">{ev.event_name ?? ev.name ?? `Flood Event ${year}`}</div>

                <div className="event-meta">
                  {ev.severity && (
                    <span className="event-meta-pill" style={{ color, borderColor: `${color}44`, background: `${color}10` }}>
                      {ev.severity.toUpperCase()}
                    </span>
                  )}
                  {ev.rainfall_mm != null && (
                    <span className="event-meta-pill">🌧 {ev.rainfall_mm}mm</span>
                  )}
                  {ev.peak_flood_level_m != null && (
                    <span className="event-meta-pill">🌊 {ev.peak_flood_level_m}m</span>
                  )}
                  {ev.affected_zones?.length > 0 && (
                    <span className="event-meta-pill">{ev.affected_zones.length} zones</span>
                  )}
                  {ev.casualties != null && ev.casualties > 0 && (
                    <span className="event-meta-pill" style={{ color: '#ef4444', borderColor: '#ef444444', background: '#ef444410' }}>
                      {ev.casualties} casualties
                    </span>
                  )}
                  {ev.economic_loss_crore_inr != null && (
                    <span className="event-meta-pill">₹{ev.economic_loss_crore_inr}Cr loss</span>
                  )}
                </div>

                <div className="event-desc">{ev.description}</div>

                {isOpen && ev.affected_zones?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {ev.affected_zones.map(z => (
                      <span key={z} style={{
                        background: 'var(--bg-lift)',
                        border: '1px solid var(--border-mid)',
                        borderRadius: 3,
                        padding: '2px 7px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                      }}>{z}</span>
                    ))}
                  </div>
                )}

                {isOpen && ev.max_water_depth_m != null && (
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Max Water Depth', val: `${ev.max_water_depth_m}m` },
                      { label: 'Duration', val: ev.flood_duration_days ? `${ev.flood_duration_days} days` : '—' },
                      { label: 'Displaced', val: ev.displaced_persons ? ev.displaced_persons.toLocaleString('en-IN') : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--bg-lift)', border: '1px solid var(--border-dim)', borderRadius: 5, padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
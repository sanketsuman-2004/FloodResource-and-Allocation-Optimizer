import React, { useState } from 'react';
import { fmtNum, ZONE_FULL_NAMES, getRiskColor } from '../utils';

const API = 'http://localhost:8000/api';

// Fields must match backend AvailableResources schema exactly:
// food_tonnes (float), boats (int), medical_kits (int), rescue_teams (int)
const AVAILABLE_DEFAULTS = {
  food_tonnes:   500,
  boats:         120,
  medical_kits:  80,
  rescue_teams:  200,
};

// Map zones from prediction API → ZoneDemand schema
// risk_factor must be 0–1 (Pydantic will reject > 1)
function buildEstimatePayload(zones) {
  return {
    zones: zones.map(z => ({
      zone_id:           z.zone_id,
      zone_name:         z.zone_name,
      population:        z.population ?? 100000,
      flood_probability: z.flood_probability,                          // already 0–1
      risk_factor:       Math.min(1, (z.combined_risk_score ?? z.flood_probability * 100) / 100), // normalise to 0–1
    })),
  };
}

// Safely extract a human-readable message from a Pydantic 422 body
function extractErrorMsg(body, status) {
  const detail = body?.detail;
  if (Array.isArray(detail)) {
    return detail.map(d => `${(d.loc ?? []).join('.')} — ${d.msg}`).join('; ');
  }
  if (typeof detail === 'string') return detail;
  return `Request failed (${status})`;
}

export default function ResourcePanel({ predictions }) {
  const [available, setAvailable]         = useState(AVAILABLE_DEFAULTS);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);

  const setR = (k, v) => setAvailable(prev => ({ ...prev, [k]: parseInt(v) || 0 }));

  const hasZones = predictions?.zones?.length > 0;

  // ── Two-step flow ─────────────────────────────────────────────────────────
  // 1. POST /api/estimate-resources  → zone_demands
  // 2. POST /api/optimize-allocation → zone_allocations
  const handleOptimize = async () => {
    if (!hasZones) return;
    setLoading(true);
    setError(null);
    setOptimizeResult(null);

    try {
      // Step 1 — estimate demand
      const estRes  = await fetch(`${API}/estimate-resources`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildEstimatePayload(predictions.zones)),
      });
      const estBody = await estRes.json().catch(() => ({}));
      if (!estRes.ok) throw new Error(extractErrorMsg(estBody, estRes.status));

      const zone_demands = estBody.zone_demands;
      if (!zone_demands?.length) throw new Error('estimate-resources returned no zone demands');

      // Step 2 — optimize
      // available keys now exactly match AvailableResources schema:
      // food_tonnes, boats, medical_kits, rescue_teams
      const optRes  = await fetch(`${API}/optimize-allocation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ zone_demands, available_resources: available }),
      });
      const optBody = await optRes.json().catch(() => ({}));
      if (!optRes.ok) {
        console.error('[optimize-allocation] error →', optBody);
        throw new Error(extractErrorMsg(optBody, optRes.status));
      }

      setOptimizeResult(optBody);

    } catch (err) {
      setError(String(err.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const alloc = optimizeResult?.zone_allocations ?? optimizeResult?.allocations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Resource inputs ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Available Resources</span>
          <button
            onClick={handleOptimize}
            disabled={!hasZones || loading}
            style={{
              padding: '5px 14px',
              background: hasZones ? 'var(--accent-flood)' : 'var(--bg-lift)',
              border: 'none', borderRadius: 5,
              color: hasZones ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.06em',
              cursor: hasZones && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading && <span className="spinner" style={{ width: 10, height: 10, borderTopColor: '#fff' }} />}
            {loading ? 'OPTIMIZING…' : '⚡ OPTIMIZE'}
          </button>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {Object.entries(available).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="input-label">{key.replace('_', ' ')}</div>
                <div className="input-row" style={{ padding: '6px 8px' }}>
                  <input
                    className="input-field"
                    type="number" min={0} value={val}
                    onChange={e => setR(key, e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {!hasZones && (
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
              Run a prediction first to enable optimization
            </div>
          )}

          {/* Error — always a plain string, never an object */}
          {error && (
            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444',
            }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Allocation table ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Resource Allocation</span>
          {optimizeResult && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--risk-low)' }}>
              OPTIMIZED
            </span>
          )}
        </div>

        {!alloc ? (
          <div className="empty-state">
            <div className="empty-icon">🚁</div>
            <div className="empty-title">No Allocation Data</div>
            <div className="empty-sub">Run a prediction then click Optimize to compute NDMA-based allocations</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Priority</th>
                  <th>Boats</th>
                  <th>Teams</th>
                  <th>Medical</th>
                  <th>Food (t/d)</th>
                  <th>Avg Coverage</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(alloc)
                  ? alloc
                  : Object.entries(alloc).map(([zone_id, v]) => ({ zone_id, ...v }))
                )
                  .sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999))
                  .map((row, i) => {
                    const coveragePct = (
                      (row.boats_coverage_pct   ?? 0) +
                      (row.medical_coverage_pct ?? 0) +
                      (row.teams_coverage_pct   ?? 0) +
                      (row.food_coverage_pct    ?? 0)
                    ) / 4;

                    const color = coveragePct >= 80
                      ? 'var(--risk-low)'
                      : coveragePct >= 50
                        ? 'var(--risk-medium)'
                        : 'var(--risk-critical)';

                    return (
                      <tr key={row.zone_id ?? i}>
                        <td>
                          <div className="td-zone-name">
                            {ZONE_FULL_NAMES?.[row.zone_id] ?? row.zone_name ?? row.zone_id}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                            {row.zone_id}
                          </div>
                        </td>
                        <td>
                          {row.priority_rank != null ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              color: row.priority_rank <= 2
                                ? 'var(--risk-critical)'
                                : row.priority_rank <= 5
                                  ? 'var(--risk-high)'
                                  : 'var(--text-muted)',
                            }}>
                              #{row.priority_rank}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {fmtNum(row.allocated_boats ?? row.boats_allocated)}
                          <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 3 }}>
                            /{fmtNum(row.demand_boats)}
                          </span>
                        </td>
                        <td>
                          {fmtNum(row.allocated_teams ?? row.teams_allocated)}
                          <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 3 }}>
                            /{fmtNum(row.demand_teams)}
                          </span>
                        </td>
                        <td>
                          {fmtNum(row.allocated_medical ?? row.medical_allocated)}
                          <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 3 }}>
                            /{fmtNum(row.demand_medical)}
                          </span>
                        </td>
                        <td>
                          {typeof row.allocated_food_t === 'number' ? row.allocated_food_t.toFixed(1) : '—'}
                          <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 3 }}>
                            /{typeof row.demand_food_t === 'number' ? row.demand_food_t.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="resource-bar-cell">
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>
                            {coveragePct.toFixed(0)}%
                          </div>
                          <div className="resource-mini-bar">
                            <div className="resource-mini-fill"
                              style={{ width: `${Math.min(100, coveragePct)}%`, background: color }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recommendation + summary stats ── */}
      {optimizeResult && (
        <>
          {optimizeResult.recommendation && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--bg-lift)', border: '1px solid var(--border)',
              borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-secondary)', lineHeight: 1.6,
            }}>
              {String(optimizeResult.recommendation)}
            </div>
          )}

          {Array.isArray(optimizeResult.summary) && (
            <div className="stats-row">
              {optimizeResult.summary.map(s => {
                const pct       = typeof s.overall_coverage_pct === 'number' ? s.overall_coverage_pct : null;
                const available = typeof s.total_available === 'number' ? s.total_available : null;
                const allocated = typeof s.total_allocated === 'number' ? s.total_allocated : null;
                const demand    = typeof s.total_demand    === 'number' ? s.total_demand    : null;
                const color = pct === null ? 'var(--text-secondary)'
                  : pct >= 80 ? 'var(--risk-low)'
                  : pct >= 50 ? 'var(--risk-medium)'
                  : 'var(--risk-critical)';
                return (
                  <div className="stat-card" key={String(s.resource)}>
                    <div className="stat-label">{String(s.resource)}</div>

                    {/* Big number: your input vs total needed */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '4px 0 2px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color }}>
                        {available !== null ? fmtNum(available) : '—'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                        / {demand !== null ? fmtNum(demand) : '—'} needed
                      </span>
                    </div>

                    {/* Mini bar: available vs demand */}
                    <div style={{ height: 4, background: 'var(--bg-lift)', borderRadius: 2, margin: '4px 0' }}>
                      <div style={{
                        height: '100%',
                        width: `${demand > 0 ? Math.min(100, (available / demand) * 100) : 0}%`,
                        background: color, borderRadius: 2,
                      }} />
                    </div>

                    {/* Sub: how much was actually dispatched */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                      {allocated !== null ? fmtNum(allocated) : '—'} dispatched
                      {pct !== null && (
                        <span style={{ color, marginLeft: 5 }}>({pct.toFixed(1)}%)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {optimizeResult.unmet_zones?.length > 0 && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ef4444',
            }}>
              ⚠ Under-served zones (&lt;60% coverage):{' '}
              {optimizeResult.unmet_zones.map(z => String(z)).join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
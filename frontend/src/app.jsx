import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import {
  checkHealth, fetchZones, fetchHistoricalEvents,
  predictRisk, estimateResources, optimizeAllocation,
} from './api';
import InputPanel from './components/InputPanel';
import Dashboard from './components/Dashboard';
import FloodMap from './components/FloodMap';
import ZoneTable from './components/ZoneTable';
import ZoneRiskChart from './components/ZoneRiskChart';
import ResourcePanel from './components/ResourcePanel';
import HistoricalEvents from './components/HistoricalEvents';
import ZoneSidebar from './components/ZoneSidebar';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'map',       label: 'Risk Map' },
  { id: 'zones',     label: 'Zones' },
  { id: 'resources', label: 'Resources' },
  { id: 'history',   label: 'History' },
];

export default function App() {
  // ── State ────────────────────────────────────────────
  const [tab, setTab] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  const [predictions, setPredictions] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);

  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingOptimize, setLoadingOptimize] = useState(false);
  const [error, setError] = useState(null);

  // ── Boot ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await checkHealth();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    })();

    fetchZones().then(r => setZones(r.data.zones ?? r.data ?? [])).catch(() => {});
    fetchHistoricalEvents().then(r => setEvents(r.data.events ?? r.data ?? [])).catch(() => {});
  }, []);

  // ── Predict ──────────────────────────────────────────
  const handlePredict = useCallback(async (inputs) => {
    setError(null);
    setLoadingPredict(true);
    try {
      const res = await predictRisk(inputs);
      const data = res.data;
      setPredictions(data);
      setOptimizeResult(null);

      // Auto-switch to dashboard on first predict
      if (tab !== 'dashboard') setTab('dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Prediction failed');
    } finally {
      setLoadingPredict(false);
    }
  }, [tab]);

  // ── Optimize ─────────────────────────────────────────
  const handleOptimize = useCallback(async (payload) => {
    setLoadingOptimize(true);
    setError(null);
    try {
      const res = await optimizeAllocation(payload);
      setOptimizeResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Optimization failed');
    } finally {
      setLoadingOptimize(false);
    }
  }, []);

  // ── Summary stats from prediction ────────────────────
  const criticalCount = predictions?.zone_predictions
    ? predictions.zone_predictions.filter(z => (z.combined_risk_score ?? z.flood_probability * 100) >= 75).length
    : zones.filter(z => (z.base_risk_score ?? z.risk_score ?? 30) >= 75).length;

  const highCount = predictions?.zone_predictions
    ? predictions.zone_predictions.filter(z => { const s = z.combined_risk_score ?? z.flood_probability * 100; return s >= 60 && s < 75; }).length
    : zones.filter(z => { const s = z.base_risk_score ?? z.risk_score ?? 30; return s >= 60 && s < 75; }).length;

  const cityScore = predictions?.city_risk_score ?? (predictions?.flood_probability ? predictions.flood_probability * 100 : null);

  return (
    <div className="app-shell">
      {/* ── Top Nav ── */}
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo">🌊</div>
          <div className="nav-title">Chennai<span>Flood</span>AI</div>
        </div>

        <div className="nav-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="nav-status">
          <div className={`status-dot ${apiStatus === 'offline' ? 'offline' : ''}`} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            API {apiStatus === 'checking' ? '…' : apiStatus.toUpperCase()}
          </span>
          {predictions && (
            <span style={{ marginLeft: 12, color: 'var(--accent-flood)' }}>
              ● PREDICTION ACTIVE
            </span>
          )}
        </div>
      </nav>

      {/* ── Main Layout ── */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <InputPanel onPredict={handlePredict} loading={loadingPredict} />
          {error && (
            <div className="alert-banner danger" style={{ margin: '0 12px 10px', fontSize: 10 }}>
              ⚠ {error}
            </div>
          )}
          {apiStatus === 'offline' && (
            <div className="alert-banner warning" style={{ margin: '0 12px 10px', fontSize: 10 }}>
              ⚡ Backend offline — start uvicorn on :8000
            </div>
          )}
          <ZoneSidebar
            zones={zones}
            predictions={predictions}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
          />
        </aside>

        {/* Content */}
        <main className="content-area">
          {/* ── DASHBOARD TAB ── */}
          {tab === 'dashboard' && (
            <Dashboard zones={zones} predictions={predictions} />
          )}

          {/* ── MAP TAB ── */}
          {tab === 'map' && (
            <div className="tab-panel">
              <FloodMap
                zones={zones}
                predictions={predictions}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
              />
              {!predictions && (
                <div className="alert-banner info">
                  ℹ️ Run a prediction to update zone colors with LSTM-predicted risk scores
                </div>
              )}
            </div>
          )}

          {/* ── ZONES TAB ── */}
          {tab === 'zones' && (
            <div className="tab-panel">
              <ZoneRiskChart zones={zones} predictions={predictions} />
              <ZoneTable
                zones={zones}
                predictions={predictions}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
              />
            </div>
          )}

          {/* ── RESOURCES TAB ── */}
          {tab === 'resources' && (
            <div className="tab-panel">
              <ResourcePanel
                predictions={predictions}
                onOptimize={handleOptimize}
                optimizeResult={optimizeResult}
                loading={loadingOptimize}
              />
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="tab-panel">
              <HistoricalEvents events={events} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
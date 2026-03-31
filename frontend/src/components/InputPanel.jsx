import React, { useState } from 'react';
import { todayISO } from '../utils';

const DEFAULT_INPUTS = {
  rainfall_mm: 45,
  river_level_m: 2.8,
  date: todayISO(),
  temperature_c: 29,
  humidity_pct: 82,
  wind_speed_kmh: 18,
  previous_day_rainfall_mm: 30,
  cyclone_proximity: false,
  tide_level_m: 1.2,
};

export default function InputPanel({ onPredict, loading }) {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);

  const set = (key, val) => setInputs(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const payload = {
      date: inputs.date,
      rainfall_mm: inputs.rainfall_mm,
      rolling_3d_mm: inputs.previous_day_rainfall_mm + inputs.rainfall_mm + 100, // Example calculation
      rolling_7d_mm: inputs.previous_day_rainfall_mm + inputs.rainfall_mm + 200, // Example calculation
      adyar_discharge_m3s: inputs.river_level_m * 100, // Example calculation
      cooum_discharge_m3s: inputs.river_level_m * 30, // Example calculation
      kosasthalaiyar_m3s: inputs.river_level_m * 50, // Example calculation
      soil_moisture: 0.8, // Placeholder value
      temperature_c: inputs.temperature_c,
      humidity_pct: inputs.humidity_pct,
      wind_speed_kmh: inputs.wind_speed_kmh,
      pressure_hpa: 1005.0, // Placeholder value
    };

    console.log('Payload sent to API:', payload);
    onPredict(payload);
  };

  return (
    <>
      <div className="section-label">Input Parameters</div>

      <div className="input-section">

        <div className="input-group">
          <div className="input-label">Rainfall (24h)</div>
          <div className="input-row">
            <span className="input-icon">🌧️</span>
            <input
              className="input-field"
              type="number"
              value={inputs.rainfall_mm}
              min={0} max={500}
              onChange={e => set('rainfall_mm', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">mm</span>
          </div>
          <input
            className="input-range"
            type="range"
            min={0} max={400} step={5}
            value={inputs.rainfall_mm}
            onChange={e => set('rainfall_mm', parseFloat(e.target.value))}
          />
        </div>

        <div className="input-group">
          <div className="input-label">River Level</div>
          <div className="input-row">
            <span className="input-icon">🌊</span>
            <input
              className="input-field"
              type="number"
              value={inputs.river_level_m}
              min={0} max={10} step={0.1}
              onChange={e => set('river_level_m', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">m</span>
          </div>
          <input
            className="input-range"
            type="range"
            min={0} max={8} step={0.1}
            value={inputs.river_level_m}
            onChange={e => set('river_level_m', parseFloat(e.target.value))}
          />
        </div>

        <div className="input-group">
          <div className="input-label">Previous Day Rainfall</div>
          <div className="input-row">
            <span className="input-icon">📅</span>
            <input
              className="input-field"
              type="number"
              value={inputs.previous_day_rainfall_mm}
              min={0} max={300}
              onChange={e => set('previous_day_rainfall_mm', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">mm</span>
          </div>
        </div>

        <div className="input-group">
          <div className="input-label">Temperature</div>
          <div className="input-row">
            <span className="input-icon">🌡️</span>
            <input
              className="input-field"
              type="number"
              value={inputs.temperature_c}
              min={15} max={45}
              onChange={e => set('temperature_c', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">°C</span>
          </div>
        </div>

        <div className="input-group">
          <div className="input-label">Humidity</div>
          <div className="input-row">
            <span className="input-icon">💧</span>
            <input
              className="input-field"
              type="number"
              value={inputs.humidity_pct}
              min={0} max={100}
              onChange={e => set('humidity_pct', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">%</span>
          </div>
          <input
            className="input-range"
            type="range"
            min={0} max={100} step={1}
            value={inputs.humidity_pct}
            onChange={e => set('humidity_pct', parseFloat(e.target.value))}
          />
        </div>

        <div className="input-group">
          <div className="input-label">Wind Speed</div>
          <div className="input-row">
            <span className="input-icon">🌬️</span>
            <input
              className="input-field"
              type="number"
              value={inputs.wind_speed_kmh}
              min={0} max={200}
              onChange={e => set('wind_speed_kmh', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">km/h</span>
          </div>
        </div>

        <div className="input-group">
          <div className="input-label">Tide Level</div>
          <div className="input-row">
            <span className="input-icon">⚓</span>
            <input
              className="input-field"
              type="number"
              value={inputs.tide_level_m}
              min={0} max={4} step={0.1}
              onChange={e => set('tide_level_m', parseFloat(e.target.value) || 0)}
            />
            <span className="input-unit">m</span>
          </div>
        </div>

        <div className="input-group">
          <div className="input-label">Forecast Date</div>
          <div className="input-row">
            <span className="input-icon">📆</span>
            <input
              className="input-field"
              type="date"
              value={inputs.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>
        </div>

        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="input-label" style={{ margin: 0 }}>Cyclone Proximity</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={inputs.cyclone_proximity}
              onChange={e => set('cyclone_proximity', e.target.checked)}
              style={{ accentColor: 'var(--accent-flood)', width: 14, height: 14, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: inputs.cyclone_proximity ? 'var(--risk-high)' : 'var(--text-muted)' }}>
              {inputs.cyclone_proximity ? 'YES' : 'NO'}
            </span>
          </label>
        </div>

      </div>

      {/* Sticky predict button always visible at bottom of sidebar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--bg-panel)',
        padding: '10px 12px 12px',
        borderTop: '1px solid var(--border-dim)',
        zIndex: 10,
      }}>
        <button
          className={`predict-btn ${loading ? 'loading' : ''}`}
          onClick={handleSubmit}
          disabled={loading}
          style={{ margin: 0, width: '100%' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: '#fff', width: 12, height: 12 }} />
              Running LSTM Model…
            </span>
          ) : (
            '⚡ Run Flood Prediction'
          )}
        </button>
      </div>
    </>
  );
}
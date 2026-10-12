import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Brush,
} from 'recharts';
import { Activity, Eye, EyeOff, ZoomIn, Loader2 } from 'lucide-react';

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const dp = payload[0].payload;
  return (
    <div className="bg-space-dark/95 border border-space-border p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
      <p className="text-space-cyan font-bold mb-1">SAMPLE INDEX: #{label}</p>
      <p className="text-white">
        TELEMETRY VALUE:{' '}
        <span className="text-space-green font-bold">{dp.value?.toFixed(4) ?? '—'}</span>
      </p>
      {dp.isAnomaly && (
        <p className="text-space-red font-bold mt-1">
          ⚠ ANOMALY DETECTED (CONF: {(dp.confidence * 100).toFixed(1)}%)
        </p>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function TelemetryChart({ results, isLoading }) {
  const [showAnomalies, setShowAnomalies] = useState(true);

  const {
    primary_signal = [],
    window_predictions = [],
    anomaly_sequences = [],
  } = results || {};

  /**
   * Build chart data with per-point anomaly flags.
   * Downsamples when signal > 8 000 points to keep the DOM lightweight.
   * Anomaly ReferenceAreas use the *raw* signal indices (seq.start / seq.end),
   * so their x1/x2 values match the dataKey="index" axis correctly.
   */
  const { chartData, step } = useMemo(() => {
    if (!primary_signal || primary_signal.length === 0) return { chartData: [], step: 1 };

    const anomalyMap = new Array(primary_signal.length).fill(0);
    const confMap = new Array(primary_signal.length).fill(0);

    window_predictions.forEach((w) => {
      if (w.is_anomaly) {
        for (let i = w.start; i < w.end && i < primary_signal.length; i++) {
          anomalyMap[i] = 1;
          confMap[i] = Math.max(confMap[i], w.confidence);
        }
      }
    });

    const s = primary_signal.length > 8000 ? 2 : 1;
    const data = [];
    for (let i = 0; i < primary_signal.length; i += s) {
      data.push({
        index: i,
        value: primary_signal[i],
        isAnomaly: anomalyMap[i] === 1,
        confidence: confMap[i],
      });
    }
    return { chartData: data, step: s };
  }, [primary_signal, window_predictions]);

  /**
   * Convert raw-signal indices to chart (downsampled) indices for ReferenceAreas.
   * This ensures the red highlights align exactly with the rendered data points.
   */
  const toChartIndex = (rawIdx) => Math.floor(rawIdx / step);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-space-border text-center flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-12 h-12 text-space-cyan animate-spin mb-3" />
        <h3 className="text-base font-bold text-white font-mono">PIPELINE INFERENCE RUNNING</h3>
        <p className="text-xs text-space-muted mt-1 max-w-md">
          XGBoost is scanning telemetry windows — this takes a few seconds for large channels.
        </p>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!results || primary_signal.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-space-border text-center flex flex-col items-center justify-center min-h-[350px]">
        <Activity className="w-12 h-12 text-space-cyan/40 mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-white font-mono">MISSION CONTROL MONITOR IDLE</h3>
        <p className="text-xs text-space-muted mt-1 max-w-md">
          Upload a telemetry .npy channel or pick a benchmark NASA channel above to render live
          signal visualisation &amp; anomaly overlay.
        </p>
      </div>
    );
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  return (
    <div className="glass-panel rounded-2xl p-6 border border-space-border relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-space-card border border-space-border rounded-xl text-space-cyan">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              TELEMETRY TIME-SERIES SIGNAL
            </h3>
            <p className="text-xs text-space-muted">
              Continuous sensor data •{' '}
              <span className="text-white font-semibold">
                {primary_signal.length.toLocaleString()}
              </span>{' '}
              points • Red highlights = detected anomaly intervals
              {step === 2 && ' (downsampled 2×)'}
            </p>
          </div>
        </div>

        {/* Anomaly overlay toggle */}
        <button
          type="button"
          onClick={() => setShowAnomalies((v) => !v)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            showAnomalies
              ? 'border-space-red bg-space-red/15 text-space-red shadow-red-glow'
              : 'border-space-border bg-space-card text-space-muted hover:text-white'
          }`}
        >
          {showAnomalies ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showAnomalies ? 'ANOMALY OVERLAY ON' : 'ANOMALY OVERLAY OFF'}</span>
        </button>
      </div>

      {/* Recharts */}
      <div className="w-full h-[400px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <defs>
              <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />

            <XAxis
              dataKey="index"
              stroke="#64748B"
              tick={{ fill: '#8A99AD', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              label={{
                value: 'Sample Step (Time)',
                position: 'insideBottom',
                offset: -15,
                fill: '#8A99AD',
                fontSize: 11,
              }}
            />
            <YAxis
              stroke="#64748B"
              tick={{ fill: '#8A99AD', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              domain={['auto', 'auto']}
              label={{
                value: 'Telemetry Value',
                angle: -90,
                position: 'insideLeft',
                fill: '#8A99AD',
                fontSize: 11,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Anomaly shaded regions — indices are already chart (downsampled) coords */}
            {showAnomalies &&
              anomaly_sequences.map((seq, idx) => (
                <ReferenceArea
                  key={idx}
                  x1={toChartIndex(seq.start)}
                  x2={toChartIndex(seq.end)}
                  fill="#FF3366"
                  fillOpacity={0.3}
                  stroke="#FF3366"
                  strokeOpacity={0.8}
                  strokeWidth={1}
                />
              ))}

            {/* Primary telemetry line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#00F0FF"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 5, fill: '#00F0FF', stroke: '#FFFFFF', strokeWidth: 2 }}
            />

            {/* Brush zoom slider */}
            <Brush
              dataKey="index"
              height={26}
              stroke="#00F0FF"
              fill="#151A28"
              tickFormatter={(val) => `#${val}`}
              startIndex={0}
              endIndex={Math.max(0, chartData.length - 1)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-space-border/60 flex flex-wrap items-center justify-between text-xs font-mono text-space-muted gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-space-cyan inline-block" />
            <span>Nominal Telemetry</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-space-red/40 border border-space-red inline-block rounded-sm" />
            <span>Anomalous Region</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <ZoomIn className="w-3.5 h-3.5 text-space-cyan" />
          <span>Drag horizontal slider to zoom into temporal regions</span>
        </div>
      </div>
    </div>
  );
}

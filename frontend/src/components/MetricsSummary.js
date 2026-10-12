import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity, Gauge, Zap } from 'lucide-react';

export default function MetricsSummary({ results }) {
  if (!results) return null;

  const {
    num_samples = 0,
    total_windows = 0,
    anomalous_windows = 0,
    anomaly_ratio = 0,
    health_status = 'NORMAL',
    status_level = 'success',
    max_confidence = 0,
    filename = 'Telemetry Channel'
  } = results;

  const getStatusBadge = () => {
    switch (status_level) {
      case 'danger':
        return {
          icon: <ShieldAlert className="w-6 h-6 text-space-red" />,
          bgColor: 'bg-space-red/10',
          borderColor: 'border-space-red/50',
          textColor: 'text-space-red',
          glow: 'shadow-red-glow'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-space-amber" />,
          bgColor: 'bg-space-amber/10',
          borderColor: 'border-space-amber/50',
          textColor: 'text-space-amber',
          glow: 'shadow-[0_0_20px_rgba(255,184,0,0.3)]'
        };
      default:
        return {
          icon: <ShieldCheck className="w-6 h-6 text-space-green" />,
          bgColor: 'bg-space-green/10',
          borderColor: 'border-space-green/50',
          textColor: 'text-space-green',
          glow: 'shadow-green-glow'
        };
    }
  };

  const statusStyle = getStatusBadge();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* System Health Status Card (Spans 2 columns on lg) */}
      <div className={`glass-panel rounded-2xl p-5 border ${statusStyle.borderColor} ${statusStyle.bgColor} ${statusStyle.glow} lg:col-span-2 flex flex-col justify-between`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-space-muted">SYSTEM HEALTH DIAGNOSTIC</span>
            <h3 className={`text-xl font-extrabold mt-1 font-mono tracking-tight ${statusStyle.textColor}`}>
              {health_status}
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${statusStyle.bgColor} border ${statusStyle.borderColor}`}>
            {statusStyle.icon}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-space-muted">CHANNEL: <strong className="text-white">{filename}</strong></span>
          <span className="text-space-cyan">SLIDING WINDOW: 100 | STRIDE: 5</span>
        </div>
      </div>

      {/* KPI 1: Telemetry Data Points */}
      <div className="glass-panel rounded-2xl p-5 border border-space-border flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-space-muted">TOTAL SAMPLES</span>
          <Activity className="w-4 h-4 text-space-cyan" />
        </div>
        <div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {num_samples.toLocaleString()}
          </div>
          <p className="text-[11px] text-space-muted mt-1">Telemetry array length</p>
        </div>
      </div>

      {/* KPI 2: Anomaly Ratio */}
      <div className="glass-panel rounded-2xl p-5 border border-space-border flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-space-muted">ANOMALY RATIO</span>
          <Gauge className="w-4 h-4 text-space-amber" />
        </div>
        <div>
          <div className="text-2xl font-black font-mono text-white mt-2 flex items-baseline space-x-1">
            <span>{anomaly_ratio}%</span>
            <span className="text-xs font-normal text-space-muted">({anomalous_windows}/{total_windows} w.)</span>
          </div>
          <p className="text-[11px] text-space-muted mt-1">Pipeline classified windows</p>
        </div>
      </div>

      {/* KPI 3: Peak Confidence */}
      <div className="glass-panel rounded-2xl p-5 border border-space-border flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-space-muted">PEAK CONFIDENCE</span>
          <Zap className="w-4 h-4 text-space-green" />
        </div>
        <div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {(max_confidence * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-space-muted mt-1">XGBoost probability score</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Activity,
  Server,
  Download,
  AlertOctagon,
  Clock,
  Database,
  WifiOff,
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from './config';
import UploadChannel from './components/UploadChannel';
import MetricsSummary from './components/MetricsSummary';
import TelemetryChart from './components/TelemetryChart';
import AnomalyTable from './components/AnomalyTable';

export default function App() {
  const [predictionResults, setPredictionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'warning' | 'offline'
  const [backendError, setBackendError] = useState('');
  const [utcTime, setUtcTime] = useState('');

  // ── Live UTC Clock ────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().replace('GMT', 'UTC'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Health Check + Demo channel pre-load ─────────────────────────────────
  useEffect(() => {
    // Health check
    axios
      .get(`${API_BASE_URL}/health`)
      .then((res) => {
        if (res.data && res.data.status === 'HEALTHY') {
          setBackendStatus('online');
          setBackendError('');
        } else {
          setBackendStatus('warning');
          setBackendError('Backend responded but pipeline may not be ready.');
        }
      })
      .catch(() => {
        setBackendStatus('offline');
        setBackendError(
          `Cannot reach backend at ${API_BASE_URL}. Make sure the server is running.`
        );
      });

    // Auto-load benchmark channel T-1 on mount
    setIsLoading(true);
    axios
      .post(`${API_BASE_URL}/sample/T-1.npy`)
      .then((res) => {
        setPredictionResults(res.data);
      })
      .catch((err) => {
        console.warn('Could not pre-load sample channel T-1:', err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // ── JSON Report Export ────────────────────────────────────────────────────
  const exportReport = () => {
    if (!predictionResults) return;
    const blob = new Blob(
      [JSON.stringify(predictionResults, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa_anomaly_report_${predictionResults.filename || 'channel'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col selection:bg-space-cyan selection:text-black">

      {/* ── Top Navbar ──────────────────────────────────────────────────── */}
      <header className="glass-panel border-b border-space-border/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo + Title */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-space-cyan to-space-blue p-0.5 flex items-center justify-center shadow-cyan-glow">
              <div className="w-full h-full bg-space-dark rounded-[10px] flex items-center justify-center">
                <Rocket className="w-5 h-5 text-space-cyan" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-white tracking-wider font-mono">
                  NASA TELEMETRY ANOMALY DETECTION
                </h1>
                <span className="bg-space-card text-space-cyan text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-space-cyan/30">
                  SMAP / MSL ML PIPELINE
                </span>
              </div>
              <p className="text-xs text-space-muted">
                XGBoost End-to-End Pipeline • 304 Features (250 Statistical + 54 Channel Encodings)
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center space-x-3">
            {/* UTC Clock */}
            <div className="hidden md:flex items-center space-x-1.5 text-xs font-mono text-space-muted bg-space-card/80 px-3 py-1.5 rounded-lg border border-space-border">
              <Clock className="w-3.5 h-3.5 text-space-cyan" />
              <span>{utcTime || 'SYS TIME UTC'}</span>
            </div>

            {/* Backend Status */}
            <div className="flex items-center space-x-2 bg-space-card/80 px-3 py-1.5 rounded-lg border border-space-border text-xs font-mono">
              <Server className="w-3.5 h-3.5 text-space-cyan" />
              {backendStatus === 'online' && (
                <span className="text-space-green font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-space-green animate-pulse" />
                  <span>BACKEND ONLINE</span>
                </span>
              )}
              {backendStatus === 'offline' && (
                <span className="text-space-red font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-space-red" />
                  <span>BACKEND OFFLINE</span>
                </span>
              )}
              {backendStatus === 'warning' && (
                <span className="text-space-amber font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-space-amber animate-pulse" />
                  <span>BACKEND WARNING</span>
                </span>
              )}
              {backendStatus === 'checking' && (
                <span className="text-space-amber font-bold">CHECKING STATUS...</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Offline Banner ───────────────────────────────────────────────── */}
      {backendStatus === 'offline' && (
        <div className="bg-space-red/10 border-b border-space-red/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center space-x-3 text-sm text-space-red font-mono">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Backend Unreachable:</strong> {backendError}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Dashboard ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow space-y-8 w-full">

        {/* Step 1 — Upload / Channel Selector */}
        <section>
          <UploadChannel
            onPredictionResult={setPredictionResults}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </section>

        {/* Step 2 — KPI Diagnostics */}
        {predictionResults && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-space-cyan" />
                <h2 className="text-lg font-bold text-white font-mono tracking-wide">
                  MISSION DIAGNOSTIC METRICS
                </h2>
              </div>
              <button
                type="button"
                onClick={exportReport}
                className="flex items-center space-x-2 px-3.5 py-1.5 bg-space-card hover:bg-space-border text-space-cyan border border-space-cyan/30 rounded-lg text-xs font-mono transition-all hover:shadow-cyan-glow"
              >
                <Download className="w-4 h-4" />
                <span>EXPORT REPORT (JSON)</span>
              </button>
            </div>
            <MetricsSummary results={predictionResults} />
          </section>
        )}

        {/* Step 3 — Time-Series Chart */}
        <section>
          <TelemetryChart results={predictionResults} isLoading={isLoading} />
        </section>

        {/* Step 4 — Anomaly Sequences Table */}
        {predictionResults &&
          predictionResults.anomaly_sequences &&
          predictionResults.anomaly_sequences.length > 0 && (
            <section>
              <AnomalyTable sequences={predictionResults.anomaly_sequences} />
            </section>
          )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="glass-panel border-t border-space-border/80 mt-12 py-6 text-xs text-space-muted font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-space-cyan" />
            <span>NASA SMAP / MSL Telemetry Anomaly Benchmark Dataset</span>
          </div>
          <div>FastAPI Backend • React.js + Tailwind CSS • XGBoost ML Pipeline</div>
        </div>
      </footer>
    </div>
  );
}

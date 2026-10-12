import React, { useState, useEffect } from 'react';
import { Upload, FileCode, Play, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

export default function UploadChannel({ onPredictionResult, isLoading, setIsLoading }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Fetch sample channel list from backend on mount ─────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/samples`)
      .then((res) => {
        if (res.data?.samples) {
          setSamples(res.data.samples);
          if (res.data.samples.length > 0) {
            setSelectedSample(res.data.samples[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load sample channels list from backend:', err.message);
        // Fall back to known channels so the UI is still usable offline
        const fallback = ['T-1.npy', 'P-1.npy', 'A-1.npy', 'S-1.npy', 'E-1.npy', 'E-2.npy'];
        setSamples(fallback);
        setSelectedSample(fallback[0]);
      });
  }, []);

  // ── Drag-and-drop handlers ───────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.npy')) {
      setErrorMessage('Invalid file format. Please upload a NASA telemetry .npy file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum allowed size is 50 MB.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files?.[0]);
  };

  // ── File upload → predict ────────────────────────────────────────────────
  const uploadAndPredict = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2-minute timeout for large files / slow cold starts
      });
      onPredictionResult(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. The backend may be starting up — please try again.');
      } else {
        setErrorMessage(detail || 'Error uploading file. Please check the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sample channel predict ───────────────────────────────────────────────
  const runSamplePredict = async (channelName) => {
    const target = channelName || selectedSample;
    if (!target) return;
    setIsLoading(true);
    setErrorMessage('');
    setSelectedSample(target);

    try {
      const response = await axios.post(`${API_BASE_URL}/sample/${target}`, null, {
        timeout: 120000,
      });
      onPredictionResult(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. The backend may be starting up — please try again.');
      } else {
        setErrorMessage(detail || `Error analysing sample channel ${target}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="glass-panel rounded-2xl p-6 border border-space-border relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-space-card border border-cyan-500/30 rounded-xl text-space-cyan shadow-cyan-glow">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">TELEMETRY DATA STREAM</h2>
            <p className="text-xs text-space-muted">
              Upload raw .npy channel or select SMAP/MSL benchmark dataset
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-space-green animate-pulse" />
          <span className="text-xs font-mono text-space-green font-semibold">CHANNEL DISPATCH READY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Dropzone ────────────────────────────────────────────────── */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 text-center flex flex-col items-center justify-center relative cursor-pointer min-h-[160px] ${
            dragActive
              ? 'border-space-cyan bg-space-cyan/10 scale-[1.01]'
              : selectedFile
              ? 'border-space-green bg-space-green/5'
              : 'border-space-border hover:border-space-cyan/50 hover:bg-space-card/50'
          }`}
        >
          <input
            type="file"
            accept=".npy"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />

          {isLoading ? (
            <div className="flex flex-col items-center space-y-2 z-0">
              <Loader2 className="w-10 h-10 text-space-cyan animate-spin" />
              <p className="text-sm font-semibold text-space-cyan font-mono">
                PROCESSING INFERENCE...
              </p>
              <p className="text-xs text-space-muted">XGBoost pipeline running anomaly scan</p>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center space-y-2 z-0">
              <CheckCircle2 className="w-10 h-10 text-space-green" />
              <p className="text-sm font-semibold text-white font-mono">{selectedFile.name}</p>
              <p className="text-xs text-space-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB • Telemetry Array
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); uploadAndPredict(); }}
                disabled={isLoading}
                className="mt-2 px-5 py-2 bg-gradient-to-r from-space-cyan to-space-blue text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:shadow-cyan-glow transition-all disabled:opacity-50"
              >
                Execute Anomaly Scan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 z-0">
              <FileCode className="w-10 h-10 text-space-cyan/70" />
              <p className="text-sm text-gray-200 font-medium">
                Drag &amp; Drop <span className="text-space-cyan font-mono font-bold">.npy</span> file here
              </p>
              <p className="text-xs text-space-muted">or click to browse local filesystem</p>
            </div>
          )}
        </div>

        {/* ── Sample Channel Quick Selector ───────────────────────────── */}
        <div className="bg-space-card/60 border border-space-border/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-space-cyan uppercase tracking-wider font-mono">
                NASA Benchmark Channels
              </span>
              <span className="text-[10px] text-space-muted bg-space-dark px-2 py-0.5 rounded border border-space-border">
                SMAP/MSL
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-3">
              Instant-load verified spacecraft telemetry channels from the test dataset:
            </p>

            {/* Quick-launch buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['T-1.npy', 'P-1.npy', 'A-1.npy', 'S-1.npy', 'E-1.npy', 'E-2.npy'].map((chan) => (
                <button
                  key={chan}
                  type="button"
                  onClick={() => runSamplePredict(chan)}
                  disabled={isLoading}
                  className={`py-2 px-2 text-xs font-mono rounded-lg border transition-all flex items-center justify-center space-x-1.5 ${
                    selectedSample === chan
                      ? 'border-space-cyan bg-space-cyan/15 text-space-cyan shadow-cyan-glow'
                      : 'border-space-border hover:border-space-cyan/40 bg-space-panel text-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>{chan.replace('.npy', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Full dropdown + run button */}
          <div className="flex items-center space-x-3 pt-2 border-t border-space-border/50">
            <select
              value={selectedSample}
              onChange={(e) => setSelectedSample(e.target.value)}
              className="bg-space-panel border border-space-border text-white text-xs font-mono rounded-lg px-3 py-2 flex-grow focus:outline-none focus:border-space-cyan"
            >
              {samples.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => runSamplePredict()}
              disabled={isLoading || !selectedSample}
              className="flex items-center space-x-1.5 px-4 py-2 bg-space-cyan text-space-dark font-bold text-xs uppercase tracking-wider rounded-lg hover:shadow-cyan-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isLoading ? 'Running...' : 'Run Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-space-red text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

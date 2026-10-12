import React from 'react';
import { AlertOctagon } from 'lucide-react';

/**
 * AnomalyTable — displays detected anomaly sequences in a sortable table.
 * Extracted from App.js for better maintainability.
 */
export default function AnomalyTable({ sequences }) {
  if (!sequences || sequences.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-space-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-space-red/10 border border-space-red/30 rounded-xl text-space-red">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              DETECTED ANOMALY SEQUENCES ({sequences.length})
            </h3>
            <p className="text-xs text-space-muted">
              Exact time-window intervals with anomalous telemetry behaviour
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-space-border text-space-muted bg-space-card/50">
              <th className="py-3 px-4">SEQUENCE #</th>
              <th className="py-3 px-4">START SAMPLE</th>
              <th className="py-3 px-4">END SAMPLE</th>
              <th className="py-3 px-4">DURATION</th>
              <th className="py-3 px-4">CONFIDENCE</th>
              <th className="py-3 px-4">SEVERITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-border/50 text-gray-200">
            {sequences.map((seq, idx) => {
              const duration = seq.end - seq.start;
              const isHigh = seq.confidence >= 0.85;

              return (
                <tr key={idx} className="hover:bg-space-card/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-space-cyan">
                    SEQ-{String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4">#{seq.start}</td>
                  <td className="py-3 px-4">#{seq.end}</td>
                  <td className="py-3 px-4">{duration} samples</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-space-dark rounded-full h-1.5 overflow-hidden border border-space-border">
                        <div
                          className={`h-full ${isHigh ? 'bg-space-red' : 'bg-space-amber'}`}
                          style={{ width: `${seq.confidence * 100}%` }}
                        />
                      </div>
                      <span>{(seq.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {isHigh ? (
                      <span className="px-2.5 py-1 rounded bg-space-red/15 text-space-red border border-space-red/40 font-bold text-[10px]">
                        HIGH ANOMALY
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-space-amber/15 text-space-amber border border-space-amber/40 font-bold text-[10px]">
                        MODERATE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { Loader2, Shield, AlertTriangle, AlertOctagon, CheckCircle, Server, Globe, Activity } from 'lucide-react';

interface IPDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: any | null;
  error: string | null;
  ipAddress?: string; // Optional prop to show IP while loading
}

const IPDetailsModal: React.FC<IPDetailsModalProps> = ({ isOpen, onClose, isLoading, data, error, ipAddress }) => {
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-lg shadow-2xl flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
          <h3 className="text-xl font-mono text-cyan-400">
            Analyzing {ipAddress || 'Theat Actor'}...
          </h3>
          <p className="text-slate-400 mt-2 text-sm">Querying Global Threat Intelligence Network</p>
        </div>
      </div>
    );
  }

  // Determine risk color
  const riskColor = data?.abuseConfidenceScore > 75 ? 'text-red-500' : 
                   data?.abuseConfidenceScore > 50 ? 'text-orange-500' : 'text-yellow-500';
  
  const riskBg = data?.abuseConfidenceScore > 75 ? 'bg-red-500/10 border-red-500/50' : 
                 data?.abuseConfidenceScore > 50 ? 'bg-orange-500/10 border-orange-500/50' : 'bg-yellow-500/10 border-yellow-500/50';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-500" />
            <h2 className="text-xl font-bold text-white font-mono tracking-wider">
              IP INTELLIGENCE REPORT
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error ? (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded text-red-200 flex items-center gap-3">
              <AlertOctagon className="w-5 h-5" />
              {error}
            </div>
          ) : data ? (
            <>
              {/* Primary Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-cyan-400">{data.ip}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{data.usageType || 'Unknown'}</span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                     <Globe className="w-4 h-4" /> {data.countryCode} - {data.isp}
                  </div>
                </div>
                
                {/* Risk Score */}
                <div className={`p-4 rounded-lg border flex flex-col items-center justify-center min-w-[120px] ${riskBg}`}>
                  <span className="text-xs uppercase font-bold tracking-widest opacity-80">Risk Score</span>
                  <span className={`text-3xl font-black ${riskColor}`}>{data.abuseConfidenceScore}%</span>
                </div>
              </div>

              {/* AI Analysis Block */}
              <div className="bg-cyan-950/30 border border-cyan-500/30 p-4 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="text-cyan-400 font-bold text-sm uppercase tracking-wider mb-2">AI Tactical Assessment</h4>
                    <p className="text-cyan-100/90 leading-relaxed font-mono text-sm">
                      {data.ai_summary || "Processing threat telemetry..."}
                    </p>
                  </div>
                </div>
                { data.simulation_mode && (
                   <div className="absolute top-2 right-2 text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700">
                     SIMULATION
                   </div>
                )}
              </div>

              {/* Technical Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                   <span className="text-slate-500 block text-xs uppercase mb-1">Total Reports</span>
                   <span className="text-white font-mono">{data.totalReports}</span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                   <span className="text-slate-500 block text-xs uppercase mb-1">Distinct Users</span>
                   <span className="text-white font-mono">{data.numDistinctUsers}</span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                   <span className="text-slate-500 block text-xs uppercase mb-1">Last Reported</span>
                   <span className="text-white font-mono">{new Date(data.lastReportedAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                   <span className="text-slate-500 block text-xs uppercase mb-1">Domain</span>
                   <span className="text-white font-mono truncate">{data.domain || 'N/A'}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default IPDetailsModal;

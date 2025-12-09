import React, { useState, useEffect } from 'react';
import { Terminal, Sparkles, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface BriefingData {
  summary: string;
  points: string[];
  risk_level: string;
  is_simulation?: boolean;
}

const BriefingCard: React.FC = () => {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/briefing');
      const data = await response.json();
      if (response.ok) {
        setBriefing(data);
      } else {
        setError('Failed to load briefing');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (error) return null; // Hide if error to avoid clutter

  const riskColor = briefing?.risk_level === 'Critical' ? 'text-red-400' :
                    briefing?.risk_level === 'High' ? 'text-orange-400' :
                    briefing?.risk_level === 'Medium' ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Terminal size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono uppercase tracking-wider">
              Daily Threat Intelligence
            </h3>
            {briefing?.is_simulation && (
               <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">SIMULATION</span>
            )}
          </div>
          
          <button 
             onClick={fetchBriefing} 
             disabled={loading}
             className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
             title="Refresh Briefing"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
           <div className="space-y-2 animate-pulse">
             <div className="h-4 bg-slate-800 rounded w-3/4"></div>
             <div className="h-4 bg-slate-800 rounded w-1/2"></div>
           </div>
        ) : briefing ? (
          <div className="space-y-4">
             <div className="flex items-start gap-4 p-3 bg-slate-800/40 rounded border border-slate-700/50">
                <div className="shrink-0 pt-1">
                   {briefing.risk_level === 'Critical' || briefing.risk_level === 'High' ? 
                     <AlertTriangle className={`w-6 h-6 ${riskColor}`} /> : 
                     <ShieldCheck className={`w-6 h-6 ${riskColor}`} />
                   }
                </div>
                <div>
                   <p className="text-slate-300 text-sm leading-relaxed font-medium">
                     {briefing.summary}
                   </p>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                {briefing.points.map((point, i) => (
                  <div key={i} className="bg-slate-950/30 p-3 rounded border-l-2 border-cyan-500/30 pl-4 hover:bg-slate-900/50 transition-colors">
                    <p className="text-cyan-100/80 text-sm font-mono leading-relaxed">
                      {`> ${point}`}
                    </p>
                  </div>
                ))}
             </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BriefingCard;

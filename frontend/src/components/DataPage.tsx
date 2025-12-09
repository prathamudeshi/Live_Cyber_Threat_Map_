import React, { useState, useEffect, useRef } from 'react';
import { Download, Shield, Globe, FileText, AlertTriangle } from 'lucide-react';
import { Attack, MaliciousIP, AttackSeverity } from '../types';
import { fetchMaliciousIPsWithRetry } from '../data/maliciousIPs';
import { useStream } from '../context/StreamContext';
import IPDetailsModal from './IPDetailsModal'; // New Import

// Define News interface locally as it's not in types/index.ts
interface NewsItem {
  title: string;
  link: string;
  timestamp: string;
}

const DataPage = () => {
  const { isStreamPaused } = useStream();
  const [activeTab, setActiveTab] = useState<'threats' | 'news' | 'ips'>('threats');
  const [threats, setThreats] = useState<Attack[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [ips, setIps] = useState<MaliciousIP[]>([]);
  const [loading, setLoading] = useState(true);

  // IP Analysis State
  const [showIPModal, setShowIPModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleIPClick = async (ip: MaliciousIP) => {
    setShowIPModal(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisData(null);

    setAnalysisData({
       ip: ip.ip,
       countryCode: ip.country_code || 'UNK',
       usageType: "Scanning...", 
       abuseConfidenceScore: 0
    });

    try {
      const response = await fetch('http://localhost:5000/api/analyze-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip.ip })
      });
      
      const data = await response.json();
      if (response.ok) {
        setAnalysisData(data);
      } else {
        setAnalysisError(data.error || "Analysis failed");
      }
    } catch (err) {
      setAnalysisError("Failed to connect to intelligence server");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fetch News
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('http://localhost:5000/news');
        const data = await response.json();
        setNews(data);
      } catch (error) {
        console.error('Error fetching news:', error);
      }
    };
    fetchNews();
  }, []);

  // Fetch Malicious IPs
  useEffect(() => {
    const fetchIPs = async () => {
      try {
        const data = await fetchMaliciousIPsWithRetry();
        setIps(data);
      } catch (error) {
        console.error('Error fetching IPs:', error);
      }
    };
    fetchIPs();
  }, []);

  // Fetch Threats (using SSE similar to App.tsx but accumulating for list)
  useEffect(() => {
    if (isStreamPaused) return;

    const eventSource = new EventSource('http://localhost:5000/threats');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data) && data.length > 0) {
            // Map backend format to frontend Attack interface if needed
            // Assuming backend sends data matching the structure or we need to adapt
            // Based on server.py, it sends a list of dicts. 
            // We need to map it to Attack interface.
            const newThreats = data.map((item: any) => ({
                id: Math.random().toString(36).substr(2, 9), // Generate temp ID
                source: {
                    name: item['Source Country Name'] || 'Unknown',
                    code: item['Source Country Code'] || 'UNK',
                    latitude: item['Source Latitude'] || 0,
                    longitude: item['Source Longitude'] || 0
                },
                target: {
                    name: item['Destination Country Name'] || 'Unknown',
                    code: item['Destination Country Code'] || 'UNK',
                    latitude: item['Destination Latitude'] || 0,
                    longitude: item['Destination Longitude'] || 0
                },
                type: item['Attack Types'] || [],
                severity: AttackSeverity.MEDIUM, // Defaulting as server doesn't seem to send severity explicitly in the mapped dict
                timestamp: new Date(item['Timestamp'])
            }));
            
            setThreats(prev => [...newThreats, ...prev].slice(0, 1000)); // Keep last 1000
        }
      } catch (error) {
        console.error('Error parsing threat data:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isStreamPaused]);

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
            const value = row[header];
            if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';'); // Simple escape
            return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to flatten objects for CSV
  const flattenThreats = (threats: Attack[]) => {
      return threats.map(t => ({
          Source: t.source.name,
          Target: t.target.name,
          Types: t.type.join('; '),
          Severity: t.severity,
          Timestamp: t.timestamp.toISOString()
      }));
  };

  const flattenIPs = (ips: MaliciousIP[]) => {
      return ips.map(ip => ({
          IP: ip.ip,
          Latitude: ip.latitude,
          Longitude: ip.longitude,
          Severity: ip.severity,
          Timestamp: ip.timestamp ? new Date(ip.timestamp).toISOString() : ''
      }));
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <DatabaseIcon className="h-8 w-8 text-blue-500" />
            Data Intelligence
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('threats')}
            className={`pb-3 px-4 flex items-center gap-2 transition-colors ${
              activeTab === 'threats' 
                ? 'border-b-2 border-blue-500 text-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={20} />
            Threat Data
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`pb-3 px-4 flex items-center gap-2 transition-colors ${
              activeTab === 'news' 
                ? 'border-b-2 border-blue-500 text-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={20} />
            Global News
          </button>
          <button
            onClick={() => setActiveTab('ips')}
            className={`pb-3 px-4 flex items-center gap-2 transition-colors ${
              activeTab === 'ips' 
                ? 'border-b-2 border-blue-500 text-blue-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={20} />
            Malicious IPs
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 p-6">
          
          {/* Controls */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                  if (activeTab === 'threats') downloadCSV(flattenThreats(threats), 'threat_data.csv');
                  else if (activeTab === 'news') downloadCSV(news, 'news_data.csv');
                  else if (activeTab === 'ips') downloadCSV(flattenIPs(ips), 'malicious_ips.csv');
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Download size={18} />
              Download CSV
            </button>
          </div>

          {/* Table/List */}
          <div className="overflow-x-auto">
            {activeTab === 'threats' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="p-3">Source</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {threats.map((t, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="p-3">{t.source.name}</td>
                      <td className="p-3">{t.target.name}</td>
                      <td className="p-3">{t.type.join(', ')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          t.severity === 'Critical' ? 'bg-red-900 text-red-200' :
                          t.severity === 'High' ? 'bg-orange-900 text-orange-200' :
                          'bg-blue-900 text-blue-200'
                        }`}>
                          {t.severity}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">{t.timestamp.toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {threats.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Waiting for live threat data...</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'news' && (
              <div className="space-y-4">
                {news.map((n, i) => (
                  <div key={i} className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg text-blue-300 mb-1">
                            <a href={n.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {n.title}
                            </a>
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {new Date(n.timestamp).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{n.link}</p>
                  </div>
                ))}
                {news.length === 0 && <div className="p-8 text-center text-gray-500">Loading news...</div>}
              </div>
            )}

            {activeTab === 'ips' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {ips.map((ip, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td 
                        className="p-3 font-mono text-blue-300 cursor-pointer hover:bg-blue-900/40 hover:text-blue-200 transition-colors rounded"
                        onClick={() => handleIPClick(ip)}
                        title="Analyze this IP"
                      >
                        {ip.ip}
                      </td>
                      <td className="p-3">
                        {ip.latitude != null && ip.longitude != null 
                          ? `${ip.latitude.toFixed(2)}, ${ip.longitude.toFixed(2)}` 
                          : 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          ip.severity === 'Critical' ? 'bg-red-900 text-red-200' :
                          ip.severity === 'High' ? 'bg-orange-900 text-orange-200' :
                          'bg-yellow-900 text-yellow-200'
                        }`}>
                          {ip.severity}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {ip.timestamp ? new Date(ip.timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {ips.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading malicious IPs...</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <IPDetailsModal 
        isOpen={showIPModal}
        onClose={() => setShowIPModal(false)}
        isLoading={isAnalyzing}
        data={analysisData}
        error={analysisError}
        ipAddress={analysisData?.ip}
      />
    </div>
  );
};

// Simple icon component for the header
const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export default DataPage;

import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Shield, Target, Activity, ArrowLeft } from 'lucide-react';
import { countries } from '../data/countries';
import { Country, Attack, AttackSeverity } from '../types';
import { useStream } from '../context/StreamContext';

const CountryAnalytics = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [threats, setThreats] = useState<Attack[]>([]);
  const { isStreamPaused } = useStream();

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    return countries.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Listen to threat stream for live stats
  useEffect(() => {
    if (isStreamPaused) return;

    const eventSource = new EventSource('http://localhost:5000/threats');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data) && data.length > 0) {
            const newThreats = data.map((item: any) => ({
                id: Math.random().toString(36).substr(2, 9),
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
                severity: AttackSeverity.MEDIUM,
                timestamp: new Date(item['Timestamp'])
            }));
            
            // Keep last 5000 threats for analytics
            setThreats(prev => [...prev, ...newThreats].slice(-5000));
        }
      } catch (error) {
        console.error('Error parsing threat data:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isStreamPaused]);

  // Calculate stats for selected country
  const stats = useMemo(() => {
    if (!selectedCountry) return null;

    const countryThreats = threats.filter(t => 
      t.source.code === selectedCountry.code || t.target.code === selectedCountry.code
    );

    const outgoing = countryThreats.filter(t => t.source.code === selectedCountry.code);
    const incoming = countryThreats.filter(t => t.target.code === selectedCountry.code);

    return {
      total: countryThreats.length,
      outgoing: outgoing.length,
      incoming: incoming.length,
      recentAttacks: countryThreats.slice(-10).reverse()
    };
  }, [selectedCountry, threats]);

  if (selectedCountry) {
    return (
      <div className="min-h-screen bg-[#111827] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => setSelectedCountry(null)}
            className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back to Country List
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Header Card */}
            <div className="lg:col-span-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">{getFlagEmoji(selectedCountry.code)}</span>
                  {selectedCountry.name}
                </h1>
                <div className="flex gap-4 text-gray-400 mt-2">
                  <span className="flex items-center gap-1"><MapPin size={16}/> {selectedCountry.latitude.toFixed(2)}, {selectedCountry.longitude.toFixed(2)}</span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-sm font-mono">{selectedCountry.code}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Live Activity (Session)</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.total || 0} Events</div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                  <Target size={20} /> Incoming Attacks
                </h3>
              </div>
              <div className="text-4xl font-bold mb-2">{stats?.incoming || 0}</div>
              <p className="text-sm text-gray-400">Targeted by other nations</p>
            </div>

            <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <Shield size={20} /> Outgoing Attacks
                </h3>
              </div>
              <div className="text-4xl font-bold mb-2">{stats?.outgoing || 0}</div>
              <p className="text-sm text-gray-400">Originating from this country</p>
            </div>

            <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                  <Activity size={20} /> Net Threat Level
                </h3>
              </div>
              <div className="text-4xl font-bold mb-2">
                {((stats?.outgoing || 0) > (stats?.incoming || 0)) ? 'Aggressor' : 'Victim'}
              </div>
              <p className="text-sm text-gray-400">Based on current flow</p>
            </div>

            {/* Recent Activity List */}
            <div className="lg:col-span-3 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="p-3">Time</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Direction</th>
                      <th className="p-3">Counterpart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentAttacks.map((attack, i) => {
                      const isIncoming = attack.target.code === selectedCountry.code;
                      return (
                        <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="p-3 text-gray-400">{attack.timestamp.toLocaleTimeString()}</td>
                          <td className="p-3">{attack.type.join(', ')}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${isIncoming ? 'bg-red-900/50 text-red-200' : 'bg-orange-900/50 text-orange-200'}`}>
                              {isIncoming ? 'INCOMING' : 'OUTGOING'}
                            </span>
                          </td>
                          <td className="p-3">
                            {isIncoming ? attack.source.name : attack.target.name}
                          </td>
                        </tr>
                      );
                    })}
                    {(!stats?.recentAttacks || stats.recentAttacks.length === 0) && (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">No recent activity recorded in this session.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <GlobeIcon className="h-8 w-8 text-blue-500" />
            Country Analytics
          </h2>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCountries.map((country) => (
            <div 
              key={country.code}
              onClick={() => setSelectedCountry(country)}
              className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-all hover:scale-105 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-4xl">{getFlagEmoji(country.code)}</span>
                <span className="px-2 py-1 bg-gray-900 rounded text-xs font-mono text-gray-400 group-hover:text-blue-400 transition-colors">
                  {country.code}
                </span>
              </div>
              <h3 className="font-bold text-lg truncate">{country.name}</h3>
              <div className="text-sm text-gray-500 mt-1">
                {country.latitude.toFixed(1)}, {country.longitude.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper to get flag emoji from country code
const getFlagEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const GlobeIcon = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default CountryAnalytics;

import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import WorldMap from "./WorldMap";
import Controls from "./Controls";
import IPDetailsModal from "./IPDetailsModal";
import BriefingCard from "./BriefingCard"; // Import Modal
import { generateReport } from "../utils/reportGenerator";
import {
  Attack,
  AttackType,
  AttackSeverity,
  Country,
  MaliciousIP,
} from "../types";
import {
  fetchMaliciousIPsWithRetry,
} from "../data/maliciousIPs";
import useDebounce from "../hooks/useDebounce";
import { useStream } from "../context/StreamContext";
import { FileDown } from "lucide-react";

// Lazy load components
const Stats = lazy(() => import("./Stats"));
const News = lazy(() => import("./news"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-700 rounded"></div>
    </div>
  </div>
);

function Dashboard() {
  const [maliciousIPs, setMaliciousIPs] = useState<MaliciousIP[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<Country | null>(null);
  const [selectedSeverities, setSelectedSeverities] = useState<
    AttackSeverity[]
  >([
    AttackSeverity.LOW,
    AttackSeverity.MEDIUM,
    AttackSeverity.HIGH,
    AttackSeverity.CRITICAL,
  ]);
  const [attackDetails, setAttackDetails] = useState<Attack[]>([]); // Only for display in attack details panel
  const [currentAttacks, setCurrentAttacks] = useState<Attack[]>([]); // Current attacks being rendered on map

  // IP Analysis State
  const [showIPModal, setShowIPModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const threatWorkerRef = useRef<Worker | null>(null);
  const { isStreamPaused } = useStream();

  const handleIPClick = async (ip: MaliciousIP) => {
    setShowIPModal(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisData(null);

    // Prepare data for the modal (basic info first)
    setAnalysisData({
       ip: ip.ip,
       countryCode: ip.country_code,
       // Temporary placeholder while loading
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

  // Handle threat data from Web Worker
  useEffect(() => {
    if (isStreamPaused) {
      if (threatWorkerRef.current) {
        threatWorkerRef.current.postMessage({ type: "STOP_SSE" });
      }
      return;
    }

    if (!threatWorkerRef.current) {
      threatWorkerRef.current = new Worker(
        new URL("../workers/threatWorker.ts", import.meta.url),
        { type: "module" }
      );

      threatWorkerRef.current.onmessage = (event) => {
        if (event.data.type === "THREATS") {
          const threats = event.data.data;
          // Apply filters to threats
          const validThreats = threats.filter(
            (attack: Attack) =>
              selectedSeverities.includes(attack.severity) &&
              attack.source.code !== "UNK" &&
              attack.target.code !== "UNK" &&
              attack.source.latitude !== 0 &&
              attack.source.longitude !== 0 &&
              attack.target.latitude !== 0 &&
              attack.target.longitude !== 0
          );

          // Add threats in batch and limit the number of active attacks to prevent performance issues
          if (validThreats.length > 0) {
            setCurrentAttacks((prevAttacks) => {
              const updated = [...prevAttacks, ...validThreats];
              // Keep only the last 30 attacks on the map to prevent DOM overload
              return updated.slice(-30);
            });
            
            setAttackDetails((prev) => {
              const updated = [...prev, ...validThreats];
              // Keep only the last 500 attacks in history for stats
              return updated.slice(-500);
            });
          }
        } else if (event.data.type === "ERROR") {
          console.error("Threat Worker Error:", event.data.error);
        }
      };
    }

    // Start SSE connection
    threatWorkerRef.current.postMessage({ type: "START_SSE" });

    return () => {
      if (threatWorkerRef.current) {
        threatWorkerRef.current.postMessage({ type: "STOP_SSE" });
        // Don't terminate here to allow resuming, or manage termination better
        // For now, we keep it simple: stop SSE on pause/unmount
      }
    };
  }, [selectedSeverities, isStreamPaused]);

  // Handle malicious IPs with GET request
  useEffect(() => {
    const fetchIPs = async () => {
      try {
        const ips = await fetchMaliciousIPsWithRetry();
        setMaliciousIPs(ips);
      } catch (error) {
        console.error("Error fetching malicious IPs:", error);
      }
    };

    fetchIPs();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [rawDimensions, setRawDimensions] = useState({
    width: 800,
    height: 600,
  });
  const debouncedDimensions = useDebounce(rawDimensions, 250); // 250ms delay

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setRawDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Update final dimensions when debounced value changes
  useEffect(() => {
    setDimensions(debouncedDimensions);
  }, [debouncedDimensions]);

  const handleExport = async () => {
    let briefing = null;
    try {
        const res = await fetch('http://localhost:5000/api/briefing');
        if(res.ok) briefing = await res.json();
    } catch(e) {}
    
    generateReport(attackDetails, maliciousIPs, briefing);
  };

  return (
    <div className="w-full px-4 min-h-screen bg-[#111827] pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left sidebar */}
        <div className="lg:col-span-2 space-y-4 mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <Stats attacks={attackDetails} />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <News />
          </Suspense>

          {hoveredCountry && (
            <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
              <h3 className="font-medium mb-2">{hoveredCountry.name}</h3>
              <div className="text-sm text-gray-400">
                <p>Lat: {hoveredCountry.latitude.toFixed(2)}</p>
                <p>Long: {hoveredCountry.longitude.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main map area */}
        <div
          ref={containerRef}
          className="lg:col-span-7 bg-[#111827] rounded-lg overflow-hidden relative"
          style={{ height: "85vh", minHeight: "85vh" }}
        >
          <WorldMap
            width={dimensions.width}
            height={dimensions.height}
            onCountryHover={setHoveredCountry}
            onIPClick={handleIPClick}
            maliciousIPs={maliciousIPs}
            attacks={currentAttacks}
          />
        </div>

        <div className="lg:col-span-3 space-y-4 mt-4">
          {/* Recent attacks list */}
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <h3 className="font-bold mb-3">Attack Details</h3>
            <div className="space-y-2 h-800 overflow-y-auto">
              {attackDetails
                .slice(-10)
                .reverse()
                .map((attack) => (
                  <div
                    key={attack.id}
                    className="p-2 bg-gray-700 bg-opacity-50 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="font-medium truncate max-w-[400px]"
                        title={`${attack.source.name} → ${attack.target.name}`}
                      >
                        {attack.source.name} → {attack.target.name}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          attack.severity === AttackSeverity.CRITICAL
                            ? "bg-red-900 text-red-200"
                            : attack.severity === AttackSeverity.HIGH
                            ? "bg-orange-900 text-orange-200"
                            : attack.severity === AttackSeverity.MEDIUM
                            ? "bg-yellow-900 text-yellow-200"
                            : attack.severity === AttackSeverity.LOW
                            ? "bg-blue-900 text-blue-200"
                            : "bg-purple-900 text-purple-200"
                        }`}
                      >
                        {attack.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between mt-1">
                      <span
                        className="truncate max-w-[200px]"
                        title={attack.type.join(", ")}
                      >
                        {attack.type.join(", ")}
                      </span>
                      <span className="flex-shrink-0">
                        {new Date(attack.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
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
      <div className="flex justify-between items-center mt-6 mb-2">
         <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 uppercase">Live Intelligence Feed</h1>
         <button onClick={handleExport} className="flex gap-2 items-center bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white font-bold transition-all shadow-lg shadow-cyan-900/20 active:scale-95">
             <FileDown size={18} /> Export Executive Report
         </button>
      </div>
      <div className="mt-2">
        <BriefingCard />
      </div>
    </div>
  );
}

export default Dashboard;

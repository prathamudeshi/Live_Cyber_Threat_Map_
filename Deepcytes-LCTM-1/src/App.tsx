import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Shield, AlertCircle } from "lucide-react";
import WorldMap from "./components/WorldMap";
import LogoDC from "./Image/logo_DC.png";
import Controls from "./components/Controls";
import {
  Attack,
  AttackType,
  AttackSeverity,
  Country,
  MaliciousIP,
} from "./types";
import {
  generateRandomMaliciousIP,
  generateInitialMaliciousIPs,
  fetchMaliciousIPsWithRetry,
} from "./data/maliciousIPs";
import useDebounce from "./hooks/useDebounce";

// Lazy load components
const AttackInfo = lazy(() => import("./components/AttackInfo"));
const Stats = lazy(() => import("./components/Stats"));
const News = lazy(() => import("./components/news"));

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

function App() {
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

  const maliciousIPSSERef = useRef<EventSource | null>(null);
  const threatWorkerRef = useRef<Worker | null>(null);

  // Handle threat data from Web Worker
  useEffect(() => {
    threatWorkerRef.current = new Worker(
      new URL("./workers/threatWorker.ts", import.meta.url),
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

        // Add each threat with a delay
        validThreats.forEach((threat: Attack, index: number) => {
          setTimeout(() => {
            setCurrentAttacks((prevAttacks) => [...prevAttacks, threat]);
            setAttackDetails((prev) => [...prev, threat]);
          }, index * 200);
        });
      } else if (event.data.type === "ERROR") {
        console.error("Threat Worker Error:", event.data.error);
      }
    };

    // Start SSE connection
    threatWorkerRef.current.postMessage({ type: "START_SSE" });

    return () => {
      if (threatWorkerRef.current) {
        threatWorkerRef.current.postMessage({ type: "STOP_SSE" });
        threatWorkerRef.current.terminate();
      }
    };
  }, [selectedSeverities]);

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

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Header */}
      <header className="bg-[#000129] py-4 border-b border-gray-700 h-14">
        <div className="w-full px-4 relative h-full flex items-center justify-between">
          {/* <div className="flex items-center">
            <img src={LogoDC} alt="Cyber Shield" className="h-13 w-14" />
          </div> */}
          <h1 className="text-3xl font-bold absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white">
            Live Cyber Threat Map
          </h1>
        </div>
      </header>

      <main className="w-full px-4">
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
      </main>
    </div>
  );
}

export default App;

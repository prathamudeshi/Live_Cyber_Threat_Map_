import React, { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { Country, MaliciousIP, Attack } from "../types";
import { countries } from "../data/countries";
import AttackVector from "./AttackVector";

interface WorldMapProps {
  width: number;
  height: number;
  onCountryHover?: (country: Country | null) => void;
  onIPClick?: (ip: MaliciousIP) => void; // New prop
  maliciousIPs: MaliciousIP[];
  attacks: Attack[];
}

const WorldMap: React.FC<WorldMapProps> = ({
  width,
  height,
  onCountryHover,
  onIPClick, // Destructure
  maliciousIPs,
  attacks,
}) => {
  const handleCountryHover = React.useCallback((geo: any) => {
    if (geo) {
      const country = countries.find((c) => c.code === geo.properties.iso_a2);
      onCountryHover?.(country || null);
    } else {
      onCountryHover?.(null);
    }
  }, [onCountryHover]);

  // Memoize the geography data to prevent unnecessary re-renders
  const geographyUrl = useMemo(
    () => "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    []
  );

  const mapLayer = useMemo(() => (
    <Geographies geography={geographyUrl}>
      {({ geographies }) =>
        geographies
          .filter((geo: any) => geo.properties.name !== "Antarctica")
          .map((geo: any) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              onMouseEnter={() => handleCountryHover(geo)}
              onMouseLeave={() => handleCountryHover(null)}
              style={{
                default: {
                  fill: "#1E293B",
                  stroke: "#334155",
                  strokeWidth: 0.75,
                  outline: "none",
                  transition: "all 250ms",
                },
                hover: {
                  fill: "#2D3B4F",
                  stroke: "#475569",
                  strokeWidth: 1,
                  outline: "none",
                  cursor: "pointer",
                },
                pressed: {
                  fill: "#334155",
                  stroke: "#64748B",
                  strokeWidth: 1,
                  outline: "none",
                },
              }}
              clipPath="url(#map-clip)"
            />
          ))
      }
    </Geographies>
  ), [geographyUrl, handleCountryHover]);

  return (
    <div className="relative w-full h-full bg-[#111827] rounded-lg overflow-hidden top-16">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: width / 2.01 / Math.PI,
          center: [0, 30],
        }}
        width={width}
        height={height}
        style={{
          backgroundColor: "#111827",
        }}
      >
        <ZoomableGroup>
          {/* Clipping mask for the visible area */}
          <defs>
            <clipPath id="map-clip">
              <rect width={width} height={height} />
            </clipPath>
          </defs>

          {mapLayer}

          {/* Attack Vectors with visibility optimization */}
          <g clipPath="url(#map-clip)">
            {attacks.map((attack) => (
              <AttackVector key={attack.id} attack={attack} />
            ))}
          </g>

          {/* Malicious IP Markers with visibility optimization */}
          <g clipPath="url(#map-clip)">
            {maliciousIPs.map((ip, index) => (
              <Marker
                key={`${ip.latitude}-${ip.longitude}-${index}`}
                coordinates={[ip.longitude, ip.latitude]}
                onClick={() => onIPClick?.(ip)} // Added click handler
                style={{ cursor: "pointer" }} // Change cursor
              >
                <circle
                  r={1.7}
                  fill="#EF4444"
                  style={{
                    transition: "all 250ms",
                  }}
                />
              </Marker>
            ))}
          </g>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default WorldMap;

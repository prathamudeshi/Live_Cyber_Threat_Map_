import { Attack, AttackType, AttackSeverity, Country } from "../types";

// Interface for the raw SSE data
interface RawSSEThreat {
  "Source Country Code": string;
  "Source Country Name": string;
  "Source Latitude": number | null;
  "Source Longitude": number | null;
  "Destination Country Code": string;
  "Destination Country Name": string;
  "Destination Latitude": number | null;
  "Destination Longitude": number | null;
  "Attack Count": number;
  "Attack Types": string[];
  "Severity": string;
  Timestamp: string;
}

// Convert raw SSE data to our Attack type
const convertSSEToAttack = (rawThreat: RawSSEThreat): Attack => {
  // Helper function to map severity string to enum
  const mapSeverity = (severity: string): AttackSeverity => {
    if (!severity) return AttackSeverity.UNKNOWN;
    const s = severity.toLowerCase();
    if (s === "critical") return AttackSeverity.CRITICAL;
    if (s === "high") return AttackSeverity.HIGH;
    if (s === "medium") return AttackSeverity.MEDIUM;
    if (s === "low") return AttackSeverity.LOW;
    return AttackSeverity.UNKNOWN;
  };

  // Create source country object
  const source: Country = {
    code: rawThreat["Source Country Code"] || "UNK",
    name: rawThreat["Source Country Name"] || "Unknown",
    latitude: rawThreat["Source Latitude"] || 0,
    longitude: rawThreat["Source Longitude"] || 0,
  };

  // Create target country object
  const target: Country = {
    code: rawThreat["Destination Country Code"] || "UNK",
    name: rawThreat["Destination Country Name"] || "Unknown",
    latitude: rawThreat["Destination Latitude"] || 0,
    longitude: rawThreat["Destination Longitude"] || 0,
  };

  return {
    id: crypto.randomUUID(),
    source,
    target,
    type: rawThreat["Attack Types"] as AttackType[],
    severity: mapSeverity(rawThreat["Severity"]),
    timestamp: new Date(rawThreat["Timestamp"]),
  };
};

// Handle messages from the main thread
self.onmessage = (event: MessageEvent) => {
  if (event.data.type === "START_SSE") {
    const eventSource = new EventSource("http://localhost:5000/threats");

    eventSource.onmessage = (event) => {
      try {
        const data = event.data;
        if (data === "[]") {
          self.postMessage({ type: "THREATS", data: [] });
          return;
        }

        const rawThreats: RawSSEThreat[] = JSON.parse(data);
        const threats = rawThreats.map(convertSSEToAttack);
        self.postMessage({ type: "THREATS", data: threats });
      } catch (error) {
        self.postMessage({ type: "ERROR", error: "Error parsing SSE data" });
      }
    };

    eventSource.onerror = (error) => {
      self.postMessage({ type: "ERROR", error: "SSE Error" });
      eventSource.close();
    };

    // Store the EventSource instance
    (self as any).eventSource = eventSource;
  } else if (event.data.type === "STOP_SSE") {
    const eventSource = (self as any).eventSource;
    if (eventSource) {
      eventSource.close();
    }
  }
};

import { Attack, AttackType, AttackSeverity, Country } from "../types";
import { v4 as uuidv4 } from "uuid";

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
  Timestamp: string;
}

// Convert raw SSE data to our Attack type
const convertSSEToAttack = (rawThreat: RawSSEThreat): Attack => {
  // Helper function to map severity string to enum
  const mapSeverity = (severity: string): AttackSeverity => {
    const severityMap: { [key: string]: AttackSeverity } = {
      "1": AttackSeverity.LOW,
      "2": AttackSeverity.LOW,
      "3": AttackSeverity.MEDIUM,
      "4": AttackSeverity.HIGH,
      "5": AttackSeverity.CRITICAL,
    };
    return severityMap[severity] || AttackSeverity.UNKNOWN;
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

  // For each attack type in the array, create a separate attack
  return {
    id: uuidv4(),
    source,
    target,
    type: rawThreat["Attack Types"] as AttackType[], // Use all attack types from the array
    severity: mapSeverity(rawThreat["Attack Count"]?.toString() || "0"), // Map severity from attack count
    timestamp: new Date(rawThreat["Timestamp"]),
  };
};

// Function to start SSE connection
export const startThreatSSEConnection = (
  onThreat: (threats: Attack[]) => void,
  onError: (error: Event) => void
): EventSource => {
  const eventSource = new EventSource("http://localhost:5000/threats");

  eventSource.onmessage = (event) => {
    try {
      const data = event.data;
      if (data === "[]") {
        onThreat([]);
        return;
      }

      const rawThreats: RawSSEThreat[] = JSON.parse(data);
      const threats = rawThreats.map(convertSSEToAttack);
      onThreat(threats);
    } catch (error) {
      console.error("Error parsing SSE data:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE Error:", error);
    onError(error);
    eventSource.close();
  };

  return eventSource;
};

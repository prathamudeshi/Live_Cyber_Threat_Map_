import { Attack, AttackType, AttackSeverity, Country } from "../types";
import { v4 as uuidv4 } from "uuid";

// Interface for the raw SSE data
interface RawSSEAttack {
  source: string;
  data: {
    "Attack Count": number | null;
    "Attack Name": string;
    "Attack Type": string;
    "Destination Country Code": string;
    "Destination Country Name": string;
    "Destination Latitude": number;
    "Destination Longitude": number;
    "Destination Severity": string;
    "Source Country Code": string | null;
    "Source Country Name": string | null;
    "Source Latitude": number | null;
    "Source Longitude": number | null;
    "Source Severity": string | null;
    Timestamp: string;
  };
}

// Convert raw SSE data to our Attack type
const convertSSEToAttack = (rawAttack: RawSSEAttack): Attack => {
  // Helper function to map severity string to enum
  const mapSeverity = (severity: string): AttackSeverity => {
    const severityMap: { [key: string]: AttackSeverity } = {
      "1": AttackSeverity.LOW,
      "2": AttackSeverity.LOW,
      "3": AttackSeverity.MEDIUM,
      "4": AttackSeverity.HIGH,
      "5": AttackSeverity.CRITICAL,
    };
    return severityMap[severity] || AttackSeverity.LOW;
  };

  // Helper function to map attack type string to enum
  const mapAttackType = (type: string): AttackType => {
    const typeMap: { [key: string]: AttackType } = {
      abuse_tracker: AttackType.MALWARE,
      spam_tracker: AttackType.PHISHING,
      botnet_tracker: AttackType.DDOS,
      default: AttackType.MALWARE,
    };
    return typeMap[type] || AttackType.MALWARE;
  };

  // Create source country object
  const source: Country = {
    code: rawAttack.data["Source Country Code"] || "UNK",
    name: rawAttack.data["Source Country Name"] || "Unknown",
    latitude: rawAttack.data["Source Latitude"] || 0,
    longitude: rawAttack.data["Source Longitude"] || 0,
  };

  // Create target country object
  const target: Country = {
    code: rawAttack.data["Destination Country Code"] || "UNK",
    name: rawAttack.data["Destination Country Name"] || "Unknown",
    latitude: rawAttack.data["Destination Latitude"] || 0,
    longitude: rawAttack.data["Destination Longitude"] || 0,
  };

  return {
    id: uuidv4(),
    source,
    target,
    type: mapAttackType(rawAttack.data["Attack Type"]),
    severity: mapSeverity(rawAttack.data["Destination Severity"]),
    timestamp: new Date(rawAttack.data["Timestamp"]),
  };
};

// Function to start SSE connection
export const startSSEConnection = (
  onAttack: (attack: Attack) => void,
  onError: (error: Event) => void
): EventSource => {
  const eventSource = new EventSource("http://localhost:8000/threat-data");

  eventSource.onmessage = (event) => {
    try {
      const rawAttack: RawSSEAttack = JSON.parse(event.data);
      const attack = convertSSEToAttack(rawAttack);
      onAttack(attack);
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

// Function to stop SSE connection
export const stopSSEConnection = (eventSource: EventSource): void => {
  if (eventSource) {
    eventSource.close();
  }
};

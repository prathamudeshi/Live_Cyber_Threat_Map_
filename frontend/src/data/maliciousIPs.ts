import { v4 as uuidv4 } from "uuid";
import { MaliciousIP, AttackSeverity } from "../types";

// Generate a random IP address
const generateRandomIP = (): string => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(
    "."
  );
};

// Generate a random timestamp within the last 24 hours
const getRandomTimestamp = (): Date => {
  const now = new Date();
  const pastHours = Math.floor(Math.random() * 24);
  const pastMinutes = Math.floor(Math.random() * 60);
  const pastSeconds = Math.floor(Math.random() * 60);

  return new Date(
    now.getTime() -
      pastHours * 60 * 60 * 1000 -
      pastMinutes * 60 * 1000 -
      pastSeconds * 1000
  );
};

// Generate random coordinates within reasonable bounds
const generateRandomCoordinates = () => {
  return {
    latitude: Math.random() * 180 - 90, // -90 to 90
    longitude: Math.random() * 360 - 180, // -180 to 180
  };
};

// Generate a random severity
const getRandomSeverity = (): AttackSeverity => {
  const severities = Object.values(AttackSeverity);
  return severities[Math.floor(Math.random() * severities.length)];
};

// Generate a single random malicious IP
export const generateRandomMaliciousIP = (): MaliciousIP => {
  const { latitude, longitude } = generateRandomCoordinates();

  return {
    id: uuidv4(),
    ip: generateRandomIP(),
    latitude,
    longitude,
    timestamp: getRandomTimestamp(),
    severity: getRandomSeverity(),
  };
};

// Generate initial set of malicious IPs
export const generateInitialMaliciousIPs = (count: number): MaliciousIP[] => {
  const ips: MaliciousIP[] = [];

  for (let i = 0; i < count; i++) {
    ips.push(generateRandomMaliciousIP());
  }

  return ips;
};

// Interface for raw API data
interface RawMaliciousIP {
  ip: string;
  latitude: number;
  longitude: number;
  type: string;
}

// Convert raw API data to our MaliciousIP type
const convertToMaliciousIP = (rawIP: RawMaliciousIP): MaliciousIP => {
  // Helper function to map severity string to enum
  const mapSeverity = (type: string): AttackSeverity => {
    const severityMap: { [key: string]: AttackSeverity } = {
      malicious: AttackSeverity.HIGH,
      default: AttackSeverity.MEDIUM,
    };
    return severityMap[type] || AttackSeverity.MEDIUM;
  };

  return {
    id: uuidv4(),
    ip: rawIP.ip,
    latitude: rawIP.latitude,
    longitude: rawIP.longitude,
    timestamp: new Date(),
    severity: mapSeverity(rawIP.type),
  };
};

// Function to fetch malicious IPs
export const fetchMaliciousIPs = async (): Promise<MaliciousIP[]> => {
  try {
    const response = await fetch("http://localhost:5000/malicious-ips");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawIPs: RawMaliciousIP[] = await response.json();
    return rawIPs.map(convertToMaliciousIP);
  } catch (error) {
    console.error("Error fetching malicious IPs:", error);
    return [];
  }
};

// Function to fetch malicious IPs with retry
export const fetchMaliciousIPsWithRetry = async (
  maxRetries: number = 3
): Promise<MaliciousIP[]> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ips = await fetchMaliciousIPs();
      if (ips.length > 0) {
        return ips;
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // Wait for 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
};

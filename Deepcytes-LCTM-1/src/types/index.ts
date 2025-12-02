export interface Country {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface Attack {
  id: string;
  source: Country;
  target: Country;
  type: AttackType[];
  severity: AttackSeverity;
  timestamp: Date;
}

export enum AttackType {
  DDOS = "DDoS Attack",
  MALWARE = "Malware",
  PHISHING = "Phishing",
  RANSOMWARE = "Ransomware",
  SQL_INJECTION = "SQL Injection",
  XSS = "Cross-Site Scripting",
  ZERO_DAY = "Zero-Day Exploit",
  BRUTE_FORCE = "Brute Force",
}

export enum AttackSeverity {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
  UNKNOWN = "Unknown",
}

export interface MaliciousIP {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  severity: AttackSeverity;
}

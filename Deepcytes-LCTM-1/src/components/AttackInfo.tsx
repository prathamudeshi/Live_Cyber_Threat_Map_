import React from "react";
import { Attack } from "../types";
import { Shield, AlertTriangle, Clock } from "lucide-react";

interface AttackInfoProps {
  attack: Attack | null;
}

const AttackInfo: React.FC<AttackInfoProps> = ({ attack }) => {
  if (!attack) return null;

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "Critical":
        return "text-red-500";
      case "High":
        return "text-orange-500";
      case "Medium":
        return "text-yellow-500";
      case "Low":
        return "text-blue-500";
      case "Unknown":
        return "text-purple-500";
      default:
        return "text-purple-500";
    }
  };

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">Attack Details</h3>
        <span
          className={`flex items-center ${getSeverityColor(attack.severity)}`}
        >
          <AlertTriangle size={16} className="mr-1" />
          {attack.severity}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-gray-400 text-sm">Source</p>
          <p className="font-medium">{attack.source.name}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Target</p>
          <p className="font-medium">{attack.target.name}</p>
        </div>
      </div>

      <div className="flex items-center mb-2">
        <Shield size={16} className="mr-2 text-gray-400" />
        <span className="whitespace-pre-wrap">{attack.type.join(", ")}</span>
      </div>

      <div className="flex items-center text-gray-300 text-sm">
        <Clock size={14} className="mr-2" />
        <span>{formatTime(attack.timestamp)}</span>
      </div>
    </div>
  );
};

export default AttackInfo;

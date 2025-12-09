import React from "react";
import { Play, Pause, SkipForward, Filter, Shield } from "lucide-react";
import { AttackSeverity } from "../types";

interface ControlsProps {
  isPlaying: boolean;
  togglePlayPause: () => void;
  generateNewAttack: () => void;
  attackFrequency: number;
  setAttackFrequency: (value: number) => void;
  selectedSeverities: AttackSeverity[];
  setSelectedSeverities: (severities: AttackSeverity[]) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  togglePlayPause,
  generateNewAttack,
  attackFrequency,
  setAttackFrequency,
  selectedSeverities,
  setSelectedSeverities,
}) => {
  const handleSeverityToggle = (severity: AttackSeverity) => {
    if (selectedSeverities.includes(severity)) {
      setSelectedSeverities(selectedSeverities.filter((s) => s !== severity));
    } else {
      setSelectedSeverities([...selectedSeverities, severity]);
    }
  };

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <Shield className="mr-2" size={18} />
          Threat Controls
        </h3>

        <div className="flex space-x-2">
          <button
            onClick={togglePlayPause}
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={generateNewAttack}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Generate new attack"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Attack Frequency
        </label>
        <div className="flex items-center">
          <span className="text-xs mr-2">Slow</span>
          <input
            type="range"
            min="1"
            max="100"
            value={attackFrequency}
            onChange={(e) => setAttackFrequency(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs ml-2">Fast</span>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">
          Severity Levels
        </label>
        <div className="flex gap-2">
          {Object.values(AttackSeverity).map((severity) => (
            <button
              key={severity}
              onClick={() => handleSeverityToggle(severity)}
              className={`text-xs px-2 py-1 rounded-full ${
                selectedSeverities.includes(severity)
                  ? getSeverityButtonClass(severity)
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const getSeverityButtonClass = (severity: AttackSeverity): string => {
  switch (severity) {
    case AttackSeverity.CRITICAL:
      return "bg-red-600 text-white";
    case AttackSeverity.HIGH:
      return "bg-orange-600 text-white";
    case AttackSeverity.MEDIUM:
      return "bg-yellow-600 text-white";
    case AttackSeverity.LOW:
      return "bg-blue-600 text-white";
    case AttackSeverity.UNKNOWN:
      return "bg-purple-600 text-white";
    default:
      return "bg-purple-600 text-white";
  }
};

export default Controls;

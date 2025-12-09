import React from "react";
import { Attack, AttackSeverity } from "../types";
import { BarChart, Activity, Shield, Globe } from "lucide-react";

interface StatsProps {
  attacks: Attack[];
}

const Stats: React.FC<StatsProps> = ({ attacks }) => {
  // Calculate stats
  const totalAttacks = attacks.length;

  const attacksBySeverity = {
    [AttackSeverity.CRITICAL]: attacks.filter(
      (a) => a.severity === AttackSeverity.CRITICAL
    ).length,
    [AttackSeverity.HIGH]: attacks.filter(
      (a) => a.severity === AttackSeverity.HIGH
    ).length,
    [AttackSeverity.MEDIUM]: attacks.filter(
      (a) => a.severity === AttackSeverity.MEDIUM
    ).length,
    [AttackSeverity.LOW]: attacks.filter(
      (a) => a.severity === AttackSeverity.LOW
    ).length,
    [AttackSeverity.UNKNOWN]: attacks.filter(
      (a) => a.severity === AttackSeverity.UNKNOWN
    ).length,
  };

  // Get top source and target countries
  const sourceCountMap = new Map<string, number>();
  const targetCountMap = new Map<string, number>();

  attacks.forEach((attack) => {
    const sourceCount = sourceCountMap.get(attack.source.name) || 0;
    sourceCountMap.set(attack.source.name, sourceCount + 1);

    const targetCount = targetCountMap.get(attack.target.name) || 0;
    targetCountMap.set(attack.target.name, targetCount + 1);
  });

  const topSource = [...sourceCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)[0];

  const topTarget = [...targetCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)[0];

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white">
      <div className="flex items-center mb-4">
        <BarChart className="mr-2" size={18} />
        <h3 className="text-lg font-bold">Attack Statistics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
          <div className="flex items-center text-blue-400 mb-1">
            <Activity size={16} className="mr-2" />
            <span className="text-sm">Total Attacks</span>
          </div>
          <p className="text-2xl font-bold">{totalAttacks}</p>
        </div>

        <div className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
          <div className="flex items-center text-red-400 mb-1">
            <Shield size={16} className="mr-2" />
            <span className="text-sm">Critical Threats</span>
          </div>
          <p className="text-2xl font-bold">
            {attacksBySeverity[AttackSeverity.CRITICAL]}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm text-gray-400 mb-2 flex items-center">
          <Globe size={14} className="mr-1" />
          Threat Origin
        </h4>

        <div className="space-y-2">
          {topSource && (
            <div className="flex justify-between items-center">
              <span className="text-sm">{topSource[0]}</span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden mr-2">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(topSource[1] / totalAttacks) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">{topSource[1]}</span>
              </div>
            </div>
          )}

          <h4 className="text-sm text-gray-400 mb-2 flex items-center">
            <Globe size={14} className="mr-1" />
            Threat Target
          </h4>

          {topTarget && (
            <div className="flex justify-between items-center">
              <span className="text-sm">{topTarget[0]} </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden mr-2">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(topTarget[1] / totalAttacks) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">{topTarget[1]}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm text-gray-400 mb-2">Severity Breakdown</h4>
        <div className="flex h-4 rounded-full overflow-hidden">
          <div
            className="bg-red-500"
            style={{
              width: `${
                (attacksBySeverity[AttackSeverity.CRITICAL] / totalAttacks) *
                100
              }%`,
            }}
            title={`Critical: ${attacksBySeverity[AttackSeverity.CRITICAL]}`}
          ></div>
          <div
            className="bg-orange-500"
            style={{
              width: `${
                (attacksBySeverity[AttackSeverity.HIGH] / totalAttacks) * 100
              }%`,
            }}
            title={`High: ${attacksBySeverity[AttackSeverity.HIGH]}`}
          ></div>
          <div
            className="bg-yellow-500"
            style={{
              width: `${
                (attacksBySeverity[AttackSeverity.MEDIUM] / totalAttacks) * 100
              }%`,
            }}
            title={`Medium: ${attacksBySeverity[AttackSeverity.MEDIUM]}`}
          ></div>
          <div
            className="bg-blue-500"
            style={{
              width: `${
                (attacksBySeverity[AttackSeverity.LOW] / totalAttacks) * 100
              }%`,
            }}
            title={`Low: ${attacksBySeverity[AttackSeverity.LOW]}`}
          ></div>
          <div
            className="bg-purple-500"
            style={{
              width: `${
                (attacksBySeverity[AttackSeverity.UNKNOWN] / totalAttacks) * 100
              }%`,
            }}
            title={`Unknown: ${attacksBySeverity[AttackSeverity.UNKNOWN]}`}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Stats;

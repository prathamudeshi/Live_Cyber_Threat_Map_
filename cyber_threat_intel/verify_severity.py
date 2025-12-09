import asyncio
import json
from cyber_threat_intel import ThreatIntelligenceAggregator

async def verify():
    aggregator = ThreatIntelligenceAggregator()
    print("Initializing collector...")
    await aggregator.threat_collector.initialize()
    
    print("Fetching data...")
    data = await aggregator.threat_collector.fetch_data()
    
    print(f"Collected {len(data)} items.")
    
    severities = {}
    missing_severity = 0
    
    for item in data[:20]: # Check first 20
        sev = item.get("Severity")
        types = item.get("Attack Types")
        print(f"Severity: {sev}, Types: {types}")
        
        if sev:
            severities[sev] = severities.get(sev, 0) + 1
        else:
            missing_severity += 1

    print("\nSummary of Severities (Sample):")
    print(json.dumps(severities, indent=2))
    
    if missing_severity > 0:
        print(f"WARNING: {missing_severity} items missing severity!")
    else:
        print("SUCCESS: All items have severity.")

    await aggregator.threat_collector.close()

if __name__ == "__main__":
    asyncio.run(verify())

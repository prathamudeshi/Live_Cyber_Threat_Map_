
import asyncio
import aiohttp
import json
import random
import time

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
]

async def fetch_fortiguard(session):
    print("\n--- Fortiguard ---")
    url = "https://fortiguard.fortinet.com/api/threatmap/live/outbreak"
    params = {"outbreak_id": 0}
    headers = {
        'Accept': 'application/json',
        'Referer': 'https://fortiguard.fortinet.com/',
        'User-Agent': USER_AGENTS[0]
    }
    try:
        async with session.get(url, params=params, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                print("Keys:", data.keys())
                ips = data.get("ips", {})
                if ips:
                    first_key = list(ips.keys())[0]
                    print("Sample Item:", json.dumps(ips[first_key][0], indent=2))
            else:
                print(f"Error: {response.status}")
    except Exception as e:
        print(f"Exception: {e}")

async def fetch_checkpoint(session):
    print("\n--- Checkpoint ---")
    url = "https://threatmap-api.checkpoint.com/ThreatMap/api/feed"
    headers = {'Accept': 'text/event-stream'}
    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                print("Connected to stream. Waiting for data...")
                start = time.time()
                async for line in response.content:
                    if time.time() - start > 5:
                        break
                    line = line.decode('utf-8').strip()
                    if line.startswith("data:") and "attack" in line: # simplistic check
                         # Checkpoint stream sends event: attack then data: {...}
                         # But sometimes data comes after event.
                         # The legacy code parsed it. Let's just print a raw data line.
                         pass
                    
                    if line.startswith("data:"):
                        try:
                            # Try to parse if it looks like json
                            content = line[5:].strip()
                            if content.startswith("{"):
                                print("Sample Item:", content)
                                break
                        except:
                            pass
            else:
                print(f"Error: {response.status}")
    except Exception as e:
        print(f"Exception: {e}")

async def fetch_radware(session):
    print("\n--- Radware ---")
    url = "https://ltm-prod-api.radware.com/map/attacks?limit=20"
    try:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                if data and isinstance(data, list) and len(data) > 0:
                    print("Sample Item:", json.dumps(data[0], indent=2))
                else:
                    print("Data:", data)
            else:
                print(f"Error: {response.status}")
    except Exception as e:
        print(f"Exception: {e}")

async def main():
    async with aiohttp.ClientSession() as session:
        await fetch_fortiguard(session)
        print("\n" + "="*50 + "\n")
        await asyncio.sleep(1)
        await fetch_checkpoint(session)
        print("\n" + "="*50 + "\n")
        await asyncio.sleep(1)
        await fetch_radware(session)

if __name__ == "__main__":
    asyncio.run(main())

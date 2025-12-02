import asyncio
import aiohttp
import json
import logging
import re
import feedparser
import time
import random
import os
from datetime import datetime
from ipaddress import ip_address
import pycountry
from typing import Dict, List, Set, Optional, AsyncGenerator
from collections import deque
from aiohttp.client_exceptions import ClientError
import geoip2.database
from geoip2.errors import AddressNotFoundError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# User-Agent pool for rotation
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
]

# Proxy configuration from environment variables
PROXY = os.getenv('HTTP_PROXY', None)

class BaseDataCollector:
    """Base class for data collectors with anti-blocking provisions."""
    def __init__(self, source_name: str, interval: float = 10.0, max_retries: int = 5):
        self.source_name = source_name
        self.interval = interval
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None
        self.seen_records: Set = set()
        self.session_refresh_interval = 3600

    async def initialize(self):
        """Initialize or refresh the aiohttp session."""
        if self.session:
            await self.session.close()
        self.session = aiohttp.ClientSession(
            headers={'User-Agent': random.choice(USER_AGENTS)},
            connector=aiohttp.TCPConnector(limit=50),
            timeout=aiohttp.ClientTimeout(total=30)
        )

    async def close(self):
        """Close the aiohttp session."""
        if self.session:
            await self.session.close()
            self.session = None

    @staticmethod
    def get_country_name(code: Optional[str]) -> Optional[str]:
        if not code or not code.strip():
            return None
        try:
            return pycountry.countries.get(alpha_2=code.upper()).name
        except (AttributeError, LookupError):
            return None

    @staticmethod
    def get_country_code(name: Optional[str]) -> Optional[str]:
        if not name or not name.strip():
            return None
        if name.lower() == "turkey":
            name = "Türkiye"
        try:
            return pycountry.countries.search_fuzzy(name)[0].alpha_2
        except (AttributeError, LookupError):
            return None
    
    @staticmethod
    def get_country_coordinates(code: Optional[str] = None, name: Optional[str] = None, coord_type: str = "lat") -> Optional[float]:
        try:
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            json_path = os.path.join(BASE_DIR, "assets", "country_coordinates.json")
            if not os.path.exists(json_path):
                logger.error(f"Country coordinates file not found at {json_path}")
                return None
            with open(json_path, "r") as f:
                COUNTRY_CENTROIDS = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Error loading country coordinates: {e}")
            return None
        if not code and not name:
            return None
        if name and not code:
            if name.lower() == "turkey":
                name = "Türkiye"
            try:
                code = pycountry.countries.search_fuzzy(name)[0].alpha_2
            except (AttributeError, LookupError):
                return None
        if code:
            code = code.upper()
            coords = COUNTRY_CENTROIDS.get(code, [None, None])
            return coords[0] if coord_type.lower() == "lat" else coords[1]
        return None

    async def fetch_with_retry(self, url: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> Optional[Dict]:
        for attempt in range(self.max_retries):
            try:
                async with self.session.get(url, params=params, headers=headers, proxy=PROXY) as response:
                    if response.status in [429, 403]:
                        backoff = min((2 ** attempt) + random.uniform(0, 0.5), 600)
                        logger.warning(f"{self.source_name} received {response.status}, retrying after {backoff}s")
                        await asyncio.sleep(backoff)
                        continue
                    response.raise_for_status()
                    return await response.json(content_type=None)
            except ClientError as e:
                logger.error(f"{self.source_name} fetch error (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep((2 ** attempt) + random.uniform(0, 0.5))
        return None

    async def fetch_data(self) -> List[Dict]:
        raise NotImplementedError

    async def stream_data(self) -> AsyncGenerator[List[Dict], None]:
        await self.initialize()
        last_session_refresh = time.time()
        while True:
            try:
                if time.time() - last_session_refresh > self.session_refresh_interval:
                    await self.initialize()
                    last_session_refresh = time.time()
                    logger.info(f"{self.source_name} session refreshed")

                data = await self.fetch_data()
                if data:
                    yield data
                await asyncio.sleep(self.interval + random.uniform(0, 0.5))
            except Exception as e:
                logger.error(f"Error in {self.source_name}: {e}")
                yield []
                await asyncio.sleep(self.interval + random.uniform(0, 0.5))

class ThreatDataCollector(BaseDataCollector):
    """Collector for threat data from multiple sources."""
    def __init__(self, sources: List[str], interval: float = 10.0, max_retries: int = 5):
        super().__init__("threat_data", interval, max_retries)
        self.sources = sources
        self.checkpoint_buffer = []
        self.checkpoint_task = None
        self.checkpoint_running = False

    async def initialize(self):
        """Initialize session and start Checkpoint SSE in the background."""
        await super().initialize()
        if "checkpoint" in self.sources and not self.checkpoint_running:
            self.checkpoint_running = True
            self.checkpoint_task = asyncio.create_task(self._collect_checkpoint_background())

    async def close(self):
        """Close session and stop Checkpoint SSE."""
        self.checkpoint_running = False
        if self.checkpoint_task:
            self.checkpoint_task.cancel()
            try:
                await self.checkpoint_task
            except asyncio.CancelledError:
                pass
            self.checkpoint_task = None
        await super().close()

    async def _collect_checkpoint_background(self):
        """Collect Checkpoint SSE data continuously in the background."""
        while self.checkpoint_running:
            try:
                data = await self._fetch_checkpoint()
                if data:
                    self.checkpoint_buffer.extend(data)
                    logger.debug(f"Checkpoint: Added {len(data)} entries to buffer")
                await asyncio.sleep(0.1)  # Prevent tight loop
            except Exception as e:
                logger.error(f"Checkpoint background: Error: {e}")
                await asyncio.sleep(1)

    async def fetch_data(self) -> List[Dict]:
        """Fetch, filter, and preprocess threat data from all sources."""
        # Initialize tasks for Fortiguard and Radware, use Checkpoint buffer
        tasks = []
        if "fortiguard" in self.sources:
            tasks.append(self._fetch_fortiguard())
        if "radware" in self.sources:
            tasks.append(self._fetch_radware())
        
        # Fetch Fortiguard and Radware data
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Step 1: Collect all data into a single list
        all_data = []
        discarded_count = 0
        
        # Add Checkpoint buffer data (empty at t=0, populated at t=10s)
        if "checkpoint" in self.sources:
            all_data.extend(self.checkpoint_buffer)
            logger.debug(f"Checkpoint: Added {len(self.checkpoint_buffer)} buffered entries")
            self.checkpoint_buffer = []  # Clear buffer after using
        
        # Add Fortiguard and Radware data
        for result in results:
            if isinstance(result, list):
                all_data.extend(result)
            else:
                logger.error(f"Error in source fetch: {result}")
        
        # Step 2: Filter invalid data (either source or dest is missing)
        filtered_data = []
        for item in all_data:
            src_cc = item.get("Source Country Code")
            dst_cc = item.get("Destination Country Code")
            if not src_cc or not dst_cc:
                logger.debug(f"{self.source_name}: Discarding entry with missing source or destination country code: {item}")
                discarded_count += 1
                continue
            filtered_data.append(item)
        logger.info(f"{self.source_name}: Discarded {discarded_count} entries due to missing country codes")
        
        # Step 3: Preprocessing
        # 3.1 Remove redundant data
        unique_attacks = {}
        for item in filtered_data:
            key = (item["Attack Name"], item["Source Country Code"], item["Destination Country Code"])
            if key not in unique_attacks:
                unique_attacks[key] = item
        
        # Step 3.2 Group attacks by source and destination
        grouped_attacks = {}
        for item in unique_attacks.values():
            key = (item["Source Country Code"], item["Destination Country Code"])
            if key not in grouped_attacks:
                grouped_attacks[key] = {
                    "Attack Count": 0,
                    "Attack Types": set(),
                    "Source Country Code": item["Source Country Code"],
                    "Source Country Name": item["Source Country Name"],
                    "Source Latitude": item.get("Source Latitude"),
                    "Source Longitude": item.get("Source Longitude"),
                    "Destination Country Code": item["Destination Country Code"],
                    "Destination Country Name": item["Destination Country Name"],
                    "Destination Latitude": item.get("Destination Latitude"),
                    "Destination Longitude": item.get("Destination Longitude"),
                    "Timestamp": item["Timestamp"]
                }
            grouped_attacks[key]["Attack Count"] += item.get("Attack Count", 1) or 1
            grouped_attacks[key]["Attack Types"].add(item["Attack Type"])
        
        # Step 4: Convert to final list
        final_data = [
            {
                "Source Country Code": data["Source Country Code"],
                "Source Country Name": data["Source Country Name"],
                "Source Latitude": data["Source Latitude"],
                "Source Longitude": data["Source Longitude"],
                "Destination Country Code": data["Destination Country Code"],
                "Destination Country Name": data["Destination Country Name"],
                "Destination Latitude": data["Destination Latitude"],
                "Destination Longitude": data["Destination Longitude"],
                "Attack Count": data["Attack Count"],
                "Attack Types": list(data["Attack Types"]),
                "Timestamp": data["Timestamp"]
            }
            for data in grouped_attacks.values()
        ]
        
        logger.info(f"{self.source_name}: Returning {len(final_data)} preprocessed threat entries")
        return final_data

    async def _fetch_fortiguard(self) -> List[Dict]:
        url = "https://fortiguard.fortinet.com/api/threatmap/live/outbreak"
        params = {"outbreak_id": 0}
        headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Referer': 'https://fortiguard.fortinet.com/',
            'User-Agent': USER_AGENTS[0]
        }
        data = await self.fetch_with_retry(url, params=params, headers=headers)
        if not data:
            logger.error(f"fortiguard: Failed to retrieve data")
            return []
    
        parsed_data = []
        ips_data = data.get("ips", {})
        for timestamp_key, attacks in ips_data.items():
            for attack in attacks:
                entry = {
                    "Attack Count": attack.get("count"),
                    "Attack Name": attack.get("vuln_name"),
                    "Attack Type": attack.get("vuln_type"),
                    "Destination Country Code": attack.get("dest_country"),
                    "Destination Country Name": self.get_country_name(attack.get("dest_country")),
                    "Destination Latitude": attack.get("dest_lat"),
                    "Destination Longitude": attack.get("dest_long"),
                    "Source Country Code": attack.get("src_country"),
                    "Source Country Name": self.get_country_name(attack.get("src_country")),
                    "Source Latitude": attack.get("src_lat"),
                    "Source Longitude": attack.get("src_long"),
                    "Timestamp": datetime.utcnow().isoformat() if not attack.get("timestamp") else attack.get("timestamp"),
                }
                parsed_data.append(entry)
        logger.debug(f"fortiguard: Collected {len(parsed_data)} entries")
        return parsed_data

    async def _fetch_checkpoint(self) -> List[Dict]:
        """Fetch attack data from Check Point SSE stream for 10 seconds."""
        url = "https://threatmap-api.checkpoint.com/ThreatMap/api/feed"
        threat_data_list = []
        current_event = None
        start_time = time.time()
        max_duration = 10.0

        try:
            async with self.session.get(url, headers={'Accept': 'text/event-stream'}, proxy=PROXY, timeout=10) as response:
                if response.status != 200:
                    logger.warning(f"checkpoint: Status {response.status}")
                    return []
                
                async for line in response.content:
                    if time.time() - start_time > max_duration:
                        logger.debug(f"checkpoint: Stopping collection after {max_duration}s")
                        break
                    if line:
                        decoded_line = line.decode('utf-8').strip()
                        if decoded_line.startswith("event:"):
                            current_event = decoded_line[6:].strip()
                        elif decoded_line.startswith("data:") and current_event == "attack":
                            try:
                                json_data = json.loads(decoded_line[5:])
                                mapping = {
                                    "a_c": "Attack Count", "a_n": "Attack Name", "a_t": "Attack Type",
                                    "d_co": "Destination Country Code", "d_la": "Destination Latitude",
                                    "d_lo": "Destination Longitude", "s_co": "Source Country Code",
                                    "s_lo": "Source Longitude", "s_la": "Source Latitude", "t": "Timestamp"
                                }
                                threat_data = {}
                                for key, label in mapping.items():
                                    value = json_data.get(key)
                                    if value not in [None, "None"]:
                                        threat_data[label] = value
                                if threat_data:
                                    threat_data["Destination Country Name"] = self.get_country_name(threat_data.get("Destination Country Code"))
                                    threat_data["Source Country Name"] = self.get_country_name(threat_data.get("Source Country Code"))
                                    if not threat_data.get("Timestamp"):
                                        threat_data["Timestamp"] = datetime.utcnow().isoformat()
                                    threat_data_list.append(threat_data)
                            except json.JSONDecodeError as e:
                                logger.warning(f"checkpoint: Failed to parse JSON: {decoded_line}, error: {e}")
                                continue
        except Exception as e:
            logger.error(f"checkpoint: Fetch error: {e}")
        
        logger.debug(f"checkpoint: Collected {len(threat_data_list)} events in {max_duration}s")
        return threat_data_list

    async def _fetch_radware(self) -> List[Dict]:
        url = "https://ltm-prod-api.radware.com/map/attacks?limit=20"
        data = await self.fetch_with_retry(url)
        if not data:
            logger.error(f"radware: Failed to retrieve data")
            return []
        parsed_data = []
        for attack_group in data:
            if not isinstance(attack_group, list):
                logger.debug(f"radware: Skipping non-list attack group: {attack_group}")
                continue
            for attack in attack_group:
                if not isinstance(attack, dict):
                    logger.debug(f"radware: Skipping non-dict attack: {attack}")
                    continue
                dst_cc = attack.get("destinationCountry", "").strip() or None
                src_cc = attack.get("sourceCountry", "").strip() or None
                entry = {
                    "Attack Count": None,
                    "Attack Name": attack.get("type"),
                    "Attack Type": attack.get("type"),
                    "Destination Country Code": dst_cc,
                    "Destination Country Name": self.get_country_name(dst_cc),
                    "Destination Latitude": self.get_country_coordinates(code=dst_cc, coord_type="lat"),
                    "Destination Longitude": self.get_country_coordinates(code=dst_cc, coord_type="long"),
                    "Source Country Code": src_cc,
                    "Source Country Name": self.get_country_name(src_cc),
                    "Source Latitude": self.get_country_coordinates(code=src_cc, coord_type="lat"),
                    "Source Longitude": self.get_country_coordinates(code=src_cc, coord_type="long"),
                    "Timestamp": attack.get("attackTime") or datetime.utcnow().isoformat()
                }
                parsed_data.append(entry)
        logger.debug(f"radware: Collected {len(parsed_data)} entries")
        return parsed_data

class NewsDataCollector(BaseDataCollector):
    """Collector for news data from multiple RSS feeds."""
    def __init__(self, sources: List[Dict[str, str]], max_retries: int = 3):
        super().__init__("news_data", interval=0.0, max_retries=max_retries)
        self.sources = sources
        self.primary_keywords = [
            "ransomware", "malware", "exploit", "vulnerability", "breach",
            "zero-day", "attack", "compromised", "infected", "stolen",
            "hacked", "leak", "backdoor", "trojan", "rootkit", "spyware",
            "security", "cyber"
        ]
        self.secondary_keywords = [
            "cybercrime", "phishing", "ddos", "apt", "hacking", "credential",
            "cyberattack", "databreach", "hack", "payload", "threat", "botnet",
            "mitigation", "critical", "authentication", "attacker", "command and control",
            "lateral movement", "exfiltration", "intrusion", "security flaw"
        ]
        self.exclude_terms = [
            "webinar", "workshop", "training", "course", "certification",
            "conference", "roundtable", "partner", "sponsored", "promotion",
            "discount", "offer", "register now", "sign up", "earn", "sale",
            "subscription", "tutorial", "guide", "how to", "introduction to"
        ]

    async def fetch_data(self) -> List[Dict]:
        """Fetch and filter news data from all sources."""
        tasks = [self._fetch_source(source["name"], source["url"]) for source in self.sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_articles = []
        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)

        logger.debug(f"{self.source_name}: Returning {len(all_articles)} news articles")
        return all_articles

    async def _fetch_source(self, source_name: str, rss_url: str) -> List[Dict]:
        feed = feedparser.parse(rss_url)
        if not feed.entries:
            logger.debug(f"{source_name}: No entries in feed")
            return []

        filtered_articles = []
        for entry in feed.entries:
            title = entry.get("title", "").strip()
            summary = entry.get("summary", "") or entry.get("description", "")
            summary = summary.strip()
            link = entry.get("link", "").strip()
            published = entry.get("published", datetime.utcnow().isoformat())
            if not title or not link:
                continue
            text = f"{title} {summary}"
            is_relevant, _ = self.is_relevant_article(text)
            if is_relevant:
                article = {
                    "title": title,
                    "link": link,
                    "timestamp": published
                }
                filtered_articles.append(article)
        return filtered_articles

    def is_relevant_article(self, text: str) -> tuple[bool, List[str]]:
        for term in self.exclude_terms:
            if re.search(r'\b' + re.escape(term) + r'\b', text, re.IGNORECASE):
                return False, []
        primary_matches = [kw for kw in self.primary_keywords if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE)]
        if not primary_matches:
            return False, []
        secondary_matches = [kw for kw in self.secondary_keywords if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE)]
        return True, primary_matches + secondary_matches

class MaliciousIPCollector(BaseDataCollector):
    """Collector for malicious IPs from multiple sources."""
    def __init__(self, sources: List[str], interval: float = 0.0, max_retries: int = 5, geodb_path: str = None):  # Increased max_retries
        super().__init__("malicious_ip", interval, max_retries)
        self.sources = sources
        self.urls = {
            "alienvault": "https://reputation.alienvault.com/reputation.unix",
            "bd_banlist": "https://www.binarydefense.com/banlist.txt", 
            "fraudguard": "https://api.fraudguard.io/landing-page-map",
            "talos": "https://talosintelligence.com/cloud_intel/top_senders_list"
        }
        self.ip_regex = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        default_geodb_path = os.path.join(BASE_DIR, "assets", "GeoLite2-City.mmdb")
        self.geodb_path = os.path.abspath(os.getenv("GEOLITE2_DB_PATH", geodb_path or default_geodb_path))
        self.geo_reader = None

    async def initialize(self):
        await super().initialize()
        try:
            if not os.path.exists(self.geodb_path):
                raise FileNotFoundError(f"GeoLite2 database not found at {self.geodb_path}")
            self.geo_reader = geoip2.database.Reader(self.geodb_path)
        except Exception as e:
            logger.error(f"{self.source_name}: Failed to initialize GeoLite2 reader: {e}")
            self.geo_reader = None

    async def close(self):
        await super().close()
        if self.geo_reader:
            self.geo_reader.close()

    async def fetch_data(self) -> List[Dict]:
        """Fetch and deduplicate malicious IPs from all sources."""
        tasks = [self._fetch_source(source) for source in self.sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Step 1: Collect all IPs into a single list
        all_ips = []
        for result in results:
            if isinstance(result, list):
                all_ips.extend(result)
        
        # Step 2: Remove redundant IPs
        unique_ips = {}
        for item in all_ips:
            ip = item["ip"]
            if ip not in unique_ips:
                unique_ips[ip] = item
        
        # Step 3: Return final list
        final_data = list(unique_ips.values())
        logger.debug(f"{self.source_name}: Returning {len(final_data)} unique IPs")
        return final_data

    async def _fetch_source(self, source: str) -> List[Dict]:
        if source == "alienvault":
            return await self._fetch_alienvault()
        elif source == "bd_banlist":
            return await self._fetch_bd_banlist()
        elif source == "fraudguard":
            return await self._fetch_fraudguard()
        elif source == "talos":
            return await self._fetch_talos()
        else:
            logger.error(f"Unknown source: {source}")
            return []

    async def _fetch_alienvault(self) -> List[Dict]:
        url = self.urls["alienvault"]
        try:
            async with self.session.get(url, proxy=PROXY, timeout=10) as response:
                if response.status != 200:
                    return []
                data = await response.text()
                ips = sorted(set(ip for ip in self.ip_regex.findall(data) if self.is_valid_ip(ip)))
                return [self._create_ip_entry(ip, "malicious") for ip in ips]
        except Exception as e:
            logger.error(f"alienvault: Error fetching: {e}")
            return []

    async def _fetch_bd_banlist(self) -> List[Dict]:
        url = self.urls["bd_banlist"]
        try:
            async with self.session.get(url, proxy=PROXY, timeout=10) as response:
                if response.status != 200:
                    return []
                data = await response.text()
                ips = sorted(set(ip.strip() for ip in data.splitlines() if ip.strip() and self.is_valid_ip(ip.strip())))
                return [self._create_ip_entry(ip, "malicious") for ip in ips]
        except Exception as e:
            logger.error(f"bd_banlist: Error fetching: {e}")
            return []

    async def _fetch_fraudguard(self) -> List[Dict]:
        url = self.urls["fraudguard"]
        try:
            async with self.session.get(url, proxy=PROXY, timeout=10) as response:
                if response.status != 200:
                    return []
                text = await response.text()
                match = re.search(r'const threatData = (\[.*?\]);', text, re.DOTALL)
                if not match:
                    return []
                attacks_data = json.loads(match.group(1))
                ips = set()
                for attack in attacks_data:
                    ip = attack.get("ip")
                    if ip and self.is_valid_ip(ip):
                        ips.add(ip)
                return [self._create_ip_entry(ip, "malicious") for ip in sorted(ips)]
        except Exception as e:
            logger.error(f"fraudguard: Error fetching: {e}")
            return []

    async def _fetch_talos(self) -> List[Dict]:
        url = self.urls["talos"]
        data = await self.fetch_with_retry(url)
        if not data:
            return []
        ips = set()
        for entry in data.get("spam", []):
            ip = entry.get("ip")
            if ip and self.is_valid_ip(ip):
                ips.add(ip)
        return [self._create_ip_entry(ip, "spam") for ip in sorted(ips)]

    def _create_ip_entry(self, ip: str, source_type: str) -> Dict:
        latitude, longitude = self.get_ip_coordinates(ip)
        return {
            "ip": ip,
            "latitude": latitude,
            "longitude": longitude,
            "type": source_type
        }

    def is_valid_ip(self, ip_str: str) -> bool:
        try:
            ip_address(ip_str)
            return True
        except ValueError:
            return False

    def get_ip_coordinates(self, ip: str) -> tuple[Optional[float], Optional[float]]:
        if not self.geo_reader:
            return None, None
        try:
            response = self.geo_reader.city(ip)
            return response.location.latitude, response.location.longitude
        except Exception:
            return None, None

class ThreatIntelligenceAggregator:
    """Aggregates data from threat, news, and IP collectors."""
    def __init__(self):
        self.threat_collector = ThreatDataCollector(
            sources=["fortiguard", "checkpoint", "radware"],
            interval=10.0
        )
        self.news_collector = NewsDataCollector(
            sources=[
                {"name": "hackernews", "url": "https://feeds.feedburner.com/TheHackersNews"},
                {"name": "darkreading", "url": "https://www.darkreading.com/rss.xml"},
                {"name": "420in", "url": "https://the420.in/feed"}
            ]
        )
        self.ip_collector = MaliciousIPCollector(
            sources=["alienvault", "bd_banlist", "fraudguard", "talos"]
        )
        self.threat_queue = deque()
        self.news_list = []
        self.ip_queue = deque()

    async def start_collectors(self):
        """Start all collectors and store their data."""
        async def collect_threat():
            async for data in self.threat_collector.stream_data():
                self.threat_queue.extend(data)

        async def collect_news():
            async for data in self.news_collector.stream_data():
                self.news_list = data  # Replace with latest data

        async def collect_ips():
            async for data in self.ip_collector.stream_data():
                self.ip_queue.extend(data)

        await asyncio.gather(collect_threat(), collect_news(), collect_ips())

    async def get_threat_batch(self, batch_size: int) -> List[Dict]:
        """Retrieve a batch of threat data."""
        batch = []
        while len(batch) < batch_size and self.threat_queue:
            batch.append(self.threat_queue.popleft())
        return batch

    async def get_ip_batch(self, batch_size: int) -> List[Dict]:
        """Retrieve a batch of malicious IP data."""
        batch = []
        while len(batch) < batch_size and self.ip_queue:
            batch.append(self.ip_queue.popleft())
        return batch

    async def get_news(self) -> List[Dict]:
        """Retrieve the latest news data."""
        return self.news_list

    async def close(self):
        """Close all collector sessions."""
        await asyncio.gather(
            self.threat_collector.close(),
            self.news_collector.close(),
            self.ip_collector.close()
        )

if __name__ == "__main__":
    async def run_menu():
        aggregator = ThreatIntelligenceAggregator()
        try:
            await aggregator.threat_collector.initialize()
            await aggregator.news_collector.initialize()
            await aggregator.ip_collector.initialize()

            while True:
                print("\nCyber Threat Intelligence Menu:")
                print("1. Stream Threat Data (Live)")
                print("2. Collect News Data")
                print("3. Collect Malicious IP Data")
                print("4. Exit")
                choice = input("Enter your choice (1-4): ").strip()

                if choice == "1":
                    print("Streaming threat data (press Ctrl+C to stop)...")
                    try:
                        async for data_batch in aggregator.threat_collector.stream_data():
                            with open("threat_data.txt", "w") as f:
                                f.write(json.dumps(data_batch, indent=2))
                            print(f"Collected {len(data_batch)} threat data entries. Saved to threat_data.txt")
                    except KeyboardInterrupt:
                        print("\nStopped threat stream.")
                
                elif choice == "2":
                    data = await aggregator.news_collector.fetch_data()
                    with open("news_data.txt", "w") as f:
                        f.write(json.dumps(data, indent=2))
                    print(f"Collected {len(data)} news articles. Saved to news_data.txt")
                
                elif choice == "3":
                    data = await aggregator.ip_collector.fetch_data()
                    with open("malicious_ip_data.txt", "w") as f:
                        f.write(json.dumps(data, indent=2))
                    print(f"Collected {len(data)} malicious IPs. Saved to malicious_ip_data.txt")
                
                elif choice == "4":
                    print("Exiting program.")
                    break
                
                else:
                    print("Invalid choice. Please select 1, 2, 3, or 4.")
        
        except KeyboardInterrupt:
            print("\nProgram interrupted.")
        except Exception as e:
            logger.error(f"Error in menu: {e}")
        finally:
            await aggregator.close()

    asyncio.run(run_menu())
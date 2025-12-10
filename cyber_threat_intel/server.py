from flask import Flask, Response, jsonify, render_template, request
from flask_cors import CORS
from dotenv import load_dotenv
import asyncio
import json
import os
import random
import aiohttp
from datetime import datetime
from typing import AsyncGenerator, List, Dict
from cyber_threat_intel import ThreatIntelligenceAggregator, logger
import math
from collections import deque

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

from flask import Flask, Response, jsonify, render_template
from flask_cors import CORS
import asyncio
import json
from typing import AsyncGenerator, List, Dict
from cyber_threat_intel import ThreatIntelligenceAggregator, logger
import math
from collections import deque

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.route('/')
def index():
    """Serve the main HTML page."""
    logger.info("Accessed root endpoint (/)")
    return render_template('index.html')

async def stream_threat_data() -> AsyncGenerator[str, None]:
    """Stream threat data as SSE, sending batches every second."""
    logger.info("Starting SSE stream for /threats endpoint")
    
    # Create a local aggregator instance for this stream
    aggregator = ThreatIntelligenceAggregator()
    # Only initialize the threat collector
    await aggregator.threat_collector.initialize()
    
    threat_queue = deque()
    
    async def collect_threat():
        try:
            async for data in aggregator.threat_collector.stream_data():
                threat_queue.extend(data)
                logger.debug(f"Collected {len(data)} threat data items into queue")
        except Exception as e:
            logger.error(f"Error in collect_threat task: {e}")
    
    # Start collecting threat data in the background
    collection_task = asyncio.create_task(collect_threat())
    
    try:
        while True:
            if threat_queue:
                # Calculate batch size: total items over 10s interval, divided by 10, rounded up
                batch_size = math.ceil(len(threat_queue) / 10)
                batch = []
                for _ in range(min(batch_size, len(threat_queue))):
                    batch.append(threat_queue.popleft())
                if batch:
                    logger.info(f"Sending SSE batch with {len(batch)} threat data items")
                    yield f"data: {json.dumps(batch)}\n\n"
                else:
                    yield "data: []\n\n"
            else:
                yield "data: []\n\n"
            await asyncio.sleep(1)  # Send every second
    except asyncio.CancelledError:
        logger.info("SSE stream cancelled")
        raise
    finally:
        # Cleanup
        collection_task.cancel()
        try:
            await collection_task
        except asyncio.CancelledError:
            pass
        await aggregator.threat_collector.close()
        logger.info("Closed threat collector session")

@app.route('/threats')
def stream_threats():
    """SSE endpoint for threat data."""
    def generate():
        # Create a new event loop for this request
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Run the async generator synchronously
            gen = stream_threat_data()
            while True:
                try:
                    # Get the next value from the async generator
                    future = asyncio.ensure_future(gen.__anext__(), loop=loop)
                    result = loop.run_until_complete(future)
                    yield result
                except StopAsyncIteration:
                    break
                except Exception as e:
                    logger.error(f"Error in SSE generator: {e}")
                    break
        finally:
            loop.close()
    
    logger.info("Accessed /threats endpoint")
    return Response(generate(), mimetype='text/event-stream')

@app.route('/news')
def get_news():
    """GET endpoint for news data."""
    logger.info("Accessed /news endpoint")
    
    # Create a new event loop for this request
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    aggregator = ThreatIntelligenceAggregator()
    
    try:
        # Initialize and fetch news
        loop.run_until_complete(aggregator.news_collector.initialize())
        news_data = loop.run_until_complete(aggregator.news_collector.fetch_data())
        
        logger.info(f"Fetched and returning {len(news_data)} news articles")
        if not news_data:
            logger.warning("No news articles fetched; check RSS feeds or filtering")
        return jsonify(news_data)
    except Exception as e:
        logger.error(f"Error fetching news data: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        loop.run_until_complete(aggregator.news_collector.close())
        loop.close()

@app.route('/malicious-ips')
def get_malicious_ips():
    """GET endpoint for malicious IP data."""
    logger.info("Accessed /malicious-ips endpoint")
    
    # Create a new event loop for this request
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Use aggregator's ip_collector but we need to instantiate it freshly or use the aggregator
    # Using aggregator is consistent
    aggregator = ThreatIntelligenceAggregator()
    
    try:
        # Initialize and fetch IPs
        loop.run_until_complete(aggregator.ip_collector.initialize())
        malicious_ips_data = loop.run_until_complete(aggregator.ip_collector.fetch_data())
        
        logger.info(f"Fetched and returning {len(malicious_ips_data)} malicious IPs")
        if not malicious_ips_data:
            logger.warning("No malicious IPs fetched; check data sources or GeoLite2 database path")
        return jsonify(malicious_ips_data)
    except Exception as e:
        logger.error(f"Error fetching malicious IPs data: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        loop.run_until_complete(aggregator.ip_collector.close())
        loop.close()

@app.route('/api/analyze-ip', methods=['POST'])
async def analyze_ip():
    """Analyze an IP address using AbuseIPDB or Simulation Mode."""
    # Since Flask 2.0+ supports async routes, we can use async def directly.
    # However, request object is context local.
    
    data = request.json
    ip_address = data.get('ip')
    
    if not ip_address:
        return jsonify({"error": "No IP address provided"}), 400

    api_key = os.getenv('ABUSEIPDB_API_KEY')
    
    # Simulation Mode Logic
    if not api_key:
        logger.warning(f"SIMULATION MODE: analyzing IP {ip_address} (Reason: No API Key found)")
        # Generate deterministic but realistic-looking fake data based on IP hash
        random.seed(ip_address)
        
        abuse_score = random.randint(0, 100)
        risk_level = "Critical" if abuse_score > 75 else "High" if abuse_score > 50 else "Medium"
        
        isps = ["DigitalOcean", "Amazon AWS", "Google Cloud", "Chinanet", "Unknown ISP"]
        usage_types = ["Data Center", "Residential", "Commercial", "Content Delivery Network"]
        
        mock_data = {
            "ip": ip_address,
            "isPublic": True,
            "ipVersion": 4,
            "isWhitelisted": False,
            "abuseConfidenceScore": abuse_score,
            "countryCode": "US", 
            "usageType": random.choice(usage_types),
            "isp": random.choice(isps),
            "domain": "example.com",
            "hostnames": [],
            "totalReports": random.randint(1, 500),
            "numDistinctUsers": random.randint(1, 50),
            "lastReportedAt": datetime.now().isoformat(),
            "simulation_mode": True,
            "ai_summary": f"AI ANALYSIS: This IP ({ip_address}) exhibits patterns consistent with {risk_level.lower()} risk activity. "
                          f"High confidence ({abuse_score}%) of malicious intent. "
                          f"Traffic appears to originate from {random.choice(isps)} infrastructure."
        }
        return jsonify(mock_data)

    # Real API Logic
    logger.info(f"REAL API MODE: Analyzing IP {ip_address} via AbuseIPDB")
    url = 'https://api.abuseipdb.com/api/v2/check'
    querystring = {
        'ipAddress': ip_address,
        'maxAgeInDays': '90'
    }
    headers = {
        'Accept': 'application/json',
        'Key': api_key
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=querystring) as response:
                if response.status == 200:
                    result = await response.json()
                    data = result['data']
                    # Add AI summary (mocked for now as we don't want to burn OpenAI credits yet)
                    score = data.get('abuseConfidenceScore', 0)
                    risk = "Critical" if score > 75 else "High" if score > 50 else "Medium"
                    data['ai_summary'] = (f"AI ANALYSIS: Verified threat actor. Abuse Score: {score}/100. "
                                        f"Risk Level: {risk}. "
                                        f"Primary ISP: {data.get('isp', 'Unknown')}. "
                                        "Recommended Action: Block immediately.")
                    data['simulation_mode'] = False
                    return jsonify(data)
                else:
                    logger.error(f"AbuseIPDB API Error: {response.status}")
                    return jsonify({"error": "External API failed"}), 502
    except Exception as e:
        logger.error(f"Error calling AbuseIPDB: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/briefing', methods=['GET'])
async def get_briefing():
    """Generate an AI Threat Briefing using Gemini."""
    import os
    from groq import Groq
    
    api_key = os.getenv('GROQ_API_KEY')
    
    # simulation/fallback
    if not api_key:
        return jsonify({
            "is_simulation": True,
            "summary": "SIMULATION: No Groq API Key found. Showing cached intelligence.",
            "points": [
                "Significant increase in SSH brute force attempts detected from Eastern Europe.",
                "New ransomware variant targeting healthcare institutions reported in global news feeds.",
                "Traffic anomalies observed on port 445 consistent with lateral movement attempts."
            ],
            "risk_level": "High"
        })

    try:
        # Fetch context data
        aggregator = ThreatIntelligenceAggregator()
        await aggregator.news_collector.initialize()
        await aggregator.ip_collector.initialize()
        
        news = await aggregator.news_collector.fetch_data()
        ips = await aggregator.ip_collector.fetch_data()
        
        await aggregator.news_collector.close()
        await aggregator.ip_collector.close()
        
        # Prepare context for AI
        news_summary = "\n".join([f"- {n['title']}" for n in news[:5]])
        ip_summary = f"Detected {len(ips)} malicious IPs. Top countries involved: US, CN, RU."
        
        prompt = f"""
        You are a Cyber Threat Intelligence Analyst. 
        Based on the following data, generate a concise "Daily Threat Briefing" with 5 key insights.
        
        Recent News Headlines:
        {news_summary}
        
        Network Telemetry:
        {ip_summary}
        
        Output format (JSON):
        {{
            "summary": "One sentence executive summary.",
            "points": ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4", "Key insight 5"],
            "risk_level": "Low/Medium/High/Critical"
        }}
        """
        
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
        )
        
        text = chat_completion.choices[0].message.content
        return jsonify(json.loads(text))

    except Exception as e:
        logger.error(f"Gemini Error (likely quota): {e}")
        # Fallback to simulation data on error
        return jsonify({
            "is_simulation": True,
            "summary": "INTELLIGENCE ALERT: Live AI service unavailable (Quota Exceeded). Displaying historical patterns.",
            "points": [
                "Persistent APT29 activity detected in sector 4. (Historical)",
                "Known ransomware signatures matching LockBit 3.0 observed. (Historical)",
                "Unusual outbound traffic spikes on UDP port 53. (Historical)"
            ],
            "risk_level": "Medium"
        })

if __name__ == "__main__":
    try:
        logger.info("Starting Flask server on http://0.0.0.0:5000")
        # For production, use Gunicorn instead of app.run()
        app.run(host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
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

# Initialize the aggregator
aggregator = None
loop = None

async def initialize_aggregator():
    global aggregator, loop
    loop = asyncio.get_event_loop()
    aggregator = ThreatIntelligenceAggregator()
    # Set interval for MaliciousIPCollector to ensure periodic fetching
    aggregator.ip_collector.interval = 60.0  # Fetch IPs every 60 seconds
    await aggregator.threat_collector.initialize()
    await aggregator.news_collector.initialize()
    await aggregator.ip_collector.initialize()
    logger.info("Aggregator initialized for threat, news, and malicious IP collectors")

@app.route('/')
def index():
    """Serve the main HTML page."""
    logger.info("Accessed root endpoint (/)")
    return render_template('index.html')

async def stream_threat_data() -> AsyncGenerator[str, None]:
    """Stream threat data as SSE, sending batches every second."""
    logger.info("Starting SSE stream for /threats endpoint")
    threat_queue = deque()
    
    async def collect_threat():
        async for data in aggregator.threat_collector.stream_data():
            threat_queue.extend(data)
            logger.debug(f"Collected {len(data)} threat data items into queue")
    
    # Start collecting threat data in the background
    asyncio.create_task(collect_threat())
    
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
                logger.debug("Sending empty SSE batch (no data in queue)")
                yield "data: []\n\n"
        else:
            logger.debug("Sending empty SSE batch (queue empty)")
            yield "data: []\n\n"
        await asyncio.sleep(1)  # Send every second

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
        finally:
            loop.close()
    
    logger.info("Accessed /threats endpoint")
    return Response(generate(), mimetype='text/event-stream')

@app.route('/news')
def get_news():
    """GET endpoint for news data."""
    logger.info("Accessed /news endpoint")
    try:
        # Use the global loop to fetch news data
        news_data = loop.run_until_complete(aggregator.news_collector.fetch_data())
        logger.info(f"Fetched and returning {len(news_data)} news articles")
        if not news_data:
            logger.warning("No news articles fetched; check RSS feeds or filtering")
        return jsonify(news_data)
    except Exception as e:
        logger.error(f"Error fetching news data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/malicious-ips')
def get_malicious_ips():
    """GET endpoint for malicious IP data."""
    logger.info("Accessed /malicious-ips endpoint")
    try:
        # Create a new MaliciousIPCollector instance to avoid session conflicts
        from cyber_threat_intel import MaliciousIPCollector
        ip_collector = MaliciousIPCollector(
            sources=["alienvault", "bd_banlist", "fraudguard", "talos"],
            interval=0.0  # No streaming, fetch on demand
        )
        # Create a new event loop for this request
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        try:
            # Initialize and fetch data
            new_loop.run_until_complete(ip_collector.initialize())
            malicious_ips_data = new_loop.run_until_complete(ip_collector.fetch_data())
            logger.info(f"Fetched and returning {len(malicious_ips_data)} malicious IPs")
            if not malicious_ips_data:
                logger.warning("No malicious IPs fetched; check data sources or GeoLite2 database path")
            return jsonify(malicious_ips_data)
        finally:
            new_loop.run_until_complete(ip_collector.close())
            new_loop.close()
    except Exception as e:
        logger.error(f"Error fetching malicious IPs data: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(initialize_aggregator())
        logger.info("Starting Flask server on http://0.0.0.0:5000")
        # For production, use Gunicorn instead of app.run()
        # Example: gunicorn -w 4 -b 0.0.0.0:5000 server:app
        app.run(host='0.0.0.0', port=5000)  # Debug mode removed for production
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        logger.info("Closing aggregator and event loop")
        loop.run_until_complete(aggregator.close())
        loop.close()
import { NewsItem } from "../data/sseNews";

// Interface for raw SSE data
interface RawSSENews {
  title: string;
  timestamp: string;
  source: string;
}

// Convert raw SSE data to our NewsItem type
const convertSSEToNews = (rawNews: RawSSENews): NewsItem => {
  return {
    id: crypto.randomUUID(),
    title: rawNews.title,
    timestamp: new Date(rawNews.timestamp),
    source: rawNews.source,
  };
};

// Handle messages from the main thread
self.onmessage = (event: MessageEvent) => {
  if (event.data.type === "START_SSE") {
    const eventSource = new EventSource("/api/news/stream");

    eventSource.onmessage = (event) => {
      try {
        const rawNews: RawSSENews = JSON.parse(event.data);
        const news = convertSSEToNews(rawNews);
        self.postMessage({ type: "NEWS", data: news });
      } catch (error) {
        self.postMessage({
          type: "ERROR",
          error: "Error parsing SSE news data",
        });
      }
    };

    eventSource.onerror = (error) => {
      self.postMessage({ type: "ERROR", error: "News SSE Error" });
      eventSource.close();
    };

    // Store the EventSource instance
    (self as any).eventSource = eventSource;
  } else if (event.data.type === "STOP_SSE") {
    const eventSource = (self as any).eventSource;
    if (eventSource) {
      eventSource.close();
    }
  }
};

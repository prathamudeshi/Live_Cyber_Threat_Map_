import { v4 as uuidv4 } from "uuid";

export interface NewsItem {
  id: string;
  title: string;
  timestamp: Date;
  source: string;
}

// Interface for raw SSE data
interface RawSSENews {
  title: string;
  timestamp: string;
  source: string;
}

// Interface for raw API news data
interface RawAPINews {
  link: string;
  timestamp: string;
  title: string;
}

// Convert raw SSE data to our NewsItem type
const convertSSEToNews = (rawNews: RawSSENews): NewsItem => {
  return {
    id: uuidv4(),
    title: rawNews.title,
    timestamp: new Date(rawNews.timestamp),
    source: rawNews.source,
  };
};

// Convert raw API data to our NewsItem type
const convertAPIToNews = (rawNews: RawAPINews): NewsItem => {
  return {
    id: uuidv4(),
    title: rawNews.title,
    timestamp: new Date(rawNews.timestamp),
    source: rawNews.link,
  };
};

// Function to start SSE connection for news
export const startNewsSSEConnection = (
  onNews: (news: NewsItem) => void,
  onError: (error: Event) => void
): EventSource => {
  const eventSource = new EventSource("/api/news/stream");

  eventSource.onmessage = (event) => {
    try {
      const rawNews: RawSSENews = JSON.parse(event.data);
      const news = convertSSEToNews(rawNews);
      onNews(news);
    } catch (error) {
      console.error("Error parsing SSE news data:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("News SSE Error:", error);
    onError(error);
    eventSource.close();
  };

  return eventSource;
};

// Function to stop SSE connection
export const stopNewsSSEConnection = (eventSource: EventSource): void => {
  if (eventSource) {
    eventSource.close();
  }
};

// Function to fetch news data from API
export const fetchNewsData = async (): Promise<NewsItem[]> => {
  try {
    const response = await fetch("http://localhost:5000/news");
    if (!response.ok) {
      throw new Error("Failed to fetch news data");
    }
    const rawNewsData: RawAPINews[] = await response.json();
    return rawNewsData.map(convertAPIToNews);
  } catch (error) {
    console.error("Error fetching news data:", error);
    return [];
  }
};

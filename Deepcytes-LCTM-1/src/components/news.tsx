import React, { useEffect, useState, useRef } from "react";
import { NewsItem } from "../data/sseNews";

const dummyNewsItems = [
  {
    id: "1",
    title: "Critical zero-day exploit found in Microsoft Exchange",
    timestamp: new Date("2023-10-01T12:00:00Z"),
    source: "https://www.bleepingcomputer.com/news/security/",
  },
  {
    id: "2",
    title: "MegaCorp data breach exposes 50M user records",
    timestamp: new Date("2023-10-01T11:00:00Z"),
    source: "https://www.securityweek.com/",
  },
  {
    id: "3",
    title: 'New ransomware strain "BlackMatter" targets hospitals',
    timestamp: new Date("2023-10-01T10:00:00Z"),
    source: "https://www.zdnet.com/security/",
  },
  {
    id: "4",
    title: "Apache Struts vulnerability allows remote code execution",
    timestamp: new Date("2023-10-01T09:00:00Z"),
    source: "https://www.bleepingcomputer.com/news/security/",
  },
  {
    id: "5",
    title: "Phishing campaign targets Fortune 500 companies",
    timestamp: new Date("2023-10-01T08:00:00Z"),
    source: "https://www.securityweek.com/",
  },
  {
    id: "6",
    title: "New Linux malware discovered in the wild",
    timestamp: new Date("2023-10-01T07:00:00Z"),
    source: "https://www.zdnet.com/security/",
  },
];

interface NewsProps {
  useSSE?: boolean;
  itemsPerPage?: number;
}

interface FlipTileProps {
  currentNews: NewsItem;
  previousNews: NewsItem | null;
  isFlipped: boolean;
  tileIndex: number;
  flipDirection: "forward" | "backward";
}

const FlipTile: React.FC<FlipTileProps> = ({
  currentNews,
  previousNews,
  isFlipped,
  tileIndex,
  flipDirection,
}) => {
  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className="flip-container"
      style={{
        animationDelay: `${tileIndex * 80}ms`,
      }}
    >
      <div
        className={`flip-card ${
          isFlipped ? "flipped" : ""
        } flip-${flipDirection}`}
      >
        {/* Front Side - Current News */}
        <div className="flip-card-front">
          <div className="p-3 bg-gray-700 bg-opacity-50 rounded hover:bg-gray-600 transition-colors min-h-20">
            <div className="text-sm font-medium news-title-truncate">
              {currentNews.title}
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-gray-400">
                {formatTimestamp(currentNews.timestamp)}
              </div>
              <a
                href={currentNews.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Source
              </a>
            </div>
          </div>
        </div>

        {/* Back Side - Previous News */}
        <div className="flip-card-back">
          <div className="p-3 bg-gray-600 bg-opacity-60 rounded border-l-4 border-orange-500 min-h-20">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-xs text-orange-400 font-medium">
                OLDER NEWS
              </span>
            </div>
            <div className="text-sm font-medium text-gray-200 news-title-truncate">
              {previousNews ? previousNews.title : "No previous news available"}
            </div>
            {previousNews && (
              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-400">
                  {formatTimestamp(previousNews.timestamp)}
                </div>
                <a
                  href={previousNews.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Source
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .flip-container {
          perspective: 1200px;
          height: auto;
          min-height: 80px;
          margin-bottom: 12px;
        }

        .flip-card {
          position: relative;
          width: 100%;
          height: auto;
          min-height: 80px;
          text-align: left;
          transition: transform 1.2s cubic-bezier(0.23, 1, 0.32, 1);
          transform-style: preserve-3d;
          transform-origin: center center;
        }

        /* Title truncation styles */
        .news-title-truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
          max-height: calc(1.4em * 2); /* 2 lines with line-height of 1.4 */
        }

        /* Smooth flip animations based on direction */
        .flip-card.flip-forward.flipped {
          transform: rotateY(-180deg);
        }

        .flip-card.flip-backward.flipped {
          transform: rotateY(180deg);
        }

        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          min-height: 80px;
          backface-visibility: hidden;
          border-radius: 8px;
          top: 0;
          left: 0;
          transition: opacity 0.3s ease-in-out;
        }

        /* Adjust back face rotation based on flip direction */
        .flip-card.flip-forward .flip-card-back {
          transform: rotateY(180deg);
        }

        .flip-card.flip-backward .flip-card-back {
          transform: rotateY(-180deg);
        }

        .flip-card-front {
          z-index: 2;
          transform: rotateY(0deg);
        }

        /* Smoother entrance animation */
        @keyframes smoothFlipIn {
          0% {
            transform: perspective(800px) rotateY(60deg) translateZ(-40px);
            opacity: 0;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: perspective(800px) rotateY(0deg) translateZ(0px);
            opacity: 1;
          }
        }

        /* Enhanced flip transition with scaling */
        .flip-card.flipped {
          transform-origin: center center;
        }

        .flip-card:not(.flipped) {
          transform: scale(1);
        }

        /* Add subtle scaling during flip */
        @keyframes flipScale {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        .flip-card.flipped {
          animation: flipScale 1.2s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .flip-container {
          animation: smoothFlipIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        /* Smooth hover effects */
        .flip-card:hover {
          transform: translateY(-2px) scale(1.02);
          transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .flip-card.flipped:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .flip-card.flip-forward.flipped:hover {
          transform: translateY(-2px) scale(1.02) rotateY(-180deg);
        }

        .flip-card.flip-backward.flipped:hover {
          transform: translateY(-2px) scale(1.02) rotateY(180deg);
        }

        /* Custom scrollbar for page dots */
        .page-dots-container::-webkit-scrollbar {
          height: 4px;
        }

        .page-dots-container::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.3);
          border-radius: 2px;
        }

        .page-dots-container::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }

        .page-dots-container::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </div>
  );
};

const News: React.FC<NewsProps> = ({ useSSE = false, itemsPerPage = 3 }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">(
    "forward"
  );
  const [displayedItems, setDisplayedItems] = useState<NewsItem[]>([]);
  const [previousDisplayedItems, setPreviousDisplayedItems] = useState<
    NewsItem[]
  >([]);
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Initialize Web Worker
  useEffect(() => {
    if (useSSE) {
      workerRef.current = new Worker(
        new URL("../workers/newsWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (event) => {
        if (event.data.type === "NEWS") {
          setNewsItems((prev) => {
            const newItems = [event.data.data, ...prev];
            return newItems.slice(0, itemsPerPage * 3); // Keep only the latest items
          });
        } else if (event.data.type === "ERROR") {
          console.error("News Worker Error:", event.data.error);
        }
      };

      // Start SSE connection
      workerRef.current.postMessage({ type: "START_SSE" });

      return () => {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: "STOP_SSE" });
          workerRef.current.terminate();
        }
      };
    }
  }, [useSSE, itemsPerPage]);

  // Fetch initial news data if not using SSE
  useEffect(() => {
    if (!useSSE) {
      const loadNewsData = async () => {
        try {
          const response = await fetch("http://localhost:5000/news");
          if (!response.ok) {
            throw new Error("Failed to fetch news data");
          }
          const newsData = await response.json();
          setNewsItems(newsData);
          setDisplayedItems(newsData.slice(0, itemsPerPage));
        } catch (error) {
          console.error("Error loading news data:", error);
        }
      };

      loadNewsData();
    }
  }, [useSSE, itemsPerPage]);

  // Calculate pagination values
  const totalPages = Math.ceil(newsItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = newsItems.slice(startIndex, endIndex);

  // Update displayed items when not flipping
  useEffect(() => {
    if (!isFlipping) {
      setDisplayedItems(currentItems);
    }
  }, [currentPage, newsItems, isFlipping]);

  // Enhanced navigation with smoother timing
  const navigateToPage = (
    newPage: number,
    direction: "forward" | "backward"
  ) => {
    if (
      newPage === currentPage ||
      isFlipping ||
      newPage < 1 ||
      newPage > totalPages
    ) {
      return;
    }

    // Clear any existing timeout
    if (flipTimeoutRef.current) {
      clearTimeout(flipTimeoutRef.current);
    }

    // Store current items as previous before flipping
    setPreviousDisplayedItems(displayedItems);
    setFlipDirection(direction);
    setIsFlipping(true);

    // Smoother timing for the flip sequence
    flipTimeoutRef.current = setTimeout(() => {
      setCurrentPage(newPage);
      const newStartIndex = (newPage - 1) * itemsPerPage;
      const newEndIndex = newStartIndex + itemsPerPage;
      const newItems = newsItems.slice(newStartIndex, newEndIndex);
      setDisplayedItems(newItems);

      // Extended timeout for smoother transition completion
      flipTimeoutRef.current = setTimeout(() => {
        setIsFlipping(false);
      }, 200);
    }, 600); // Increased to match the smoother animation duration
  };

  const goToPrevPage = () => {
    const newPage = Math.max(currentPage - 1, 1);
    if (newPage !== currentPage) {
      navigateToPage(newPage, "backward");
    }
  };

  const goToNextPage = () => {
    const newPage = Math.min(currentPage + 1, totalPages);
    if (newPage !== currentPage) {
      navigateToPage(newPage, "forward");
    }
  };

  const goToSpecificPage = (page: number) => {
    const direction = page > currentPage ? "forward" : "backward";
    navigateToPage(page, direction);
  };

  // Generate page numbers with smart truncation
  const getVisiblePages = () => {
    const maxVisiblePages = 7;
    const sidePages = 1; // Pages to show on each side of current page

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];

    // Determine if we need ellipsis on left and right
    const needsLeftEllipsis = currentPage > 4;
    const needsRightEllipsis = currentPage < totalPages - 3;

    // Always show first page
    pages.push(1);

    // Add left ellipsis if current page is far from start
    if (needsLeftEllipsis) {
      pages.push(-1); // -1 represents left ellipsis
    }

    // Calculate the range of pages to show around current page
    let start, end;

    if (currentPage <= 3) {
      // Near the beginning: show pages 2, 3, 4, 5
      start = 2;
      end = Math.min(5, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      // Near the end: show last 4 pages before the final page
      start = Math.max(2, totalPages - 4);
      end = totalPages - 1;
    } else {
      // In the middle: show current page and neighbors
      start = currentPage - sidePages;
      end = currentPage + sidePages;
    }

    // Add the middle pages (avoid duplicating page 1 or last page)
    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages && !pages.includes(i)) {
        pages.push(i);
      }
    }

    // Add right ellipsis if current page is far from end
    if (needsRightEllipsis) {
      pages.push(-2); // -2 represents right ellipsis (different from left)
    }

    // Always show last page (if more than 1 page total)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
      }
    };
  }, []);

  // Reset to first page when news items change significantly
  useEffect(() => {
    if (!isFlipping) {
      setCurrentPage(1);
      setDisplayedItems(newsItems.slice(0, itemsPerPage));
    }
  }, [newsItems.length, itemsPerPage]);

  // Initialize displayed items
  useEffect(() => {
    if (displayedItems.length === 0) {
      setDisplayedItems(currentItems);
    }
  }, [currentItems]);

  const visiblePages = getVisiblePages();

  return (
    <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Threat News</h3>
        <div className="text-xs text-gray-400">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      <div className="space-y-3 min-h-64">
        {displayedItems.map((news, index) => (
          <FlipTile
            key={`${currentPage}-${news.id}-${index}`}
            currentNews={news}
            previousNews={previousDisplayedItems[index] || null}
            isFlipped={isFlipping}
            tileIndex={index}
            flipDirection={flipDirection}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 px-2">
          {/* Previous Button */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1 || isFlipping}
            className={`group relative p-3 rounded-full transition-all duration-300 flex-shrink-0 ${
              currentPage === 1 || isFlipping
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-gray-700 hover:bg-opacity-50 hover:scale-110 active:scale-95"
            }`}
            aria-label="Previous page"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-all duration-300 ${
                currentPage === 1 || isFlipping
                  ? "text-gray-600"
                  : "text-gray-300 group-hover:text-white group-hover:-translate-x-0.5"
              }`}
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {currentPage !== 1 && !isFlipping && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            )}
          </button>

          {/* Page Dots Container */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-900 bg-opacity-40 rounded-full backdrop-blur-sm border border-gray-600 border-opacity-30 max-w-xs overflow-x-auto page-dots-container">
              {visiblePages.map((page, index) =>
                page === -1 ? (
                  <span
                    key={`left-ellipsis-${index}`}
                    className="text-gray-500 text-sm px-1"
                  >
                    ...
                  </span>
                ) : page === -2 ? (
                  <span
                    key={`right-ellipsis-${index}`}
                    className="text-gray-500 text-sm px-1"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToSpecificPage(page)}
                    disabled={isFlipping}
                    className={`relative w-3 h-3 rounded-full transition-all duration-300 flex-shrink-0 ${
                      currentPage === page
                        ? "bg-white shadow-lg shadow-white/30 scale-125"
                        : isFlipping
                        ? "bg-gray-600 cursor-not-allowed opacity-50"
                        : "bg-gray-500 hover:bg-gray-400 hover:scale-110 active:scale-95"
                    }`}
                    aria-label={`Go to page ${page}`}
                  >
                    {currentPage === page && !isFlipping && (
                      <div className="absolute inset-0 rounded-full bg-white animate-pulse opacity-60" />
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || isFlipping}
            className={`group relative p-3 rounded-full transition-all duration-300 flex-shrink-0 ${
              currentPage === totalPages || isFlipping
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-gray-700 hover:bg-opacity-50 hover:scale-110 active:scale-95"
            }`}
            aria-label="Next page"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-all duration-300 ${
                currentPage === totalPages || isFlipping
                  ? "text-gray-600"
                  : "text-gray-300 group-hover:text-white group-hover:translate-x-0.5"
              }`}
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {currentPage !== totalPages && !isFlipping && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default News;

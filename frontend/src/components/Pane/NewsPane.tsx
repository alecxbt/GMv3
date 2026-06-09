import { useEffect, useState } from 'react';
import type { Pane, NewsItem } from '@shared/types';
import { marketDataApi, cryptoApi } from '../../services/api';

interface NewsPaneProps {
  pane: Pane;
}

export function NewsPane({ pane }: NewsPaneProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
      setLoading(true);
        
        // Check if it's crypto or equity
        if (pane.assetType === 'crypto' || pane.config?.isPair) {
          const newsData = await cryptoApi.getNews(pane.ticker || '', 20);
          setNews(newsData.news);
        } else {
          const newsData = await marketDataApi.getNews(pane.ticker || 'MARKET', 20);
          setNews(newsData.news);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setNews([]);
      } finally {
      setLoading(false);
      }
    };

    if (pane.ticker) {
    fetchNews();
    }
  }, [pane.ticker, pane.config?.countryCode, pane.assetType, pane.config?.isPair]);

  if (loading) {
    return <div className="pane-loading">Loading news...</div>;
  }

  return (
    <div className="news-pane">
      <div className="news-list">
        {news.map((item) => (
          <div key={item.id} className="news-item">
            <div className="news-item-header">
              <span className="news-source">{item.source}</span>
              <span className="news-time">
                {new Date(item.publishedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="news-title">{item.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


import { useEffect, useState } from 'react';
import type { Pane, NewsItem } from '../../../shared/src/types';

interface RSSPaneProps {
  pane: Pane;
}

export function RSSPane({ pane }: RSSPaneProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const label = pane.config?.label;
    if (!label) return;

    const fetchRSS = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rss/${encodeURIComponent(label)}`);
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        } else {
          // Mock data
          setItems([
            {
              id: '1',
              title: 'Sample RSS item 1',
              source: label,
              url: '#',
              publishedAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch RSS:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRSS();
  }, [pane.config?.label]);

  if (loading) {
    return <div className="pane-loading">Loading RSS feed...</div>;
  }

  return (
    <div className="rss-pane">
      <div className="rss-header">
        <h3>RSS: {pane.config?.label}</h3>
      </div>
      <div className="rss-items">
        {items.map((item) => (
          <div key={item.id} className="rss-item">
            <div className="rss-item-title">{item.title}</div>
            <div className="rss-item-meta">
              {new Date(item.publishedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


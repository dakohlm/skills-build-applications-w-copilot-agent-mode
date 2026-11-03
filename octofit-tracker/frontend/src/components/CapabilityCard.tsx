import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type ApiItem = Record<string, unknown>;
type Props = {
  title: string;
  description: string;
  endpoint: string;
  dataKey: string;
  emptyText: string;
  renderItem: (item: ApiItem) => ReactNode;
};

function isRecord(value: unknown): value is ApiItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function CapabilityCard({ title, description, endpoint, dataKey, emptyText, renderItem }: Props) {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getJson<unknown>(endpoint)
      .then((payload) => {
        if (!isRecord(payload) || !Array.isArray(payload[dataKey]) || !payload[dataKey].every(isRecord)) {
          throw new Error('The server returned an unexpected response');
        }
        if (active) {
          setItems(payload[dataKey]);
          setStatus('success');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [dataKey, endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}: {errorMessage}</p>}
        {status === 'success' && items.length === 0 && <p>{emptyText}</p>}
        {status === 'success' && items.length > 0 && (
          <ul className="list-group list-group-flush">
            {items.map((item, index) => <li className="list-group-item" key={String(item._id ?? index)}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

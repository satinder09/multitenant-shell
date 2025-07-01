// 'use client' directive for Next.js client component
'use client';

import { useEffect, useState } from 'react';
import { browserApi } from '@/shared/services/api-client';

export default function HealthTestPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Call the Next.js health proxy endpoint
    browserApi.get('/api/health')
      .then(response => {
        setHealthData(response);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Health Test</h1>
      {error && (
        <pre style={{ color: 'red' }}>{error}</pre>
      )}
      {healthData ? (
        <pre>{JSON.stringify(healthData, null, 2)}</pre>
      ) : !error ? (
        <p>Loading…</p>
      ) : null}
    </div>
  );
} 
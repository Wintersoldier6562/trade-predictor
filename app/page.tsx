'use client';

import { useState } from 'react';

interface AnalysisResult {
  message?: string;
  results?: any[];
  timestamp?: string;
  error?: string;
}

export default function Home() {
  const [stocks, setStocks] = useState('ITBEES,RELIANCE,TCS');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stocks.split(',').map((s: string) => s.trim())
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to analyze stocks' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Trend Predictor - Stock Analysis</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="stocks" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Stocks to analyze (comma-separated):
        </label>
        <input
          id="stocks"
          type="text"
          value={stocks}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStocks(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          placeholder="ITBEES,RELIANCE,TCS"
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '1rem'
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze Stocks'}
      </button>

      {result && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          <h3>Analysis Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h3>API Endpoints:</h3>
        <ul>
          <li><code>GET /api/health</code> - Health check</li>
          <li><code>POST /api/analyze-stocks</code> - Analyze stocks</li>
          <li><code>POST /api/cron/stock-analysis</code> - Cron job endpoint</li>
        </ul>
        
        <h3>Cron Schedule:</h3>
        <p>Stock analysis runs automatically every weekday at 9:00 AM IST</p>
      </div>
    </div>
  );
}

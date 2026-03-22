'use client';
import { useState, useEffect } from 'react';

type Opportunity = {
  symbol: string;
  name: string;
  score: number;
  direction: 'LONG' | 'SHORT';
  change: string;
  entry: number;
  risk: number;
  color: string;
};

const ALL_OPPORTUNITIES: Opportunity[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', score: 82, direction: 'LONG', change: '+2.4%', entry: 68420, risk: 1.2, color: '#f59e0b' },
  { symbol: 'ETH/USD', name: 'Ethereum', score: 74, direction: 'LONG', change: '+1.8%', entry: 3640, risk: 1.5, color: '#776bff' },
  { symbol: 'AAPL', name: 'Apple', score: 71, direction: 'LONG', change: '+0.9%', entry: 182.40, risk: 1.0, color: '#29e17c' },
  { symbol: 'GOLD', name: 'Or', score: 68, direction: 'LONG', change: '+0.6%', entry: 2318, risk: 0.9, color: '#f59e0b' },
  { symbol: 'EUR/USD', name: 'Euro/Dollar', score: 65, direction: 'LONG', change: '+0.3%', entry: 1.0842, risk: 0.7, color: '#2d7cff' },
  { symbol: 'NVDA', name: 'Nvidia', score: 79, direction: 'LONG', change: '+3.1%', entry: 874.50, risk: 1.8, color: '#29e17c' },
  { symbol: 'OIL/USD', name: 'Pétrole', score: 43, direction: 'SHORT', change: '-1.2%', entry: 78.30, risk: 1.1, color: '#f87171' },
  { symbol: 'SPX500', name: 'S&P 500', score: 38, direction: 'SHORT', change: '-0.3%', entry: 5248, risk: 0.8, color: '#f87171' },
  { symbol: 'BNB/USD', name: 'BNB', score: 77, direction: 'LONG', change: '+2.0%', entry: 412.60, risk: 1.4, color: '#f59e0b' },
  { symbol: 'MSFT', name: 'Microsoft', score: 69, direction: 'LONG', change: '+1.1%', entry: 420.80, risk: 0.9, color: '#2d7cff' },
];

function getTopOpportunities(seed: number): Opportunity[] {
  // Rotate list deterministically based on seed for "refresh" effect
  const shifted = [...ALL_OPPORTUNITIES.slice(seed % 3), ...ALL_OPPORTUNITIES.slice(0, seed % 3)];
  return shifted
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="opp-score-bar-bg">
      <div
        className="opp-score-bar-fill"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
}

export function OpportunitiesWidget() {
  const [seed, setSeed] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const opportunities = getTopOpportunities(seed);

  useEffect(() => {
    const now = new Date();
    setLastUpdate(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  }, [seed]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        setSeed(s => s + 1);
        setRefreshing(false);
      }, 400);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSeed(s => s + 1);
      setRefreshing(false);
    }, 400);
  };

  return (
    <div className="opp-shell">
      <div className="opp-header">
        <div className="opp-title-row">
          <span className="demo-live-dot" />
          <h3 className="opp-title">Opportunités en temps réel</h3>
        </div>
        <div className="opp-header-right">
          {lastUpdate && <span className="opp-update">MAJ {lastUpdate}</span>}
          <button
            className={`opp-refresh-btn${refreshing ? ' spinning' : ''}`}
            onClick={handleRefresh}
            aria-label="Rafraîchir"
          >
            ↻
          </button>
        </div>
      </div>

      <div className={`opp-list${refreshing ? ' opp-list-fade' : ''}`}>
        {opportunities.map((opp, i) => {
          const scoreColor = opp.score >= 75 ? '#29e17c' : opp.score >= 60 ? '#f59e0b' : '#2d7cff';
          return (
            <div key={opp.symbol} className="opp-row">
              <div className="opp-rank">{i + 1}</div>
              <div className="opp-info">
                <div className="opp-symbol-row">
                  <span className="opp-symbol">{opp.symbol}</span>
                  <span
                    className={`opp-dir${opp.direction === 'LONG' ? ' opp-long' : ' opp-short'}`}
                  >
                    {opp.direction === 'LONG' ? '▲' : '▼'} {opp.direction}
                  </span>
                  <span className={`opp-change${opp.change.startsWith('+') ? ' pos' : ' neg'}`}>
                    {opp.change}
                  </span>
                </div>
                <ScoreBar score={opp.score} color={scoreColor} />
              </div>
              <div className="opp-score-block">
                <span className="opp-score-num" style={{ color: scoreColor }}>{opp.score}</span>
                <span className="opp-score-unit">/100</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="opp-footer">
        Score IA sur 30+ paramètres · Données simulées · Mise à jour automatique
      </p>
    </div>
  );
}

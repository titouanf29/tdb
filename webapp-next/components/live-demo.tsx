'use client';
import { useState, useEffect, useRef } from 'react';

const ASSETS = [
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    emoji: '₿',
    price: 68420,
    change: '+2.4%',
    direction: 'LONG',
    score: 82,
    entry: 68420,
    sl: 66800,
    tp: 71500,
    risk: 1.2,
    confidence: 'Élevée',
    context: 'SMA200 haussière, VIX neutre, momentum positif',
    factors: [
      { label: 'Technique', score: 85, color: '#2d7cff' },
      { label: 'Volume', score: 78, color: '#06b6d4' },
      { label: 'Momentum', score: 80, color: '#f59e0b' },
      { label: 'Contexte', score: 72, color: '#776bff' },
      { label: 'Sentiment', score: 68, color: '#29e17c' },
      { label: 'Volatilité', score: 75, color: '#f87171' },
    ],
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    emoji: 'Ξ',
    price: 3640,
    change: '+1.8%',
    direction: 'LONG',
    score: 74,
    entry: 3640,
    sl: 3520,
    tp: 3820,
    risk: 1.5,
    confidence: 'Modérée',
    context: 'Au-dessus SMA200, RSI 58, volume en hausse',
    factors: [
      { label: 'Technique', score: 72, color: '#2d7cff' },
      { label: 'Volume', score: 80, color: '#06b6d4' },
      { label: 'Momentum', score: 65, color: '#f59e0b' },
      { label: 'Contexte', score: 70, color: '#776bff' },
      { label: 'Sentiment', score: 75, color: '#29e17c' },
      { label: 'Volatilité', score: 60, color: '#f87171' },
    ],
  },
  {
    symbol: 'GOLD/USD',
    name: 'Or',
    emoji: '⚡',
    price: 2318,
    change: '+0.6%',
    direction: 'LONG',
    score: 61,
    entry: 2318,
    sl: 2285,
    tp: 2375,
    risk: 0.9,
    confidence: 'Modérée',
    context: 'Tendance haussière long terme, zone support clé',
    factors: [
      { label: 'Technique', score: 65, color: '#2d7cff' },
      { label: 'Volume', score: 55, color: '#06b6d4' },
      { label: 'Momentum', score: 58, color: '#f59e0b' },
      { label: 'Contexte', score: 70, color: '#776bff' },
      { label: 'Sentiment', score: 52, color: '#29e17c' },
      { label: 'Volatilité', score: 65, color: '#f87171' },
    ],
  },
  {
    symbol: 'SPX500',
    name: 'S&P 500',
    emoji: '📊',
    price: 5248,
    change: '-0.3%',
    direction: 'SHORT',
    score: 38,
    entry: 5248,
    sl: 5310,
    tp: 5120,
    risk: 0.8,
    confidence: 'Faible',
    context: 'RSI surachat, résistance majeure, VIX hausse',
    factors: [
      { label: 'Technique', score: 35, color: '#2d7cff' },
      { label: 'Volume', score: 45, color: '#06b6d4' },
      { label: 'Momentum', score: 30, color: '#f59e0b' },
      { label: 'Contexte', score: 40, color: '#776bff' },
      { label: 'Sentiment', score: 38, color: '#29e17c' },
      { label: 'Volatilité', score: 42, color: '#f87171' },
    ],
  },
];

function ScoreMeter({ score, animated }: { score: number; animated: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!animated) { setDisplayed(0); return; }
    let start: number | null = null;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(ease * score));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animated, score]);

  const color = score >= 75 ? '#29e17c' : score >= 60 ? '#f59e0b' : score >= 40 ? '#2d7cff' : '#f87171';
  const label = score >= 75 ? 'Signal fort' : score >= 60 ? 'Opportunité' : score >= 40 ? 'Surveillance' : 'Ignorer';
  const pct = (displayed / 100) * 100;

  return (
    <div className="demo-score-meter">
      <div className="demo-score-ring" style={{ '--score-color': color, '--pct': `${pct}%` } as React.CSSProperties}>
        <span className="demo-score-num" style={{ color }}>{displayed}</span>
        <span className="demo-score-label">/100</span>
      </div>
      <div className="demo-score-badge" style={{ color, borderColor: color + '44', background: color + '11' }}>
        {label}
      </div>
    </div>
  );
}

export function LiveDemo() {
  const [selected, setSelected] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);

  const asset = ASSETS[selected];

  const STEPS = [
    'Collecte des données marché...',
    'Analyse technique multi-timeframe...',
    'Calcul RSI, MACD, SMA200...',
    'Évaluation du contexte macro...',
    'Analyse volume et momentum...',
    'Scoring IA en cours...',
  ];

  const handleAnalyze = () => {
    if (analyzing) return;
    setDone(false);
    setStep(0);
    setAnalyzing(true);
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setStep(s);
      if (s >= STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setAnalyzing(false);
          setDone(true);
        }, 300);
      }
    }, 380);
  };

  const handleAssetChange = (i: number) => {
    setSelected(i);
    setDone(false);
    setAnalyzing(false);
    setStep(0);
  };

  return (
    <div className="demo-shell">
      <div className="demo-header">
        <div className="demo-title-row">
          <span className="demo-live-dot" />
          <span className="demo-live-text">DEMO INTERACTIVE</span>
        </div>
        <p className="demo-subtitle">Sélectionnez un actif et lancez une analyse IA en temps réel</p>
      </div>

      <div className="demo-asset-tabs">
        {ASSETS.map((a, i) => (
          <button
            key={a.symbol}
            className={`demo-asset-tab${selected === i ? ' demo-asset-tab-active' : ''}`}
            onClick={() => handleAssetChange(i)}
          >
            <span className="demo-asset-emoji">{a.emoji}</span>
            <span className="demo-asset-sym">{a.symbol}</span>
            <span className={`demo-asset-chg${a.change.startsWith('+') ? ' pos' : ' neg'}`}>{a.change}</span>
          </button>
        ))}
      </div>

      <div className="demo-body">
        <div className="demo-panel demo-panel-left">
          <div className="demo-price-row">
            <span className="demo-price">{asset.price.toLocaleString('fr-FR')} $</span>
            <span className={`demo-dir-badge${asset.direction === 'LONG' ? ' long' : ' short'}`}>
              {asset.direction === 'LONG' ? '▲' : '▼'} {asset.direction}
            </span>
          </div>
          <p className="demo-context">{asset.context}</p>

          {!analyzing && !done && (
            <button className="btn btn-primary demo-analyze-btn" onClick={handleAnalyze}>
              Analyser {asset.symbol}
            </button>
          )}

          {analyzing && (
            <div className="demo-scanning">
              <div className="demo-scan-spinner" />
              <div className="demo-scan-steps">
                {STEPS.map((s, i) => (
                  <div key={i} className={`demo-scan-step${i < step ? ' done' : i === step - 1 ? ' active' : ''}`}>
                    <span className="demo-scan-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {done && (
            <div className="demo-result">
              <div className="demo-result-row">
                <span>Entrée</span><strong>{asset.entry.toLocaleString('fr-FR')} $</strong>
              </div>
              <div className="demo-result-row">
                <span>Stop Loss</span><strong style={{ color: '#f87171' }}>{asset.sl.toLocaleString('fr-FR')} $</strong>
              </div>
              <div className="demo-result-row">
                <span>Take Profit</span><strong style={{ color: '#29e17c' }}>{asset.tp.toLocaleString('fr-FR')} $</strong>
              </div>
              <div className="demo-result-row">
                <span>Risque portefeuille</span><strong>{asset.risk}%</strong>
              </div>
              <div className="demo-result-row">
                <span>Confiance IA</span><strong>{asset.confidence}</strong>
              </div>
              <button className="btn btn-secondary demo-retry-btn" onClick={handleAnalyze}>
                Relancer l&apos;analyse
              </button>
            </div>
          )}
        </div>

        <div className="demo-panel demo-panel-right">
          <ScoreMeter score={asset.score} animated={done} />
          {done && (
            <div className="demo-factors">
              {asset.factors.map((f) => (
                <div key={f.label} className="demo-factor-row">
                  <span className="demo-factor-label">{f.label}</span>
                  <div className="demo-factor-bar-bg">
                    <div className="demo-factor-bar-fill" style={{ width: `${f.score}%`, background: f.color }} />
                  </div>
                  <span className="demo-factor-val" style={{ color: f.color }}>{f.score}</span>
                </div>
              ))}
            </div>
          )}
          {!done && !analyzing && (
            <div className="demo-placeholder-score">
              <div className="demo-score-ring demo-score-ring-empty">
                <span className="demo-score-num" style={{ color: 'var(--muted)' }}>?</span>
                <span className="demo-score-label">/100</span>
              </div>
              <p className="demo-placeholder-text">Lancez l&apos;analyse pour voir le score IA</p>
            </div>
          )}
        </div>
      </div>

      <p className="demo-disclaimer">Données simulées à des fins éducatives — aucun conseil financier</p>
    </div>
  );
}

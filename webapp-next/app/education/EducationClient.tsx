'use client';
import { useState, useEffect } from 'react';

/* ─── TYPES ─────────────────────────────────────────────── */
type Candle = { o: number; h: number; l: number; c: number; label: string };

/* ─── CANDLESTICK CHART ───────────────────────────────────── */
const CANDLES: Candle[] = [
  { o: 41800, h: 43200, l: 41200, c: 42900, label: 'J1' },
  { o: 42900, h: 43800, l: 42400, c: 43500, label: 'J2' },
  { o: 43500, h: 44100, l: 43000, c: 43200, label: 'J3' },
  { o: 43200, h: 43400, l: 41900, c: 42100, label: 'J4' },
  { o: 42100, h: 42600, l: 41400, c: 41600, label: 'J5' },
  { o: 41600, h: 42200, l: 41100, c: 42000, label: 'J6' },
  { o: 42000, h: 43500, l: 41900, c: 43300, label: 'J7' },
  { o: 43300, h: 45000, l: 43100, c: 44700, label: 'J8' },
  { o: 44700, h: 45200, l: 44100, c: 44400, label: 'J9' },
  { o: 44400, h: 45600, l: 44200, c: 45400, label: 'J10' },
  { o: 45400, h: 46200, l: 45100, c: 45900, label: 'J11' },
  { o: 45900, h: 46100, l: 44600, c: 44800, label: 'J12' },
];

function CandleChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 540; const H = 200;
  const PAD = { top: 14, right: 10, bottom: 28, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const allP = CANDLES.flatMap(c => [c.o, c.h, c.l, c.c]);
  const minP = Math.min(...allP) - 300;
  const maxP = Math.max(...allP) + 300;
  const toY = (p: number) => PAD.top + (1 - (p - minP) / (maxP - minP)) * chartH;
  const cw = chartW / CANDLES.length;
  const bodyW = cw * 0.55;
  const priceLabels = [minP + 300, (minP + maxP) / 2, maxP - 300];

  return (
    <div className="chart-wrap">
      <div className="chart-label">Graphique en bougies japonaises — BTC/USD (fictif)</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Candlestick chart">
        {/* Grid lines */}
        {priceLabels.map((p, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(p)} y2={toY(p)} stroke="rgba(39,51,78,0.6)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={toY(p) + 4} textAnchor="end" fontSize="10" fill="#9db0d0">{(p / 1000).toFixed(0)}k</text>
          </g>
        ))}
        {/* Candles */}
        {CANDLES.map((c, i) => {
          const bull = c.c >= c.o;
          const x = PAD.left + i * cw + cw / 2;
          const bodyTop = toY(Math.max(c.o, c.c));
          const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 1);
          const isHov = hovered === i;
          const color = bull ? '#29e17c' : '#f87171';
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {isHov && <rect x={PAD.left + i * cw} y={PAD.top} width={cw} height={chartH} fill="rgba(45,124,255,0.08)" rx="2" />}
              {/* Wick */}
              <line x1={x} x2={x} y1={toY(c.h)} y2={toY(c.l)} stroke={color} strokeWidth={isHov ? 2 : 1.5} />
              {/* Body */}
              <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={bull ? 'rgba(41,225,124,0.85)' : 'rgba(248,113,113,0.85)'} stroke={color} strokeWidth={isHov ? 1.5 : 1} rx="1" />
              {/* X label */}
              <text x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="#9db0d0">{c.label}</text>
            </g>
          );
        })}
        {/* Support line */}
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(41400)} y2={toY(41400)} stroke="#2d7cff" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7" />
        <text x={PAD.left + 4} y={toY(41400) - 4} fontSize="9" fill="#2d7cff">Support</text>
        {/* Resistance line */}
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(45600)} y2={toY(45600)} stroke="#776bff" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7" />
        <text x={PAD.left + 4} y={toY(45600) - 4} fontSize="9" fill="#776bff">Résistance</text>
      </svg>
      {hovered !== null && (
        <div className="candle-tooltip">
          <strong>{CANDLES[hovered].label}</strong>
          <span>O: {CANDLES[hovered].o.toLocaleString()}</span>
          <span>H: {CANDLES[hovered].h.toLocaleString()}</span>
          <span>L: {CANDLES[hovered].l.toLocaleString()}</span>
          <span>C: {CANDLES[hovered].c.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

/* ─── RSI CHART ───────────────────────────────────────────── */
const RSI_DATA = [42, 48, 55, 62, 68, 72, 76, 70, 61, 50, 38, 30, 26, 32, 41, 50, 57];

function RsiChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 540; const H = 180;
  const PAD = { top: 14, right: 14, bottom: 26, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (RSI_DATA.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - v / 100) * chartH;
  const points = RSI_DATA.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const yLabels = [0, 30, 50, 70, 100];

  return (
    <div className="chart-wrap">
      <div className="chart-label">Indicateur RSI (Relative Strength Index) sur 17 périodes</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
        {/* Zones */}
        <rect x={PAD.left} y={PAD.top} width={chartW} height={toY(70) - PAD.top} fill="rgba(248,113,113,0.07)" />
        <rect x={PAD.left} y={toY(30)} width={chartW} height={PAD.top + chartH - toY(30)} fill="rgba(41,225,124,0.07)" />
        {/* Grid + labels */}
        {yLabels.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} stroke={v === 70 || v === 30 ? 'rgba(255,255,255,0.15)' : 'rgba(39,51,78,0.5)'} strokeWidth={v === 70 || v === 30 ? 1.5 : 1} strokeDasharray={v === 50 ? '4 4' : '0'} />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fontSize="10" fill={v === 70 ? '#f87171' : v === 30 ? '#29e17c' : '#9db0d0'}>{v}</text>
          </g>
        ))}
        {/* Zone labels */}
        <text x={PAD.left + 6} y={PAD.top + 12} fontSize="9" fill="#f87171" opacity="0.8">Surachat (vente)</text>
        <text x={PAD.left + 6} y={H - PAD.bottom - 6} fontSize="9" fill="#29e17c" opacity="0.8">Survente (achat)</text>
        {/* Line */}
        <polyline points={points} fill="none" stroke="#776bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {RSI_DATA.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={hovered === i ? 5 : 3}
            fill={v >= 70 ? '#f87171' : v <= 30 ? '#29e17c' : '#776bff'}
            stroke="#05070c" strokeWidth="1.5"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }} />
        ))}
        {/* Tooltip */}
        {hovered !== null && (
          <g>
            <rect x={toX(hovered) - 22} y={toY(RSI_DATA[hovered]) - 24} width={44} height={18} rx="4" fill="#121b2d" stroke="rgba(119,107,255,0.5)" />
            <text x={toX(hovered)} y={toY(RSI_DATA[hovered]) - 11} textAnchor="middle" fontSize="10" fill="#eaf2ff" fontWeight="700">RSI {RSI_DATA[hovered]}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─── RISK/REWARD DIAGRAM ─────────────────────────────────── */
function RiskRewardDiagram() {
  const [ratio, setRatio] = useState(2);
  const entry = 100;
  const sl = 97;
  const tp = entry + (entry - sl) * ratio;
  const risk = entry - sl;
  const reward = tp - entry;

  return (
    <div className="chart-wrap">
      <div className="chart-label">Diagramme Risque / Récompense — Ratio 1:{ratio}</div>
      <div className="rr-controls">
        <span>Ratio 1:1</span>
        <input type="range" min="1" max="5" step="0.5" value={ratio} onChange={e => setRatio(Number(e.target.value))} className="rr-slider" />
        <span>1:5</span>
      </div>
      <div className="rr-visual">
        {/* TP zone */}
        <div className="rr-zone rr-tp" style={{ flex: ratio }}>
          <span className="rr-zone-label">🎯 TP</span>
          <span className="rr-price">+{reward.toFixed(1)} pts</span>
        </div>
        {/* Entry */}
        <div className="rr-entry">
          <span>→ Entrée @ {entry}</span>
        </div>
        {/* SL zone */}
        <div className="rr-zone rr-sl" style={{ flex: 1 }}>
          <span className="rr-zone-label">🛑 SL</span>
          <span className="rr-price">-{risk.toFixed(1)} pts</span>
        </div>
      </div>
      <div className="rr-stats">
        <div className="rr-stat">
          <span>Risque</span><strong style={{ color: '#f87171' }}>{risk.toFixed(1)} pts</strong>
        </div>
        <div className="rr-stat">
          <span>Récompense</span><strong style={{ color: '#29e17c' }}>{reward.toFixed(1)} pts</strong>
        </div>
        <div className="rr-stat">
          <span>Ratio</span><strong style={{ color: '#776bff' }}>1:{ratio}</strong>
        </div>
        <div className="rr-stat">
          <span>Win rate min</span><strong style={{ color: '#2d7cff' }}>{((1 / (1 + ratio)) * 100).toFixed(0)}%</strong>
        </div>
      </div>
      <p className="chart-note">💡 Avec un ratio 1:{ratio}, vous pouvez vous permettre de perdre {((1 / (1 + ratio)) * 100).toFixed(0)}% de vos trades et rester rentable.</p>
    </div>
  );
}

/* ─── POSITION SIZING CALC ───────────────────────────────── */
function PositionSizingCalc() {
  const [capital, setCapital] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [slPct, setSlPct] = useState(2);
  const riskAmount = (capital * riskPct) / 100;
  const positionSize = riskAmount / (slPct / 100);
  const positionPct = (positionSize / capital) * 100;

  return (
    <div className="calc-wrap">
      <div className="calc-title">🧮 Calculateur de Position Sizing</div>
      <div className="calc-grid">
        <div className="calc-field">
          <label>Capital total ($)</label>
          <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))} className="calc-input" min="100" />
        </div>
        <div className="calc-field">
          <label>Risque par trade (%)</label>
          <div className="calc-slider-row">
            <input type="range" min="0.5" max="5" step="0.5" value={riskPct} onChange={e => setRiskPct(Number(e.target.value))} className="rr-slider" />
            <span className="calc-val">{riskPct}%</span>
          </div>
        </div>
        <div className="calc-field">
          <label>Distance Stop Loss (%)</label>
          <div className="calc-slider-row">
            <input type="range" min="0.5" max="10" step="0.5" value={slPct} onChange={e => setSlPct(Number(e.target.value))} className="rr-slider" />
            <span className="calc-val">{slPct}%</span>
          </div>
        </div>
      </div>
      <div className="calc-result">
        <div className="calc-result-item">
          <span>Risque max</span>
          <strong style={{ color: '#f87171' }}>${riskAmount.toFixed(0)}</strong>
        </div>
        <div className="calc-result-item">
          <span>Taille position</span>
          <strong style={{ color: '#29e17c' }}>${positionSize.toFixed(0)}</strong>
        </div>
        <div className="calc-result-item">
          <span>% du capital</span>
          <strong style={{ color: '#776bff' }}>{positionPct.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}

/* ─── SCORE GAUGE ─────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const R = 70; const CX = 90; const CY = 90;
  const startAngle = -180;
  const endAngle = 0;
  const angle = startAngle + (score / 100) * 180;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const describeArc = (start: number, end: number, color: string, sw = 12) => {
    const x1 = CX + R * Math.cos(toRad(start));
    const y1 = CY + R * Math.sin(toRad(start));
    const x2 = CX + R * Math.cos(toRad(end));
    const y2 = CY + R * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />;
  };
  const pX = CX + (R - 6) * Math.cos(toRad(angle));
  const pY = CY + (R - 6) * Math.sin(toRad(angle));
  const color = score >= 75 ? '#29e17c' : score >= 60 ? '#f59e0b' : score >= 40 ? '#2d7cff' : '#f87171';
  const label = score >= 75 ? 'Signal fort' : score >= 60 ? 'Opportunité' : score >= 40 ? 'Surveillance' : 'Ignorer';

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 180 100" className="gauge-svg">
        {describeArc(-180, -108, '#f87171', 10)}
        {describeArc(-108, -72, '#2d7cff', 10)}
        {describeArc(-72, -36, '#f59e0b', 10)}
        {describeArc(-36, 0, '#29e17c', 10)}
        {describeArc(startAngle, angle, color, 12)}
        <circle cx={pX} cy={pY} r="6" fill={color} />
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}</text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="9" fill="#9db0d0">{label}</text>
        <text x={CX - R - 4} y={CY + 6} fontSize="8" fill="#f87171" textAnchor="middle">0</text>
        <text x={CX + R + 4} y={CY + 6} fontSize="8" fill="#29e17c" textAnchor="middle">100</text>
      </svg>
    </div>
  );
}

/* ─── WEIGHT BAR CHART ────────────────────────────────────── */
const WEIGHTS = [
  { label: 'Technique', value: 30, color: '#2d7cff' },
  { label: 'Contexte marché', value: 15, color: '#776bff' },
  { label: 'Volume', value: 20, color: '#06b6d4' },
  { label: 'Momentum', value: 15, color: '#f59e0b' },
  { label: 'News/Sentiment', value: 10, color: '#29e17c' },
  { label: 'Volatilité', value: 10, color: '#f87171' },
];

function WeightChart() {
  const [hov, setHov] = useState<number | null>(null);
  return (
    <div className="chart-wrap">
      <div className="chart-label">Composition du score TDB (0–100)</div>
      <div className="weight-bars">
        {WEIGHTS.map((w, i) => (
          <div key={i} className="weight-row" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <span className="weight-label">{w.label}</span>
            <div className="weight-bar-bg">
              <div className="weight-bar-fill" style={{ width: `${w.value * 2}%`, background: w.color, opacity: hov === null || hov === i ? 1 : 0.3 }} />
            </div>
            <span className="weight-pct" style={{ color: w.color }}>{w.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── BIAS CARDS ─────────────────────────────────────────── */
const BIASES = [
  { icon: '🔮', name: 'Biais de confirmation', desc: 'On ne cherche que les infos qui confirment notre opinion initiale. Solution : chercher activement les contre-arguments.' },
  { icon: '😨', name: 'FOMO', desc: "Peur de rater une opportunité. Provoque des entrées en retard au mauvais prix. Solution : respecter son plan d'entrée." },
  { icon: '💔', name: 'Loss aversion', desc: "La douleur d'une perte est 2x plus forte que le plaisir d'un gain. Cause des sorties prématurées des positions gagnantes." },
  { icon: '🎲', name: 'Overconfidence', desc: "Après une série de gains, on pense être invincible. On augmente les tailles de position. Solution : rester sur son plan." },
  { icon: '⏮️', name: 'Biais de récence', desc: "On accorde trop d'importance aux derniers trades. Un stop touché n'invalide pas une stratégie sur 100 trades." },
  { icon: '🐑', name: 'Effet troupeau', desc: "Suivre la masse sans analyse propre. Les marchés retournent toujours contre la majorité. Solution : trader son plan." },
];

function BiasCards() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="bias-grid">
      {BIASES.map((b, i) => (
        <button key={i} className={`bias-card${open === i ? ' bias-open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
          <div className="bias-header">
            <span className="bias-icon">{b.icon}</span>
            <span className="bias-name">{b.name}</span>
            <span className="bias-arrow">{open === i ? '▲' : '▼'}</span>
          </div>
          {open === i && <p className="bias-desc">{b.desc}</p>}
        </button>
      ))}
    </div>
  );
}

/* ─── QUIZ ────────────────────────────────────────────────── */
const QUIZ: { q: string; opts: string[]; correct: number; explain: string }[] = [
  {
    q: 'Qu\'une bougie verte signifie-t-elle ?',
    opts: ['Le prix a baissé sur la période', 'Le prix a clôturé plus haut qu\'il n\'a ouvert', 'Le volume était élevé', 'Le RSI est en surachat'],
    correct: 1,
    explain: 'Une bougie verte (haussière) signifie que le prix de clôture est supérieur au prix d\'ouverture.',
  },
  {
    q: 'Le RSI est à 78. Que signifie-t-il ?',
    opts: ['Survente — signal d\'achat potentiel', 'Zone neutre — aucun signal', 'Surachat — vigilance vente', 'Indicateur cassé'],
    correct: 2,
    explain: 'Au-dessus de 70, le RSI indique une zone de surachat. Le prix peut continuer mais le momentum ralentit.',
  },
  {
    q: 'Vous avez 5 000 $ et risquez 1% par trade avec un SL à 3%. Quelle est la taille de votre position ?',
    opts: ['50 $', '1 666 $', '5 000 $', '150 $'],
    correct: 1,
    explain: 'Risque = 5000 × 1% = 50 $. Position = 50 / 3% = 1 666 $. C\'est le principe du position sizing.',
  },
  {
    q: 'Quel biais vous pousse à entrer sur un actif qui vient de faire +20% ?',
    opts: ['Loss aversion', 'Biais de confirmation', 'FOMO (Fear Of Missing Out)', 'Overconfidence'],
    correct: 2,
    explain: 'Le FOMO pousse à rentrer tardivement sur une tendance déjà avancée, souvent au pire moment.',
  },
  {
    q: 'Un signal TDB avec un score de 82/100 correspond à quelle catégorie ?',
    opts: ['Ignorer (<40)', 'Surveiller (40–60)', 'Opportunité (60–75)', 'Signal fort (75–100)'],
    correct: 3,
    explain: 'Un score ≥ 75 représente un signal fort selon l\'algorithme TDB. À valider avec votre propre analyse.',
  },
];

function QuizSection() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const score = answers.filter((a, i) => a === QUIZ[i].correct).length;

  const handleAnswer = (qi: number, oi: number) => {
    if (submitted) return;
    const next = [...answers];
    next[qi] = oi;
    setAnswers(next);
  };

  return (
    <section className="quiz-section">
      <div className="quiz-header">
        <span className="eyebrow">Quiz</span>
        <h2>Testez vos connaissances</h2>
        <p className="section-text">5 questions pour valider ce que vous avez appris. Prenez le temps de réfléchir.</p>
      </div>
      <div className="quiz-list">
        {QUIZ.map((q, qi) => {
          const answered = answers[qi] !== null;
          const isCorrect = answers[qi] === q.correct;
          return (
            <div key={qi} className={`quiz-q${submitted && answered ? (isCorrect ? ' quiz-correct' : ' quiz-wrong') : ''}`}>
              <div className="quiz-q-header">
                <span className="quiz-num">{qi + 1}</span>
                <p className="quiz-question">{q.q}</p>
              </div>
              <div className="quiz-opts">
                {q.opts.map((opt, oi) => {
                  let cls = 'quiz-opt';
                  if (answers[qi] === oi) cls += ' quiz-opt-selected';
                  if (submitted) {
                    if (oi === q.correct) cls += ' quiz-opt-correct';
                    else if (answers[qi] === oi) cls += ' quiz-opt-wrong';
                  }
                  return (
                    <button key={oi} className={cls} onClick={() => handleAnswer(qi, oi)}>
                      <span className="quiz-letter">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && answered && (
                <p className="quiz-explain">💡 {q.explain}</p>
              )}
            </div>
          );
        })}
      </div>
      {!submitted ? (
        <button className="btn btn-primary quiz-submit" onClick={() => setSubmitted(true)} disabled={answers.some(a => a === null)}>
          {answers.some(a => a === null) ? `Répondez à toutes les questions (${answers.filter(a => a !== null).length}/${QUIZ.length})` : 'Valider mes réponses'}
        </button>
      ) : (
        <div className="quiz-score">
          <div className="quiz-score-circle" style={{ borderColor: score === 5 ? '#29e17c' : score >= 3 ? '#f59e0b' : '#f87171' }}>
            <span>{score}/{QUIZ.length}</span>
          </div>
          <div>
            <strong>{score === 5 ? '🏆 Parfait !' : score >= 3 ? '👍 Bien joué !' : '📚 Revoyez les leçons'}</strong>
            <p className="section-text">{score === 5 ? 'Vous maîtrisez les fondamentaux. Passez à la pratique avec le paper trading !' : score >= 3 ? 'Bonnes bases. Relisez les sections sur les points manqués.' : 'Pas de panique — relisez les leçons et retentez le quiz.'}</p>
            <button className="btn btn-secondary" style={{ marginTop: '0.8rem' }} onClick={() => { setAnswers(Array(QUIZ.length).fill(null)); setSubmitted(false); }}>Recommencer</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── ORDER BOOK CHART ────────────────────────────────────── */
function OrderBookChart() {
  const bids = [
    { price: 44900, size: 3.2 },
    { price: 44850, size: 5.8 },
    { price: 44800, size: 9.1 },
    { price: 44750, size: 4.3 },
    { price: 44700, size: 12.5 },
    { price: 44650, size: 7.2 },
  ];
  const asks = [
    { price: 44950, size: 2.8 },
    { price: 45000, size: 6.4 },
    { price: 45050, size: 11.3 },
    { price: 45100, size: 4.9 },
    { price: 45150, size: 8.7 },
    { price: 45200, size: 5.1 },
  ];
  const maxSize = Math.max(...bids.map(b => b.size), ...asks.map(a => a.size));
  return (
    <div className="chart-wrap">
      <div className="chart-label">Carnet d&apos;ordres — BTC/USD (fictif)</div>
      <div className="ob-container">
        <div className="ob-col">
          <div className="ob-header"><span>Prix (Bid)</span><span>Taille</span></div>
          {bids.map((b, i) => (
            <div key={i} className="ob-row ob-bid" style={{ '--bar': `${(b.size / maxSize) * 100}%` } as React.CSSProperties}>
              <span className="ob-price">{b.price.toLocaleString()}</span>
              <span className="ob-size">{b.size.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="ob-spread">
          <div className="ob-spread-label">Spread</div>
          <div className="ob-spread-val">50 $</div>
        </div>
        <div className="ob-col">
          <div className="ob-header"><span>Prix (Ask)</span><span>Taille</span></div>
          {asks.map((a, i) => (
            <div key={i} className="ob-row ob-ask" style={{ '--bar': `${(a.size / maxSize) * 100}%` } as React.CSSProperties}>
              <span className="ob-price">{a.price.toLocaleString()}</span>
              <span className="ob-size">{a.size.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="chart-note">💡 Les ordres Bid sont des acheteurs en attente, les Ask sont des vendeurs. Le spread = Ask − Bid.</p>
    </div>
  );
}

/* ─── TREND CHART ─────────────────────────────────────────── */
function TrendChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = [38, 40, 37, 42, 41, 45, 43, 48, 46, 52, 50, 55, 53, 58, 56, 62, 60, 65];
  const W = 540; const H = 180;
  const PAD = { top: 14, right: 14, bottom: 26, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const minV = Math.min(...data) - 3;
  const maxV = Math.max(...data) + 3;
  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * chartH;
  // Higher highs and higher lows indices
  const hhIdx = [3, 7, 11, 15, 17];
  const hlIdx = [2, 6, 10, 14];
  return (
    <div className="chart-wrap">
      <div className="chart-label">Tendance haussière — plus-hauts et plus-bas croissants</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Trend chart">
        {/* Grid */}
        {[minV + 3, (minV + maxV) / 2, maxV - 3].map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} stroke="rgba(39,51,78,0.6)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="#9db0d0">{v}</text>
          </g>
        ))}
        {/* Area fill */}
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#29e17c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#29e17c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={[...data.map((v, i) => `${toX(i)},${toY(v)}`), `${toX(data.length - 1)},${H - PAD.bottom}`, `${PAD.left},${H - PAD.bottom}`].join(' ')}
          fill="url(#trendGrad)"
        />
        {/* Line */}
        <polyline points={data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} fill="none" stroke="#29e17c" strokeWidth="2" />
        {/* Higher highs */}
        {hhIdx.map(i => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(data[i])} r={5} fill="#29e17c" stroke="#0d1f35" strokeWidth="1.5"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }} />
            <text x={toX(i)} y={toY(data[i]) - 8} textAnchor="middle" fontSize="9" fill="#29e17c">HH</text>
          </g>
        ))}
        {/* Higher lows */}
        {hlIdx.map(i => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(data[i])} r={5} fill="#2d7cff" stroke="#0d1f35" strokeWidth="1.5"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }} />
            <text x={toX(i)} y={toY(data[i]) + 16} textAnchor="middle" fontSize="9" fill="#2d7cff">HL</text>
          </g>
        ))}
        {/* Hover tooltip */}
        {hovered !== null && (
          <g>
            <rect x={toX(hovered) + 8} y={toY(data[hovered]) - 20} width={60} height={22} fill="#0d1f35" rx="4" stroke="rgba(45,124,255,0.4)" strokeWidth="1" />
            <text x={toX(hovered) + 38} y={toY(data[hovered]) - 5} textAnchor="middle" fontSize="10" fill="#e2eaf6">val: {data[hovered]}</text>
          </g>
        )}
      </svg>
      <p className="chart-note">HH = Higher High (plus-haut croissant) · HL = Higher Low (plus-bas croissant)</p>
    </div>
  );
}

/* ─── STYLE COMPARISON ────────────────────────────────────── */
function StyleComparison() {
  const [active, setActive] = useState<'scalp' | 'day' | 'swing'>('day');
  const styles = {
    scalp: {
      label: 'Scalping',
      color: '#f87171',
      duration: 'Secondes à minutes',
      timeframe: 'Tick / 1m / 5m',
      trades: '10–50 / jour',
      profit: '0.1–0.5% par trade',
      stress: 95,
      skill: 90,
      capital: 40,
      pros: ['Profit rapide', 'Pas d\'overnight', 'Beaucoup d\'opportunités'],
      cons: ['Très stressant', 'Frais importants', 'Nécessite concentration totale'],
    },
    day: {
      label: 'Day Trading',
      color: '#f59e0b',
      duration: 'Minutes à heures',
      timeframe: '5m / 15m / 1h',
      trades: '1–5 / jour',
      profit: '0.5–2% par trade',
      stress: 65,
      skill: 70,
      capital: 55,
      pros: ['Pas de positions overnight', 'Setups clairs', 'Rythme gérable'],
      cons: ['Besoin de plusieurs heures/jour', 'Volatile intraday', 'Exige discipline'],
    },
    swing: {
      label: 'Swing Trading',
      color: '#29e17c',
      duration: 'Jours à semaines',
      timeframe: '4h / Daily',
      trades: '2–10 / mois',
      profit: '3–15% par trade',
      stress: 30,
      skill: 55,
      capital: 70,
      pros: ['Peu chronophage', 'Moins de bruit', 'Idéal pour débutants'],
      cons: ['Risque overnight', 'Patience requise', 'Moins d\'opportunités'],
    },
  };
  const s = styles[active];
  return (
    <div className="style-comp">
      <div className="style-tabs">
        {(Object.keys(styles) as Array<keyof typeof styles>).map(k => (
          <button key={k} className={`style-tab${active === k ? ' active' : ''}`} style={{ '--tc': styles[k].color } as React.CSSProperties} onClick={() => setActive(k)}>
            {styles[k].label}
          </button>
        ))}
      </div>
      <div className="style-detail">
        <div className="style-grid">
          <div className="style-info-item"><span>Durée</span><strong style={{ color: s.color }}>{s.duration}</strong></div>
          <div className="style-info-item"><span>Timeframe</span><strong style={{ color: s.color }}>{s.timeframe}</strong></div>
          <div className="style-info-item"><span>Fréquence</span><strong style={{ color: s.color }}>{s.trades}</strong></div>
          <div className="style-info-item"><span>Objectif</span><strong style={{ color: s.color }}>{s.profit}</strong></div>
        </div>
        <div className="style-bars">
          {([['Stress', s.stress, '#f87171'], ['Compétence requise', s.skill, '#f59e0b'], ['Capital accessible', s.capital, '#29e17c']] as [string, number, string][]).map(([label, val, col]) => (
            <div key={label} className="style-bar-row">
              <span className="style-bar-label">{label}</span>
              <div className="style-bar-bg"><div className="style-bar-fill" style={{ width: `${val}%`, background: col }} /></div>
              <span className="style-bar-pct">{val}%</span>
            </div>
          ))}
        </div>
        <div className="style-pros-cons">
          <div>
            <div className="style-pros-title" style={{ color: '#29e17c' }}>✅ Avantages</div>
            {s.pros.map((p, i) => <div key={i} className="style-point">· {p}</div>)}
          </div>
          <div>
            <div className="style-pros-title" style={{ color: '#f87171' }}>⚠️ Inconvénients</div>
            {s.cons.map((c, i) => <div key={i} className="style-point">· {c}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── LESSON DATA ─────────────────────────────────────────── */
type Level = 'debutant' | 'intermediaire' | 'avance';

const LEVELS: { id: Level; label: string; color: string; emoji: string; desc: string }[] = [
  { id: 'debutant', label: 'Débutant', color: '#29e17c', emoji: '🌱', desc: 'Fondamentaux' },
  { id: 'intermediaire', label: 'Intermédiaire', color: '#2d7cff', emoji: '📈', desc: 'Stratégies' },
  { id: 'avance', label: 'Avancé', color: '#776bff', emoji: '⚡', desc: 'Maîtrise' },
];

const LESSONS = [
  {
    num: '01',
    title: 'Bases du Trading',
    duration: '8 min',
    tags: ['Marché', 'Bougies', 'Tendances'],
    emoji: '📊',
    color: '#2d7cff',
    level: 'debutant' as Level,
    intro: 'Avant de lancer un seul trade, il faut comprendre comment les marchés se déplacent et ce qu\'un graphique vous dit.',
  },
  {
    num: '02',
    title: 'Indicateurs Techniques',
    duration: '10 min',
    tags: ['RSI', 'MACD', 'SMA200'],
    emoji: '📈',
    color: '#776bff',
    level: 'debutant' as Level,
    intro: 'Les indicateurs ne prédisent pas l\'avenir — ils mesurent le passé pour vous aider à évaluer la probabilité d\'un mouvement.',
  },
  {
    num: '03',
    title: 'Gestion du Risque',
    duration: '12 min',
    tags: ['Position sizing', 'Stop Loss', 'R/R'],
    emoji: '🛡️',
    color: '#29e17c',
    level: 'debutant' as Level,
    intro: 'La gestion du risque est la compétence n°1 d\'un trader rentable. Elle détermine votre survie sur le long terme.',
  },
  {
    num: '04',
    title: 'Psychologie du Trading',
    duration: '9 min',
    tags: ['Biais', 'Discipline', 'Routine'],
    emoji: '🧠',
    color: '#f59e0b',
    level: 'intermediaire' as Level,
    intro: 'Les marchés sont un miroir de vos émotions. Comprendre vos biais cognitifs est aussi important que l\'analyse technique.',
  },
  {
    num: '05',
    title: 'Lire les Signaux TDB',
    duration: '7 min',
    tags: ['Score', 'Alertes', 'Algorithme'],
    emoji: '🤖',
    color: '#06b6d4',
    level: 'intermediaire' as Level,
    intro: 'Le score TDB agrège 30+ paramètres pour vous donner une vision rapide de la qualité d\'un setup. Voici comment l\'interpréter.',
  },
  {
    num: '06',
    title: 'Analyse Top-Down',
    duration: '8 min',
    tags: ['Macro', 'Secteur', 'Actif'],
    emoji: '🔭',
    color: '#ec4899',
    level: 'intermediaire' as Level,
    intro: 'Les meilleurs traders commencent par la vue d\'ensemble avant de zoomer sur l\'actif. C\'est l\'approche top-down.',
  },
  {
    num: '07',
    title: 'Types d\'Ordres',
    duration: '7 min',
    tags: ['Market', 'Limit', 'Slippage'],
    emoji: '📋',
    color: '#10b981',
    level: 'intermediaire' as Level,
    intro: 'Savoir quel type d\'ordre utiliser peut faire la différence entre un bon et un mauvais remplissage — et donc entre profit et perte.',
  },
  {
    num: '08',
    title: 'Carnet d\'Ordres',
    duration: '9 min',
    tags: ['Order Book', 'Bid/Ask', 'Liquidité'],
    emoji: '📖',
    color: '#8b5cf6',
    level: 'avance' as Level,
    intro: 'Le carnet d\'ordres révèle les intentions des acheteurs et vendeurs en temps réel. C\'est la radiographie du marché.',
  },
  {
    num: '09',
    title: 'Trading de Tendance',
    duration: '10 min',
    tags: ['Trend', 'Breakout', 'Pull-back'],
    emoji: '🚀',
    color: '#f97316',
    level: 'avance' as Level,
    intro: 'La tendance est votre alliée. Apprendre à l\'identifier et à trader dans sa direction est la base de toute stratégie rentable.',
  },
  {
    num: '10',
    title: 'Styles de Trading',
    duration: '8 min',
    tags: ['Scalping', 'Day', 'Swing'],
    emoji: '⚡',
    color: '#e879f9',
    level: 'avance' as Level,
    intro: 'Chaque trader a un style qui correspond à sa personnalité, son capital et son temps disponible. Trouvez le vôtre.',
  },
];

function LessonContent({ num }: { num: string }) {
  if (num === '01') return (
    <div className="lesson-body">
      <h4>🕯️ Lire une bougie japonaise</h4>
      <p>Chaque bougie représente une période (1m, 1h, 1j…). Elle contient 4 informations : <strong>Open</strong> (ouverture), <strong>High</strong> (plus haut), <strong>Low</strong> (plus bas), <strong>Close</strong> (clôture).</p>
      <div className="concept-row">
        <div className="concept-box" style={{ borderColor: '#29e17c' }}>
          <div className="concept-icon">🟢</div>
          <strong>Bougie haussière</strong>
          <p>Close &gt; Open. Les acheteurs ont dominé la période.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#f87171' }}>
          <div className="concept-icon">🔴</div>
          <strong>Bougie baissière</strong>
          <p>Close &lt; Open. Les vendeurs ont dominé la période.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#9db0d0' }}>
          <div className="concept-icon">➖</div>
          <strong>Doji</strong>
          <p>Open ≈ Close. Indécision du marché — souvent avant un retournement.</p>
        </div>
      </div>
      <p>👇 <em>Survolez les bougies du graphique pour voir leurs données OHLC.</em></p>
      <CandleChart />
      <h4 style={{ marginTop: '1.5rem' }}>📐 Tendances et niveaux clés</h4>
      <p>Un marché évolue en <strong>3 phases</strong> :</p>
      <div className="phase-list">
        <div className="phase-item" style={{ borderLeft: '3px solid #29e17c' }}><strong>Tendance haussière (Uptrend)</strong><br />Série de plus-hauts et plus-bas croissants. On cherche à acheter les retracements.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f87171' }}><strong>Tendance baissière (Downtrend)</strong><br />Série de plus-hauts et plus-bas décroissants. On cherche à vendre les rebonds.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #9db0d0' }}><strong>Consolidation (Range)</strong><br />Le prix oscille entre support et résistance. On évite ou on joue les extrêmes.</div>
      </div>
      <div className="info-callout">💡 <strong>Support</strong> : niveau où le prix rebondit souvent à la hausse.<br /><strong>Résistance</strong> : niveau où le prix bute souvent à la baisse.<br />Le graphique ci-dessus montre ces deux niveaux en bleu et violet.</div>
    </div>
  );

  if (num === '02') return (
    <div className="lesson-body">
      <h4>📊 Le RSI — Relative Strength Index</h4>
      <p>Le RSI mesure la <strong>vitesse et l'amplitude</strong> des variations de prix. Il oscille entre 0 et 100.</p>
      <div className="concept-row">
        <div className="concept-box" style={{ borderColor: '#f87171' }}>
          <strong>RSI &gt; 70 — Surachat</strong>
          <p>Le prix a monté trop vite. Risque de correction. Signal de prudence si vous êtes acheteur.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#9db0d0' }}>
          <strong>RSI 40–60 — Zone neutre</strong>
          <p>Pas de signal clair. Le marché consolide ou est en tendance modérée.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#29e17c' }}>
          <strong>RSI &lt; 30 — Survente</strong>
          <p>Le prix a baissé trop vite. Potentiel rebond. Opportunité d'achat à surveiller.</p>
        </div>
      </div>
      <p>👇 <em>Survolez les points pour voir les valeurs. Notez les zones colorées.</em></p>
      <RsiChart />
      <h4 style={{ marginTop: '1.5rem' }}>📉 La SMA 200</h4>
      <div className="info-callout">La <strong>SMA 200</strong> (moyenne mobile sur 200 périodes) est <em>la référence</em> de tous les traders professionnels.<br /><br />✅ Prix au-dessus → contexte haussier → favoriser les achats<br />❌ Prix en-dessous → contexte baissier → favoriser les ventes</div>
      <h4 style={{ marginTop: '1.5rem' }}>⚡ Le MACD</h4>
      <div className="macd-visual">
        <div className="macd-row">
          <div className="macd-bar bull" style={{ height: '30px' }} />
          <div className="macd-bar bull" style={{ height: '45px' }} />
          <div className="macd-bar bull" style={{ height: '55px' }} />
          <div className="macd-bar bull" style={{ height: '40px' }} />
          <div className="macd-bar bull" style={{ height: '20px' }} />
          <div className="macd-bar bear" style={{ height: '15px' }} />
          <div className="macd-bar bear" style={{ height: '30px' }} />
          <div className="macd-bar bear" style={{ height: '45px' }} />
        </div>
        <div className="macd-label-row"><span style={{ color: '#29e17c' }}>Histogramme positif → momentum haussier</span><span style={{ color: '#f87171' }}>Histogramme négatif → momentum baissier</span></div>
      </div>
      <p className="chart-note">💡 Ne jamais utiliser un seul indicateur. La confluence de plusieurs signaux augmente la probabilité d'un trade réussi.</p>
    </div>
  );

  if (num === '03') return (
    <div className="lesson-body">
      <h4>⚖️ La règle du 1%</h4>
      <p>Ne jamais risquer plus de <strong>1–2% de son capital</strong> sur un seul trade. Cette règle permet de survivre à de longues séries de pertes.</p>
      <div className="info-callout">Avec 10 000 $ et une règle de 1% :<br />→ Risque max par trade : <strong style={{ color: '#f87171' }}>100 $</strong><br />→ Il faudrait <strong>50 pertes consécutives</strong> pour perdre 40% du capital<br />→ Un seul grand gagnant peut rembourser 10 pertes</div>
      <h4 style={{ marginTop: '1.5rem' }}>📐 Position Sizing interactif</h4>
      <p>Ajustez les paramètres pour calculer la taille optimale de votre position :</p>
      <PositionSizingCalc />
      <h4 style={{ marginTop: '1.5rem' }}>🎯 Ratio Risque/Récompense</h4>
      <p>Le ratio R/R compare le gain potentiel au risque pris. <strong>Visez minimum 1:2</strong> — gagner 2x ce que vous risquez.</p>
      <RiskRewardDiagram />
      <div className="info-callout">
        ⚠️ <strong>Erreur fréquente</strong> : déplacer son stop loss quand le prix s'en approche. C'est la garantie de subir des pertes catastrophiques. Placez votre SL avant d'entrer — et respectez-le.
      </div>
    </div>
  );

  if (num === '04') return (
    <div className="lesson-body">
      <h4>🧠 Pourquoi la psychologie est essentielle</h4>
      <p>Selon les statistiques, <strong>plus de 80% des traders perdants</strong> ont une stratégie rentable — mais ne la suivent pas. La cause : les émotions.</p>
      <div className="stats-row">
        <div className="stat-bubble" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <strong style={{ color: '#f87171', fontSize: '2rem' }}>80%</strong>
          <span>des traders perdants ont une bonne stratégie</span>
        </div>
        <div className="stat-bubble" style={{ background: 'rgba(41,225,124,0.1)', border: '1px solid rgba(41,225,124,0.3)' }}>
          <strong style={{ color: '#29e17c', fontSize: '2rem' }}>5×</strong>
          <span>plus important de respecter un plan que de le concevoir</span>
        </div>
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>🎭 Les 6 biais cognitifs du trader</h4>
      <p>👇 <em>Cliquez sur chaque biais pour le détail et la solution.</em></p>
      <BiasCards />
      <h4 style={{ marginTop: '1.5rem' }}>📋 Votre checklist quotidienne</h4>
      <div className="checklist">
        {['Analyser le contexte macro (indices, VIX)', 'Identifier 2-3 setups sur ma watchlist', 'Définir entrée, SL et TP avant de trader', 'Ne trader que si la condition de tendance est remplie', 'Écrire dans mon journal de trading', 'Accepter que la perte fait partie du jeu'].map((item, i) => (
          <ChecklistItem key={i} text={item} />
        ))}
      </div>
    </div>
  );

  if (num === '05') return (
    <div className="lesson-body">
      <h4>🤖 L'algorithme TDB en détail</h4>
      <p>TDB analyse <strong>30+ paramètres</strong> sur plusieurs timeframes et les condense en un score de 0 à 100. Voici comment il est composé :</p>
      <WeightChart />
      <h4 style={{ marginTop: '1.5rem' }}>🎯 Interpréter le score</h4>
      <div className="score-zones">
        <div className="score-zone" style={{ borderColor: '#f87171', background: 'rgba(248,113,113,0.08)' }}>
          <span style={{ color: '#f87171', fontWeight: 700 }}>0 – 40 · Ignorer</span>
          <p>Signal faible ou conditions défavorables. Ne rien faire.</p>
        </div>
        <div className="score-zone" style={{ borderColor: '#2d7cff', background: 'rgba(45,124,255,0.08)' }}>
          <span style={{ color: '#2d7cff', fontWeight: 700 }}>40 – 60 · Surveiller</span>
          <p>Setup en formation. Attendre la confirmation.</p>
        </div>
        <div className="score-zone" style={{ borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>60 – 75 · Opportunité</span>
          <p>Setup valide. Analyser et potentiellement trader.</p>
        </div>
        <div className="score-zone" style={{ borderColor: '#29e17c', background: 'rgba(41,225,124,0.08)' }}>
          <span style={{ color: '#29e17c', fontWeight: 700 }}>75 – 100 · Signal fort</span>
          <p>Haute probabilité. Conditions réunies — agir si votre plan confirme.</p>
        </div>
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>Exemples de scores</h4>
      <div className="gauge-row">
        {[28, 52, 68, 83].map(s => <div key={s} className="gauge-item"><ScoreGauge score={s} /></div>)}
      </div>
      <div className="info-callout">⚠️ Le score TDB est un <strong>outil pédagogique</strong>, pas un conseil financier. Croisez toujours avec votre propre analyse avant d'agir.</div>
    </div>
  );

  if (num === '06') return (
    <div className="lesson-body">
      <h4>🔭 La méthode Top-Down</h4>
      <p>L'analyse top-down consiste à <strong>commencer par le macro</strong> et descendre progressivement vers le micro. Cela évite de trader à contre-courant du marché global.</p>
      <div className="pyramid">
        <div className="pyramid-level" style={{ background: 'rgba(45,124,255,0.12)', borderColor: 'rgba(45,124,255,0.3)' }}>
          <span className="pyramid-step">1</span>
          <div><strong>Macro & indices</strong><p>Tendance SP500, Nasdaq, VIX. Le contexte global détermine le biais directionnel.</p></div>
        </div>
        <div className="pyramid-level" style={{ background: 'rgba(119,107,255,0.12)', borderColor: 'rgba(119,107,255,0.3)' }}>
          <span className="pyramid-step">2</span>
          <div><strong>Secteur / corrélations</strong><p>Le secteur tech monte ? Chercher les leaders du secteur. BTC monte ? Regarder les altcoins.</p></div>
        </div>
        <div className="pyramid-level" style={{ background: 'rgba(41,225,124,0.12)', borderColor: 'rgba(41,225,124,0.3)' }}>
          <span className="pyramid-step">3</span>
          <div><strong>Actif — timeframe haut</strong><p>Analyser en weekly/daily. Tendance principale, niveaux clés majeurs.</p></div>
        </div>
        <div className="pyramid-level" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <span className="pyramid-step">4</span>
          <div><strong>Actif — timeframe d'exécution</strong><p>Descendre en 4h/1h pour trouver le point d'entrée précis.</p></div>
        </div>
        <div className="pyramid-level" style={{ background: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.3)' }}>
          <span className="pyramid-step">5</span>
          <div><strong>Définir trade & exécuter</strong><p>Entrée, SL, TP définis. Position sizing calculé. On exécute ou on passe.</p></div>
        </div>
      </div>
      <div className="info-callout">💡 TDB fait ce travail <strong>automatiquement</strong> : il analyse le contexte macro, les corrélations et l'actif simultanément. Le score résume cette cascade d'analyses en un seul chiffre.</div>
    </div>
  );

  if (num === '07') return (
    <div className="lesson-body">
      <h4>📋 Ordre au marché vs ordre limité</h4>
      <div className="concept-row">
        <div className="concept-box" style={{ borderColor: '#2d7cff' }}>
          <div className="concept-icon">⚡</div>
          <strong>Ordre au marché (Market)</strong>
          <p>Exécution immédiate au <em>meilleur prix disponible</em>. Priorité à la vitesse. Risque de slippage en cas de faible liquidité.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#29e17c' }}>
          <div className="concept-icon">🎯</div>
          <strong>Ordre limité (Limit)</strong>
          <p>Exécution uniquement si le prix atteint votre niveau. Priorité au prix. Pas de slippage, mais pas garanti de se remplir.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#f87171' }}>
          <div className="concept-icon">🛑</div>
          <strong>Stop Loss (Stop Market)</strong>
          <p>Déclenché quand le prix atteint un seuil. Coupe automatiquement la perte. Peut subir du slippage en gaps de marché.</p>
        </div>
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>⚠️ Le slippage — ce coût invisible</h4>
      <div className="info-callout">
        Le <strong>slippage</strong> est la différence entre le prix attendu et le prix réel d&apos;exécution.<br /><br />
        → Vous achetez BTC à <strong>44 900 $</strong> au marché<br />
        → Exécution réelle à <strong>44 950 $</strong><br />
        → Slippage = <strong style={{ color: '#f87171' }}>50 $ de perdu</strong> immédiatement<br /><br />
        Solution : utilisez des <strong>ordres limités</strong> pour les entrées. Réservez les ordres marché aux sorties urgentes.
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>🔧 Quel ordre utiliser ?</h4>
      <div className="phase-list">
        <div className="phase-item" style={{ borderLeft: '3px solid #29e17c' }}><strong>Entrée sur pull-back</strong><br />Ordre limité sous la résistance — attendre le prix, ne pas courir après.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #2d7cff' }}><strong>Breakout explosif</strong><br />Ordre au marché acceptable si la liquidité est haute (spread faible).</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f87171' }}><strong>Stop Loss</strong><br />Toujours en place avant l&apos;entrée. Stop limit risqué — préférer stop market pour la protection.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f59e0b' }}><strong>Take Profit</strong><br />Ordre limité sur la zone cible. Garanti de se remplir au prix désiré.</div>
      </div>
    </div>
  );

  if (num === '08') return (
    <div className="lesson-body">
      <h4>📖 Comprendre le carnet d&apos;ordres</h4>
      <p>Le carnet d&apos;ordres (<strong>order book</strong>) liste tous les ordres limités en attente d&apos;exécution. Il révèle où se trouve la liquidité — et donc où le prix peut s&apos;arrêter ou accélérer.</p>
      <p>👇 <em>Observez la structure bid/ask et le spread central.</em></p>
      <OrderBookChart />
      <h4 style={{ marginTop: '1.5rem' }}>🔑 Concepts clés</h4>
      <div className="concept-row">
        <div className="concept-box" style={{ borderColor: '#29e17c' }}>
          <strong>Bid (acheteurs)</strong>
          <p>Prix maximum que les acheteurs sont prêts à payer. Côté vert du carnet.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#f87171' }}>
          <strong>Ask (vendeurs)</strong>
          <p>Prix minimum que les vendeurs acceptent. Côté rouge du carnet.</p>
        </div>
        <div className="concept-box" style={{ borderColor: '#f59e0b' }}>
          <strong>Spread</strong>
          <p>Différence Ask − Bid. Plus il est faible, plus l&apos;actif est liquide et les coûts réduits.</p>
        </div>
      </div>
      <div className="info-callout">
        💡 <strong>Murs d&apos;ordres (walls)</strong> : un volume anormalement élevé à un niveau est souvent une résistance/support temporaire. Le prix peut y rebondir — ou le franchir avec violence si le mur est retiré ou absorbé.
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>📊 Liquidité et market impact</h4>
      <div className="phase-list">
        <div className="phase-item" style={{ borderLeft: '3px solid #29e17c' }}><strong>Haute liquidité (BTC, ETH, AAPL…)</strong><br />Spread serré, slippage minimal. Facile d&apos;entrer et sortir même avec des positions importantes.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f87171' }}><strong>Faible liquidité (small caps, altcoins)</strong><br />Spread large, slippage fort. Un ordre moyen peut déplacer le prix de plusieurs pourcents.</div>
      </div>
    </div>
  );

  if (num === '09') return (
    <div className="lesson-body">
      <h4>🚀 Identifier une tendance</h4>
      <p>Une tendance haussière se définit par une succession de <strong>plus-hauts croissants (HH)</strong> et de <strong>plus-bas croissants (HL)</strong>. L&apos;inverse définit une tendance baissière.</p>
      <p>👇 <em>Chaque point vert (HH) confirme la tendance. Chaque point bleu (HL) offre une entrée.</em></p>
      <TrendChart />
      <h4 style={{ marginTop: '1.5rem' }}>📐 Les 3 types d&apos;entrées en tendance</h4>
      <div className="phase-list">
        <div className="phase-item" style={{ borderLeft: '3px solid #29e17c' }}>
          <strong>Pull-back sur support</strong><br />
          Le prix reteste un ancien niveau ou une MA. C&apos;est l&apos;entrée <em>idéale</em> — bon rapport R/R, confirmation de tendance.
        </div>
        <div className="phase-item" style={{ borderLeft: '3px solid #2d7cff' }}>
          <strong>Breakout de résistance</strong><br />
          Le prix franchit un niveau avec volume. Entrée agressive. Attention aux faux breakouts — attendre la clôture de bougie.
        </div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f59e0b' }}>
          <strong>Re-test du breakout</strong><br />
          Après un breakout, le prix revient tester l&apos;ancien niveau (maintenant support). Entrée conservatrice avec confirmation.
        </div>
      </div>
      <h4 style={{ marginTop: '1.5rem' }}>🎯 La règle du trend following</h4>
      <div className="info-callout">
        Ne <strong>jamais</strong> trader contre la tendance dominante sans raison solide.<br /><br />
        ✅ Tendance haussière → chercher des achats sur pull-backs<br />
        ✅ Tendance baissière → chercher des ventes sur rebonds<br />
        ❌ Essayer d&apos;attraper le sommet/creux → stratégie à très faible probabilité de succès
      </div>
      <div className="stats-row">
        <div className="stat-bubble" style={{ background: 'rgba(41,225,124,0.1)', border: '1px solid rgba(41,225,124,0.3)' }}>
          <strong style={{ color: '#29e17c', fontSize: '1.8rem' }}>3:1</strong>
          <span>R/R moyen d&apos;un trade de tendance bien exécuté</span>
        </div>
        <div className="stat-bubble" style={{ background: 'rgba(45,124,255,0.1)', border: '1px solid rgba(45,124,255,0.3)' }}>
          <strong style={{ color: '#2d7cff', fontSize: '1.8rem' }}>65%</strong>
          <span>taux de réussite typique en trend following discipliné</span>
        </div>
      </div>
    </div>
  );

  if (num === '10') return (
    <div className="lesson-body">
      <h4>⚡ Quel style vous correspond ?</h4>
      <p>Il n&apos;existe pas de style &quot;supérieur&quot; — seulement celui qui correspond à <strong>votre personnalité, votre temps et votre capital</strong>. Cliquez sur chaque style pour comparer.</p>
      <StyleComparison />
      <h4 style={{ marginTop: '1.5rem' }}>🧭 Comment choisir votre style</h4>
      <div className="phase-list">
        <div className="phase-item" style={{ borderLeft: '3px solid #29e17c' }}><strong>Vous avez peu de temps</strong><br />Swing trading. 30 min d&apos;analyse le soir suffisent pour gérer 2-3 positions hebdomadaires.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f59e0b' }}><strong>Vous pouvez surveiller le marché 2-4h/jour</strong><br />Day trading. Permet de clôturer toutes les positions le soir sans risque overnight.</div>
        <div className="phase-item" style={{ borderLeft: '3px solid #f87171' }}><strong>Vous êtes disponible en continu</strong><br />Scalping envisageable, mais exige une infrastructure et une discipline hors norme.</div>
      </div>
      <div className="info-callout">
        💡 <strong>Conseil pour les débutants</strong> : commencez toujours par le <strong>swing trading</strong>. Les timeframes plus élevés (daily/4h) offrent des signaux plus clairs, moins de bruit, et laissent le temps de réfléchir avant d&apos;agir.
      </div>
    </div>
  );

  return null;
}

function ChecklistItem({ text }: { text: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button className={`checklist-item${checked ? ' checked' : ''}`} onClick={() => setChecked(!checked)}>
      <span className="check-box">{checked ? '✓' : ''}</span>
      <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.6 : 1 }}>{text}</span>
    </button>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const PROGRESS_KEY = 'tdb_edu_progress';

export function EducationClient() {
  const [open, setOpen] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeLevel, setActiveLevel] = useState<Level>('debutant');
  const [hydrated, setHydrated] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const arr: string[] = JSON.parse(saved);
        setCompleted(new Set(arr));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Detect user profile from onboarding
  useEffect(() => {
    try {
      const profile = localStorage.getItem('tdb_user_profile');
      if (profile) {
        const { profile: p } = JSON.parse(profile);
        if (p === 'intermediaire' || p === 'avance') setActiveLevel(p);
      }
    } catch {}
    const handler = (e: Event) => {
      const { profile } = (e as CustomEvent).detail;
      if (profile === 'intermediaire' || profile === 'avance') setActiveLevel(profile);
    };
    window.addEventListener('tdb:profile-set', handler);
    return () => window.removeEventListener('tdb:profile-set', handler);
  }, []);

  const toggle = (num: string) => {
    const next = open === num ? null : num;
    setOpen(next);
    if (next) {
      const newCompleted = new Set([...completed, num]);
      setCompleted(newCompleted);
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...newCompleted])); } catch {}
    }
  };

  const filteredLessons = LESSONS.filter(l => l.level === activeLevel);
  const levelCompleted = filteredLessons.filter(l => completed.has(l.num)).length;
  const levelTotal = filteredLessons.length;
  const totalCompleted = LESSONS.filter(l => completed.has(l.num)).length;
  const levelConfig = LEVELS.find(lv => lv.id === activeLevel)!;

  return (
    <>
      {/* Level Tabs */}
      <div className="edu-level-tabs">
        {LEVELS.map(lv => {
          const lvLessons = LESSONS.filter(l => l.level === lv.id);
          const lvDone = lvLessons.filter(l => completed.has(l.num)).length;
          const isActive = activeLevel === lv.id;
          return (
            <button
              key={lv.id}
              className={`edu-level-tab${isActive ? ' edu-level-tab-active' : ''}`}
              style={{ '--lv-color': lv.color } as React.CSSProperties}
              onClick={() => { setActiveLevel(lv.id); setOpen(null); }}
            >
              <span className="edu-lv-emoji">{lv.emoji}</span>
              <span className="edu-lv-label">{lv.label}</span>
              <span className="edu-lv-sub">{lv.desc}</span>
              <div className="edu-lv-progress-bar">
                <div
                  className="edu-lv-progress-fill"
                  style={{ width: hydrated ? `${(lvDone / lvLessons.length) * 100}%` : '0%', background: lv.color }}
                />
              </div>
              <span className="edu-lv-count" style={{ color: lv.color }}>{hydrated ? lvDone : 0}/{lvLessons.length}</span>
            </button>
          );
        })}
      </div>

      {/* Level Progress Header */}
      <div className="edu-level-header">
        <div className="edu-level-info">
          <span className="edu-level-badge" style={{ color: levelConfig.color, borderColor: levelConfig.color + '44', background: levelConfig.color + '11' }}>
            {levelConfig.emoji} Niveau {levelConfig.label}
          </span>
          <span className="edu-level-desc">{levelConfig.desc}</span>
        </div>
        <div className="edu-progress">
          <div className="edu-progress-bar">
            <div
              className="edu-progress-fill"
              style={{
                width: hydrated ? `${(levelCompleted / levelTotal) * 100}%` : '0%',
                background: `linear-gradient(90deg, ${levelConfig.color}, ${levelConfig.color}aa)`
              }}
            />
          </div>
          <span className="edu-progress-label">
            {hydrated ? levelCompleted : 0}/{levelTotal} leçons
            {hydrated && totalCompleted > 0 && ` · ${totalCompleted}/${LESSONS.length} total`}
          </span>
        </div>
      </div>

      {/* Lessons */}
      <div className="lessons-list">
        {filteredLessons.map((l) => {
          const isOpen = open === l.num;
          const isDone = completed.has(l.num);
          return (
            <article key={l.num} className={`lesson-card${isOpen ? ' lesson-open' : ''}`}>
              <button className="lesson-header" onClick={() => toggle(l.num)} aria-expanded={isOpen}>
                <div className="lesson-meta">
                  <span className="lesson-num" style={{ background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}44` }}>
                    {isDone ? '✓' : l.num}
                  </span>
                  <span className="lesson-emoji">{l.emoji}</span>
                  <div className="lesson-titles">
                    <span className="lesson-title">{l.title}</span>
                    <span className="lesson-duration">⏱ {l.duration}</span>
                  </div>
                </div>
                <div className="lesson-right">
                  <div className="lesson-tags">
                    {l.tags.map(t => <span key={t} className="lesson-tag">{t}</span>)}
                  </div>
                  <span className="lesson-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="lesson-content">
                  <p className="lesson-intro">{l.intro}</p>
                  <LessonContent num={l.num} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Level completion message */}
      {hydrated && levelCompleted === levelTotal && (
        <div className="edu-level-complete">
          <span className="edu-level-complete-icon">🏆</span>
          <div>
            <strong>Niveau {levelConfig.label} complété !</strong>
            {activeLevel !== 'avance' && (
              <p>
                Passez au niveau suivant →{' '}
                <button
                  className="edu-next-level-btn"
                  style={{ color: LEVELS[LEVELS.findIndex(l => l.id === activeLevel) + 1]?.color }}
                  onClick={() => setActiveLevel(LEVELS[LEVELS.findIndex(l => l.id === activeLevel) + 1].id)}
                >
                  {LEVELS[LEVELS.findIndex(l => l.id === activeLevel) + 1]?.label}
                </button>
              </p>
            )}
            {activeLevel === 'avance' && <p>Vous maîtrisez tous les niveaux. Passez à la pratique !</p>}
          </div>
        </div>
      )}

      {/* Quiz */}
      <QuizSection />

      {/* CTA */}
      <div className="edu-cta">
        <h3>Prêt à pratiquer ?</h3>
        <p className="section-text">Ouvrez TDB sur Telegram et commencez avec le paper trading — 10 000 $ virtuels, risque zéro.</p>
        <a href="https://t.me/tdbcapten_bot" className="btn btn-primary" target="_blank" rel="noopener noreferrer">Démarrer sur Telegram →</a>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Star,
  Trophy,
  Zap,
  Lock,
  X,
  Check,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Award,
  Crown,
  Loader2,
  Brain,
  Shield,
  Activity,
  Target,
  Percent,
  BarChart3,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { usePremium } from "@/lib/PremiumContext";
import { toolsAPI, type AdviceData, type AdviceCard } from "@/lib/api";
import {
  LEARN_MODULES,
  getLevelBadge,
  type Module,
  type Lesson,
  type QuizQuestion,
} from "@/lib/learnContent";

// ─── Interactive Chart Components ─────────────────────────────────────────────

type CandleData = { o: number; h: number; l: number; c: number; label: string };
const CANDLES: CandleData[] = [
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
  const W = 520; const H = 200;
  const PAD = { top: 14, right: 10, bottom: 28, left: 60 };
  const chartW = W - PAD.left - PAD.right; const chartH = H - PAD.top - PAD.bottom;
  const allP = CANDLES.flatMap(c => [c.o, c.h, c.l, c.c]);
  const minP = Math.min(...allP) - 300; const maxP = Math.max(...allP) + 300;
  const toY = (p: number) => PAD.top + (1 - (p - minP) / (maxP - minP)) * chartH;
  const cw = chartW / CANDLES.length; const bodyW = cw * 0.55;
  const priceLabels = [minP + 300, (minP + maxP) / 2, maxP - 300];
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">📊 Graphique BTC/USD — bougies japonaises (fictif) · Survolez pour voir OHLC</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {priceLabels.map((p, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(p)} y2={toY(p)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 6} y={toY(p) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">{(p / 1000).toFixed(0)}k</text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(41400)} y2={toY(41400)} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7" />
        <text x={PAD.left + 4} y={toY(41400) - 4} fontSize="9" fill="#22d3ee">Support</text>
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(45600)} y2={toY(45600)} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7" />
        <text x={PAD.left + 4} y={toY(45600) - 4} fontSize="9" fill="#a78bfa">Résistance</text>
        {CANDLES.map((c, i) => {
          const bull = c.c >= c.o;
          const x = PAD.left + i * cw + cw / 2;
          const bodyTop = toY(Math.max(c.o, c.c)); const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 1);
          const color = bull ? '#34d399' : '#f87171';
          const isHov = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {isHov && <rect x={PAD.left + i * cw} y={PAD.top} width={cw} height={chartH} fill="rgba(255,255,255,0.05)" rx="2" />}
              <line x1={x} x2={x} y1={toY(c.h)} y2={toY(c.l)} stroke={color} strokeWidth={isHov ? 2 : 1.5} />
              <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={bull ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)'} stroke={color} strokeWidth="1" rx="1" />
              <text x={x} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">{c.label}</text>
            </g>
          );
        })}
      </svg>
      {hovered !== null && (
        <div className="mt-2 flex gap-3 text-xs font-mono text-white/60 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-white/40">{CANDLES[hovered].label}</span>
          <span>O: <strong className="text-white/80">{CANDLES[hovered].o.toLocaleString()}</strong></span>
          <span>H: <strong className="text-emerald-400">{CANDLES[hovered].h.toLocaleString()}</strong></span>
          <span>L: <strong className="text-red-400">{CANDLES[hovered].l.toLocaleString()}</strong></span>
          <span>C: <strong className="text-white/80">{CANDLES[hovered].c.toLocaleString()}</strong></span>
        </div>
      )}
    </div>
  );
}

const RSI_DATA = [42, 48, 55, 62, 68, 72, 76, 70, 61, 50, 38, 30, 26, 32, 41, 50, 57];
function RsiChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 520; const H = 170;
  const PAD = { top: 14, right: 14, bottom: 26, left: 40 };
  const chartW = W - PAD.left - PAD.right; const chartH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (RSI_DATA.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - v / 100) * chartH;
  const points = RSI_DATA.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const areaPoints = `${PAD.left},${H - PAD.bottom} ${points} ${toX(RSI_DATA.length - 1)},${H - PAD.bottom}`;
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">📈 Indicateur RSI — survolez les points pour voir les valeurs</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 170 }}>
        <defs>
          <linearGradient id="rsiGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={PAD.left} y={toY(70)} width={chartW} height={toY(30) - toY(70)} fill="rgba(239,68,68,0.06)" />
        <rect x={PAD.left} y={toY(30)} width={chartW} height={chartH - (toY(30) - PAD.top)} fill="rgba(52,211,153,0.06)" />
        {[30, 50, 70].map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">{v}</text>
          </g>
        ))}
        <text x={W - PAD.right + 4} y={toY(75)} fontSize="9" fill="rgba(239,68,68,0.8)">Surachat</text>
        <text x={W - PAD.right + 4} y={toY(25)} fontSize="9" fill="rgba(52,211,153,0.8)">Survente</text>
        <polygon points={areaPoints} fill="url(#rsiGrad)" />
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
        {RSI_DATA.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={hovered === i ? 5 : 3}
            fill={v > 70 ? '#ef4444' : v < 30 ? '#34d399' : '#6366f1'}
            stroke={hovered === i ? 'white' : 'transparent'} strokeWidth="1.5"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }} />
        ))}
      </svg>
      {hovered !== null && (
        <div className="mt-1 text-xs text-center font-mono">
          <span className={RSI_DATA[hovered] > 70 ? 'text-red-400' : RSI_DATA[hovered] < 30 ? 'text-emerald-400' : 'text-white/60'}>
            RSI = {RSI_DATA[hovered]} — {RSI_DATA[hovered] > 70 ? '⚠️ Surachat' : RSI_DATA[hovered] < 30 ? '✅ Survente' : '— Zone neutre'}
          </span>
        </div>
      )}
    </div>
  );
}

function OrderBookViz() {
  const bids = [{ price: 44900, size: 3.2 }, { price: 44850, size: 5.8 }, { price: 44800, size: 9.1 }, { price: 44750, size: 4.3 }, { price: 44700, size: 12.5 }];
  const asks = [{ price: 44950, size: 2.8 }, { price: 45000, size: 6.4 }, { price: 45050, size: 11.3 }, { price: 45100, size: 4.9 }, { price: 45150, size: 8.7 }];
  const maxSize = Math.max(...bids.map(b => b.size), ...asks.map(a => a.size));
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">📖 Carnet d&apos;ordres — BTC/USD (fictif)</p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-xs font-mono">
        <div>
          <div className="flex justify-between text-white/30 pb-1 border-b border-white/10 mb-1"><span>Bid (Acheteurs)</span><span>BTC</span></div>
          {bids.map((b, i) => (
            <div key={i} className="relative flex justify-between py-0.5 overflow-hidden rounded">
              <div className="absolute inset-y-0 left-0 bg-emerald-500/15 rounded" style={{ width: `${(b.size / maxSize) * 100}%` }} />
              <span className="relative text-emerald-400 font-semibold">{b.price.toLocaleString()}</span>
              <span className="relative text-white/40">{b.size.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-1 px-2">
          <span className="text-white/30 text-[10px]">Spread</span>
          <span className="text-amber-400 font-bold text-sm">50$</span>
        </div>
        <div>
          <div className="flex justify-between text-white/30 pb-1 border-b border-white/10 mb-1"><span>Ask (Vendeurs)</span><span>BTC</span></div>
          {asks.map((a, i) => (
            <div key={i} className="relative flex justify-between py-0.5 overflow-hidden rounded">
              <div className="absolute inset-y-0 right-0 bg-red-500/15 rounded" style={{ width: `${(a.size / maxSize) * 100}%` }} />
              <span className="relative text-red-400 font-semibold">{a.price.toLocaleString()}</span>
              <span className="relative text-white/40">{a.size.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendViz() {
  const [hov, setHov] = useState<number | null>(null);
  const data = [38, 40, 37, 42, 41, 45, 43, 48, 46, 52, 50, 55, 53, 58, 56, 62, 60, 65];
  const W = 520; const H = 160;
  const PAD = { top: 20, right: 14, bottom: 24, left: 36 };
  const chartW = W - PAD.left - PAD.right; const chartH = H - PAD.top - PAD.bottom;
  const minV = Math.min(...data) - 3; const maxV = Math.max(...data) + 3;
  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * chartH;
  const hhIdx = [3, 7, 11, 15, 17]; const hlIdx = [2, 6, 10, 14];
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">🚀 Tendance haussière — HH = Higher High, HL = Higher Low</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        <defs>
          <linearGradient id="trendG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={[...data.map((v, i) => `${toX(i)},${toY(v)}`), `${toX(data.length-1)},${H-PAD.bottom}`, `${PAD.left},${H-PAD.bottom}`].join(' ')} fill="url(#trendG)" />
        <polyline points={data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} fill="none" stroke="#34d399" strokeWidth="2" />
        {hhIdx.map(i => (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <circle cx={toX(i)} cy={toY(data[i])} r={hov === i ? 6 : 4} fill="#34d399" stroke="#0f172a" strokeWidth="1.5" />
            <text x={toX(i)} y={toY(data[i]) - 8} textAnchor="middle" fontSize="9" fill="#34d399">HH</text>
          </g>
        ))}
        {hlIdx.map(i => (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <circle cx={toX(i)} cy={toY(data[i])} r={hov === i ? 6 : 4} fill="#818cf8" stroke="#0f172a" strokeWidth="1.5" />
            <text x={toX(i)} y={toY(data[i]) + 16} textAnchor="middle" fontSize="9" fill="#818cf8">HL</text>
          </g>
        ))}
      </svg>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> HH — Plus-haut croissant</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" /> HL — Plus-bas croissant</span>
      </div>
    </div>
  );
}

function StyleCompare() {
  const [active, setActive] = useState<'scalp'|'day'|'swing'>('swing');
  const styles = {
    scalp: { label: 'Scalping', color: '#f87171', duration: 'Secondes–minutes', tf: '1m / 5m', freq: '10–50/jour', target: '0,1–0,5%', stress: 95, skill: 90 },
    day:   { label: 'Day Trading', color: '#fbbf24', duration: 'Minutes–heures', tf: '5m / 15m / 1H', freq: '1–5/jour', target: '0,5–2%', stress: 65, skill: 70 },
    swing: { label: 'Swing Trading', color: '#34d399', duration: 'Jours–semaines', tf: '4H / Daily', freq: '2–10/mois', target: '3–15%', stress: 30, skill: 55 },
  };
  const s = styles[active];
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-white/50">⚡ Comparer les styles — cliquez pour explorer</p>
      <div className="flex gap-2">
        {(Object.keys(styles) as Array<keyof typeof styles>).map(k => (
          <button key={k} onClick={() => setActive(k)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active === k ? 'border-transparent text-gray-900' : 'border-white/10 text-white/50 bg-transparent hover:border-white/30'}`}
            style={active === k ? { background: styles[k].color } : {}}>
            {styles[k].label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[['Durée', s.duration], ['Timeframe', s.tf], ['Fréquence', s.freq], ['Objectif/trade', s.target]].map(([label, val]) => (
          <div key={label} className="bg-white/5 rounded-lg px-3 py-2">
            <div className="text-white/40 mb-0.5">{label}</div>
            <div className="font-semibold" style={{ color: s.color }}>{val}</div>
          </div>
        ))}
      </div>
      {[['Niveau de stress', s.stress], ['Compétence requise', s.skill]].map(([label, val]) => (
        <div key={label}>
          <div className="flex justify-between text-xs text-white/50 mb-1"><span>{label}</span><span>{val}%</span></div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${val}%`, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SupResChart ───────────────────────────────────────────────────────────────
function SupResChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const candles = [
    { o: 100, h: 108, l: 98, c: 105 }, { o: 105, h: 112, l: 103, c: 110 },
    { o: 110, h: 118, l: 108, c: 116 }, { o: 116, h: 122, l: 114, c: 120 },
    { o: 120, h: 124, l: 116, c: 118 }, { o: 118, h: 120, l: 112, c: 113 },
    { o: 113, h: 116, l: 108, c: 110 }, { o: 110, h: 112, l: 104, c: 106 },
    { o: 106, h: 110, l: 102, c: 109 }, { o: 109, h: 116, l: 107, c: 115 },
    { o: 115, h: 122, l: 113, c: 121 }, { o: 121, h: 126, l: 119, c: 122 },
  ];
  const labels = ['J1','J2','J3','J4','J5','J6','J7','J8','J9','J10','J11','J12'];
  const W = 520; const H = 200;
  const PAD = { top: 14, right: 10, bottom: 28, left: 54 };
  const chartW = W - PAD.left - PAD.right; const chartH = H - PAD.top - PAD.bottom;
  const allP = candles.flatMap(c => [c.o, c.h, c.l, c.c]);
  const minP = Math.min(...allP) - 5; const maxP = Math.max(...allP) + 5;
  const toY = (p: number) => PAD.top + (1 - (p - minP) / (maxP - minP)) * chartH;
  const cw = chartW / candles.length; const bodyW = cw * 0.55;
  const support = 104; const resistance = 123;
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">🎯 Supports & Résistances — observez les rebonds sur les niveaux clés</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        <line x1={PAD.left} x2={W-PAD.right} y1={toY(support)} y2={toY(support)} stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 3" opacity="0.9" />
        <text x={PAD.left+4} y={toY(support)-4} fontSize="9" fill="#22d3ee" fontWeight="600">Support ~{support}</text>
        <line x1={PAD.left} x2={W-PAD.right} y1={toY(resistance)} y2={toY(resistance)} stroke="#f87171" strokeWidth="2" strokeDasharray="6 3" opacity="0.9" />
        <text x={PAD.left+4} y={toY(resistance)-4} fontSize="9" fill="#f87171" fontWeight="600">Résistance ~{resistance}</text>
        <rect x={PAD.left} y={toY(support+2)} width={chartW} height={toY(support-2)-toY(support+2)} fill="rgba(34,211,238,0.07)" />
        <rect x={PAD.left} y={toY(resistance+2)} width={chartW} height={toY(resistance-2)-toY(resistance+2)} fill="rgba(248,113,113,0.07)" />
        {candles.map((c, i) => {
          const bull = c.c >= c.o;
          const x = PAD.left + i * cw + cw / 2;
          const bodyTop = toY(Math.max(c.o, c.c)); const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 1);
          const color = bull ? '#34d399' : '#f87171';
          const isHov = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              {isHov && <rect x={PAD.left+i*cw} y={PAD.top} width={cw} height={chartH} fill="rgba(255,255,255,0.05)" rx="2" />}
              <line x1={x} x2={x} y1={toY(c.h)} y2={toY(c.l)} stroke={color} strokeWidth={isHov ? 2 : 1.5} />
              <rect x={x-bodyW/2} y={bodyTop} width={bodyW} height={bodyH} fill={bull ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)'} stroke={color} strokeWidth="1" rx="1" />
              <text x={x} y={H-6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">{labels[i]}</text>
            </g>
          );
        })}
        {[minP+5, (minP+maxP)/2, maxP-5].map((p, i) => (
          <text key={i} x={PAD.left-6} y={toY(p)+4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">{p.toFixed(0)}</text>
        ))}
      </svg>
      {hovered !== null && (
        <div className="mt-2 flex gap-3 text-xs font-mono text-white/60 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-white/40">{labels[hovered]}</span>
          <span>O: <strong className="text-white/80">{candles[hovered].o}</strong></span>
          <span>H: <strong className="text-emerald-400">{candles[hovered].h}</strong></span>
          <span>L: <strong className="text-red-400">{candles[hovered].l}</strong></span>
          <span>C: <strong className="text-white/80">{candles[hovered].c}</strong></span>
        </div>
      )}
    </div>
  );
}

// ── RiskRewardViz ─────────────────────────────────────────────────────────────
function RiskRewardViz() {
  const [ratio, setRatio] = useState<1 | 2 | 3>(2);
  const risk = 100; const reward = risk * ratio;
  const total = risk + reward;
  const riskPct = (risk / total) * 100; const rewardPct = (reward / total) * 100;
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <p className="text-xs font-semibold text-white/50">⚖️ Ratio Risque/Récompense — sélectionnez un ratio</p>
      <div className="flex gap-2">
        {([1, 2, 3] as const).map(r => (
          <button key={r} onClick={() => setRatio(r)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${ratio === r ? 'bg-primary border-primary text-white' : 'border-white/15 text-white/50 hover:border-white/30'}`}>
            1 : {r}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-8 rounded-lg overflow-hidden flex">
          <div className="flex items-center justify-center text-xs font-bold text-white transition-all duration-500" style={{ width: `${riskPct}%`, background: '#ef4444' }}>Risque</div>
          <div className="flex items-center justify-center text-xs font-bold text-white transition-all duration-500" style={{ width: `${rewardPct}%`, background: '#34d399' }}>Récompense</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <div className="text-red-400 font-bold text-lg">-{risk}€</div>
            <div className="text-white/50">Stop Loss (risque)</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <div className="text-emerald-400 font-bold text-lg">+{reward}€</div>
            <div className="text-white/50">Take Profit (objectif)</div>
          </div>
        </div>
      </div>
      <div className={`p-3 rounded-lg text-xs text-center font-medium ${ratio >= 2 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}`}>
        {ratio === 1 && "⚠️ 1:1 — Taux de réussite > 50% requis pour être rentable"}
        {ratio === 2 && "✅ 1:2 — Taux de réussite > 33% requis — recommandé débutants"}
        {ratio === 3 && "🏆 1:3 — Taux de réussite > 25% requis — excellent ratio"}
      </div>
    </div>
  );
}

// ── EmotionCycleViz ───────────────────────────────────────────────────────────
function EmotionCycleViz() {
  const [hov, setHov] = useState<number | null>(null);
  const emotions = [
    { label: 'Espoir', color: '#fbbf24', x: 50, y: 130 },
    { label: 'Optimisme', color: '#34d399', x: 100, y: 100 },
    { label: 'Excitation', color: '#34d399', x: 155, y: 65 },
    { label: 'Euphorie', color: '#22d3ee', x: 210, y: 38 },
    { label: 'Anxiété', color: '#f87171', x: 265, y: 58 },
    { label: 'Déni', color: '#f87171', x: 310, y: 84 },
    { label: 'Peur', color: '#ef4444', x: 355, y: 112 },
    { label: 'Panique', color: '#dc2626', x: 395, y: 142 },
    { label: 'Capitulation', color: '#dc2626', x: 430, y: 165 },
    { label: 'Dépression', color: '#9ca3af', x: 465, y: 175 },
    { label: 'Espoir', color: '#fbbf24', x: 500, y: 155 },
  ];
  const path = emotions.map((e, i) => `${i === 0 ? 'M' : 'L'}${e.x},${e.y}`).join(' ');
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">🧠 Cycle des émotions du marché — survolez les points</p>
      <svg viewBox="0 0 550 210" className="w-full" style={{ maxHeight: 210 }}>
        <path d={path} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
        {emotions.map((e, i) => (
          <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <circle cx={e.x} cy={e.y} r={hov === i ? 7 : 4} fill={e.color} stroke={hov === i ? 'white' : 'transparent'} strokeWidth="1.5" />
            {hov === i && <text x={e.x} y={e.y - 12} textAnchor="middle" fontSize="10" fill={e.color} fontWeight="600">{e.label}</text>}
            {hov !== i && i % 3 === 0 && <text x={e.x} y={i < 5 ? e.y - 10 : e.y + 16} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">{e.label}</text>}
          </g>
        ))}
        <text x="210" y="26" textAnchor="middle" fontSize="9" fill="#22d3ee" fontWeight="600">📈 SOMMET</text>
        <text x="448" y="195" textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="600">📉 CREUX</text>
        <text x="30" y="205" fontSize="8" fill="rgba(255,255,255,0.2)">Temps →</text>
      </svg>
      {hov !== null && (
        <div className="mt-1 text-xs text-center" style={{ color: emotions[hov].color }}>
          Émotion : <strong>{emotions[hov].label}</strong>
        </div>
      )}
    </div>
  );
}

// ── SwingViz ──────────────────────────────────────────────────────────────────
function SwingViz() {
  const [hov, setHov] = useState<string | null>(null);
  const data = [45, 48, 42, 50, 44, 55, 48, 60, 52, 65, 57, 68];
  const entries = [{ idx: 2, label: 'Entrée Long' }, { idx: 6, label: 'Entrée Long' }];
  const exits = [{ idx: 5, label: 'Sortie +14%' }, { idx: 9, label: 'Sortie +25%' }];
  const W = 520; const H = 180;
  const PAD = { top: 20, right: 14, bottom: 26, left: 36 };
  const chartW = W - PAD.left - PAD.right; const chartH = H - PAD.top - PAD.bottom;
  const minV = Math.min(...data) - 3; const maxV = Math.max(...data) + 3;
  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * chartH;
  const pts = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">📈 Swing Trading — achats aux creux, ventes aux sommets · survolez les flèches</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        <defs>
          <linearGradient id="swingG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={[...data.map((v, i) => `${toX(i)},${toY(v)}`), `${toX(data.length-1)},${H-PAD.bottom}`, `${PAD.left},${H-PAD.bottom}`].join(' ')} fill="url(#swingG)" />
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" />
        {entries.map((e, i) => (
          <g key={i} onMouseEnter={() => setHov(`entry${i}`)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <polygon points={`${toX(e.idx)},${toY(data[e.idx])} ${toX(e.idx)-5},${toY(data[e.idx])-10} ${toX(e.idx)+5},${toY(data[e.idx])-10}`} fill="#34d399" />
            {hov === `entry${i}` && <text x={toX(e.idx)} y={toY(data[e.idx])-14} textAnchor="middle" fontSize="9" fill="#34d399">{e.label}</text>}
          </g>
        ))}
        {exits.map((e, i) => (
          <g key={i} onMouseEnter={() => setHov(`exit${i}`)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
            <polygon points={`${toX(e.idx)},${toY(data[e.idx])} ${toX(e.idx)-5},${toY(data[e.idx])+10} ${toX(e.idx)+5},${toY(data[e.idx])+10}`} fill="#a78bfa" />
            {hov === `exit${i}` && <text x={toX(e.idx)} y={toY(data[e.idx])-6} textAnchor="middle" fontSize="9" fill="#a78bfa">{e.label}</text>}
          </g>
        ))}
        {data.map((_, i) => (
          <text key={i} x={toX(i)} y={H-6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">J{i+1}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Entrée (achat)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-400 inline-block" /> Sortie (vente)</span>
      </div>
    </div>
  );
}

// ── OrderTypesViz ─────────────────────────────────────────────────────────────
function OrderTypesViz() {
  const [selected, setSelected] = useState<'market' | 'limit' | 'stop'>('market');
  const types = {
    market: { label: 'Marché', color: '#6366f1', desc: "Exécution immédiate au meilleur prix disponible. Garantit l'exécution mais pas le prix.", icon: '⚡', level: 100 },
    limit:  { label: 'Limite', color: '#34d399', desc: "Exécution uniquement si le prix atteint votre niveau. Garantit le prix mais pas l'exécution.", icon: '🎯', level: 95 },
    stop:   { label: 'Stop', color: '#f87171', desc: "Déclenché quand le prix franchit un seuil. Utilisé pour couper les pertes (stop loss).", icon: '🛑', level: 92 },
  };
  const t = types[selected];
  const priceData = [101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90];
  const W = 520; const H = 140;
  const PAD = { top: 20, right: 70, bottom: 20, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const minP = 87; const maxP = 106;
  const toX = (i: number) => PAD.left + (i / (priceData.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - minP) / (maxP - minP)) * (H - PAD.top - PAD.bottom);
  const pts = priceData.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const execIdx = selected === 'market' ? 0 : selected === 'limit' ? 6 : 9;
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-white/50">📋 Types d'ordres — cliquez pour explorer</p>
      <div className="flex gap-2">
        {(Object.keys(types) as Array<keyof typeof types>).map(k => (
          <button key={k} onClick={() => setSelected(k)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selected === k ? 'border-transparent text-white' : 'border-white/10 text-white/50 hover:border-white/30'}`}
            style={selected === k ? { background: types[k].color } : {}}>
            {types[k].icon} {types[k].label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        <polyline points={pts} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <line x1={PAD.left} x2={W-PAD.right} y1={toY(100)} y2={toY(100)} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4 3" />
        <text x={W-PAD.right+4} y={toY(100)+4} fontSize="9" fill="rgba(255,255,255,0.45)">Prix: 100</text>
        <line x1={PAD.left} x2={W-PAD.right} y1={toY(t.level)} y2={toY(t.level)} stroke={t.color} strokeWidth="1.5" strokeDasharray="5 3" />
        <text x={W-PAD.right+4} y={toY(t.level)+4} fontSize="9" fill={t.color}>{t.level}</text>
        <circle cx={toX(execIdx)} cy={toY(priceData[execIdx])} r="5" fill={t.color} />
        <text x={toX(execIdx)} y={toY(priceData[execIdx])-9} textAnchor="middle" fontSize="9" fill={t.color} fontWeight="600">⚡Exécution</text>
      </svg>
      <div className="p-3 rounded-lg text-xs" style={{ background: `${t.color}15`, border: `1px solid ${t.color}30`, color: t.color }}>
        {t.icon} {t.desc}
      </div>
    </div>
  );
}

// ── PositionSizeViz ───────────────────────────────────────────────────────────
function PositionSizeViz() {
  const [riskPct, setRiskPct] = useState(2);
  const portfolio = 10000;
  const riskAmount = (portfolio * riskPct) / 100;
  const ruinTrades = Math.floor(100 / riskPct);
  const color = riskPct <= 2 ? '#34d399' : riskPct <= 3 ? '#fbbf24' : '#f87171';
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-white/50">💰 Taille de position — ajustez le % de risque par trade</p>
      <div className="flex items-center gap-4">
        <span className="text-xs text-white/50 whitespace-nowrap">Risque / trade :</span>
        <input type="range" min={1} max={5} step={1} value={riskPct} onChange={e => setRiskPct(Number(e.target.value))} className="flex-1 accent-primary" />
        <span className="text-sm font-bold w-8 text-right" style={{ color }}>{riskPct}%</span>
      </div>
      <div className="h-8 bg-white/5 rounded-lg overflow-hidden flex border border-white/10">
        <div className="h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-300"
          style={{ width: `${Math.min(riskPct * 10, 50)}%`, background: color, minWidth: 28 }}>
          {riskPct}%
        </div>
        <div className="flex-1 flex items-center px-3 text-xs text-white/40">Reste du portefeuille</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/40 mb-1">Portefeuille</div>
          <div className="font-bold text-white">{portfolio.toLocaleString()}€</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <div className="text-white/40 mb-1">Risque max</div>
          <div className="font-bold" style={{ color }}>-{riskAmount.toLocaleString()}€</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/40 mb-1">Trades ruine</div>
          <div className="font-bold text-white">~{ruinTrades}</div>
        </div>
      </div>
      <div className={`text-xs p-2 rounded-lg text-center`} style={{ background: `${color}10`, color }}>
        {riskPct <= 2 ? '✅ Recommandé — gestion conservatrice du risque' : riskPct <= 3 ? '⚠️ Acceptable — surveiller la série de pertes' : '🚨 Risque élevé — peut vider le compte rapidement'}
      </div>
    </div>
  );
}

// ── MarketParticipantsViz ─────────────────────────────────────────────────────
function MarketParticipantsViz() {
  const [hov, setHov] = useState<number | null>(null);
  const data = [
    { label: 'Institutionnels', pct: 45, color: '#6366f1' },
    { label: 'Banques', pct: 25, color: '#22d3ee' },
    { label: 'Market Makers', pct: 20, color: '#a78bfa' },
    { label: 'Retail (nous)', pct: 10, color: '#34d399' },
  ];
  let cumAngle = 0;
  const slices = data.map(d => {
    const start = cumAngle;
    const angle = (d.pct / 100) * 2 * Math.PI;
    cumAngle += angle;
    const x1 = 90 + 70 * Math.cos(start - Math.PI / 2);
    const y1 = 90 + 70 * Math.sin(start - Math.PI / 2);
    const x2 = 90 + 70 * Math.cos(start + angle - Math.PI / 2);
    const y2 = 90 + 70 * Math.sin(start + angle - Math.PI / 2);
    return { ...d, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0 };
  });
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/50 mb-3">👥 Acteurs des marchés — survolez pour les détails</p>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 180 180" className="w-32 h-32 shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={`M 90 90 L ${s.x1} ${s.y1} A 70 70 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
              fill={s.color} opacity={hov === null || hov === i ? 1 : 0.35}
              stroke="#0f172a" strokeWidth="2"
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} />
          ))}
          <circle cx="90" cy="90" r="36" fill="#0f172a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          {hov !== null ? (
            <text x="90" y="94" textAnchor="middle" fontSize="18" fontWeight="bold" fill={data[hov].color}>{data[hov].pct}%</text>
          ) : (
            <text x="90" y="94" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">marchés</text>
          )}
        </svg>
        <div className="flex-1 space-y-2">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs cursor-pointer" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ opacity: hov === null || hov === i ? 1 : 0.4, transition: 'opacity 0.2s' }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
              <div className="flex-1 font-medium" style={{ color: s.color }}>{s.label}</div>
              <span className="font-bold" style={{ color: s.color }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Map lesson IDs to their chart components
function LessonChart({ lessonId }: { lessonId: string }) {
  if (lessonId === 'reading-charts') return <CandleChart />;
  if (lessonId === 'support-resistance') return <SupResChart />;
  if (lessonId === 'trend-indicators' || lessonId === 'rsi-divergence') return <RsiChart />;
  if (lessonId === 'order-book-deep' || lessonId === 'market-vs-limit') return <OrderBookViz />;
  if (lessonId === 'trend-following') return <TrendViz />;
  if (lessonId === 'trading-styles-comparison') return <StyleCompare />;
  if (lessonId === 'risk-basics') return <RiskRewardViz />;
  if (lessonId === 'position-sizing') return <PositionSizeViz />;
  if (lessonId === 'emotions-trading') return <EmotionCycleViz />;
  if (lessonId === 'swing-trading-strategy') return <SwingViz />;
  if (lessonId === 'order-types') return <OrderTypesViz />;
  if (lessonId === 'market-participants') return <MarketParticipantsViz />;
  return null;
}

// ─── Fiches Conseils Section ──────────────────────────────────────────────────
function FichesConseilsSection() {
  const { isPremium } = usePremium();
  const [data, setData] = useState<AdviceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<AdviceCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await toolsAPI.getAdvice(selectedCategory || undefined);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedCategory]);

  const openCard = async (card: AdviceCard) => {
    if (card.locked) { setSelectedCard(card); return; }
    setLoadingCard(true);
    try {
      const detail = await toolsAPI.getAdviceDetail(card.id);
      setSelectedCard(detail);
    } catch (e: any) {
      if (e.status === 403) {
        setSelectedCard({ ...card, locked: true, lock_message: "Contenu réservé aux membres Premium" });
      }
    } finally {
      setLoadingCard(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      "trending-up": TrendingUp, "activity": Activity, "shield": Shield,
      "brain": Brain, "chart": BarChart3, "bar-chart": BarChart3,
      "target": Target, "percent": Percent,
    };
    return icons[iconName] || BookOpen;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Fiches Conseils Trading</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
            >
              <option value="" className="bg-background">Toutes les catégories</option>
              {data?.categories.map((cat) => (
                <option key={cat.key} value={cat.key} className="bg-background">{cat.label}</option>
              ))}
            </select>
            <button onClick={load} disabled={isLoading} className="p-2 rounded-lg hover:bg-white/10">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
        {!isPremium && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">
              Certaines fiches sont réservées aux membres Premium.{" "}
              <a href="/premium" className="underline hover:no-underline">Passer Premium</a>
            </p>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.advice.map((card) => {
            const Icon = getIcon(card.icon);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => openCard(card)}
                className={cn(
                  "glass-card p-5 cursor-pointer transition-colors relative overflow-hidden",
                  card.locked ? "opacity-80" : "hover:bg-white/5"
                )}
              >
                {card.locked && (
                  <div className="absolute top-3 right-3">
                    <div className="p-1.5 rounded-full bg-yellow-500/20">
                      <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{card.summary}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground capitalize">
                    {data?.categories.find((c) => c.key === card.category)?.label || card.category}
                  </span>
                  {card.premium_only && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Crown className="w-3 h-3" />Premium
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCard(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
          >
            {loadingCard ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : selectedCard.locked ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{selectedCard.title}</h3>
                <p className="text-muted-foreground mb-6">{selectedCard.lock_message}</p>
                <a href="/premium" className="inline-flex items-center gap-2 btn-primary">
                  <Crown className="w-4 h-4" />Passer Premium
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      {(() => { const Icon = getIcon(selectedCard.icon); return <Icon className="w-6 h-6 text-primary" />; })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedCard.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {data?.categories.find((c) => c.key === selectedCard.category)?.label}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCard(null)} className="p-2 rounded-lg hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table {...props} className="w-full border-collapse border border-white/10 rounded-lg overflow-hidden" /></div>,
                      th: ({ node, ...props }) => <th {...props} className="bg-white/5 p-2 text-left font-semibold border border-white/10" />,
                      td: ({ node, ...props }) => <td {...props} className="p-2 border border-white/10" />,
                      code: ({ node, inline, ...props }: any) => inline
                        ? <code {...props} className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm" />
                        : <code {...props} className="block bg-white/5 p-4 rounded-lg border border-white/10 overflow-x-auto text-sm" />,
                      blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" />,
                    }}
                  >
                    {selectedCard.content}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Progress stored in localStorage ──────────────────────────────────────────
const STORAGE_KEY = "tdb_learn_progress";

type Progress = {
  completedLessons: string[]; // "moduleId/lessonId"
  quizScores: Record<string, number>; // "moduleId/lessonId" -> score %
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return { completedLessons: [], quizScores: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completedLessons: [], quizScores: {} };
  } catch {
    return { completedLessons: [], quizScores: {} };
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function LearnPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress>({ completedLessons: [], quizScores: {} });
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [mainTab, setMainTab] = useState<"modules" | "fiches">("modules");

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const markLessonComplete = (moduleId: string, lessonId: string) => {
    const key = `${moduleId}/${lessonId}`;
    if (progress.completedLessons.includes(key)) return;
    const updated = { ...progress, completedLessons: [...progress.completedLessons, key] };
    setProgress(updated);
    saveProgress(updated);
  };

  const saveQuizScore = (moduleId: string, lessonId: string, score: number) => {
    const key = `${moduleId}/${lessonId}`;
    const updated = { ...progress, quizScores: { ...progress.quizScores, [key]: score } };
    setProgress(updated);
    saveProgress(updated);
  };

  const totalLessons = LEARN_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = progress.completedLessons.length;
  const overallPercent = Math.round((completedCount / totalLessons) * 100);

  const userLevel = user?.trading_level;

  if (activeLesson && activeModule) {
    return (
      <LessonView
        module={activeModule}
        lesson={activeLesson}
        progress={progress}
        onComplete={() => markLessonComplete(activeModule.id, activeLesson.id)}
        onSaveQuiz={(score) => saveQuizScore(activeModule.id, activeLesson.id, score)}
        onBack={() => setActiveLesson(null)}
      />
    );
  }

  if (activeModule) {
    return (
      <ModuleView
        module={activeModule}
        progress={progress}
        onSelectLesson={setActiveLesson}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  // ── Module list / home ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Formation Trading
          </h1>
          <p className="text-muted-foreground mt-1">
            Apprends les bases et les techniques du trading, à ton rythme.
          </p>
        </div>
        {userLevel && (
          <div className={cn("px-3 py-1.5 rounded-full text-sm font-medium border", getLevelBadge(userLevel).color)}>
            Niveau : {getLevelBadge(userLevel).label}
          </div>
        )}
      </div>

      {/* Tab toggle */}
      <div className="glass-card p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab("modules")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
              mainTab === "modules" ? "bg-primary text-primary-foreground" : "hover:bg-white/10"
            )}
          >
            <GraduationCap className="w-4 h-4" />
            Modules de formation
          </button>
          <button
            onClick={() => setMainTab("fiches")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
              mainTab === "fiches" ? "bg-primary text-primary-foreground" : "hover:bg-white/10"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Fiches Conseils
          </button>
        </div>
      </div>

      {/* Fiches Conseils view */}
      {mainTab === "fiches" && <FichesConseilsSection />}

      {/* Modules view */}
      {mainTab === "modules" && <>

      {/* Overall progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">Progression globale</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {totalLessons} leçons
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Débutant</span>
          <span className="font-medium text-primary">{overallPercent}%</span>
          <span>Expert</span>
        </div>
      </div>

      {/* Beginner banner */}
      {(!userLevel || userLevel === "beginner") && completedCount === 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-400 mb-1">Commençons par le début !</p>
              <p className="text-sm text-white/70">
                On te recommande de commencer par{" "}
                <button
                  onClick={() => setActiveModule(LEARN_MODULES[0])}
                  className="text-emerald-400 underline hover:no-underline"
                >
                  Les bases du trading
                </button>
                . Chaque leçon prend moins de 10 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEARN_MODULES.map((module, idx) => {
          const moduleLessons = module.lessons.length;
          const completedInModule = module.lessons.filter((l) =>
            progress.completedLessons.includes(`${module.id}/${l.id}`)
          ).length;
          const modulePercent = Math.round((completedInModule / moduleLessons) * 100);
          const isLocked = userLevel === "expert" ? false
            : module.level === "advanced" && userLevel === "beginner" && completedInModule === 0;

          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              onClick={() => !isLocked && setActiveModule(module)}
              disabled={isLocked}
              className={cn(
                "text-left p-5 rounded-xl border bg-gradient-to-br transition-all group",
                module.color,
                isLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02] hover:shadow-lg cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{module.icon}</span>
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-white/40" />
                  ) : modulePercent === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : null}
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getLevelBadge(module.level).color)}>
                    {getLevelBadge(module.level).label}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1">{module.title}</h3>
              <p className="text-sm text-white/60 leading-snug mb-4">{module.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {moduleLessons} leçons
                  </span>
                  <span>{completedInModule}/{moduleLessons} complétées</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/40 rounded-full transition-all duration-500"
                    style={{ width: `${modulePercent}%` }}
                  />
                </div>
              </div>

              {!isLocked && (
                <div className="mt-3 flex items-center gap-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                  <span>{modulePercent === 100 ? "Revoir le module" : modulePercent > 0 ? "Continuer" : "Commencer"}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      </>}
    </motion.div>
  );
}

// ─── Module view (list of lessons) ──────────────────────────────────────────
function ModuleView({
  module,
  progress,
  onSelectLesson,
  onBack,
}: {
  module: Module;
  progress: Progress;
  onSelectLesson: (l: Lesson) => void;
  onBack: () => void;
}) {
  const completedInModule = module.lessons.filter((l) =>
    progress.completedLessons.includes(`${module.id}/${l.id}`)
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour aux modules
      </button>

      <div className={cn("p-6 rounded-xl border bg-gradient-to-br", module.color)}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{module.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{module.title}</h1>
            <p className="text-sm text-white/60">{completedInModule} / {module.lessons.length} leçons complétées</p>
          </div>
        </div>
        <p className="text-sm text-white/70">{module.description}</p>
      </div>

      <div className="space-y-3">
        {module.lessons.map((lesson, idx) => {
          const key = `${module.id}/${lesson.id}`;
          const isCompleted = progress.completedLessons.includes(key);
          const quizScore = progress.quizScores[key];

          return (
            <motion.button
              key={lesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectLesson(lesson)}
              className="w-full text-left p-5 glass-card hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-white/5 border-white/20"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <span className="text-sm font-bold text-white/50">{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{lesson.title}</p>
                    {lesson.quiz && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                        Quiz inclus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duration}
                    </span>
                    {quizScore !== undefined && (
                      <span className={cn(
                        "flex items-center gap-1",
                        quizScore >= 80 ? "text-emerald-400" : quizScore >= 50 ? "text-yellow-400" : "text-red-400"
                      )}>
                        <Award className="w-3 h-3" />
                        Quiz : {quizScore}%
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Lesson view ─────────────────────────────────────────────────────────────
function LessonView({
  module,
  lesson,
  progress,
  onComplete,
  onSaveQuiz,
  onBack,
}: {
  module: Module;
  lesson: Lesson;
  progress: Progress;
  onComplete: () => void;
  onSaveQuiz: (score: number) => void;
  onBack: () => void;
}) {
  const key = `${module.id}/${lesson.id}`;
  const isCompleted = progress.completedLessons.includes(key);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  const handleReadingDone = () => {
    if (!isCompleted) onComplete();
    if (lesson.quiz && !quizDone) {
      setShowQuiz(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {module.title}
      </button>

      {/* Lesson header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span className="text-lg">{module.icon}</span>
              <span>{module.title}</span>
            </div>
            <h1 className="text-xl font-bold">{lesson.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {lesson.duration}
            </span>
            {isCompleted && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Complétée
              </div>
            )}
          </div>
        </div>

        {/* Key points */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
          <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Points clés
          </p>
          <ul className="space-y-1.5">
            {lesson.keyPoints.map((point, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive chart */}
        <LessonChart lessonId={lesson.id} />

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          {lesson.content.split("\n\n").map((paragraph, i) => {
            if (!paragraph.trim()) return null;
            // Detect bullet list
            if (paragraph.trim().startsWith("•")) {
              const items = paragraph.split("\n").filter((l) => l.trim().startsWith("•"));
              return (
                <ul key={i} className="list-none space-y-1.5 mb-4">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-white/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: item.replace("• ", "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              );
            }
            // Parse bold inline **text**
            const html = paragraph
              .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>")
              .replace(/\n/g, "<br/>");
            return (
              <p
                key={i}
                className="text-white/75 leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
        </div>

        {/* CTA */}
        {!showQuiz && (
          <button
            onClick={handleReadingDone}
            className="mt-4 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {lesson.quiz ? (
              <>
                <Award className="w-4 h-4" />
                {quizDone ? "Revoir le quiz" : "J'ai compris, passer au quiz !"}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Marquer comme lu
              </>
            )}
          </button>
        )}
      </div>

      {/* Quiz */}
      <AnimatePresence>
        {showQuiz && lesson.quiz && (
          <QuizSection
            questions={lesson.quiz}
            existingScore={progress.quizScores[key]}
            onComplete={(score) => {
              onSaveQuiz(score);
              setQuizDone(true);
            }}
            onClose={() => setShowQuiz(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Quiz section ─────────────────────────────────────────────────────────────
function QuizSection({
  questions,
  existingScore,
  onComplete,
  onClose,
}: {
  questions: QuizQuestion[];
  existingScore?: number;
  onComplete: (score: number) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const q = questions[current];
  const answered = answers[current] !== null;
  const isCorrect = answers[current] === q.correct;

  const handleAnswer = (optIdx: number) => {
    if (answered) return;
    const updated = [...answers];
    updated[current] = optIdx;
    setAnswers(updated);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      const correct = answers.filter((a, i) => a === questions[i].correct).length;
      const score = Math.round((correct / questions.length) * 100);
      onComplete(score);
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers(questions.map(() => null));
    setShowResult(false);
    setShowExplanation(false);
  };

  if (showResult) {
    const correct = answers.filter((a, i) => a === questions[i].correct).length;
    const score = Math.round((correct / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center"
      >
        <div className={cn(
          "w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl",
          score >= 80 ? "bg-emerald-500/20" : score >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"
        )}>
          {score >= 80 ? "🏆" : score >= 50 ? "📚" : "💪"}
        </div>
        <h3 className="text-xl font-bold mb-2">Quiz terminé !</h3>
        <p className="text-4xl font-black mb-2" style={{
          color: score >= 80 ? "#4ade80" : score >= 50 ? "#facc15" : "#f87171"
        }}>
          {score}%
        </p>
        <p className="text-muted-foreground mb-1">
          {correct} / {questions.length} bonnes réponses
        </p>
        <p className="text-sm text-white/60 mb-6">
          {score >= 80
            ? "Excellent ! Vous maîtrisez ce contenu."
            : score >= 50
            ? "Pas mal ! Revoir les points que vous avez manqués."
            : "Continuez à apprendre, relisez la leçon avant de retenter."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Recommencer
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-sm text-white"
          >
            <Check className="w-4 h-4" />
            Terminer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Quiz header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Quiz — Question {current + 1} / {questions.length}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="font-medium text-lg mb-4">{q.question}</p>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {q.options.map((option, i) => {
          const isSelected = answers[current] === i;
          const isCorrectOption = i === q.correct;
          let style = "bg-white/5 border-white/15 hover:bg-white/10";
          if (answered) {
            if (isCorrectOption) style = "bg-emerald-500/20 border-emerald-500/50";
            else if (isSelected && !isCorrectOption) style = "bg-red-500/20 border-red-500/50";
            else style = "bg-white/5 border-white/10 opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                style,
                answered ? "cursor-default" : "cursor-pointer"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold",
                answered && isCorrectOption
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : answered && isSelected && !isCorrectOption
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-white/30 text-white/50"
              )}>
                {answered
                  ? isCorrectOption ? <Check className="w-3 h-3" /> : isSelected ? <X className="w-3 h-3" /> : String.fromCharCode(65 + i)
                  : String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "p-4 rounded-xl mb-4 border",
              isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-orange-500/10 border-orange-500/30"
            )}>
              <p className={cn("text-sm font-medium mb-1", isCorrect ? "text-emerald-400" : "text-orange-400")}>
                {isCorrect ? "✓ Bonne réponse !" : "✗ Pas tout à fait..."}
              </p>
              <p className="text-sm text-white/70">{q.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {answered && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {current < questions.length - 1 ? (
            <>Question suivante <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Voir les résultats <Trophy className="w-4 h-4" /></>
          )}
        </button>
      )}
    </motion.div>
  );
}

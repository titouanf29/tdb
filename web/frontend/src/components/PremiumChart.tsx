'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from 'lightweight-charts';
import { TrendingUp, Lock, BarChart2, Activity, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { usePremium } from '@/lib/PremiumContext';
import { authHeaders } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LinePoint {
  time: number;
  value: number;
}

interface ProjectionPoint {
  time: number;
  value: number;
  upper: number;
  lower: number;
}

interface Levels {
  support: number;
  resistance: number;
  pivot: number;
}

interface ProjectionMeta {
  trend: 'bullish' | 'bearish';
  rsi: number;
  atr: number;
  target: number;
  target_upper: number;
  target_lower: number;
}

interface ChartData {
  symbol: string;
  timeframe: string;
  candles: OHLCVBar[];
  ema20: LinePoint[];
  ema50: LinePoint[];
  ema200: LinePoint[];
  bollinger: { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] };
  projection: ProjectionPoint[];
  projection_meta: ProjectionMeta;
  levels: Levels;
}

interface PremiumChartProps {
  symbol: string;
  timeframe: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toUTC = (t: number) => t as UTCTimestamp;

// ── Component ─────────────────────────────────────────────────────────────────

export default function PremiumChart({ symbol, timeframe }: PremiumChartProps) {
  const { isPremium, isAdmin } = usePremium();
  const canAccess = isPremium || isAdmin;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Indicator toggles
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showProjection, setShowProjection] = useState(true);

  // Series refs so we can toggle visibility without re-creating
  const seriesRefs = useRef<{
    candle: ISeriesApi<'Candlestick'> | null;
    volume: ISeriesApi<'Histogram'> | null;
    ema20: ISeriesApi<'Line'> | null;
    ema50: ISeriesApi<'Line'> | null;
    ema200: ISeriesApi<'Line'> | null;
    bbUpper: ISeriesApi<'Line'> | null;
    bbMiddle: ISeriesApi<'Line'> | null;
    bbLower: ISeriesApi<'Line'> | null;
    projLine: ISeriesApi<'Line'> | null;
    projUpper: ISeriesApi<'Line'> | null;
    projLower: ISeriesApi<'Line'> | null;
  }>({
    candle: null, volume: null,
    ema20: null, ema50: null, ema200: null,
    bbUpper: null, bbMiddle: null, bbLower: null,
    projLine: null, projUpper: null, projLower: null,
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchChart = useCallback(async () => {
    if (!symbol || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analysis/${encodeURIComponent(symbol)}/chart?timeframe=${timeframe}`,
        { headers: { ...authHeaders() } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Erreur lors du chargement du graphique');
      }
      const data: ChartData = await res.json();
      setChartData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, canAccess]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // ── Build / update chart ──────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !chartData) return;

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 420,
    });
    chartRef.current = chart;

    const s = seriesRefs.current;

    // ── Candles ────────────────────────────────────────────────────────────
    s.candle = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    s.candle.setData(
      chartData.candles.map((c) => ({
        time: toUTC(c.time),
        open: c.open, high: c.high, low: c.low, close: c.close,
      }))
    );

    // ── Volume ────────────────────────────────────────────────────────────
    s.volume = chart.addHistogramSeries({
      color: 'rgba(100,116,139,0.4)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    s.volume.setData(
      chartData.candles.map((c) => ({
        time: toUTC(c.time),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      }))
    );
    s.volume.applyOptions({ visible: showVolume });

    // ── EMA 20 ─────────────────────────────────────────────────────────────
    if (chartData.ema20.length) {
      s.ema20 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'EMA20', priceLineVisible: false });
      s.ema20.setData(chartData.ema20.map((p) => ({ time: toUTC(p.time), value: p.value })));
      s.ema20.applyOptions({ visible: showEMA20 });
    }

    // ── EMA 50 ─────────────────────────────────────────────────────────────
    if (chartData.ema50.length) {
      s.ema50 = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'EMA50', priceLineVisible: false });
      s.ema50.setData(chartData.ema50.map((p) => ({ time: toUTC(p.time), value: p.value })));
      s.ema50.applyOptions({ visible: showEMA50 });
    }

    // ── EMA 200 ────────────────────────────────────────────────────────────
    if (chartData.ema200.length) {
      s.ema200 = chart.addLineSeries({ color: '#a855f7', lineWidth: 1, title: 'EMA200', priceLineVisible: false });
      s.ema200.setData(chartData.ema200.map((p) => ({ time: toUTC(p.time), value: p.value })));
      s.ema200.applyOptions({ visible: showEMA200 });
    }

    // ── Bollinger ──────────────────────────────────────────────────────────
    if (chartData.bollinger.upper.length) {
      const bbOpts = { lineWidth: 1 as const, priceLineVisible: false, lineStyle: LineStyle.Dashed };
      s.bbUpper  = chart.addLineSeries({ ...bbOpts, color: 'rgba(99,102,241,0.7)', title: 'BB+' });
      s.bbMiddle = chart.addLineSeries({ ...bbOpts, color: 'rgba(99,102,241,0.4)', title: 'BB' });
      s.bbLower  = chart.addLineSeries({ ...bbOpts, color: 'rgba(99,102,241,0.7)', title: 'BB-' });
      s.bbUpper.setData(chartData.bollinger.upper.map((p) => ({ time: toUTC(p.time), value: p.value })));
      s.bbMiddle.setData(chartData.bollinger.middle.map((p) => ({ time: toUTC(p.time), value: p.value })));
      s.bbLower.setData(chartData.bollinger.lower.map((p) => ({ time: toUTC(p.time), value: p.value })));
      [s.bbUpper, s.bbMiddle, s.bbLower].forEach((ser) => ser?.applyOptions({ visible: showBollinger }));
    }

    // ── Projection ────────────────────────────────────────────────────────
    if (chartData.projection.length) {
      s.projLine  = chart.addLineSeries({
        color: '#06b6d4', lineWidth: 2, lineStyle: LineStyle.Dashed,
        title: 'Projection', priceLineVisible: false,
      });
      s.projUpper = chart.addLineSeries({
        color: 'rgba(6,182,212,0.25)', lineWidth: 1, lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
      });
      s.projLower = chart.addLineSeries({
        color: 'rgba(6,182,212,0.25)', lineWidth: 1, lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
      });

      // Connect last candle → projection
      const lastCandle = chartData.candles[chartData.candles.length - 1];
      const projBase  = [{ time: toUTC(lastCandle.time), value: lastCandle.close }, ...chartData.projection.map((p) => ({ time: toUTC(p.time), value: p.value }))];
      const projUp    = [{ time: toUTC(lastCandle.time), value: lastCandle.close }, ...chartData.projection.map((p) => ({ time: toUTC(p.time), value: p.upper }))];
      const projDown  = [{ time: toUTC(lastCandle.time), value: lastCandle.close }, ...chartData.projection.map((p) => ({ time: toUTC(p.time), value: p.lower }))];

      s.projLine.setData(projBase);
      s.projUpper.setData(projUp);
      s.projLower.setData(projDown);
      [s.projLine, s.projUpper, s.projLower].forEach((ser) => ser?.applyOptions({ visible: showProjection }));
    }

    // ── Support / Resistance price lines ─────────────────────────────────
    if (s.candle) {
      s.candle.createPriceLine({ price: chartData.levels.support,    color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'Support',    axisLabelVisible: true });
      s.candle.createPriceLine({ price: chartData.levels.resistance, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'Résistance', axisLabelVisible: true });
      s.candle.createPriceLine({ price: chartData.levels.pivot,      color: '#94a3b8', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'Pivot',      axisLabelVisible: true });
    }

    chart.timeScale().fitContent();

    // ── Resize observer ───────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData]);

  // ── Toggle handlers ───────────────────────────────────────────────────────

  const toggle = (key: keyof typeof seriesRefs.current | 'bb' | 'proj', value: boolean) => {
    const s = seriesRefs.current;
    if (key === 'bb') {
      [s.bbUpper, s.bbMiddle, s.bbLower].forEach((ser) => ser?.applyOptions({ visible: value }));
    } else if (key === 'proj') {
      [s.projLine, s.projUpper, s.projLower].forEach((ser) => ser?.applyOptions({ visible: value }));
    } else {
      s[key]?.applyOptions({ visible: value });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canAccess) {
    return (
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Graphique Avancé</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
            Premium
          </span>
        </div>
        {/* Blurred placeholder */}
        <div className="relative h-64 rounded-xl overflow-hidden bg-white/5">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white mb-1">Fonctionnalité Premium</p>
              <p className="text-sm text-slate-400">Accède aux graphiques interactifs avec projections</p>
            </div>
            <a
              href="/premium"
              className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Passer Premium
            </a>
          </div>
          {/* Fake blurred chart lines */}
          <svg className="w-full h-full opacity-10 blur-sm" viewBox="0 0 400 160" preserveAspectRatio="none">
            <polyline points="0,120 40,100 80,110 120,80 160,90 200,60 240,70 280,50 320,65 360,40 400,55" fill="none" stroke="#06b6d4" strokeWidth="2" />
            <polyline points="0,130 40,115 80,125 120,95 160,105 200,75 240,85 280,65 320,80 360,55 400,70" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Graphique Avancé</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
            Premium
          </span>
        </div>
        <button
          onClick={fetchChart}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Indicator toggles */}
      {chartData && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'EMA20',      color: '#f59e0b', state: showEMA20,      set: setShowEMA20,      key: 'ema20' as const },
            { label: 'EMA50',      color: '#3b82f6', state: showEMA50,      set: setShowEMA50,      key: 'ema50' as const },
            { label: 'EMA200',     color: '#a855f7', state: showEMA200,     set: setShowEMA200,     key: 'ema200' as const },
            { label: 'Bollinger',  color: '#6366f1', state: showBollinger,  set: setShowBollinger,  key: 'bb' as const },
            { label: 'Volume',     color: '#64748b', state: showVolume,     set: setShowVolume,     key: 'volume' as const },
            { label: 'Projection', color: '#06b6d4', state: showProjection, set: setShowProjection, key: 'proj' as const },
          ].map(({ label, color, state, set, key }) => (
            <button
              key={label}
              onClick={() => { set(!state); toggle(key, !state); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                state
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/10 text-slate-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: state ? color : '#475569' }} />
              {state ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Projection stats */}
      {chartData?.projection_meta && !loading && !error && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tendance</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              chartData.projection_meta.trend === 'bullish'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {chartData.projection_meta.trend === 'bullish' ? '▲ Haussière' : '▼ Baissière'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Cible</span>
            <span className="font-semibold text-cyan-400">{chartData.projection_meta.target.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Zone haute</span>
            <span className="font-semibold text-green-400">{chartData.projection_meta.target_upper.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Zone basse</span>
            <span className="font-semibold text-red-400">{chartData.projection_meta.target_lower.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">RSI</span>
            <span className={`font-semibold ${
              chartData.projection_meta.rsi > 70 ? 'text-red-400'
              : chartData.projection_meta.rsi < 30 ? 'text-green-400'
              : 'text-slate-300'
            }`}>{chartData.projection_meta.rsi}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">ATR</span>
            <span className="text-slate-300 font-semibold">{chartData.projection_meta.atr.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Chart area */}
      {loading && (
        <div className="h-[420px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <TrendingUp className="w-8 h-8 animate-pulse text-primary" />
            <span className="text-sm">Chargement du graphique…</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="h-[420px] flex items-center justify-center">
          <div className="text-center text-slate-400">
            <p className="text-sm mb-3">{error}</p>
            <button
              onClick={fetchChart}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`rounded-xl overflow-hidden ${loading || error ? 'hidden' : 'block'}`}
      />

      {/* Legend */}
      {chartData && !loading && !error && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> Haussier</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> Baissier</span>
          <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-green-400 inline-block" /> Support</span>
          <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-red-400 inline-block" /> Résistance</span>
          <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-cyan-400 inline-block" /> Projection</span>
          <span className="text-slate-600">· Données historiques + projection statistique (régression linéaire, IC 95%)</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, ArrowRight, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { ipoAPI, IPOWatchItem } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

const STATUS_CONFIG = {
  listed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/25",
    labelFr: "COTÉ",
    labelEn: "LISTED",
  },
  upcoming: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/25",
    labelFr: "À VENIR",
    labelEn: "UPCOMING",
  },
  rumored: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/25",
    labelFr: "RUMEUR",
    labelEn: "RUMORED",
  },
} as const;

const STORAGE_KEY = "tdb_ipo_watch_followed";

function getFollowed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setFollowed(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function IPOCard({ item, lang }: { item: IPOWatchItem; lang: string }) {
  const router = useRouter();
  const [followed, setFollowedState] = useState<string[]>([]);

  useEffect(() => {
    setFollowedState(getFollowed());
  }, []);

  const cfg = STATUS_CONFIG[item.status];
  const isFollowed = followed.includes(item.id);
  const description = lang === "fr" ? item.description_fr : item.description_en;
  const tags = lang === "fr" ? item.tags_fr : item.tags_en;
  const statusLabel = lang === "fr" ? cfg.labelFr : cfg.labelEn;
  const sector = lang === "fr" ? item.sector : item.sector_en;

  const toggleFollow = () => {
    const next = isFollowed
      ? followed.filter((id) => id !== item.id)
      : [...followed, item.id];
    setFollowed(next);
    setFollowedState(next);
  };

  return (
    <div className="flex-shrink-0 w-72 sm:w-80 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] transition-all p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className={cn(
              "self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider",
              cfg.bg,
              cfg.text,
              cfg.border
            )}
          >
            {statusLabel}
          </span>
          <p className="font-bold text-base leading-tight truncate">{item.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sector}</p>
        </div>
        {/* Action button */}
        <div className="flex-shrink-0 mt-0.5">
          {item.status === "listed" && item.ticker_to_watch ? (
            <button
              onClick={() => router.push(`/analysis?symbol=${item.ticker_to_watch}`)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 transition-all font-semibold whitespace-nowrap"
            >
              {lang === "fr" ? "Analyser" : "Analyze"}
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              title={
                isFollowed
                  ? lang === "fr"
                    ? "Ne plus suivre"
                    : "Unfollow"
                  : lang === "fr"
                  ? "Suivre"
                  : "Follow"
              }
              className={cn(
                "p-1.5 rounded-lg border transition-all",
                isFollowed
                  ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/25"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
              )}
            >
              {isFollowed ? (
                <Bell className="w-3.5 h-3.5" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Exchange + Date */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">{item.exchange}</span>
        <span className="text-white/20">·</span>
        <span className="flex-shrink-0">{item.date}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function IPOWatchWidget() {
  const { lang } = useLanguage();
  const [ipos, setIpos] = useState<IPOWatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ipoAPI
      .getWatchlist()
      .then((data) => setIpos(data.ipos))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="h-4 w-40 bg-white/10 rounded animate-pulse mb-4" />
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 h-44 rounded-xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (ipos.length === 0) return null;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">
            {lang === "fr" ? "IPO en Veille" : "IPO Watchlist"}
          </h2>
          <span className="text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            VEILLE
          </span>
        </div>
      </div>

      {/* Horizontal scrollable cards */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {ipos.map((ipo) => (
          <IPOCard key={ipo.id} item={ipo} lang={lang} />
        ))}
      </div>
    </div>
  );
}

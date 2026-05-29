"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Plus, Pencil, Download, Trash2, CheckCircle,
  Clock, Send, ChevronLeft, Loader2, AlertCircle, BarChart3,
  Lightbulb, TrendingUp, Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI, contentFactoryAPI, ContentPiece, LibraryItem } from "@/lib/api";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  indicator: { label: "Indicateur",  color: "text-blue-400   bg-blue-400/10   border-blue-400/25"   },
  concept:   { label: "Concept",     color: "text-purple-400 bg-purple-400/10 border-purple-400/25" },
  strategy:  { label: "Stratégie",   color: "text-amber-400  bg-amber-400/10  border-amber-400/25"  },
  tip:       { label: "Conseil",     color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:     { label: "Brouillon",  icon: Clock,         color: "text-muted-foreground bg-white/5 border-white/15" },
  ready:     { label: "Prêt",       icon: CheckCircle,   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  published: { label: "Publié",     icon: Send,          color: "text-primary bg-primary/10 border-primary/25" },
};

export default function ContentFactoryPage() {
  const router = useRouter();
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pieces,     setPieces]     = useState<ContentPiece[]>([]);
  const [library,    setLibrary]    = useState<LibraryItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [exporting,  setExporting]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>("all");

  useEffect(() => {
    adminAPI.checkAdmin()
      .then(r => { if (!r.is_admin) router.push("/"); else setIsAdmin(true); })
      .catch(() => router.push("/"))
      .finally(() => setIsChecking(false));
  }, [router]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        contentFactoryAPI.getPieces(),
        contentFactoryAPI.getLibrary(),
      ]);
      setPieces(pRes.pieces);
      setLibrary(lRes.library);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (piece: ContentPiece) => {
    setExporting(piece.id);
    try {
      const safe = piece.topic.replace(/[^a-zA-Z0-9]/g, "_");
      await contentFactoryAPI.exportPiece(piece.id, `captentdb_${safe}.zip`);
    } catch (e: any) {
      setError(e.message || "Erreur export");
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    setDeletingId(id);
    try {
      await contentFactoryAPI.deletePiece(id);
      setPieces(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setError(e.message || "Erreur suppression");
    } finally {
      setDeletingId(null);
    }
  };

  if (isChecking) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!isAdmin) return null;

  const piecesByTopic = Object.fromEntries(pieces.map(p => [p.topic, p]));
  const filteredLibrary = filter === "all" ? library : library.filter(l => l.category === filter);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              Content Factory
            </h1>
            <p className="text-sm text-muted-foreground">Génère des packs vidéo pour TikTok, YouTube Shorts & Instagram</p>
          </div>
        </div>
        <Link href="/admin/content-factory/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white"
            style={{ background: "linear-gradient(135deg, rgba(99,140,255,0.9), rgba(139,92,246,0.9))", border: "1px solid rgba(99,140,255,0.4)" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau contenu
          </motion.button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total créés",  value: pieces.length,                                       icon: Video,        color: "text-primary"   },
          { label: "Prêts",        value: pieces.filter(p => p.status === "ready").length,     icon: CheckCircle,  color: "text-emerald-400" },
          { label: "Publiés",      value: pieces.filter(p => p.status === "published").length, icon: Send,         color: "text-blue-400"  },
          { label: "Sujets dispo", value: library.length,                                       icon: Lightbulb,    color: "text-amber-400" },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
            <stat.icon className={cn("w-5 h-5", stat.color)} />
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/25 rounded-xl text-sm text-loss">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Fermer</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "indicator", "concept", "strategy"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === f
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "Tous" : CATEGORY_LABELS[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Existing pieces */}
      {pieces.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contenus créés</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {pieces.filter(p => filter === "all" || p.category === filter).map(piece => {
                const cat = CATEGORY_LABELS[piece.category];
                const st  = STATUS_CONFIG[piece.status] ?? STATUS_CONFIG.draft;
                const StIcon = st.icon;
                return (
                  <motion.div
                    key={piece.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{piece.title || piece.topic}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(piece.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cat?.color ?? "text-muted-foreground bg-white/5 border-white/10")}>
                        {cat?.label ?? piece.category}
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border w-fit", st.color)}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/admin/content-factory/${piece.id}`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
                          <Pencil className="w-3 h-3" />
                          Éditer
                        </button>
                      </Link>
                      <button
                        onClick={() => handleExport(piece)}
                        disabled={exporting === piece.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs transition-colors disabled:opacity-50"
                      >
                        {exporting === piece.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        ZIP
                      </button>
                      <button
                        onClick={() => handleDelete(piece.id)}
                        disabled={deletingId === piece.id}
                        className="p-1.5 rounded-lg bg-loss/10 hover:bg-loss/20 text-loss text-xs transition-colors disabled:opacity-50"
                      >
                        {deletingId === piece.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Library — topics not yet created */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Bibliothèque de sujets
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredLibrary.map(item => {
              const existing = piecesByTopic[item.topic];
              const cat = CATEGORY_LABELS[item.category];
              const CatIcon = item.category === "indicator" ? BarChart3 : item.category === "strategy" ? TrendingUp : Lightbulb;
              return (
                <motion.div
                  key={item.topic}
                  whileHover={{ y: -2 }}
                  className={cn(
                    "glass-card p-3 flex flex-col gap-2 cursor-pointer transition-all",
                    existing ? "opacity-60" : "hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <CatIcon className={cn("w-4 h-4", cat?.color?.split(" ")[0] ?? "text-muted-foreground")} />
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", cat?.color ?? "")}>
                      {cat?.label ?? item.category}
                    </span>
                  </div>
                  <p className="font-semibold text-sm leading-tight">{item.topic}</p>
                  {existing ? (
                    <Link href={`/admin/content-factory/${existing.id}`}>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> Déjà créé
                      </span>
                    </Link>
                  ) : (
                    <Link href={`/admin/content-factory/new?topic=${encodeURIComponent(item.topic)}&category=${item.category}`}>
                      <span className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                        <Plus className="w-3 h-3" /> Créer
                      </span>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

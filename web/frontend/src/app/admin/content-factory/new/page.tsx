"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft, Sparkles, Loader2, Copy, Check, Save,
  Download, AlertCircle, Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI, contentFactoryAPI, GeneratedScript } from "@/lib/api";

const TOPICS = [
  { topic: "RSI",                     category: "indicator" },
  { topic: "MACD",                    category: "indicator" },
  { topic: "EMA",                     category: "indicator" },
  { topic: "Bollinger Bands",         category: "indicator" },
  { topic: "Volume",                  category: "indicator" },
  { topic: "Stochastique",            category: "indicator" },
  { topic: "ATR",                     category: "indicator" },
  { topic: "Ichimoku",                category: "indicator" },
  { topic: "Support & Résistance",    category: "concept"   },
  { topic: "Chandelier Japonais",     category: "concept"   },
  { topic: "Tendance",                category: "concept"   },
  { topic: "Risk Management",         category: "concept"   },
  { topic: "Take Profit / Stop Loss", category: "concept"   },
  { topic: "Scalping",                category: "strategy"  },
  { topic: "Swing Trading",           category: "strategy"  },
  { topic: "Day Trading",             category: "strategy"  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function NewContentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAdmin,       setIsAdmin]       = useState(false);
  const [isChecking,    setIsChecking]    = useState(true);
  const [topic,         setTopic]         = useState(searchParams.get("topic") || "RSI");
  const [category,      setCategory]      = useState(searchParams.get("category") || "indicator");
  const [generated,     setGenerated]     = useState<GeneratedScript | null>(null);
  const [script,        setScript]        = useState("");
  const [hook,          setHook]          = useState("");
  const [cta,           setCta]           = useState("");
  const [descTt,        setDescTt]        = useState("");
  const [descYt,        setDescYt]        = useState("");
  const [descIg,        setDescIg]        = useState("");
  const [tagsInput,     setTagsInput]     = useState<Record<string, string>>({ tt: "", yt: "", ig: "" });
  const [status,        setStatus]        = useState<"draft" | "ready" | "published">("draft");
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [savedId,       setSavedId]       = useState<string | null>(null);
  const [isExporting,   setIsExporting]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [source,        setSource]        = useState<string>("");

  useEffect(() => {
    adminAPI.checkAdmin()
      .then(r => { if (!r.is_admin) router.push("/"); else setIsAdmin(true); })
      .catch(() => router.push("/"))
      .finally(() => setIsChecking(false));
  }, [router]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await contentFactoryAPI.generateScript(topic, category);
      const g = res.generated;
      setGenerated(g);
      setScript(g.script || "");
      setHook(g.hook || "");
      setCta(g.cta || "");
      setDescTt(g.description_tiktok || "");
      setDescYt(g.description_youtube || "");
      setDescIg(g.description_instagram || "");
      setTagsInput({
        tt: (g.hashtags_tiktok || []).join(" "),
        yt: (g.hashtags_youtube || []).join(", "),
        ig: (g.hashtags_instagram || []).join(" "),
      });
      setSource(res.source);
    } catch (e: any) {
      setError(e.message || "Erreur de génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseTags = (input: string, sep: string) =>
    input.split(sep).map(t => t.trim()).filter(Boolean);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const topicLabel = topic.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim();
      const res = await contentFactoryAPI.createPiece({
        title:               `${topicLabel} expliqué en 45 secondes`,
        topic,
        category,
        status,
        script:              script || null,
        hook:                hook || null,
        call_to_action:      cta || null,
        hashtags_tiktok:     parseTags(tagsInput.tt, " "),
        hashtags_youtube:    parseTags(tagsInput.yt, ","),
        hashtags_instagram:  parseTags(tagsInput.ig, " "),
        description_tiktok:  descTt || null,
        description_youtube: descYt || null,
        description_instagram: descIg || null,
      });
      setSavedId(res.piece.id);
    } catch (e: any) {
      setError(e.message || "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!savedId) return;
    setIsExporting(true);
    try {
      const safe = topic.replace(/[^a-zA-Z0-9]/g, "_");
      await contentFactoryAPI.exportPiece(savedId, `captentdb_${safe}.zip`);
    } catch (e: any) {
      setError(e.message || "Erreur export");
    } finally {
      setIsExporting(false);
    }
  };

  if (isChecking) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/content-factory" className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Nouveau contenu
          </h1>
          <p className="text-sm text-muted-foreground">Génère un pack vidéo complet pour les réseaux sociaux</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/25 rounded-xl text-sm text-loss">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Fermer</button>
        </div>
      )}

      {savedId && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-400">
          ✅ Contenu sauvegardé !
          <Link href={`/admin/content-factory/${savedId}`} className="ml-auto text-xs underline hover:text-emerald-300">Voir / Éditer</Link>
        </div>
      )}

      {/* Topic selector */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4 text-sm">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sujet</label>
            <select
              value={topic}
              onChange={e => {
                const found = TOPICS.find(t => t.topic === e.target.value);
                setTopic(e.target.value);
                if (found) setCategory(found.category);
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ colorScheme: "dark" }}
            >
              {TOPICS.map(t => (
                <option key={t.topic} value={t.topic}>{t.topic}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Catégorie</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ colorScheme: "dark" }}
            >
              <option value="indicator">Indicateur</option>
              <option value="concept">Concept</option>
              <option value="strategy">Stratégie</option>
              <option value="tip">Conseil</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ colorScheme: "dark" }}
            >
              <option value="draft">Brouillon</option>
              <option value="ready">Prêt</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(184,134,58,0.9), rgba(232,168,32,0.9))", border: "1px solid rgba(184,134,58,0.4)" }}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Génération…" : "Générer avec l'IA"}
          </motion.button>
          {source && (
            <span className="text-xs text-muted-foreground">
              Source : {source === "groq" ? "🤖 Groq" : source === "mistral" ? "🤖 Mistral" : "📄 Template"}
            </span>
          )}
        </div>
      </div>

      {/* Script editor */}
      {(script || generated) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Script */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">Script vocal</h2>
                <CopyButton text={script} />
              </div>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                rows={14}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono resize-none focus:outline-none focus:border-primary/50 text-foreground/90 leading-relaxed"
                placeholder="Le script apparaîtra ici après génération…"
              />
            </div>
            <div className="glass-card p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Hook (accroche)</label>
                <div className="flex gap-2">
                  <input value={hook} onChange={e => setHook(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" placeholder="Phrase d'accroche…" />
                  <CopyButton text={hook} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">CTA (appel à l'action)</label>
                <div className="flex gap-2">
                  <input value={cta} onChange={e => setCta(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" placeholder="Texte CTA…" />
                  <CopyButton text={cta} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Platforms */}
          <div className="space-y-4">
            {[
              { key: "tt", label: "🎵 TikTok",          descVal: descTt, setDesc: setDescTt, tagsSep: "espace" },
              { key: "yt", label: "▶️ YouTube Shorts",   descVal: descYt, setDesc: setDescYt, tagsSep: "virgule" },
              { key: "ig", label: "📸 Instagram Reels",  descVal: descIg, setDesc: setDescIg, tagsSep: "espace" },
            ].map(({ key, label, descVal, setDesc, tagsSep }) => (
              <div key={key} className="glass-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">{label}</h3>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Description</label>
                  <div className="flex gap-2">
                    <textarea
                      value={descVal}
                      onChange={e => setDesc(e.target.value)}
                      rows={3}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
                    />
                    <CopyButton text={descVal} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Hashtags (séparés par {tagsSep})</label>
                  <div className="flex gap-2">
                    <input
                      value={tagsInput[key]}
                      onChange={e => setTagsInput(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                      placeholder={key === "yt" ? "tag1, tag2, tag3" : "#trading #captentdb"}
                    />
                    <CopyButton text={tagsInput[key]} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(script || generated) && (
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(232,168,32,0.9), rgba(184,134,58,0.9))", border: "1px solid rgba(232,168,32,0.4)" }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savedId ? "Sauvegarder à nouveau" : "Sauvegarder"}
          </motion.button>
          {savedId && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-emerald-400 disabled:opacity-50"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le pack ZIP
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewContentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <NewContentForm />
    </Suspense>
  );
}

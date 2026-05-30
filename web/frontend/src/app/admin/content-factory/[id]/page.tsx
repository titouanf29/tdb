"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft, Sparkles, Loader2, Copy, Check, Save,
  Download, AlertCircle, Film, Trash2,
} from "lucide-react";
import { adminAPI, contentFactoryAPI, ContentPiece, GeneratedScript } from "@/lib/api";

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

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const pieceId = params.id as string;

  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isChecking,   setIsChecking]   = useState(true);
  const [piece,        setPiece]        = useState<ContentPiece | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [topic,        setTopic]        = useState("");
  const [category,     setCategory]     = useState("indicator");
  const [script,       setScript]       = useState("");
  const [hook,         setHook]         = useState("");
  const [cta,          setCta]          = useState("");
  const [descTt,       setDescTt]       = useState("");
  const [descYt,       setDescYt]       = useState("");
  const [descIg,       setDescIg]       = useState("");
  const [tagsInput,    setTagsInput]    = useState({ tt: "", yt: "", ig: "" });
  const [status,       setStatus]       = useState<"draft" | "ready" | "published">("draft");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isExporting,  setIsExporting]  = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [saved,        setSaved]        = useState(false);
  const [source,       setSource]       = useState("");

  // Visual assets state
  const [visualChart,        setVisualChart]        = useState<string | null>(null);
  const [visualScreenshot,   setVisualScreenshot]   = useState<string | null>(null);
  const [visualAIImage,      setVisualAIImage]       = useState<string | null>(null);
  const [visualStockPhotos,  setVisualStockPhotos]   = useState<{ id: string; url: string; thumb: string; credit: string; credit_url: string }[]>([]);
  const [selectedStockPhoto, setSelectedStockPhoto]  = useState<{ id: string; url: string; thumb: string; credit: string; credit_url: string } | null>(null);
  const [includeChart,       setIncludeChart]        = useState(false);
  const [includeScreenshot,  setIncludeScreenshot]   = useState(false);
  const [includeAIImage,     setIncludeAIImage]       = useState(false);
  const [includeStockPhoto,  setIncludeStockPhoto]    = useState(false);
  const [isGenChart,         setIsGenChart]           = useState(false);
  const [isGenScreenshot,    setIsGenScreenshot]      = useState(false);
  const [isGenAIImage,       setIsGenAIImage]         = useState(false);
  const [isGenStockPhotos,   setIsGenStockPhotos]     = useState(false);
  const [visualErrors,       setVisualErrors]         = useState<Record<string, string>>({});
  const [animatedMode,       setAnimatedMode]         = useState(false);
  const [filmingGuide,       setFilmingGuide]         = useState<{
    concept: string; duree_totale: string;
    plans: { n: number; duree: string; emoji: string; type: string; action: string; conseil: string }[];
    apps: string[]; equipement: string[]; ambiance: string; tips: string[];
  } | null>(null);
  const [isGenFilmingGuide,  setIsGenFilmingGuide]    = useState(false);

  useEffect(() => {
    adminAPI.checkAdmin()
      .then(r => { if (!r.is_admin) router.push("/"); else setIsAdmin(true); })
      .catch(() => router.push("/"))
      .finally(() => setIsChecking(false));
  }, [router]);

  useEffect(() => {
    if (!isAdmin || !pieceId) return;
    contentFactoryAPI.getPiece(pieceId)
      .then(res => {
        const p = res.piece;
        setPiece(p);
        setTopic(p.topic);
        setCategory(p.category);
        setScript(p.script || "");
        setHook(p.hook || "");
        setCta(p.call_to_action || "");
        setDescTt(p.description_tiktok || "");
        setDescYt(p.description_youtube || "");
        setDescIg(p.description_instagram || "");
        setTagsInput({
          tt: (p.hashtags_tiktok || []).join(" "),
          yt: (p.hashtags_youtube || []).join(", "),
          ig: (p.hashtags_instagram || []).join(" "),
        });
        setStatus(p.status as "draft" | "ready" | "published");
      })
      .catch(e => setError(e.message || "Erreur de chargement"))
      .finally(() => setIsLoading(false));
  }, [isAdmin, pieceId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await contentFactoryAPI.generateScript(topic, category);
      const g: GeneratedScript = res.generated;
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
    setSaved(false);
    try {
      await contentFactoryAPI.updatePiece(pieceId, {
        topic,
        category,
        status,
        script:               script || null,
        hook:                 hook || null,
        call_to_action:       cta || null,
        hashtags_tiktok:      parseTags(tagsInput.tt, " "),
        hashtags_youtube:     parseTags(tagsInput.yt, ","),
        hashtags_instagram:   parseTags(tagsInput.ig, " "),
        description_tiktok:   descTt || null,
        description_youtube:  descYt || null,
        description_instagram: descIg || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Erreur de sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenChart = async () => {
    setIsGenChart(true);
    setVisualErrors(prev => ({ ...prev, chart: "" }));
    try {
      const res = await contentFactoryAPI.generateChart(pieceId, "portrait", animatedMode);
      if (res.image) { setVisualChart(res.image); setIncludeChart(true); }
      else setVisualErrors(prev => ({ ...prev, chart: res.error || "Génération échouée" }));
    } catch (e: any) {
      setVisualErrors(prev => ({ ...prev, chart: e.message }));
    } finally { setIsGenChart(false); }
  };

  const handleGetFilmingGuide = async () => {
    setIsGenFilmingGuide(true);
    try {
      const res = await contentFactoryAPI.getFilmingGuide(pieceId, topic || undefined);
      setFilmingGuide(res.guide);
    } catch (e: any) {
      setVisualErrors(prev => ({ ...prev, filming: e.message }));
    } finally { setIsGenFilmingGuide(false); }
  };

  const handleGenScreenshot = async () => {
    setIsGenScreenshot(true);
    setVisualErrors(prev => ({ ...prev, screenshot: "" }));
    try {
      const res = await contentFactoryAPI.takeScreenshot(pieceId);
      if (res.image) { setVisualScreenshot(res.image); setIncludeScreenshot(true); }
      else setVisualErrors(prev => ({ ...prev, screenshot: res.error || "Capture échouée" }));
    } catch (e: any) {
      setVisualErrors(prev => ({ ...prev, screenshot: e.message }));
    } finally { setIsGenScreenshot(false); }
  };

  const handleGenStockPhotos = async () => {
    setIsGenStockPhotos(true);
    setVisualErrors(prev => ({ ...prev, stock: "" }));
    try {
      const res = await contentFactoryAPI.getStockPhotos(pieceId);
      if (res.photos?.length) setVisualStockPhotos(res.photos);
      else setVisualErrors(prev => ({ ...prev, stock: res.error || "Aucune photo trouvée" }));
    } catch (e: any) {
      setVisualErrors(prev => ({ ...prev, stock: e.message }));
    } finally { setIsGenStockPhotos(false); }
  };

  const handleGenAIImage = async () => {
    setIsGenAIImage(true);
    setVisualErrors(prev => ({ ...prev, ai: "" }));
    try {
      const res = await contentFactoryAPI.generateAIImage(pieceId);
      if (res.image) { setVisualAIImage(res.image); setIncludeAIImage(true); }
      else setVisualErrors(prev => ({ ...prev, ai: res.error || "Génération échouée" }));
    } catch (e: any) {
      setVisualErrors(prev => ({ ...prev, ai: e.message }));
    } finally { setIsGenAIImage(false); }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const safe = topic.replace(/[^a-zA-Z0-9]/g, "_");
      await contentFactoryAPI.exportPiece(pieceId, `captentdb_${safe}.zip`, {
        include_chart:      includeChart && !!visualChart,
        include_screenshot: includeScreenshot && !!visualScreenshot,
        include_ai_image:   includeAIImage && !!visualAIImage,
        stock_photo_url:    includeStockPhoto && selectedStockPhoto ? selectedStockPhoto.url : undefined,
      });
    } catch (e: any) {
      setError(e.message || "Erreur export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${piece?.title || topic}" ?`)) return;
    setIsDeleting(true);
    try {
      await contentFactoryAPI.deletePiece(pieceId);
      router.push("/admin/content-factory");
    } catch (e: any) {
      setError(e.message || "Erreur suppression");
      setIsDeleting(false);
    }
  };

  if (isChecking || isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/content-factory" className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              {piece?.title || topic || "Éditer le contenu"}
            </h1>
            <p className="text-sm text-muted-foreground">Modifier et exporter le pack</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Supprimer
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Fermer</button>
        </div>
      )}
      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-400">
          ✅ Modifications sauvegardées
        </div>
      )}

      {/* Config */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4 text-sm">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sujet</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ colorScheme: "dark" }}>
              <option value="indicator">Indicateur</option>
              <option value="concept">Concept</option>
              <option value="strategy">Stratégie</option>
              <option value="tip">Conseil</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              style={{ colorScheme: "dark" }}>
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
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,140,255,0.9))", border: "1px solid rgba(139,92,246,0.4)" }}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Régénération…" : "Régénérer avec l'IA"}
          </motion.button>
          {source && <span className="text-xs text-muted-foreground">Source : {source === "groq" ? "🤖 Groq" : source === "mistral" ? "🤖 Mistral" : "📄 Template"}</span>}
        </div>
      </div>

      {/* Visual Assets */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
          🎨 Visuels
          <span className="text-xs text-muted-foreground font-normal">— générez les assets à inclure dans le ZIP</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Chart */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">📈 Graphique</span>
              {visualChart && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={includeChart} onChange={e => setIncludeChart(e.target.checked)} className="accent-primary" />
                  ZIP
                </label>
              )}
            </div>
            {/* Static / Animated toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
              <button
                onClick={() => setAnimatedMode(false)}
                className={`flex-1 py-1.5 transition-colors ${!animatedMode ? "bg-blue-500/20 text-blue-300 font-medium" : "text-muted-foreground hover:bg-white/5"}`}
              >
                📊 Statique
              </button>
              <button
                onClick={() => setAnimatedMode(true)}
                className={`flex-1 py-1.5 transition-colors ${animatedMode ? "bg-blue-500/20 text-blue-300 font-medium" : "text-muted-foreground hover:bg-white/5"}`}
              >
                🎞️ Animé (GIF)
              </button>
            </div>
            {visualChart
              ? <img src={visualChart} alt="chart" className="w-full rounded-lg object-cover" />
              : <div className="h-28 bg-white/3 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Aucun visuel</div>
            }
            {visualErrors.chart && <p className="text-xs text-red-400">{visualErrors.chart}</p>}
            <button
              onClick={handleGenChart}
              disabled={isGenChart}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenChart ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isGenChart ? (animatedMode ? "Animation…" : "Génération…") : visualChart ? "Régénérer" : "Générer"}
            </button>
          </div>

          {/* Screenshot */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">📷 Screenshot</span>
              {visualScreenshot && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={includeScreenshot} onChange={e => setIncludeScreenshot(e.target.checked)} className="accent-primary" />
                  ZIP
                </label>
              )}
            </div>
            {visualScreenshot
              ? <img src={visualScreenshot} alt="screenshot" className="w-full rounded-lg object-cover" />
              : <div className="h-28 bg-white/3 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Aucun visuel</div>
            }
            {visualErrors.screenshot && <p className="text-xs text-red-400">{visualErrors.screenshot}</p>}
            <button
              onClick={handleGenScreenshot}
              disabled={isGenScreenshot}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenScreenshot ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isGenScreenshot ? "Capture…" : visualScreenshot ? "Recapturer" : "Capturer"}
            </button>
          </div>

          {/* Stock Photos */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">🖼️ Stock Photo</span>
              {selectedStockPhoto && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={includeStockPhoto} onChange={e => setIncludeStockPhoto(e.target.checked)} className="accent-primary" />
                  ZIP
                </label>
              )}
            </div>
            {selectedStockPhoto
              ? <img src={selectedStockPhoto.thumb} alt="stock" className="w-full rounded-lg object-cover" />
              : <div className="h-28 bg-white/3 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Aucune sélection</div>
            }
            {visualStockPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {visualStockPhotos.map(p => (
                  <button key={p.id} onClick={() => { setSelectedStockPhoto(p); setIncludeStockPhoto(true); }}
                    className={`aspect-square rounded overflow-hidden border-2 transition-colors ${selectedStockPhoto?.id === p.id ? "border-primary" : "border-transparent hover:border-white/30"}`}
                  >
                    <img src={p.thumb} alt={p.credit} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {visualErrors.stock && <p className="text-xs text-red-400">{visualErrors.stock}</p>}
            <button
              onClick={handleGenStockPhotos}
              disabled={isGenStockPhotos}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenStockPhotos ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isGenStockPhotos ? "Recherche…" : "Chercher"}
            </button>
          </div>

          {/* AI Image */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">🤖 Image IA</span>
              {visualAIImage && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={includeAIImage} onChange={e => setIncludeAIImage(e.target.checked)} className="accent-primary" />
                  ZIP
                </label>
              )}
            </div>
            {visualAIImage
              ? <img src={visualAIImage} alt="ai" className="w-full rounded-lg object-cover" />
              : <div className="h-28 bg-white/3 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Aucun visuel</div>
            }
            {visualErrors.ai && <p className="text-xs text-red-400">{visualErrors.ai}</p>}
            <button
              onClick={handleGenAIImage}
              disabled={isGenAIImage}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenAIImage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isGenAIImage ? "Génération…" : visualAIImage ? "Régénérer" : "Générer (DALL-E)"}
            </button>
          </div>

        </div>

        {/* Filming Guide */}
        <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">🎬 Guide de tournage</span>
            <button
              onClick={handleGetFilmingGuide}
              disabled={isGenFilmingGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenFilmingGuide ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isGenFilmingGuide ? "Chargement…" : filmingGuide ? "Actualiser" : "Générer le guide"}
            </button>
          </div>

          {!filmingGuide ? (
            <div className="h-16 bg-white/3 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              Guide de tournage personnalisé plan-par-plan — cliquez pour générer
            </div>
          ) : (
            <div className="space-y-4">
              {/* Concept + Duration */}
              <div className="p-3 bg-white/3 rounded-lg flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{filmingGuide.concept}</p>
                  <p className="text-xs text-muted-foreground mt-1">⏱ {filmingGuide.duree_totale}</p>
                </div>
              </div>

              {/* Shot list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {filmingGuide.plans?.map(plan => (
                  <div key={plan.n} className="p-3 bg-white/3 rounded-lg border border-white/5">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none">{plan.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-foreground">Plan {plan.n}</span>
                          <span className="text-[10px] text-muted-foreground">{plan.duree}</span>
                          <span className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-px rounded-full">{plan.type}</span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-snug">{plan.action}</p>
                        <p className="text-[11px] text-muted-foreground italic mt-1 leading-snug">{plan.conseil}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apps + Equipment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/3 rounded-lg">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">📱 Apps</p>
                  <ul className="space-y-0.5">
                    {filmingGuide.apps?.map((app, i) => (
                      <li key={i} className="text-xs text-foreground/80">{app}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-white/3 rounded-lg">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">🎯 Équipement</p>
                  <ul className="space-y-0.5">
                    {filmingGuide.equipement?.map((eq, i) => (
                      <li key={i} className="text-xs text-foreground/80">{eq}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ambiance */}
              <div className="p-2.5 bg-yellow-500/8 rounded-lg border border-yellow-500/15">
                <p className="text-xs text-yellow-400/90">🎵 {filmingGuide.ambiance}</p>
              </div>

              {/* Pro tips */}
              {filmingGuide.tips?.length > 0 && (
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/15">
                  <p className="text-[11px] font-semibold text-emerald-400/80 mb-2">💡 Pro Tips</p>
                  <ul className="space-y-1">
                    {filmingGuide.tips?.map((tip, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Script + Platforms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            />
          </div>
          <div className="glass-card p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Hook</label>
              <div className="flex gap-2">
                <input value={hook} onChange={e => setHook(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" />
                <CopyButton text={hook} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">CTA</label>
              <div className="flex gap-2">
                <input value={cta} onChange={e => setCta(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" />
                <CopyButton text={cta} />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: "tt", label: "🎵 TikTok",         descVal: descTt, setDesc: setDescTt, tagsSep: "espace" },
            { key: "yt", label: "▶️ YouTube Shorts",  descVal: descYt, setDesc: setDescYt, tagsSep: "virgule" },
            { key: "ig", label: "📸 Instagram Reels", descVal: descIg, setDesc: setDescIg, tagsSep: "espace" },
          ].map(({ key, label, descVal, setDesc, tagsSep }) => (
            <div key={key} className="glass-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">{label}</h3>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                <div className="flex gap-2">
                  <textarea value={descVal} onChange={e => setDesc(e.target.value)} rows={3}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50" />
                  <CopyButton text={descVal} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Hashtags (séparés par {tagsSep})</label>
                <div className="flex gap-2">
                  <input value={tagsInput[key as keyof typeof tagsInput]}
                    onChange={e => setTagsInput(prev => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder={key === "yt" ? "tag1, tag2" : "#trading #captentdb"} />
                  <CopyButton text={tagsInput[key as keyof typeof tagsInput]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, rgba(99,140,255,0.9), rgba(139,92,246,0.9))", border: "1px solid rgba(99,140,255,0.4)" }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </motion.button>
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
      </div>
    </div>
  );
}

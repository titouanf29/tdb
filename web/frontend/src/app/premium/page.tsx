"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Rocket,
  Brain,
  BarChart3,
  Globe,
  Target,
  Calendar,
  Bell,
  Headphones,
  Sparkles,
  Loader2,
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremium } from "@/lib/PremiumContext";
import { premiumAPI, PremiumFeatures, PremiumRequest } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  brain: Brain,
  chart: BarChart3,
  globe: Globe,
  target: Target,
  calendar: Calendar,
  bell: Bell,
  headphones: Headphones,
};

export default function PremiumPage() {
  const { isPremium, isAdmin, premiumInfo } = usePremium();
  const { t, lang } = useLanguage();
  const [features, setFeatures] = useState<PremiumFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<PremiumRequest[]>([]);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [featuresData, requestsData] = await Promise.all([
        premiumAPI.getFeatures(),
        premiumAPI.getMyRequests().catch(() => ({ requests: [] })),
      ]);
      setFeatures(featuresData);
      setMyRequests(requestsData.requests);
    } catch (error) {
      console.error("Error loading premium data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = async () => {
    if (!message.trim() || !acceptedLegal) return;
    setIsSending(true);
    try {
      await premiumAPI.contact(message);
      setSendSuccess(true);
      setMessage("");
      loadData();
    } catch (error: any) {
      alert(error.message || "Error sending message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already premium/admin
  if (isPremium || isAdmin) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isAdmin ? (
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t("prem_account_admin")}
              </span>
            ) : (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {t("prem_account_premium")}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isAdmin ? t("prem_admin_desc") : t("prem_user_desc")}
          </p>

          {premiumInfo && (
            <div className="flex justify-center gap-8 text-sm">
              {premiumInfo.since && (
                <div>
                  <p className="text-muted-foreground">{t("prem_member_since")}</p>
                  <p className="font-semibold">
                    {new Date(premiumInfo.since).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                  </p>
                </div>
              )}
              {premiumInfo.expires ? (
                <div>
                  <p className="text-muted-foreground">{t("prem_expires")}</p>
                  <p className="font-semibold">
                    {new Date(premiumInfo.expires).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">{t("prem_duration")}</p>
                  <p className="font-semibold text-green-500">{t("prem_lifetime")}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Features list */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">{t("prem_your_benefits")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features?.benefits.map((benefit, index) => {
              const Icon = iconMap[benefit.icon] || Sparkles;
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Free user - show upgrade page
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 text-center relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30"
          >
            <Crown className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold mb-4">
            {t("prem_upgrade_title").split("Premium")[0]}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Premium
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("prem_upgrade_sub")}
          </p>
        </div>
      </motion.div>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">{t("prem_comparison")}</h2>

        <div className="grid grid-cols-3 gap-4">
          {/* Header */}
          <div className="p-4">
            <p className="text-muted-foreground text-sm">{t("prem_feature_col")}</p>
          </div>
          <div className="p-4 text-center rounded-t-xl bg-white/5">
            <p className="text-lg font-bold">Free</p>
            <p className="text-sm text-muted-foreground">{t("prem_free_label")}</p>
          </div>
          <div className="p-4 text-center rounded-t-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30">
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <p className="text-lg font-bold text-yellow-400">Premium</p>
            </div>
            <p className="text-sm font-semibold text-yellow-400">5€ / {lang === "en" ? "month" : "mois"}</p>
          </div>

          {/* Features */}
          {[
            { name: t("prem_feat_positions"), free: "5", premium: "50" },
            { name: t("prem_feat_favorites"), free: "10", premium: "100" },
            { name: t("prem_feat_ai_msgs"), free: "10", premium: t("prem_unlimited") },
            { name: "Backtest Manager", free: false, premium: true },
            { name: t("prem_feat_geopolitics"), free: false, premium: true },
            { name: t("prem_feat_pivots"), free: t("prem_feat_std_only"), premium: t("prem_feat_all_methods") },
            { name: t("prem_feat_per"), free: "Top 10", premium: "Top 50" },
            { name: t("prem_feat_calendar"), free: lang === "en" ? "7 days" : "7 jours", premium: lang === "en" ? "30 days" : "30 jours" },
            { name: t("prem_feat_alerts"), free: false, premium: true },
            { name: t("prem_feat_support"), free: false, premium: true },
          ].map((feature, index) => (
            <div key={index} className="contents">
              <div className="p-4 border-t border-white/10 flex items-center">
                <p className="text-sm">{feature.name}</p>
              </div>
              <div className="p-4 border-t border-white/10 text-center bg-white/5 flex items-center justify-center">
                {typeof feature.free === "boolean" ? (
                  feature.free ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )
                ) : (
                  <span className="text-sm">{feature.free}</span>
                )}
              </div>
              <div className="p-4 border-t border-yellow-500/20 text-center bg-gradient-to-r from-yellow-500/10 to-orange-500/10 flex items-center justify-center">
                {typeof feature.premium === "boolean" ? (
                  feature.premium ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )
                ) : (
                  <span className="text-sm font-semibold text-yellow-400">{feature.premium}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Benefits Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {features?.benefits.map((benefit, index) => {
          const Icon = iconMap[benefit.icon] || Sparkles;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="glass-card p-5 hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Why Premium section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-8 border border-yellow-500/20"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("prem_why_title")}</h2>
          {lang === "en" ? (
            <>
              <p className="text-muted-foreground leading-relaxed mb-4">
                TDB is an independent project, developed and maintained by a single person. The Premium subscription at{" "}
                <span className="text-yellow-400 font-semibold">€5 / month</span> covers server, database and API costs (real-time financial data, Groq AI, etc.).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By going Premium, you directly help keep the platform online and fund new features. Thank you for your support!
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed mb-4">
                TDB est un projet indépendant, développé et maintenu par une seule personne. L'abonnement Premium à{" "}
                <span className="text-yellow-400 font-semibold">5€ / mois</span> couvre les frais de serveur, de base de données et d'API (données financières en temps réel, IA Groq, etc.).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                En passant Premium, vous aidez directement à garder la plateforme en ligne et à financer de nouvelles fonctionnalités. Merci pour votre soutien !
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Contact Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-8"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("prem_get_premium")}</h2>
            <p className="text-muted-foreground">
              {t("prem_contact_desc")} <span className="text-yellow-400 font-semibold">5€ / {lang === "en" ? "month" : "mois"}</span>. {t("prem_contact_admin")}
            </p>
          </div>

          {sendSuccess ? (
            <div className="p-6 rounded-xl bg-green-500/20 border border-green-500/30 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("prem_sent_title")}</h3>
              <p className="text-muted-foreground">{t("prem_sent_desc")}</p>
              <button onClick={() => setSendSuccess(false)} className="mt-4 text-sm text-primary hover:underline">
                {t("prem_send_another")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("prem_placeholder")}
                className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none resize-none"
              />

              {/* Legal info — retraction rights (required by French consumer law L.221-5) */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300/90 space-y-2">
                <p className="font-semibold text-blue-300">ℹ️ Information légale — Droit de rétractation (L.221-18 code de la consommation)</p>
                <p>Après activation de votre abonnement Premium, vous disposez d'un délai de <strong>14 jours calendaires</strong> pour exercer votre droit de rétractation sans motif, conformément à l'article L.221-18 du code de la consommation.</p>
                <p>En demandant un accès immédiat dès activation, vous reconnaissez que si vous exercez votre droit de rétractation après le début de la fourniture du service, vous devrez payer un montant proportionnel aux services fournis (art. L.221-25).</p>
                <p>Prix : <strong>5,00 € TTC/mois</strong> — Paiement via Stripe (PCI-DSS) — Résiliable à tout moment — <a href="/cgu#retractation" target="_blank" className="underline">Voir CGU Art. 8</a></p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground">
                  J'ai lu et j'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGU</a> et la{" "}
                  <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Politique de confidentialité</a>.
                  Je comprends que le service Premium sera fourni immédiatement après activation et que mon droit de rétractation s'exercera conformément à l'art. L.221-18 du code de la consommation.
                </span>
              </label>

              <button
                onClick={handleContact}
                disabled={isSending || !message.trim() || !acceptedLegal}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {t("prem_send_btn")}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* My Requests */}
      {myRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-bold mb-4">{t("prem_my_requests")}</h2>
          <div className="space-y-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "p-4 rounded-xl border",
                  req.status === "pending"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : req.status === "approved"
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm mb-2">{req.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                    </div>
                  </div>
                  <div>
                    {req.status === "pending" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">{t("prem_status_pending")}</span>
                    ) : req.status === "approved" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">{t("prem_status_approved")}</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">{t("prem_status_rejected")}</span>
                    )}
                  </div>
                </div>
                {req.admin_response && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-muted-foreground mb-1">{t("prem_admin_reply")}</p>
                    <p className="text-sm">{req.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremium } from "@/lib/PremiumContext";
import { premiumAPI, PremiumFeatures, PremiumRequest } from "@/lib/api";

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
  const [features, setFeatures] = useState<PremiumFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const featuresData = await premiumAPI.getFeatures();
      setFeatures(featuresData);
    } catch (error) {
      console.error("Error loading premium data:", error);
    } finally {
      setIsLoading(false);
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
                Compte Admin
              </span>
            ) : (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Compte Premium
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isAdmin
              ? "Vous avez acces a toutes les fonctionnalites en tant qu'administrateur"
              : "Vous beneficiez de toutes les fonctionnalites Premium"}
          </p>

          {premiumInfo && (
            <div className="flex justify-center gap-8 text-sm">
              {premiumInfo.since && (
                <div>
                  <p className="text-muted-foreground">Membre depuis</p>
                  <p className="font-semibold">
                    {new Date(premiumInfo.since).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              )}
              {premiumInfo.expires ? (
                <div>
                  <p className="text-muted-foreground">Expire le</p>
                  <p className="font-semibold">
                    {new Date(premiumInfo.expires).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">Duree</p>
                  <p className="font-semibold text-green-500">A vie</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Features list */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Vos avantages</h2>
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
            Passez a{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Premium
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Debloquez tout le potentiel de TDB avec notre offre Premium. Analyses avancees,
            outils professionnels et support prioritaire.
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
        <h2 className="text-2xl font-bold mb-6 text-center">Comparatif des offres</h2>

        <div className="grid grid-cols-3 gap-4">
          {/* Header */}
          <div className="p-4">
            <p className="text-muted-foreground text-sm">Fonctionnalite</p>
          </div>
          <div className="p-4 text-center rounded-t-xl bg-white/5">
            <p className="text-lg font-bold">Free</p>
            <p className="text-sm text-muted-foreground">Gratuit</p>
          </div>
          <div className="p-4 text-center rounded-t-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30">
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <p className="text-lg font-bold text-yellow-400">Premium</p>
            </div>
            <p className="text-sm font-semibold text-yellow-400">5€ / mois</p>
          </div>

          {/* Features */}
          {[
            { name: "Positions simultanees", free: "5", premium: "50" },
            { name: "Favoris", free: "10", premium: "100" },
            { name: "Messages IA par jour", free: "10", premium: "Illimite" },
            { name: "Backtest Manager", free: false, premium: true },
            { name: "Analyse Geopolitique", free: false, premium: true },
            { name: "Points Pivots avances", free: "Standard seulement", premium: "Toutes les methodes" },
            { name: "Palmares PER", free: "Top 10", premium: "Top 50" },
            { name: "Calendrier Economique", free: "7 jours", premium: "30 jours" },
            { name: "Alertes Prix", free: false, premium: true },
            { name: "Support Prioritaire", free: false, premium: true },
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

      {/* Stripe Checkout Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-8"
      >
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl px-8 py-4 mb-6">
            <Crown className="w-8 h-8 text-yellow-400" />
            <div className="text-left">
              <p className="text-2xl font-bold text-yellow-400">5€ <span className="text-base font-normal text-muted-foreground">/ mois</span></p>
              <p className="text-sm text-muted-foreground">Résiliable à tout moment</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Bientôt disponible</h2>
          <p className="text-muted-foreground">
            Le paiement en ligne arrive très prochainement. En attendant, contactez-nous directement pour obtenir votre accès Premium.
          </p>
        </div>
      </motion.div>

    </div>
  );
}

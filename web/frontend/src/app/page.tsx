"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  RefreshCw,
  Loader2,
  Globe,
  Newspaper,
  Shield,
  Plus,
  Wallet,
  Bot,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, favoritesAPI, adminAPI, aiAPI, WalletBalance, TradingStats, Favorite, MarketNews } from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};


export default function Dashboard() {
  const formatCurrency = useFormatCurrency();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, statsData, favoritesData, adminData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getStats(),
        favoritesAPI.getFavorites().catch(() => ({ favorites: [] })),
        adminAPI.checkAdmin().catch(() => ({ is_admin: false })),
      ]);

      setBalance(balanceData);
      setStats(statsData);
      setFavorites(favoritesData.favorites || []);
      setIsAdmin(adminData.is_admin);

      // Load market news in background
      loadMarketNews();
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMarketNews = async () => {
    setIsLoadingNews(true);
    try {
      const newsData = await aiAPI.getMarketNews();
      setMarketNews(newsData);
    } catch (error) {
      console.error("Error loading market news:", error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate favorites stats
  const avgFavChange = favorites.length > 0
    ? favorites.filter(f => !f.error).reduce((sum, f) => sum + f.change, 0) / favorites.filter(f => !f.error).length
    : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome banner */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bienvenue sur <span className="gradient-text">TDB</span>
            </h1>
            <p className="text-muted-foreground">
              Suivez vos actifs favoris et restez informe des marches
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Admin Card - Only visible to admins */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <Link href="/admin">
            <div className="glass-card p-5 border border-yellow-500/30 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/20">
                  <Shield className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-500">Panneau d'Administration</h3>
                  <p className="text-sm text-muted-foreground">Gerez les utilisateurs, consultez les statistiques</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-yellow-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          title="Actifs Suivis"
          value={String(favorites.length)}
          icon={Star}
          href="/favorites"
        />
        <StatCard
          title="Perf. Moyenne"
          value={formatPercent(avgFavChange)}
          change={avgFavChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Solde Wallet"
          value={formatCurrency(balance?.total_equity || balance?.balance || 0)}
          icon={Wallet}
          href="/wallet"
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.win_rate || 0}%`}
          subtitle={`${stats?.total_trades || 0} trades`}
          icon={Target}
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Favorites / Watchlist */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-lg font-semibold">Mes Favoris</h2>
              </div>
              <Link href="/favorites" className="btn-ghost text-sm">
                Voir tout
              </Link>
            </div>
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun actif suivi</p>
                <Link href="/favorites" className="text-primary hover:underline text-sm flex items-center justify-center gap-1 mt-2">
                  <Plus className="w-4 h-4" />
                  Ajouter des favoris
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 6).map((fav) => (
                  <FavoriteCard key={fav.symbol} favorite={fav} formatCurrency={formatCurrency} />
                ))}
                {favorites.length > 6 && (
                  <Link href="/favorites" className="block text-center text-sm text-primary hover:underline pt-2">
                    +{favorites.length - 6} autres actifs
                  </Link>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Market News with AI Summary */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Actualites Economiques</h2>
              </div>
              <button
                onClick={loadMarketNews}
                disabled={isLoadingNews}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingNews && "animate-spin")} />
              </button>
            </div>

            {isLoadingNews && !marketNews ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : marketNews ? (
              <div className="space-y-4">
                {/* AI Summary */}
                {marketNews.summary && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Resume IA</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{marketNews.summary}</p>
                  </div>
                )}

                {/* News List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {marketNews.news.slice(0, 6).map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{item.publisher}</span>
                        {item.related && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            {item.related}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>

                {marketNews.generated_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Mis a jour: {new Date(marketNews.generated_at).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cliquez sur actualiser pour charger les actualites</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/favorites">
              <QuickActionCard title="Ajouter un Favori" icon="star" />
            </Link>
            <Link href="/markets">
              <QuickActionCard title="Explorer les Marches" icon="globe" />
            </Link>
            <Link href="/analysis">
              <QuickActionCard title="Analyser un Actif" icon="chart" />
            </Link>
            <Link href="/assistant">
              <QuickActionCard title="Assistant IA" icon="bot" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Trading Summary - More subtle */}
      {(stats?.total_trades || 0) > 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6 opacity-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Resume Trading</h2>
              <Link href="/wallet" className="btn-ghost text-sm">
                Voir le wallet
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Trades</p>
                <p className="font-semibold">{stats?.total_trades || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gagnes</p>
                <p className="font-semibold text-profit">{stats?.winning_trades || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Perdus</p>
                <p className="font-semibold text-loss">{stats?.losing_trades || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">P&L Total</p>
                <p className={cn(
                  "font-semibold",
                  (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss"
                )}>
                  {formatCurrency(stats?.total_pnl || 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
}) {
  const isPositive = change !== undefined ? change >= 0 : true;

  const content = (
    <div className={cn("glass-card-hover p-5", href && "cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && change !== 0 ? (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{formatPercent(Math.abs(change))}</span>
            </div>
          ) : (
            subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function FavoriteCard({ favorite, formatCurrency }: { favorite: Favorite; formatCurrency: (value: number) => string }) {
  const isProfit = favorite.change >= 0;

  return (
    <Link href={`/analysis?symbol=${favorite.symbol}`}>
      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <div>
              <span className="font-semibold">{favorite.symbol}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {favorite.error ? "N/A" : formatCurrency(favorite.price)}
            </p>
            {!favorite.error && (
              <p
                className={cn(
                  "text-sm flex items-center justify-end gap-1",
                  isProfit ? "text-profit" : "text-loss"
                )}
              >
                {isProfit ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {formatPercent(favorite.change)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, icon }: { title: string; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    star: <Star className="w-6 h-6" />,
    globe: <Globe className="w-6 h-6" />,
    chart: <Target className="w-6 h-6" />,
    bot: <Bot className="w-6 h-6" />,
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] text-center cursor-pointer">
      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icons[icon]}
      </div>
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

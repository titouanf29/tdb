"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Star,
  Shield,
  Settings,
  Send,
  Search,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  UserCheck,
  Trash2,
  RefreshCw,
  BarChart3,
  Eye,
  Clock,
  FileText,
  Megaphone,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Brain,
  Lock,
  Crown,
  Mail,
  MessageCircle,
  Sparkles,
  Calendar,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminAPI,
  premiumAPI,
  marketAPI,
  AdminDashboard,
  AdminUser,
  AdminUserDetails,
  AdminPosition,
  AdminBroadcast,
  PremiumRequest,
  PremiumUser,
  AdminTicket,
  AdminTicketDetail,
} from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";

type TabType = "dashboard" | "users" | "positions" | "tickets" | "premium" | "broadcasts" | "asset-requests" | "analytics" | "audit" | "settings" | "social";

export default function AdminPage() {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      if (err.status === 403) {
        setError("Acces refuse. Vous n'avez pas les droits administrateur.");
      } else if (err.status === 401) {
        router.push("/login");
      } else {
        setError(err.message || "Erreur de chargement");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Lock className="w-16 h-16 text-loss" />
        <h1 className="text-2xl font-bold text-loss">Acces Refuse</h1>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <button onClick={() => router.push("/")} className="btn-primary mt-4">
          Retour a l'accueil
        </button>
      </div>
    );
  }

  const ticketCount = dashboard?.stats?.tickets?.awaiting_response || 0;

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "positions", label: "Positions", icon: TrendingUp },
    { id: "tickets", label: "Tickets", icon: Mail, badge: ticketCount > 0 ? ticketCount : undefined },
    { id: "premium", label: "Premium", icon: Crown },
    { id: "broadcasts", label: "Broadcasts", icon: Megaphone },
    { id: "asset-requests", label: "Demandes Actifs", icon: Database },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "settings", label: "Parametres", icon: Settings },
    { id: "social", label: "Réseaux Sociaux", icon: Share2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel Admin</h1>
              <p className="text-sm text-muted-foreground">
                Connecte en tant que: {dashboard?.admin_email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <a
              href="/admin/weekly-prep"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors text-sm font-semibold border border-indigo-500/30"
            >
              <Calendar className="w-4 h-4" />
              Prép. Semaine
            </a>
            <a
              href="/admin/insights"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors text-sm font-semibold border border-yellow-500/30"
            >
              <Sparkles className="w-4 h-4" />
              Insight Engine
            </a>
            <a
              href="/api/admin/panel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors text-sm font-semibold"
            >
              <Sparkles className="w-4 h-4" />
              Plan Marketing
            </a>
            <button
              onClick={loadDashboard}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all relative",
              activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-white/5 hover:bg-white/10"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-loss text-white text-xs flex items-center justify-center animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "dashboard" && dashboard && (
        <DashboardTab dashboard={dashboard} formatCurrency={formatCurrency} />
      )}
      {activeTab === "users" && <UsersTab formatCurrency={formatCurrency} />}
      {activeTab === "positions" && <PositionsTab formatCurrency={formatCurrency} />}
      {activeTab === "tickets" && <TicketsTab />}
      {activeTab === "premium" && <PremiumTab />}
      {activeTab === "broadcasts" && <BroadcastsTab />}
      {activeTab === "asset-requests" && <AssetRequestsTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "audit" && <AuditTab />}
      {activeTab === "settings" && <SettingsTab />}
      {activeTab === "social" && <SocialTab />}
    </motion.div>
  );
}

// Relative time helper
function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return "Jamais";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `il y a ${min}min`;
  if (h < 24) return `il y a ${h}h`;
  if (d < 7) return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

// Activity dot color based on last login
function activityColor(lastLogin: string | undefined | null): string {
  if (!lastLogin) return "bg-white/20";
  const h = (Date.now() - new Date(lastLogin).getTime()) / 3600000;
  if (h < 24) return "bg-profit";
  if (h < 72) return "bg-yellow-400";
  return "bg-white/30";
}

// Dashboard Tab
function DashboardTab({
  dashboard,
  formatCurrency,
}: {
  dashboard: AdminDashboard;
  formatCurrency: (v: number) => string;
}) {
  const stats = dashboard.stats;
  const engagementRate = stats.users.total > 0
    ? Math.round((stats.users.active_24h / stats.users.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard title="Total Utilisateurs" value={stats.users.total} icon={Users} color="text-primary" />
        <StatCard title="Actifs 24h" value={stats.users.active_24h} icon={Activity} color="text-profit" />
        <StatCard title="Nouveaux 7j" value={stats.users.new_7d} icon={UserCheck} color="text-green-400" />
        <StatCard title="Positions Ouvertes" value={stats.trading.open_positions} icon={TrendingUp} color="text-warning" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Trades 24h" value={stats.trading.trades_24h} icon={Target} color="text-purple-400" />
        <StatCard title="Messages IA (total)" value={stats.ai.total_messages} icon={Brain} color="text-pink-400" />
        {stats.tickets && (
          <StatCard
            title="Tickets Ouverts"
            value={stats.tickets.open}
            icon={Mail}
            color={stats.tickets.awaiting_response > 0 ? "text-warning" : "text-primary"}
          />
        )}
        {/* Engagement rate */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className={cn("w-4 h-4", engagementRate >= 10 ? "text-profit" : engagementRate >= 5 ? "text-yellow-400" : "text-loss")} />
            <span className="text-xs text-muted-foreground">Engagement 24h</span>
          </div>
          <p className="text-2xl font-bold">{engagementRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">actifs / total</p>
        </div>
      </div>

      {/* Recent Users & Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users with last login */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Derniers Inscrits
          </h3>
          <div className="space-y-2">
            {dashboard.recent_users.slice(0, 6).map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/8 transition-colors">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm">
                    {user.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card", activityColor(user.last_login))} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Inscrit {new Date(user.created_at).toLocaleDateString("fr-FR")}</p>
                  <p className="text-xs text-muted-foreground/70">Vu {timeAgo(user.last_login)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Derniers Trades
          </h3>
          <div className="space-y-2">
            {dashboard.recent_trades.slice(0, 6).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                    trade.direction === "LONG" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss")}>
                    {trade.direction === "LONG" ? "L" : "S"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(trade.amount)}</p>
                  </div>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded",
                  trade.status === "open" ? "bg-warning/20 text-warning" : "bg-white/10")}>
                  {trade.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

type UserSort = "recent" | "last_login" | "alpha" | "balance";

// Users Tab
function UsersTab({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<UserSort>("last_login");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getUsers(page, 25, search);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [page, search]);

  const sortedUsers = [...users]
    .filter(u => filter === "all" ? true : filter === "active" ? u.is_active : !u.is_active)
    .sort((a, b) => {
      if (sort === "last_login") {
        if (!a.last_login) return 1;
        if (!b.last_login) return -1;
        return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
      }
      if (sort === "balance") return (b.balance || 0) - (a.balance || 0);
      if (sort === "alpha") return (a.username || "").localeCompare(b.username || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const loadUserDetails = async (userId: number) => {
    try {
      const data = await adminAPI.getUserDetails(userId);
      setSelectedUser(data);
    } catch (err) { console.error(err); }
  };

  const performAction = async (userId: number, action: string) => {
    setActionLoading(true);
    try {
      await adminAPI.performUserAction(userId, action);
      loadUsers();
      if (selectedUser?.user.id === userId) loadUserDetails(userId);
    } catch (err) { console.error(err); } finally { setActionLoading(false); }
  };

  // Derive last asset viewed from chat history or latest position
  const lastAsset = (u: AdminUserDetails | null): string | null => {
    if (!u) return null;
    const latestPos = u.positions.sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];
    if (latestPos) return latestPos.symbol;
    const latestFav = u.favorites.sort((a, b) =>
      new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    )[0];
    return latestFav?.symbol || null;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Email, username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full input pl-10"
          />
        </div>
        {/* Filter */}
        <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
          {(["all", "active", "inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
              {f === "all" ? "Tous" : f === "active" ? "Actifs" : "Bannis"}
            </button>
          ))}
        </div>
        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value as UserSort)}
          className="text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10 cursor-pointer">
          <option value="last_login">Tri: Dernière connexion</option>
          <option value="recent">Tri: Inscription récente</option>
          <option value="balance">Tri: Solde</option>
          <option value="alpha">Tri: A → Z</option>
        </select>
        <button onClick={loadUsers} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground">{total} utilisateurs</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Users List */}
        <div className="lg:col-span-3 glass-card p-5">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="space-y-1.5">
              {sortedUsers.map((user) => {
                const loginAgo = timeAgo(user.last_login);
                const dot = activityColor(user.last_login);
                return (
                  <div
                    key={user.id}
                    onClick={() => loadUserDetails(user.id)}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-colors group",
                      selectedUser?.user.id === user.id
                        ? "bg-primary/15 border border-primary/40"
                        : "bg-white/4 hover:bg-white/8 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar + activity dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card", dot)} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{user.username}</p>
                          {!user.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-loss/20 text-loss flex-shrink-0">Banni</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-3 text-right flex-shrink-0">
                        <div>
                          <p className="text-xs font-medium">{formatCurrency(user.balance || 0)}</p>
                          <p className="text-[10px] text-muted-foreground">solde</p>
                        </div>
                        {user.open_positions !== undefined && (
                          <div>
                            <p className="text-xs font-medium">{user.open_positions}</p>
                            <p className="text-[10px] text-muted-foreground">positions</p>
                          </div>
                        )}
                        {user.favorites_count !== undefined && (
                          <div>
                            <p className="text-xs font-medium">{user.favorites_count}</p>
                            <p className="text-[10px] text-muted-foreground">favoris</p>
                          </div>
                        )}
                        <div>
                          <p className={cn("text-xs font-medium",
                            dot === "bg-profit" ? "text-profit" : dot === "bg-yellow-400" ? "text-yellow-400" : "text-muted-foreground")}>
                            {loginAgo}
                          </p>
                          <p className="text-[10px] text-muted-foreground">connexion</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm transition-colors">
              ← Précédent
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={sortedUsers.length < 25}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm transition-colors">
              Suivant →
            </button>
          </div>
        </div>

        {/* User Details Panel */}
        <div className="lg:col-span-2 glass-card p-5 overflow-y-auto max-h-[80vh]">
          {selectedUser ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xl">
                    {selectedUser.user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    activityColor(selectedUser.user.last_login))} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{selectedUser.user.username}</h4>
                  <p className="text-sm text-muted-foreground truncate">{selectedUser.user.email}</p>
                  <p className="text-xs text-muted-foreground">ID #{selectedUser.user.id}</p>
                </div>
              </div>

              {/* Activity timeline */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activité</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Inscrit le", value: new Date(selectedUser.user.created_at).toLocaleDateString("fr-FR") },
                    { label: "Dernière connexion", value: timeAgo(selectedUser.user.last_login) },
                    { label: "Dernier actif vu", value: lastAsset(selectedUser) || "—" },
                    { label: "Solde wallet", value: formatCurrency(selectedUser.wallet?.balance || 0) },
                  ].map(row => (
                    <div key={row.label} className="p-2.5 bg-white/5 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-medium mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trading</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-white/5 rounded-lg text-center">
                    <p className="text-lg font-bold">{selectedUser.positions.filter(p => p.status === "open").length}</p>
                    <p className="text-[10px] text-muted-foreground">Positions</p>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg text-center">
                    <p className="text-lg font-bold">{selectedUser.favorites.length}</p>
                    <p className="text-[10px] text-muted-foreground">Favoris</p>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg text-center">
                    <p className="text-lg font-bold">{selectedUser.chat_history?.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Msgs IA</p>
                  </div>
                </div>
                {selectedUser.trading_stats && selectedUser.trading_stats.total_trades > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-white/5 rounded-lg text-center">
                      <p className="text-sm font-bold">{selectedUser.trading_stats.total_trades}</p>
                      <p className="text-[10px] text-muted-foreground">Trades</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-lg text-center">
                      <p className="text-sm font-bold">
                        {Math.round((selectedUser.trading_stats.winning_trades / selectedUser.trading_stats.total_trades) * 100)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Win Rate</p>
                    </div>
                    <div className={cn("p-2.5 bg-white/5 rounded-lg text-center",
                      selectedUser.trading_stats.total_pnl >= 0 ? "text-profit" : "text-loss")}>
                      <p className="text-sm font-bold">{formatCurrency(selectedUser.trading_stats.total_pnl)}</p>
                      <p className="text-[10px] text-muted-foreground">PnL</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Derniers favoris */}
              {selectedUser.favorites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favoris récents</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.favorites
                      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
                      .slice(0, 8)
                      .map(f => (
                        <span key={f.id} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                          {f.symbol}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => performAction(selectedUser.user.id, selectedUser.user.is_active ? "ban" : "unban")}
                    disabled={actionLoading}
                    className={cn("py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                      selectedUser.user.is_active
                        ? "bg-loss/15 text-loss hover:bg-loss/25"
                        : "bg-profit/15 text-profit hover:bg-profit/25")}
                  >
                    {selectedUser.user.is_active ? <><Ban className="w-3.5 h-3.5" /> Bannir</> : <><UserCheck className="w-3.5 h-3.5" /> Débannir</>}
                  </button>
                  <button
                    onClick={() => performAction(selectedUser.user.id, "reset_wallet")}
                    disabled={actionLoading}
                    className="py-2 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Wallet
                  </button>
                </div>
                <button
                  onClick={() => { if (confirm("Supprimer définitivement cet utilisateur ?")) { performAction(selectedUser.user.id, "delete"); setSelectedUser(null); }}}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-lg bg-loss/10 text-loss/70 hover:bg-loss/20 hover:text-loss flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer le compte
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Users className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Cliquez sur un utilisateur pour voir ses détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Positions Tab
function PositionsTab({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  const [positions, setPositions] = useState<AdminPosition[]>([]);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadPositions = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getPositions(status, page, 20);
      setPositions(data.positions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, [status, page]);

  const forceClose = async (positionId: number) => {
    if (!confirm("Forcer la fermeture de cette position ?")) return;
    try {
      await adminAPI.forceClosePosition(positionId);
      loadPositions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          {["all", "open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-4 py-2 rounded-lg",
                status === s ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10"
              )}
            >
              {s === "all" ? "Toutes" : s === "open" ? "Ouvertes" : "Fermees"}
            </button>
          ))}
        </div>
      </div>

      {/* Positions Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm text-muted-foreground">ID</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">User</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Symbol</th>
                  <th className="text-left p-4 text-sm text-muted-foreground">Direction</th>
                  <th className="text-right p-4 text-sm text-muted-foreground">Montant</th>
                  <th className="text-right p-4 text-sm text-muted-foreground">PnL</th>
                  <th className="text-center p-4 text-sm text-muted-foreground">Status</th>
                  <th className="text-center p-4 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-sm">{pos.id}</td>
                    <td className="p-4 text-sm">
                      <p className="font-medium">{pos.username}</p>
                      <p className="text-xs text-muted-foreground">{pos.email}</p>
                    </td>
                    <td className="p-4 font-medium">{pos.symbol}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          pos.direction === "LONG"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        )}
                      >
                        {pos.direction}
                      </span>
                    </td>
                    <td className="p-4 text-right">{formatCurrency(pos.amount)}</td>
                    <td className="p-4 text-right">
                      <span
                        className={cn(
                          (pos.realized_pnl || 0) >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {formatCurrency(pos.realized_pnl || 0)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs",
                          pos.status === "open"
                            ? "bg-warning/20 text-warning"
                            : "bg-white/10"
                        )}
                      >
                        {pos.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {pos.status === "open" && (
                        <button
                          onClick={() => forceClose(pos.id)}
                          className="p-2 rounded-lg bg-loss/20 text-loss hover:bg-loss/30"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Tickets Tab
function TicketsTab() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getTickets(status, page, 20);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [status, page]);

  const loadTicketDetail = async (ticketId: number) => {
    try {
      const data = await adminAPI.getTicketDetail(ticketId);
      setSelectedTicket(data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsSending(true);
    try {
      await adminAPI.replyToTicket(selectedTicket.ticket.id, replyMessage);
      setReplyMessage("");
      loadTicketDetail(selectedTicket.ticket.id);
      loadTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const closeTicket = async (ticketId: number) => {
    try {
      await adminAPI.closeTicket(ticketId);
      loadTickets();
      if (selectedTicket?.ticket.id === ticketId) {
        loadTicketDetail(ticketId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reopenTicket = async (ticketId: number) => {
    try {
      await adminAPI.reopenTicket(ticketId);
      loadTickets();
      if (selectedTicket?.ticket.id === ticketId) {
        loadTicketDetail(ticketId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "A l'instant";
    if (minutes < 60) return `il y a ${minutes}min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickets List */}
      <div className="lg:col-span-1 glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Tickets ({total})
          </h3>
          <button onClick={loadTickets} className="p-2 hover:bg-white/10 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4">
          {["all", "open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm transition-colors",
                status === s
                  ? "bg-primary text-white"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              {s === "all" ? "Tous" : s === "open" ? "Ouverts" : "Fermes"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun ticket</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => loadTicketDetail(ticket.id)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  selectedTicket?.ticket.id === ticket.id
                    ? "bg-primary/20 border border-primary/50"
                    : "bg-white/5 hover:bg-white/10",
                  !ticket.last_from_admin && ticket.status === "open" && "border-l-4 border-l-warning"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{ticket.subject}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      ticket.status === "open"
                        ? "bg-profit/20 text-profit"
                        : "bg-white/10 text-muted-foreground"
                    )}
                  >
                    {ticket.status === "open" ? "Ouvert" : "Ferme"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{ticket.username}</span>
                  <span>{formatTime(ticket.updated_at)}</span>
                </div>
                {!ticket.last_from_admin && ticket.status === "open" && (
                  <span className="text-xs text-warning flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    En attente de reponse
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail */}
      <div className="lg:col-span-2 glass-card p-6">
        {selectedTicket ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="font-semibold">{selectedTicket.ticket.subject}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTicket.ticket.username} - {selectedTicket.ticket.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.ticket.status === "open" ? (
                  <button
                    onClick={() => closeTicket(selectedTicket.ticket.id)}
                    className="px-3 py-1 bg-loss/20 text-loss rounded-lg text-sm hover:bg-loss/30"
                  >
                    Fermer
                  </button>
                ) : (
                  <button
                    onClick={() => reopenTicket(selectedTicket.ticket.id)}
                    className="px-3 py-1 bg-profit/20 text-profit rounded-lg text-sm hover:bg-profit/30"
                  >
                    Rouvrir
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[400px]">
              {selectedTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg",
                    msg.is_admin
                      ? "bg-primary/20 border border-primary/30 ml-8"
                      : "bg-white/5 mr-8"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {msg.is_admin && <Shield className="w-3 h-3 text-primary" />}
                      {msg.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply form */}
            {selectedTicket.ticket.status === "open" && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Votre reponse..."
                  className="flex-1 input"
                  disabled={isSending}
                />
                <button
                  onClick={sendReply}
                  disabled={!replyMessage.trim() || isSending}
                  className="btn-primary px-6 disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
            <p>Selectionnez un ticket pour voir les details</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Broadcasts Tab
function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isSending, setIsSending] = useState(false);

  // Changelog state
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [clTitle, setClTitle] = useState("");
  const [clContent, setClContent] = useState("");
  const [clVersion, setClVersion] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const loadBroadcasts = async () => {
    try {
      const data = await adminAPI.getBroadcasts(20);
      setBroadcasts(data.broadcasts);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChangelogs = async () => {
    try {
      const token = localStorage.getItem("tdb_token");
      const res = await fetch("/api/admin/changelogs?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChangelogs(data.changelogs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBroadcasts();
    loadChangelogs();
  }, []);

  const sendBroadcast = async () => {
    if (!title || !message) return;
    setIsSending(true);
    try {
      await adminAPI.sendBroadcast(title, message, type);
      setTitle("");
      setMessage("");
      loadBroadcasts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const publishChangelog = async () => {
    if (!clTitle || !clContent) return;
    setIsPublishing(true);
    try {
      const token = localStorage.getItem("tdb_token");
      const res = await fetch("/api/admin/changelog", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: clTitle, content: clContent, version: clVersion || undefined }),
      });
      if (res.ok) {
        setClTitle("");
        setClContent("");
        setClVersion("");
        loadChangelogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  const deleteChangelog = async (id: number) => {
    try {
      const token = localStorage.getItem("tdb_token");
      await fetch(`/api/admin/changelog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadChangelogs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* === BROADCASTS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Broadcast */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Envoyer un Broadcast
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full input mt-1"
                placeholder="Titre du message"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full input mt-1 min-h-[100px]"
                placeholder="Contenu du message"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full input mt-1"
              >
                <option value="info">Info</option>
                <option value="success">Succes</option>
                <option value="warning">Attention</option>
                <option value="error">Erreur</option>
              </select>
            </div>
            <button
              onClick={sendBroadcast}
              disabled={isSending || !title || !message}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Envoyer
            </button>
          </div>
        </div>

        {/* Recent Broadcasts */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Historique Broadcasts</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {broadcasts.map((b) => (
              <div key={b.id} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{b.title}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      b.type === "success"
                        ? "bg-profit/20 text-profit"
                        : b.type === "warning"
                        ? "bg-warning/20 text-warning"
                        : b.type === "error"
                        ? "bg-loss/20 text-loss"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {b.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{b.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(b.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === CHANGELOG === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Changelog */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Publier un Changelog
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Affiché en modal à la prochaine connexion de chaque utilisateur.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Titre</label>
              <input
                type="text"
                value={clTitle}
                onChange={(e) => setClTitle(e.target.value)}
                className="w-full input mt-1"
                placeholder="Ex: Nouvelles fonctionnalités"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Version (optionnel)</label>
              <input
                type="text"
                value={clVersion}
                onChange={(e) => setClVersion(e.target.value)}
                className="w-full input mt-1"
                placeholder="Ex: v1.2.0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Contenu</label>
              <textarea
                value={clContent}
                onChange={(e) => setClContent(e.target.value)}
                className="w-full input mt-1 min-h-[140px]"
                placeholder={"• Nouvelle fonctionnalité A\n• Correction du bug B\n• Amélioration de C"}
              />
            </div>
            <button
              onClick={publishChangelog}
              disabled={isPublishing || !clTitle || !clContent}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Publier le changelog
            </button>
          </div>
        </div>

        {/* Changelog History */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Historique Changelogs</h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {changelogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun changelog publié.
              </p>
            )}
            {changelogs.map((cl) => (
              <div key={cl.id} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{cl.title}</span>
                    {cl.version && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono">
                        {cl.version}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteChangelog(cl.id)}
                    className="p-1 rounded hover:bg-loss/20 transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-loss" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {cl.content}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(cl.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [tradingAnalytics, setTradingAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [users, trading] = await Promise.all([
          adminAPI.getUserAnalytics(30),
          adminAPI.getTradingAnalytics(30),
        ]);
        setUserAnalytics(users);
        setTradingAnalytics(trading);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Symbols */}
      {tradingAnalytics?.top_symbols && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Top Symboles (30 jours)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {tradingAnalytics.top_symbols.map((s: any, i: number) => (
              <div key={s.symbol} className="p-4 bg-white/5 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">#{i + 1}</p>
                <p className="font-medium mt-1">{s.symbol}</p>
                <p className="text-sm text-muted-foreground">{s.count} trades</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Stats */}
      {userAnalytics && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Inscriptions (30 jours)</h3>
          <div className="h-40 flex items-end gap-1">
            {userAnalytics.registrations.map((r: any) => (
              <div
                key={r.date}
                className="flex-1 bg-primary/50 rounded-t hover:bg-primary transition-colors"
                style={{ height: `${Math.max(10, r.count * 20)}%` }}
                title={`${r.date}: ${r.count}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Audit Log Tab
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminAPI.getAuditLog(1, 50);
        setLogs(data.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Journal d'audit
      </h3>
      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune action enregistree</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-3 bg-white/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    par {log.admin_email}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{log.details}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(log.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Settings Tab
type SettingDef = {
  key: string;
  label: string;
  desc: string;
  type: "boolean" | "number" | "text";
  default: string;
  unit?: string;
};
type SettingGroup = {
  group: string;
  icon: any;
  color: string;
  items: SettingDef[];
};

const SETTING_GROUPS: SettingGroup[] = [
  {
    group: "Plateforme",
    icon: Shield,
    color: "text-primary",
    items: [
      { key: "maintenance_mode", label: "Mode maintenance", desc: "Désactive l'accès pour tous les utilisateurs non-admin", type: "boolean", default: "false" },
      { key: "registration_enabled", label: "Inscriptions ouvertes", desc: "Autoriser les nouveaux utilisateurs à s'inscrire", type: "boolean", default: "true" },
    ],
  },
  {
    group: "Intelligence Artificielle",
    icon: Brain,
    color: "text-pink-400",
    items: [
      { key: "max_ai_messages_free", label: "Messages IA — Gratuit", desc: "Nombre max de messages IA par jour (plan gratuit)", type: "number", default: "10", unit: "msg/jour" },
      { key: "max_ai_messages_premium", label: "Messages IA — Premium", desc: "Nombre max de messages IA par jour (plan premium)", type: "number", default: "100", unit: "msg/jour" },
    ],
  },
  {
    group: "Trading & Wallets",
    icon: Wallet,
    color: "text-profit",
    items: [
      { key: "welcome_bonus_amount", label: "Bonus de bienvenue", desc: "Montant crédité au wallet à l'inscription (paper trading)", type: "number", default: "10000", unit: "$" },
      { key: "max_positions_per_user", label: "Positions simultanées max", desc: "Nombre maximum de positions ouvertes par utilisateur", type: "number", default: "10", unit: "positions" },
      { key: "max_position_amount", label: "Montant max par position", desc: "Montant maximum engageable par position", type: "number", default: "50000", unit: "$" },
    ],
  },
];

function SettingsTab() {
  const [rawSettings, setRawSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advKey, setAdvKey] = useState("");
  const [advValue, setAdvValue] = useState("");

  const loadSettings = async () => {
    try {
      const data = await adminAPI.getSettings();
      setRawSettings(data.settings);
      const map: Record<string, string> = {};
      for (const s of data.settings) map[s.key] = s.value;
      setLocalValues(map);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const getValue = (key: string, def: string) => localValues[key] ?? def;

  const saveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await adminAPI.updateSetting(key, value);
      setLocalValues(prev => ({ ...prev, [key]: value }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
      await loadSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const toggleBoolean = (key: string, def: string) => {
    const current = getValue(key, def);
    const next = current === "true" ? "false" : "true";
    setLocalValues(prev => ({ ...prev, [key]: next }));
    saveSetting(key, next);
  };

  const predefinedKeys = SETTING_GROUPS.flatMap(g => g.items.map(i => i.key));
  const customSettings = rawSettings.filter(s => !predefinedKeys.includes(s.key));

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {SETTING_GROUPS.map((group) => (
        <div key={group.group} className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <group.icon className={cn("w-4 h-4", group.color)} />
            {group.group}
          </h3>
          <div className="space-y-3">
            {group.items.map((item) => {
              const val = getValue(item.key, item.default);
              const isSaving = savingKey === item.key;
              const isSaved = savedKey === item.key;

              if (item.type === "boolean") {
                const isOn = val === "true";
                return (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {isSaved && <CheckCircle className="w-4 h-4 text-profit" />}
                      <button
                        onClick={() => toggleBoolean(item.key, item.default)}
                        disabled={isSaving}
                        className={cn(
                          "relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
                          isOn ? "bg-profit" : "bg-white/20",
                          isSaving && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                          isOn ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.key} className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <input
                          type={item.type === "number" ? "number" : "text"}
                          value={val}
                          onChange={e => setLocalValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                          className="w-28 text-right input text-sm py-1.5 pr-10"
                        />
                        {item.unit && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            {item.unit}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => saveSetting(item.key, val)}
                        disabled={isSaving}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                          isSaved ? "bg-profit/20 text-profit" : "bg-primary/20 text-primary hover:bg-primary/30"
                        )}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <CheckCircle className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Advanced / Custom Settings */}
      <div className="glass-card p-5">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Paramètres avancés
            {customSettings.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">{customSettings.length}</span>
            )}
          </span>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showAdvanced && "rotate-90")} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Raw key/value editor */}
            <div className="p-4 bg-white/5 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ajouter / modifier un paramètre</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={advKey}
                  onChange={e => setAdvKey(e.target.value)}
                  placeholder="clé_paramètre"
                  className="flex-1 input text-sm py-1.5 font-mono"
                />
                <input
                  type="text"
                  value={advValue}
                  onChange={e => setAdvValue(e.target.value)}
                  placeholder="valeur"
                  className="flex-1 input text-sm py-1.5"
                />
                <button
                  onClick={async () => {
                    if (!advKey || !advValue) return;
                    await saveSetting(advKey, advValue);
                    setAdvKey("");
                    setAdvValue("");
                  }}
                  disabled={!advKey || !advValue || savingKey !== null}
                  className="px-4 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm disabled:opacity-40 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>

            {/* Custom (non-predefined) settings */}
            {customSettings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paramètres personnalisés</p>
                {customSettings.map((s) => (
                  <div key={s.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{s.key}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm">{s.value}</span>
                      <button
                        onClick={() => { setAdvKey(s.key); setAdvValue(s.value); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Asset Requests Tab
function AssetRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/asset-requests?status=${status}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tdb_token")}`,
          },
        }
      );
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const processRequest = async (requestId: number, newStatus: string, notes?: string) => {
    setActionLoading(requestId);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/asset-requests/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("tdb_token")}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            status: newStatus,
            admin_notes: notes,
          }),
        }
      );
      loadRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-4 py-2 rounded-lg capitalize",
                status === s ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10"
              )}
            >
              {s === "all" ? "Toutes" : s === "pending" ? "En attente" : s === "approved" ? "Approuvees" : "Rejetees"}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Demandes d'ajout d'actifs
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune demande</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{req.symbol}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          req.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : req.status === "approved"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        )}
                      >
                        {req.status === "pending" ? "En attente" : req.status === "approved" ? "Approuve" : "Rejete"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {req.asset_type || "Non specifie"} | Par: {req.username || req.email}
                    </p>
                    {req.reason && (
                      <p className="text-sm mt-2 p-2 bg-white/5 rounded">
                        <span className="text-muted-foreground">Raison:</span> {req.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Demande le: {new Date(req.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => processRequest(req.id, "approved")}
                        disabled={actionLoading === req.id}
                        className="p-2 rounded-lg bg-profit/20 text-profit hover:bg-profit/30"
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => processRequest(req.id, "rejected")}
                        disabled={actionLoading === req.id}
                        className="p-2 rounded-lg bg-loss/20 text-loss hover:bg-loss/30"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Premium Tab
function PremiumTab() {
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState<number | null>(null);
  const [grantDays, setGrantDays] = useState<string>("");
  const [response, setResponse] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqData, usersData] = await Promise.all([
        premiumAPI.getAdminRequests(status),
        premiumAPI.getPremiumUsers(),
      ]);
      setRequests(reqData.requests);
      setPremiumUsers(usersData.users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status]);

  const processRequest = async (requestId: number, newStatus: string) => {
    setActionLoading(requestId);
    try {
      await premiumAPI.processRequest(requestId, newStatus, response);
      setResponse("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const grantPremium = async () => {
    if (!grantUserId) return;
    setActionLoading(grantUserId);
    try {
      const days = grantDays ? parseInt(grantDays) : undefined;
      await premiumAPI.grantPremium(grantUserId, "grant", days);
      setShowGrantModal(false);
      setGrantUserId(null);
      setGrantDays("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const revokePremium = async (userId: number) => {
    if (!confirm("Voulez-vous vraiment retirer le premium a cet utilisateur ?")) return;
    setActionLoading(userId);
    try {
      await premiumAPI.grantPremium(userId, "revoke");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Users */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Utilisateurs Premium ({premiumUsers.length})
          </h3>
          <button
            onClick={() => setShowGrantModal(true)}
            className="btn-primary text-sm"
          >
            + Ajouter Premium
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : premiumUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun utilisateur premium</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-2 text-sm text-muted-foreground">Utilisateur</th>
                  <th className="text-left py-2 px-2 text-sm text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-2 text-sm text-muted-foreground">Depuis</th>
                  <th className="text-left py-2 px-2 text-sm text-muted-foreground">Expire</th>
                  <th className="text-right py-2 px-2 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {premiumUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-semibold">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {user.is_admin ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                          Premium
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {user.premium_since
                        ? new Date(user.premium_since).toLocaleDateString("fr-FR")
                        : "-"}
                    </td>
                    <td className="py-3 px-2 text-sm">
                      {user.premium_expires ? (
                        <span className="text-warning">
                          {new Date(user.premium_expires).toLocaleDateString("fr-FR")}
                        </span>
                      ) : (
                        <span className="text-profit">A vie</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {!user.is_admin && (
                        <button
                          onClick={() => revokePremium(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-1.5 rounded-lg bg-loss/20 text-loss hover:bg-loss/30"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Requests */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Demandes Premium
        </h3>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm capitalize",
                status === s ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10"
              )}
            >
              {s === "all" ? "Toutes" : s === "pending" ? "En attente" : s === "approved" ? "Approuvees" : "Rejetees"}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune demande</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{req.username || req.email}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          req.status === "pending"
                            ? "bg-warning/20 text-warning"
                            : req.status === "approved"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        )}
                      >
                        {req.status === "pending" ? "En attente" : req.status === "approved" ? "Approuve" : "Rejete"}
                      </span>
                    </div>
                    <p className="text-sm p-2 bg-white/5 rounded">{req.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(req.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setGrantUserId(req.user_id);
                          setShowGrantModal(true);
                          processRequest(req.id, "approved");
                        }}
                        disabled={actionLoading === req.id}
                        className="p-2 rounded-lg bg-profit/20 text-profit hover:bg-profit/30"
                        title="Approuver et accorder Premium"
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => processRequest(req.id, "rejected")}
                        disabled={actionLoading === req.id}
                        className="p-2 rounded-lg bg-loss/20 text-loss hover:bg-loss/30"
                        title="Rejeter"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Premium Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Accorder Premium
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">ID Utilisateur</label>
                <input
                  type="number"
                  value={grantUserId || ""}
                  onChange={(e) => setGrantUserId(parseInt(e.target.value) || null)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
                  placeholder="ID de l'utilisateur"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Duree (jours)</label>
                <input
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10"
                  placeholder="Vide = a vie"
                />
                <p className="text-xs text-muted-foreground mt-1">Laissez vide pour un acces a vie</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowGrantModal(false);
                    setGrantUserId(null);
                    setGrantDays("");
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={grantPremium}
                  disabled={!grantUserId || actionLoading !== null}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Accorder
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Social Media Tab ──────────────────────────────────────────────────────────

const SITE_URL = "captentdb.fr";

const EDU_TIPS: PostData[] = [
  {
    tw: `Une bougie rouge ne veut pas forcément dire catastrophe.\n\nElle dit juste que les vendeurs ont eu le dessus sur la séance.\n\nLe contexte compte plus que la couleur.\n\nBougie verte après une longue descente = signal.\nBougie rouge en pleine tendance haussière = souvent juste du bruit.\n\nPratique sur de vrais graphiques → ${SITE_URL}`,
    li: `La plupart des débutants regardent la couleur d'une bougie.\nLes traders expérimentés regardent ce qui l'entoure.\n\nUne bougie rouge en tendance haussière, c'est souvent du bruit.\nUne bougie rouge après 10 jours de hausse sans volume ? Là, ça devient intéressant.\n\nChaque bougie raconte une micro-histoire : où le prix a ouvert, jusqu'où il est allé, et où il a fini. La mèche haute dit que les acheteurs ont poussé — et que les vendeurs ont résisté. La mèche basse, c'est l'inverse.\n\nSimple. Puissant. Et souvent sous-utilisé.\n\nSi vous voulez vous entraîner sur de vrais graphiques, lien en commentaire 👇\n\n#Trading #AnalyseTechnique #Bourse`,
    liComment: SITE_URL,
  },
  {
    tw: `RSI > 70 = surachat = vendre ?\n\nPas forcément.\n\nEn tendance haussière, le RSI peut rester au-dessus de 70 pendant des semaines. Ceux qui ont vendu BTC à RSI 72 début 2024 ont raté 60% de hausse.\n\nLe RSI confirme une tendance. Il ne la prédit pas.\n\nTestez ça vous-même → ${SITE_URL}`,
    li: `Il y a une idée reçue qui coûte cher à beaucoup de débutants.\n\n« RSI au-dessus de 70, c'est surachat, il faut vendre. »\n\nEn réalité, en tendance haussière forte, le RSI peut rester au-dessus de 70 pendant des mois. Vendre trop tôt sur ce signal seul, c'est sortir d'une tendance gagnante.\n\nLe RSI, c'est un outil de confirmation — pas un déclencheur de vente automatique.\n\nÀ combiner toujours avec la tendance de fond, le volume, et les niveaux de prix clés.\n\nObservez ça en direct sur n'importe quel actif, lien en commentaire 👇\n\n#Trading #RSI #AnalyseTechnique`,
    liComment: SITE_URL,
  },
  {
    tw: `Pourquoi le prix rebondit souvent aux mêmes niveaux ?\n\nParce que les traders ont une mémoire.\n\nCeux qui ont raté l'entrée à un niveau attendent que le prix revienne. Quand ça arrive, ils achètent tous en même temps.\n\nC'est ça, un support. De la psychologie collective, pas de la magie.\n\nRepérez vos niveaux → ${SITE_URL}`,
    li: `Les supports et résistances, c'est de la psychologie collective mise en graphique.\n\nQuand un actif a rebondi plusieurs fois sur le même niveau, les traders s'en souviennent. Ils passent des ordres à l'avance à ce prix. Et quand le marché y revient, ces ordres s'exécutent — créant le rebond.\n\nC'est pour ça que certains niveaux "tiennent" de façon presque prévisible.\nEt que quand ils cassent vraiment, la chute est souvent violente : tous les stops sautent en même temps.\n\nLire un graphique, c'est aussi lire la psychologie des participants.\n\nEntraînez-vous à identifier ces niveaux, lien en commentaire 👇\n\n#Trading #Bourse #AnalyseTechnique`,
    liComment: SITE_URL,
  },
  {
    tw: `Un bon trade perdu, ça arrive.\nDix mauvais trades d'affilée qui explosent le compte, ça n'arrive pas par hasard.\n\nRègle simple : ne jamais risquer plus de 2% du capital sur une position.\n\n10 pertes de suite à 2% = -18%. Récupérable.\n10 pertes à 10% = -65%. Beaucoup moins.\n\nSimulez sans risque → ${SITE_URL}`,
    li: `La gestion du risque, ce n'est pas sexy. Mais c'est ce qui sépare ceux qui durent de ceux qui disparaissent.\n\nUne règle que beaucoup de traders appliquent : ne jamais risquer plus de 2% du capital total sur une seule position.\n\nPourquoi ?\n\nMême avec 10 pertes consécutives — ce qui arrive — vous perdez environ 18% du capital. Douloureux, mais récupérable.\nÀ 10% par trade, 10 pertes = -65%. Là, psychologiquement et financièrement, c'est très difficile de revenir.\n\nLa taille de position est souvent la décision la plus importante d'un trade. Avant même de choisir dans quel sens entrer.\n\nPour pratiquer ça sans risque réel, lien en commentaire 👇\n\n#Trading #GestionDuRisque #Finance`,
    liComment: SITE_URL,
  },
];

const PROMO_POSTS: PostData[] = [
  {
    tw: `La meilleure façon d'apprendre à trader ?\n\nLe faire. Vraiment. Sur de vrais marchés.\nMais sans mettre un seul euro en jeu.\n\nC'est ce que propose CaptenTDB — paper trading sur prix réels, crypto et actions.\n\n${SITE_URL}`,
    li: `Quand on commence à trader, le plus dur ce n'est pas de comprendre les concepts.\n\nC'est de gérer ses émotions quand l'argent réel bouge.\n\nC'est là que le paper trading prend tout son sens : passer de vrais ordres, vivre de vrais mouvements de marché — mais avec un capital virtuel. Tester, échouer, corriger, sans le stress financier.\n\nCaptenTDB est construit pour ça. Paper trading sur prix en temps réel, crypto, actions et ETF.\n\nLien en commentaire 👇\n\n#Trading #PaperTrading #Investissement`,
    liComment: SITE_URL,
  },
  {
    tw: `Regarder un graphique sans indicateurs, c'est conduire sans tableau de bord.\n\nRSI, MACD, volumes, supports — tout ça en un coup d'œil sur CaptenTDB.\n\nDe 5 minutes à 1 mois. Sur n'importe quel actif.\n\n${SITE_URL}`,
    li: `Un graphique tout seul, ça raconte peu de choses.\n\nC'est quand on y superpose les indicateurs — RSI, MACD, Bollinger, volumes — que ça devient vraiment lisible.\n\nSur CaptenTDB, chaque actif a ces outils, avec des timeframes de 5 minutes à 1 mois. Pour analyser à votre rythme, à votre niveau.\n\nCrypto, actions, indices, matières premières — tout au même endroit.\n\nLien en commentaire 👇\n\n#AnalyseTechnique #Trading #Finance`,
    liComment: SITE_URL,
  },
];

type PostData = { tw: string; li: string; liComment: string; isFinancial?: boolean };
type PostKey = "signal" | "top3" | "edu" | "promo";

function buildPosts(prices: Record<string, { price: number; change: number }>, marketStatus: MarketStatus): Record<PostKey, PostData> {
  const symbols = ["BTC-USD", "ETH-USD", "AAPL", "^GSPC", "GC=F"];
  const labels: Record<string, string> = {
    "BTC-USD": "Bitcoin (BTC)",
    "ETH-USD": "Ethereum (ETH)",
    "AAPL": "Apple (AAPL)",
    "^GSPC": "S&P 500",
    "GC=F": "Or (Gold)",
  };

  const sorted = symbols
    .filter((s) => prices[s])
    .sort((a, b) => Math.abs(prices[b].change) - Math.abs(prices[a].change));

  const topSym = sorted[0];
  const top3Syms = sorted.slice(0, 3);

  const topChange = topSym ? prices[topSym].change : 0;
  const topPrice = topSym ? prices[topSym].price : 0;
  const topLabel = topSym ? labels[topSym] : "—";
  const arrow = topChange >= 0 ? "🟢" : "🔴";
  const sign = topChange >= 0 ? "+" : "";

  const priceStr = `$${topPrice.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;
  const isOpen = marketStatus === "open";
  const closingCtx = marketStatus === "weekend"
    ? "à la clôture vendredi"
    : marketStatus === "aftermarket" ? "en clôture hier" : "à la dernière clôture";
  const timeRef = isOpen ? "aujourd'hui" : closingCtx;
  const twTimeRef = isOpen ? "ce matin" : closingCtx;

  const DISCLAIMER = "⚠️ Pas un conseil en investissement.";
  const signal: PostData = topChange >= 0 ? {
    tw: `${topLabel} à ${sign}${topChange.toFixed(2)}% ${twTimeRef}.\n\nLe mouvement est notable.${isOpen ? " À voir si ça tient en clôture — c'est là que ça compte." : " Un setup à surveiller à l'ouverture."}\n\n${SITE_URL} — ${DISCLAIMER}`,
    li: `${topLabel} se démarque avec ${sign}${topChange.toFixed(2)}% ${timeRef} (${priceStr}).\n\nCe genre de mouvement attire l'attention${isOpen ? " — et souvent les acheteurs sur le retrait. La vraie question : le volume est-il là pour confirmer ?" : " — à surveiller dès l'ouverture des marchés."}\n\nAnalyse complète sur CaptenTDB, lien en commentaire 👇\n\n${DISCLAIMER}\n\n#Marchés #Trading #Finance`,
    liComment: SITE_URL,
    isFinancial: true,
  } : {
    tw: `${topLabel} à ${topChange.toFixed(2)}% ${twTimeRef}.\n\nUn niveau important est en jeu. Panique ou opportunité ? Tout dépend de ce que dit le graphique.\n\n${SITE_URL} — ${DISCLAIMER}`,
    li: `${topLabel} recule de ${Math.abs(topChange).toFixed(2)}% ${timeRef} (${priceStr}).\n\nLe marché teste un niveau qui mérite attention. Repli sain ou quelque chose de plus profond ? C'est le contexte — volumes, structure de prix — qui donne la réponse.\n\nGraphique complet sur CaptenTDB, lien en commentaire 👇\n\n${DISCLAIMER}\n\n#Marchés #Trading #Finance`,
    liComment: SITE_URL,
    isFinancial: true,
  };

  const top3Lines = top3Syms
    .map((s) => {
      const p = prices[s];
      const c = p.change >= 0 ? `+${p.change.toFixed(2)}%` : `${p.change.toFixed(2)}%`;
      return `• ${labels[s]} : ${c}`;
    })
    .join("\n");

  const top3Intro = isOpen ? "Les marchés ce matin :" : `Clôture ${marketStatus === "weekend" ? "vendredi" : "hier"} :`;
  const top3: PostData = {
    tw: `${top3Intro}\n\n${top3Lines}\n\n${SITE_URL} — ${DISCLAIMER}`,
    li: `${isOpen ? "Point marchés du jour." : `Récap clôture ${marketStatus === "weekend" ? "vendredi" : "d'hier"}.`}\n\n${top3Lines}\n\nTous ces actifs disponibles sur CaptenTDB avec analyse technique intégrée, lien en commentaire 👇\n\n${DISCLAIMER}\n\n#Marchés #Finance`,
    liComment: SITE_URL,
    isFinancial: true,
  };

  const dayIdx = new Date().getDay();
  const edu = EDU_TIPS[dayIdx % EDU_TIPS.length];
  const promo = PROMO_POSTS[Math.floor(new Date().getDate() / 15) % PROMO_POSTS.length];

  return { signal, top3, edu, promo };
}

type RedditLang = { subreddit: string; title: string; body: string };
type RedditPost = { fr: RedditLang; en: RedditLang };

function buildRedditPosts(prices: Record<string, { price: number; change: number }>): RedditPost[] {
  const labelsFr: Record<string, string> = {
    "BTC-USD": "Bitcoin (BTC)", "ETH-USD": "Ethereum (ETH)",
    "AAPL": "Apple (AAPL)", "^GSPC": "S&P 500", "GC=F": "l'or",
  };
  const labelsEn: Record<string, string> = {
    "BTC-USD": "Bitcoin (BTC)", "ETH-USD": "Ethereum (ETH)",
    "AAPL": "Apple (AAPL)", "^GSPC": "S&P 500", "GC=F": "Gold",
  };
  const symbols = ["BTC-USD", "ETH-USD", "AAPL", "^GSPC", "GC=F"];
  const sorted = symbols.filter((s) => prices[s]).sort((a, b) => Math.abs(prices[b].change) - Math.abs(prices[a].change));

  const top = sorted[0];
  const second = sorted[1];

  const topChangeFr = top ? prices[top].change : 0;
  const topSignFr = topChangeFr >= 0 ? "+" : "";
  const topLabelFr = top ? labelsFr[top] : "cet actif";
  const topDirFr = topChangeFr >= 0 ? "monte" : "recule";
  const topPosFr = topChangeFr >= 0 ? "se positionner à la hausse" : "se positionner à la baisse";

  const topLabelEn = top ? labelsEn[top] : "this asset";
  const topDirEn = topChangeFr >= 0 ? "up" : "down";
  const topPosEn = topChangeFr >= 0 ? "go long" : "go short";

  const secondLabelFr = second ? labelsFr[second] : "";
  const secondLabelEn = second ? labelsEn[second] : "";
  const secondChange = second ? prices[second].change : 0;
  const secondSign = secondChange >= 0 ? "+" : "";

  const goldChange = prices["GC=F"]?.change ?? 0;
  const btcChange = prices["BTC-USD"]?.change ?? 0;
  const goldSign = goldChange >= 0 ? "+" : "";
  const btcSign = btcChange >= 0 ? "+" : "";
  const sameDir = (goldChange >= 0) === (btcChange >= 0);

  return [
    {
      fr: {
        subreddit: "r/vosfinances",
        title: `${topLabelFr} à ${topSignFr}${topChangeFr.toFixed(2)}% aujourd'hui — ça veut dire quoi concrètement ?`,
        body: `Salut,\n\nJe m'entraîne au trading sur un simulateur (${SITE_URL}) et j'ai vu que ${topLabelFr} ${topDirFr} de ${topSignFr}${topChangeFr.toFixed(2)}% sur la séance.\n\nL'analyse technique semble indiquer que ça pourrait être un moment pour ${topPosFr}, mais je ne suis vraiment pas sûr de mon interprétation.\n\nEst-ce que quelqu'un peut expliquer ce qui se passe fondamentalement ? Qu'est-ce qui fait bouger ${topLabelFr} comme ça ?\n\n(Je précise que c'est purement pour apprendre, je ne gère pas d'argent réel — juste curieux d'avoir l'avis de gens plus expérimentés)`,
      },
      en: {
        subreddit: "r/investing",
        title: `${topLabelEn} ${topDirEn} ${topSignFr}${topChangeFr.toFixed(2)}% today — what's actually driving this?`,
        body: `Hey,\n\nI've been practicing trading on a simulator (${SITE_URL}) and noticed ${topLabelEn} is ${topDirEn} ${topSignFr}${topChangeFr.toFixed(2)}% today.\n\nThe technical setup seems to suggest this could be a moment to ${topPosEn}, but I'm not confident in my read — still learning.\n\nCan anyone explain what's fundamentally happening? What's driving ${topLabelEn} right now?\n\n(For context: paper trading only, no real money involved — just trying to learn and curious what more experienced folks think)`,
      },
    },
    {
      fr: {
        subreddit: "r/vosfinances",
        title: `Or à ${goldSign}${goldChange.toFixed(2)}% et Bitcoin à ${btcSign}${btcChange.toFixed(2)}% — ${sameDir ? "ils bougent ensemble, c'est un signal ?" : "l'un monte l'autre baisse, comment vous lisez ça ?"}`,
        body: `Bonjour,\n\nJe regarde les marchés sur ${SITE_URL} pour m'entraîner et j'ai remarqué quelque chose que je ne comprends pas bien.\n\nCe matin :\n- Or : ${goldSign}${goldChange.toFixed(2)}%\n- Bitcoin : ${btcSign}${btcChange.toFixed(2)}%\n\n${sameDir ? "Je pensais que l'or et le Bitcoin étaient des actifs refuges assez indépendants. Là ils semblent corrélés. Est-ce que c'est un signal macro (inflation, fuite vers les refuges...) ?" : "Je pensais que l'or et le Bitcoin pouvaient parfois se comporter de façon similaire, mais là ils partent dans des directions opposées. Comment vous interprétez ça ?"}\n\nMerci d'avance, je suis encore en phase d'apprentissage.`,
      },
      en: {
        subreddit: "r/Bitcoin",
        title: `Gold ${goldSign}${goldChange.toFixed(2)}% and Bitcoin ${btcSign}${btcChange.toFixed(2)}% — ${sameDir ? "both moving together, is this meaningful?" : "moving in opposite directions — how do you read this?"}`,
        body: `Hi everyone,\n\nI track markets through a trading simulator I use to practice (${SITE_URL}) and noticed something I don't fully understand.\n\nRight now:\n- Gold: ${goldSign}${goldChange.toFixed(2)}%\n- Bitcoin: ${btcSign}${btcChange.toFixed(2)}%\n\n${sameDir ? "I thought gold and BTC were fairly independent safe-haven assets. Is this correlation meaningful, or just noise? Does it say something about macro conditions (inflation fears, risk-off move)?" : "I thought gold and BTC sometimes behave similarly as inflation hedges. What's making them diverge today? Is one of them signaling something the other isn't?"}\n\nWould love to hear from people who understand macro better than I do.`,
      },
    },
    {
      fr: {
        subreddit: "r/trading",
        title: `${topLabelFr} — signal intéressant ce matin, quelqu'un voit la même chose ?`,
        body: `Salut à tous,\n\nJe surveille ${topLabelFr} sur ${SITE_URL} (simulateur, pas d'argent réel) et j'ai un signal qui me semble notable : ${topSignFr}${topChangeFr.toFixed(2)}% sur la séance${secondLabelFr ? `, pendant que ${secondLabelFr} fait ${secondSign}${secondChange.toFixed(2)}%` : ""}.\n\nLe mouvement semble confirmé par le volume. Ça pourrait pointer vers ${topPosFr} — mais je suis encore débutant et j'ai du mal à distinguer un vrai signal du bruit.\n\nDes traders plus expérimentés voient la même chose ? Qu'est-ce que vous regarderiez en plus pour confirmer ?\n\n(Chacun fait ses propres analyses évidemment, je partage juste mon observation)`,
      },
      en: {
        subreddit: "r/trading",
        title: `${topLabelEn} — interesting setup today, anyone else seeing this?`,
        body: `Hey r/trading,\n\nWatching ${topLabelEn} on a simulator I use to practice (${SITE_URL}) — ${topSignFr}${topChangeFr.toFixed(2)}% on the session${secondLabelEn ? `, while ${secondLabelEn} is at ${secondSign}${secondChange.toFixed(2)}%` : ""}.\n\nThe move looks volume-confirmed. From what I've studied, this kind of setup might suggest considering to ${topPosEn} — but I'm still learning and can't always tell real signals from noise.\n\nAre more experienced traders seeing the same thing? What additional confirmation would you look for before acting on it?\n\n(DYOR obviously — just sharing my observation as someone learning TA)`,
      },
    },
    {
      fr: {
        subreddit: "r/vosfinances",
        title: `J'utilise un simulateur de trading depuis quelques semaines — retour d'expérience honnête`,
        body: `Salut r/vosfinances,\n\nJe voulais partager mon expérience avec le paper trading après quelques semaines sur ${SITE_URL}.\n\nCe que j'ai appris :\n- C'est beaucoup plus dur que ça en a l'air. Même sans argent réel, les émotions sont là.\n- Regarder un graphique en temps réel, c'est différent d'analyser après coup.\n- Les indicateurs (RSI, MACD) sont utiles mais pas magiques — il m'a fallu du temps pour comprendre ça.\n\nCe qui m'a surpris cette semaine : ${topLabelFr} à ${topSignFr}${topChangeFr.toFixed(2)}%. J'aurais parié sur l'inverse. Bonne leçon d'humilité.\n\nEst-ce que d'autres ici ont commencé par le paper trading avant de passer au réel ? Combien de temps avant de se sentir prêt ?`,
      },
      en: {
        subreddit: "r/stocks",
        title: `Been paper trading for a few weeks — honest thoughts so far`,
        body: `Hey r/stocks,\n\nWanted to share my honest experience after a few weeks of paper trading on ${SITE_URL}.\n\nWhat I've learned:\n- It's way harder than it looks, even without real money on the line\n- Watching charts in real time is very different from analyzing them after the fact\n- Indicators (RSI, MACD) are useful but not magic — took me a while to really internalize that\n\nWhat surprised me this week: ${topLabelEn} at ${topSignFr}${topChangeFr.toFixed(2)}%. Would have bet the opposite. Good humility check.\n\nFor those who started with paper trading before going real — how long did you practice before feeling ready? Any advice on when to make the jump?`,
      },
    },
  ];
}
type MarketStatus = "open" | "premarket" | "aftermarket" | "weekend";

function getUSMarketStatus(): MarketStatus {
  const now = new Date();
  // Approximate DST: EDT (UTC-4) Mar–Nov, EST (UTC-5) Dec–Feb
  const month = now.getUTCMonth() + 1;
  const etOffset = (month >= 3 && month <= 11) ? -4 : -5;
  const etMs = now.getTime() + now.getTimezoneOffset() * 60000 + etOffset * 3600000;
  const et = new Date(etMs);
  const day = et.getDay(); // 0=dim, 6=sam
  const minutes = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6) return "weekend";
  if (minutes < 9 * 60 + 30) return "premarket";
  if (minutes >= 16 * 60) return "aftermarket";
  return "open";
}

const MARKET_STATUS_LABEL: Record<MarketStatus, { text: string; color: string }> = {
  open:        { text: "Marché ouvert", color: "text-profit" },
  premarket:   { text: "Pré-marché (ouverture 15h30 FR)", color: "text-yellow-400" },
  aftermarket: { text: "Marché fermé (clôture 22h00 FR)", color: "text-muted-foreground" },
  weekend:     { text: "Weekend — données de clôture vendredi", color: "text-loss" },
};

function SocialTab() {
  const [prices, setPrices] = useState<Record<string, { price: number; change: number; volume: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState<Record<PostKey, Platform>>({
    signal: "tw",
    top3: "tw",
    edu: "tw",
    promo: "tw",
  });
  const [copied, setCopied] = useState<Record<PostKey, boolean>>({
    signal: false, top3: false, edu: false, promo: false,
  });
  const [copiedComment, setCopiedComment] = useState<Record<PostKey, boolean>>({
    signal: false, top3: false, edu: false, promo: false,
  });
  const todayKey = `social_published_${new Date().toISOString().slice(0, 10)}`;
  const [published, setPublished] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(todayKey) || "{}");
    } catch { return {}; }
  });

  const SYMBOLS = ["BTC-USD", "ETH-USD", "AAPL", "^GSPC", "GC=F"];

  const loadPrices = async () => {
    setIsLoading(true);
    try {
      const data = await marketAPI.getPrices(SYMBOLS);
      setPrices(data.prices);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, []);

  const marketStatus = getUSMarketStatus();
  const posts = !isLoading && Object.keys(prices).length > 0 ? buildPosts(prices, marketStatus) : null;
  const redditPosts = !isLoading && Object.keys(prices).length > 0 ? buildRedditPosts(prices) : null;
  const [copiedReddit, setCopiedReddit] = useState<Record<string, boolean>>({});
  const [redditLang, setRedditLang] = useState<Record<number, "fr" | "en">>({});

  const copyReddit = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReddit((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiedReddit((prev) => ({ ...prev, [id]: false })), 2000);
    } catch (e) { console.error(e); }
  };

  const copyPost = async (key: PostKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch (e) { console.error(e); }
  };

  const copyComment = async (key: PostKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedComment((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopiedComment((prev) => ({ ...prev, [key]: false })), 2000);
    } catch (e) { console.error(e); }
  };

  // Twitter counts all URLs as 23 chars (t.co wrapping)
  const twitterLength = (text: string) => {
    const URL_RE = /https?:\/\/\S+|\S+\.\S{2,}(?:\/\S*)?/g;
    return text.replace(URL_RE, " ".repeat(23)).length;
  };

  const togglePublished = (key: PostKey, plat: Platform) => {
    const id = `${key}-${plat}`;
    setPublished((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(todayKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const publishedCount = Object.values(published).filter(Boolean).length;

  const POST_META: { key: PostKey; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "signal", label: "Signal du Jour", icon: <TrendingUp className="w-4 h-4" />, color: "text-profit" },
    { key: "top3", label: "Top Marchés", icon: <BarChart3 className="w-4 h-4" />, color: "text-primary" },
    { key: "edu", label: "Contenu Éducatif", icon: <Brain className="w-4 h-4" />, color: "text-yellow-400" },
    { key: "promo", label: "Promotion CaptenTDB", icon: <Sparkles className="w-4 h-4" />, color: "text-indigo-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Réseaux Sociaux</h3>
              <p className={cn("text-sm font-medium", MARKET_STATUS_LABEL[marketStatus].color)}>
                {MARKET_STATUS_LABEL[marketStatus].text}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {publishedCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-profit/20 text-profit border border-profit/30 font-medium">
                {publishedCount} publié{publishedCount > 1 ? "s" : ""} aujourd'hui
              </span>
            )}
            <button
              onClick={loadPrices}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {marketStatus !== "open" && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          marketStatus === "weekend"
            ? "bg-loss/10 border-loss/25 text-loss"
            : "bg-yellow-400/10 border-yellow-400/25 text-yellow-400"
        )}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {marketStatus === "weekend"
            ? "Marchés fermés ce weekend — les posts \"Signal\" et \"Top Marchés\" utilisent les données de clôture vendredi. Les posts éducatifs et promo sont publiables normalement."
            : "Marchés pas encore ouverts ou déjà fermés — les variations affichées sont celles de la dernière clôture."}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {POST_META.map(({ key, label, icon, color }) => {
            if (!posts) return null;
            const postData = posts[key as PostKey];
            const plat = platform[key as PostKey];
            const text: string = plat === "tw" ? postData.tw : postData.li;
            const isTwitter = plat === "tw";
            const twCount = twitterLength(text);
            const overLimit = isTwitter && twCount > 280;
            const pubId = `${key}-${plat}`;
            const isPublished = published[pubId];

            return (
              <div key={key} className="glass-card p-5 space-y-4">
                {/* Post header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("flex items-center gap-2 font-medium", color)}>
                      {icon}{label}
                    </span>
                    {postData.isFinancial && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/25">
                        Contenu financier
                      </span>
                    )}
                  </div>
                  {/* Platform toggle */}
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/8">
                    <button
                      onClick={() => setPlatform((p) => ({ ...p, [key]: "tw" }))}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                        plat === "tw" ? "bg-sky-500 text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      𝕏 Twitter
                    </button>
                    <button
                      onClick={() => setPlatform((p) => ({ ...p, [key]: "li" }))}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                        plat === "li" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      in LinkedIn
                    </button>
                  </div>
                </div>

                {/* Post body */}
                <pre className={cn(
                  "whitespace-pre-wrap text-sm font-sans bg-white/3 rounded-xl p-4 border leading-relaxed",
                  overLimit ? "border-loss/40" : "border-white/8"
                )}>
                  {text}
                </pre>

                {/* LinkedIn 1er commentaire */}
                {!isTwitter && postData.liComment && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-blue-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      LinkedIn — publier en <strong>1er commentaire</strong> (les liens dans le post réduisent la portée)
                    </p>
                    <div className="flex items-center gap-2 bg-white/3 rounded-lg px-3 py-2 border border-blue-500/20">
                      <span className="text-sm flex-1 font-mono text-blue-300">{postData.liComment}</span>
                      <button
                        onClick={() => copyComment(key as PostKey, postData.liComment)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
                          copiedComment[key as PostKey]
                            ? "bg-profit/20 text-profit"
                            : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                        )}
                      >
                        {copiedComment[key as PostKey] ? <><Check className="w-3 h-3" />Copié !</> : <><Copy className="w-3 h-3" />Copier</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Char count (Twitter only) */}
                  {isTwitter ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", overLimit ? "bg-loss" : twCount > 240 ? "bg-yellow-400" : "bg-profit")}
                          style={{ width: `${Math.min((twCount / 280) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-xs tabular-nums", overLimit ? "text-loss" : "text-muted-foreground")}>
                        {twCount}/280
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{charCount} caractères</span>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Mark published */}
                    <button
                      onClick={() => togglePublished(key as PostKey, plat)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        isPublished
                          ? "bg-profit/20 text-profit border-profit/30"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isPublished ? "Publié ✓" : "Marquer publié"}
                    </button>

                    {/* Copy button */}
                    <button
                      onClick={() => copyPost(key, text)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        copied[key]
                          ? "bg-profit/20 text-profit border-profit/30"
                          : "bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
                      )}
                    >
                      {copied[key] ? (
                        <><Check className="w-3.5 h-3.5" />Copié !</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" />Copier</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips Twitter/LinkedIn */}
      <div className="glass-card p-4 border-dashed border-white/15">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Workflow :</span> Copiez le post → ouvrez Twitter/X ou LinkedIn → collez et publiez → marquez comme publié ci-dessus.
          Les posts se régénèrent automatiquement avec les prix actuels en cliquant sur Actualiser.
        </p>
      </div>

      {/* Reddit Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-400 font-black text-sm">r/</span>
          </div>
          <div>
            <h3 className="font-semibold">Posts Reddit</h3>
            <p className="text-xs text-muted-foreground">Ton naturel d'utilisateur qui apprend — jamais promotionnel direct</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : redditPosts ? (
          <div className="grid gap-4">
            {redditPosts.map((post, i) => {
              const lang = redditLang[i] ?? "fr";
              const current = post[lang];
              return (
                <div key={i} className="glass-card p-5 space-y-3 border-orange-500/10">
                  {/* Header: subreddit + lang toggle */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium">
                      {current.subreddit}
                    </span>
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/8">
                      <button
                        onClick={() => setRedditLang((p) => ({ ...p, [i]: "fr" }))}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                          lang === "fr" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        🇫🇷 Français
                      </button>
                      <button
                        onClick={() => setRedditLang((p) => ({ ...p, [i]: "en" }))}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                          lang === "en" ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-snug flex-1">{current.title}</p>
                    <button
                      onClick={() => copyReddit(`title-${i}-${lang}`, current.title)}
                      className={cn(
                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all border",
                        copiedReddit[`title-${i}-${lang}`]
                          ? "bg-profit/20 text-profit border-profit/30"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {copiedReddit[`title-${i}-${lang}`] ? <><Check className="w-3 h-3" />Copié</> : <><Copy className="w-3 h-3" />Titre</>}
                    </button>
                  </div>

                  <div className="w-full h-px bg-white/6" />

                  {/* Body */}
                  <div className="space-y-2">
                    <pre className="whitespace-pre-wrap text-sm font-sans bg-white/3 rounded-xl p-4 border border-white/8 leading-relaxed text-muted-foreground">
                      {current.body}
                    </pre>
                    <div className="flex justify-end">
                      <button
                        onClick={() => copyReddit(`body-${i}-${lang}`, current.body)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          copiedReddit[`body-${i}-${lang}`]
                            ? "bg-profit/20 text-profit border-profit/30"
                            : "bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
                        )}
                      >
                        {copiedReddit[`body-${i}-${lang}`] ? <><Check className="w-3.5 h-3.5" />Copié !</> : <><Copy className="w-3.5 h-3.5" />Copier le corps</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="glass-card p-4 border-dashed border-orange-500/15">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-orange-400">Règles Reddit :</span> Poste en tant qu'utilisateur lambda qui apprend, pas en tant qu'admin du site.
            Engage avec les réponses (réponds aux commentaires). Ne poste pas le même texte deux fois — varie légèrement.
            Fréquence max : 2-3 posts par semaine sur le même sub.
          </p>
        </div>
      </div>
    </div>
  );
}

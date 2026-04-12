"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminAPI,
  premiumAPI,
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

type TabType = "dashboard" | "users" | "positions" | "tickets" | "premium" | "broadcasts" | "asset-requests" | "analytics" | "audit" | "settings";

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
    </motion.div>
  );
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

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Utilisateurs"
          value={stats.users.total}
          icon={Users}
          color="text-primary"
        />
        <StatCard
          title="Actifs 24h"
          value={stats.users.active_24h}
          icon={Activity}
          color="text-profit"
        />
        <StatCard
          title="Nouveaux 7j"
          value={stats.users.new_7d}
          icon={UserCheck}
          color="text-green-400"
        />
        <StatCard
          title="Positions Ouvertes"
          value={stats.trading.open_positions}
          icon={TrendingUp}
          color="text-warning"
        />
        <StatCard
          title="Trades 24h"
          value={stats.trading.trades_24h}
          icon={Target}
          color="text-purple-400"
        />
        <StatCard
          title="Messages IA"
          value={stats.ai.total_messages}
          icon={Brain}
          color="text-pink-400"
        />
        {stats.tickets && (
          <StatCard
            title="Tickets Ouverts"
            value={stats.tickets.open}
            icon={Mail}
            color={stats.tickets.awaiting_response > 0 ? "text-warning" : "text-primary"}
          />
        )}
      </div>

      {/* Volume & Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Volume 7 jours
          </h3>
          <p className="text-3xl font-bold">{formatCurrency(stats.trading.volume_7d)}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Solde Total Wallets
          </h3>
          <p className="text-3xl font-bold">{formatCurrency(stats.wallets.total_balance)}</p>
        </div>
      </div>

      {/* Recent Users & Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Derniers Utilisateurs
          </h3>
          <div className="space-y-3">
            {dashboard.recent_users.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    {user.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      user.is_active ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                    )}
                  >
                    {user.is_active ? "Actif" : "Inactif"}
                  </span>
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
          <div className="space-y-3">
            {dashboard.recent_trades.slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                      trade.direction === "LONG"
                        ? "bg-profit/20 text-profit"
                        : "bg-loss/20 text-loss"
                    )}
                  >
                    {trade.direction === "LONG" ? "L" : "S"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(trade.amount)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      trade.status === "open"
                        ? "bg-warning/20 text-warning"
                        : "bg-white/10"
                    )}
                  >
                    {trade.status}
                  </span>
                </div>
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

// Users Tab
function UsersTab({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getUsers(page, 20, search);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUserDetails = async (userId: number) => {
    try {
      const data = await adminAPI.getUserDetails(userId);
      setSelectedUser(data);
    } catch (err) {
      console.error(err);
    }
  };

  const performAction = async (userId: number, action: string, reason?: string) => {
    setActionLoading(true);
    try {
      await adminAPI.performUserAction(userId, action, reason);
      loadUsers();
      if (selectedUser?.user.id === userId) {
        loadUserDetails(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par email ou username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full input pl-10"
            />
          </div>
          <button onClick={loadUsers} className="btn-primary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-semibold mb-4">
            Utilisateurs ({total})
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => loadUserDetails(user.id)}
                  className={cn(
                    "p-4 rounded-lg cursor-pointer transition-colors",
                    selectedUser?.user.id === user.id
                      ? "bg-primary/20 border border-primary/50"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(user.balance || 0)}
                      </p>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          user.is_active ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                        )}
                      >
                        {user.is_active ? "Actif" : "Banni"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost"
            >
              Precedent
            </button>
            <span className="px-4 py-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={users.length < 20}
              className="btn-ghost"
            >
              Suivant
            </button>
          </div>
        </div>

        {/* User Details */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Details Utilisateur</h3>
          {selectedUser ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-2xl mx-auto">
                  {selectedUser.user.username?.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold mt-2">{selectedUser.user.username}</h4>
                <p className="text-sm text-muted-foreground">{selectedUser.user.email}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span>{selectedUser.user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Solde</span>
                  <span>{formatCurrency(selectedUser.wallet?.balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Positions</span>
                  <span>{selectedUser.positions.filter((p) => p.status === "open").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Favoris</span>
                  <span>{selectedUser.favorites.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inscrit le</span>
                  <span>{new Date(selectedUser.user.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                {selectedUser.trading_stats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Trades</span>
                      <span>{selectedUser.trading_stats.total_trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span>
                        {selectedUser.trading_stats.total_trades > 0
                          ? Math.round(
                              (selectedUser.trading_stats.winning_trades /
                                selectedUser.trading_stats.total_trades) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PnL Total</span>
                      <span
                        className={cn(
                          selectedUser.trading_stats.total_pnl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {formatCurrency(selectedUser.trading_stats.total_pnl || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <button
                  onClick={() =>
                    performAction(
                      selectedUser.user.id,
                      selectedUser.user.is_active ? "ban" : "unban"
                    )
                  }
                  disabled={actionLoading}
                  className={cn(
                    "w-full py-2 rounded-lg flex items-center justify-center gap-2",
                    selectedUser.user.is_active
                      ? "bg-loss/20 text-loss hover:bg-loss/30"
                      : "bg-profit/20 text-profit hover:bg-profit/30"
                  )}
                >
                  {selectedUser.user.is_active ? (
                    <>
                      <Ban className="w-4 h-4" /> Bannir
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Debannir
                    </>
                  )}
                </button>
                <button
                  onClick={() => performAction(selectedUser.user.id, "reset_wallet")}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-lg bg-warning/20 text-warning hover:bg-warning/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Wallet
                </button>
                <button
                  onClick={() => {
                    if (confirm("Supprimer cet utilisateur ?")) {
                      performAction(selectedUser.user.id, "delete");
                      setSelectedUser(null);
                    }
                  }}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-lg bg-loss/20 text-loss hover:bg-loss/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Selectionnez un utilisateur
            </p>
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
function SettingsTab() {
  const [settings, setSettings] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await adminAPI.getSettings();
      setSettings(data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSetting = async () => {
    if (!newKey || !newValue) return;
    try {
      await adminAPI.updateSetting(newKey, newValue);
      setNewKey("");
      setNewValue("");
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add Setting */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Ajouter/Modifier un parametre
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Cle</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full input mt-1"
              placeholder="nom_du_parametre"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Valeur</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full input mt-1"
              placeholder="valeur"
            />
          </div>
          <button
            onClick={saveSetting}
            disabled={!newKey || !newValue}
            className="w-full btn-primary"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Current Settings */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Parametres actuels</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : settings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun parametre</p>
        ) : (
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.key} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.key}</span>
                  <button
                    onClick={() => {
                      setNewKey(s.key);
                      setNewValue(s.value);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.value}</p>
              </div>
            ))}
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

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminAPI,
  AdminDashboard,
  AdminUser,
  AdminUserDetails,
  AdminPosition,
  AdminBroadcast,
} from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";

type TabType = "dashboard" | "users" | "positions" | "broadcasts" | "asset-requests" | "analytics" | "audit" | "settings";

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

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "positions", label: "Positions", icon: TrendingUp },
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
          <button
            onClick={loadDashboard}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-white/5 hover:bg-white/10"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "dashboard" && dashboard && (
        <DashboardTab dashboard={dashboard} formatCurrency={formatCurrency} />
      )}
      {activeTab === "users" && <UsersTab formatCurrency={formatCurrency} />}
      {activeTab === "positions" && <PositionsTab formatCurrency={formatCurrency} />}
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

// Broadcasts Tab
function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isSending, setIsSending] = useState(false);

  const loadBroadcasts = async () => {
    try {
      const data = await adminAPI.getBroadcasts(20);
      setBroadcasts(data.broadcasts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBroadcasts();
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

  return (
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
        <h3 className="font-semibold mb-4">Historique</h3>
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

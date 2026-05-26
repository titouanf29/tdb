"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Broadcast {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const typeConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-500/20 border-blue-500/50",
    text: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-500/20 border-yellow-500/50",
    text: "text-yellow-400",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-green-500/20 border-green-500/50",
    text: "text-green-400",
  },
  error: {
    icon: AlertTriangle,
    bg: "bg-red-500/20 border-red-500/50",
    text: "text-red-400",
  },
};

export function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    // Load dismissed broadcasts from localStorage
    const dismissed = localStorage.getItem("dismissedBroadcasts");
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }

    // Fetch broadcasts
    const fetchBroadcasts = async () => {
      try {
        const token = localStorage.getItem("tdb_token");
        if (!token) return;

        const response = await fetch("/api/admin/broadcasts/public?limit=5", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Backend already filters by user registration date — show all returned broadcasts
          setBroadcasts(data.broadcasts || []);
        }
      } catch (error) {
        console.error("Error fetching broadcasts:", error);
      }
    };

    fetchBroadcasts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchBroadcasts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dismissBroadcast = (id: number) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissedBroadcasts", JSON.stringify(newDismissed));
  };

  const visibleBroadcasts = broadcasts.filter((b) => !dismissedIds.includes(b.id));

  if (visibleBroadcasts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visibleBroadcasts.map((broadcast) => {
          const config = typeConfig[broadcast.type as keyof typeof typeConfig] || typeConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={broadcast.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm",
                config.bg
              )}
            >
              <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.text)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bell className={cn("w-4 h-4", config.text)} />
                  <h4 className={cn("font-semibold text-sm", config.text)}>
                    {broadcast.title}
                  </h4>
                </div>
                <p className="text-sm text-foreground/80 mt-1">{broadcast.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(broadcast.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => dismissBroadcast(broadcast.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

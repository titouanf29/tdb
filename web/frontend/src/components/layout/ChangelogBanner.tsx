"use client";

import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { AuthContext } from "@/lib/AuthContext";

interface Changelog {
  id: number;
  title: string;
  content: string;
  version?: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchLatestUnread(token: string): Promise<Changelog | null> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/changelog/latest-unread`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.changelog || null;
  } catch {
    return null;
  }
}

async function markRead(token: string, changelogId: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/admin/changelog/${changelogId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}

export function ChangelogBanner() {
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("tdb_token");
    if (!token) return;
    fetchLatestUnread(token).then(setChangelog);
  }, [isAuthenticated]);

  const dismiss = async () => {
    const token = localStorage.getItem("tdb_token");
    if (token && changelog) {
      await markRead(token, changelog.id);
    }
    setChangelog(null);
  };

  return (
    <AnimatePresence>
      {changelog && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="glass-card border border-primary/30 p-6 max-w-lg w-full pointer-events-auto shadow-2xl">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold">{changelog.title}</h2>
                    {changelog.version && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">
                        {changelog.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(changelog.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mb-6 max-h-64 overflow-y-auto">
                {changelog.content}
              </div>

              {/* Action */}
              <button
                onClick={dismiss}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                J&apos;ai compris !
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

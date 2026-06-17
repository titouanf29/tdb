"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (isChunkError) {
      const timer = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
        <div className="p-4 rounded-full bg-primary/10 animate-pulse">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="font-semibold">Mise à jour disponible</p>
        <p className="text-sm text-muted-foreground">
          Une nouvelle version est disponible. Rechargement en cours…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
      <div className="p-4 rounded-full bg-red-500/10">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <p className="font-semibold">Une erreur est survenue</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  );
}

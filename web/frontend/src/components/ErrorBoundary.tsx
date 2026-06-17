"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed")
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkLoadError(error);
    if (chunkError) {
      setTimeout(() => window.location.reload(), 1500);
    }
    return { hasError: true, error, isChunkError: chunkError };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8 text-center">
            <div className="p-4 rounded-full bg-primary/10 animate-pulse">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Mise à jour disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                Une nouvelle version est disponible. Rechargement en cours…
              </p>
            </div>
          </div>
        );
      }

      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8 text-center">
          <div className="p-4 rounded-full bg-loss/10">
            <AlertTriangle className="w-8 h-8 text-loss" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Une erreur est survenue</p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message || "Erreur inattendue"}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, isChunkError: false })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

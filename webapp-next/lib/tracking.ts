declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type TrackEventParams = {
  event: string;
  location: string;
  target: string;
};

export function trackEvent(params: TrackEventParams): void {
  if (typeof window === 'undefined') return;

  // Google Analytics (if configured)
  if (typeof window.gtag === 'function') {
    window.gtag('event', params.event, {
      event_category: params.location,
      event_label: params.target,
    });
  }

  // Internal tracking endpoint
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch(() => {
    // Silently ignore tracking errors
  });
}

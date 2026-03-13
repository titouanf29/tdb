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
  if (typeof window.gtag === 'function') {
    window.gtag('event', params.event, {
      event_category: params.location,
      event_label: params.target,
    });
  }
}

/**
 * Les notifications sur cet appareil (backend routes/push.py,
 * services/push.py ; service worker public/sw.js).
 *
 * Le navigateur demande l'accord UNE fois ; un refus est définitif tant que
 * la personne ne le change pas dans les réglages du navigateur. On ne
 * demande donc jamais à froid : seulement quand elle appuie sur le bouton.
 */
import { pushAPI } from "./api";

export type EtatPush = "indisponible" | "non_configure" | "refuse" | "inactif" | "actif";

export function pushPossible(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
    && "Notification" in window;
}

export async function enregistrerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function versOctets(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const brut = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
  return out;
}

export async function etatPush(): Promise<EtatPush> {
  if (!pushPossible()) return "indisponible";
  const { cle } = await pushAPI.cle().catch(() => ({ cle: null }));
  if (!cle) return "non_configure";
  if (Notification.permission === "denied") return "refuse";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const abo = await reg?.pushManager.getSubscription();
  return abo ? "actif" : "inactif";
}

export async function activerPush(): Promise<EtatPush> {
  if (!pushPossible()) return "indisponible";
  const { cle } = await pushAPI.cle();
  if (!cle) return "non_configure";
  const accord = await Notification.requestPermission();
  if (accord !== "granted") return accord === "denied" ? "refuse" : "inactif";
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await enregistrerServiceWorker());
  if (!reg) return "indisponible";
  await navigator.serviceWorker.ready;
  const abo = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) }));
  const j = abo.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await pushAPI.abonner({ endpoint: j.endpoint, keys: j.keys });
  return "actif";
}

export async function desactiverPush(): Promise<EtatPush> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const abo = await reg?.pushManager.getSubscription();
  if (abo) {
    await pushAPI.desabonner(abo.endpoint).catch(() => {});
    await abo.unsubscribe().catch(() => {});
  }
  return "inactif";
}

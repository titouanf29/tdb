"use client";

import { useEffect } from "react";
import { enregistrerServiceWorker, resynchroniserPush } from "@/lib/push";

/** Enregistre le service worker (public/sw.js) : il rend le site installable
 *  et reçoit les notifications. Ne rend rien. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    enregistrerServiceWorker().then(() => resynchroniserPush()).catch(() => {});
  }, []);
  return null;
}

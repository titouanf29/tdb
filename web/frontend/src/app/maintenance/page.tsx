"use client";

import { useEffect } from "react";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";
import { useLanguage } from "@/lib/LanguageContext";
import { useMaintenance } from "@/lib/useMaintenance";

/**
 * Where the edge middleware rewrites every locked-out request.
 *
 * It only ever renders the maintenance screen — it does not decide anything.
 * The decision was already made server-side, before this page was chosen, so
 * there is nothing here for a visitor to bypass. The /api/status call is only
 * to fill in the operator's message and countdown.
 */
export default function MaintenancePage() {
  const { lang } = useLanguage();
  const { message, endTime, startedAt, on, checked } = useMaintenance();

  // The hook polls every 30s. When the operator flips the switch off, send
  // everyone sitting here back to the site instead of making them guess.
  // A hard reload, not a router push: the gate lives in edge middleware, so
  // the decision has to be taken by the server again.
  useEffect(() => {
    if (checked && !on) window.location.replace("/");
  }, [checked, on]);

  return (
    <MaintenanceScreen
      message={message || (lang === "en"
        ? "The site is temporarily unavailable. Please come back soon."
        : "Le site est temporairement indisponible. Revenez bientôt.")}
      endTime={endTime}
      startedAt={startedAt}
      lang={lang}
    />
  );
}

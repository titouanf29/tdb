"use client";

import { useEffect, useRef, useState } from "react";
import { toTradingViewSymbol } from "@/lib/tradingViewSymbol";
import { Text } from "@/components/design-system";

/**
 * Le graphique TradingView, en cadre isolé.
 *
 * Trois décisions valent d'être écrites.
 *
 * Un iframe, pas le chargeur tv.js. Le script officiel s'exécute dans notre
 * page, avec accès au DOM et aux cookies du site ; l'iframe reste sur son
 * origine. Pour un site qui affiche des données financières nominatives,
 * c'est la différence entre héberger un tiers et lui faire une place.
 *
 * Rien n'est chargé tant que l'utilisateur ne l'a pas demandé. Le composant
 * ne monte que lorsque l'onglet TradingView est actif, donc un visiteur qui
 * s'en tient au graphique interne n'envoie aucune requête à tradingview.com
 * — et la page ne paie pas les quelques centaines de kilo-octets du widget.
 *
 * Enfin, une correspondance de symbole incertaine n'est jamais tentée : le
 * cadre afficherait « Invalid symbol », et l'utilisateur ne saurait pas si
 * c'est l'actif ou le site qui échoue. Le parent retombe alors sur le
 * graphique interne, qui fonctionne pour tout.
 */
const CLE_ACCORD = "tdb_tradingview_accord";

export function TradingViewChart({
  symbol,
  interval = "D",
  height = 420,
}: {
  symbol: string;
  /** Unité TradingView : 5, 15, 60, D, W. */
  interval?: string;
  height?: number;
}) {
  const tvSymbol = toTradingViewSymbol(symbol);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);

  // ON DEMANDE AVANT DE CHARGER. Le cadre vient des serveurs de TradingView,
  // qui reçoivent alors l'adresse IP du visiteur et le symbole consulté :
  // un tiers hors de l'Union européenne. Rien ne part tant que la personne
  // n'a pas dit oui, en sachant quoi ; son accord est retenu dans ce
  // navigateur pour ne pas le lui redemander à chaque actif.
  const [accord, setAccord] = useState<boolean | null>(null);
  useEffect(() => {
    try { setAccord(localStorage.getItem(CLE_ACCORD) === "1"); } catch { setAccord(false); }
  }, []);
  const accepter = () => {
    try { localStorage.setItem(CLE_ACCORD, "1"); } catch { /* navigation privée */ }
    setAccord(true);
  };

  // Un cadre tiers peut rester blanc indéfiniment — réseau filtré, bloqueur
  // de contenu, service en panne. Au bout de huit secondes on le dit, plutôt
  // que de laisser un rectangle vide sans explication.
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [tvSymbol, interval]);

  if (!tvSymbol) return null;

  if (accord !== true) {
    return (
      <div className="flex w-full flex-col items-start justify-center gap-3 rounded-[12px] px-5 py-6"
        style={{ minHeight: Math.min(height, 240), backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
        <Text size="small" tone="ink" className="max-w-[40rem]">
          Ce graphique est fourni par TradingView, une société américaine. En le chargeant, votre adresse IP et
          le symbole consulté lui sont transmis. Le graphique « Commenté » juste au-dessus, lui, ne sort pas du site.
        </Text>
        {accord === false && (
          <button type="button" onClick={accepter}
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[12px] px-5 text-[0.95rem] font-semibold"
            style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
            Charger le graphique TradingView
          </button>
        )}
        <Text size="caption">Votre choix est retenu dans ce navigateur. Détail dans la politique de confidentialité.</Text>
      </div>
    );
  }

  const params = new URLSearchParams({
    symbol: tvSymbol,
    interval,
    theme: "light",
    style: "1",          // chandeliers
    locale: "fr",
    timezone: "Europe/Paris",
    hide_side_toolbar: "1",
    hide_legend: "0",
    allow_symbol_change: "0",
    save_image: "0",
    withdateranges: "1",
  });

  return (
    <div className="relative w-full overflow-hidden rounded-[12px]" style={{ height }}>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: "var(--cap-bg)" }}
        >
          <Text size="caption" as="span">
            {slow
              ? "TradingView ne répond pas. Revenez au graphique simple juste au-dessus."
              : "Chargement du graphique TradingView…"}
          </Text>
        </div>
      )}
      <iframe
        ref={frame}
        key={`${tvSymbol}-${interval}`}
        src={`https://s.tradingview.com/widgetembed/?${params.toString()}`}
        title={`Graphique TradingView de ${symbol}`}
        onLoad={() => setLoaded(true)}
        className="h-full w-full"
        style={{ border: 0 }}
        // Le strict nécessaire. Ce qui n'est PAS accordé compte autant :
        // sans allow-top-navigation, un cadre tiers ne peut pas emmener la
        // page de l'utilisateur ailleurs. allow-same-origin garde au cadre sa
        // propre origine — pas la nôtre — pour que le widget accède à son
        // stockage sans jamais approcher le nôtre.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        referrerPolicy="origin"
      />
    </div>
  );
}

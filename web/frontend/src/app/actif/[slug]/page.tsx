import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisVisual } from "@/components/landing/AnalysisVisual";
import { AppelActif } from "@/components/actif/AppelActif";
import { analyseActif, dateAnalyse, listeActifs, pourcent, type AnalysePublique } from "@/lib/actifs-serveur";

/*
 * « L'ANALYSE DU JOUR » D'UN ACTIF, PUBLIQUE ET RENDUE PAR LE SERVEUR.
 *
 * Ce qu'on tape dans Google, c'est « analyse action Apple », « LVMH bourse
 * aujourd'hui ». Chaque page répond avec la vraie lecture du moteur, mise à
 * jour toutes les dix minutes, en mots simples, et renvoie vers les leçons
 * qui expliquent chaque chiffre. Elle n'est jamais un conseil : elle dit ce
 * que lit le moteur, et invite à s'entraîner en argent fictif.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://captentdb.fr";
type Props = Readonly<{ params: Promise<{ slug: string }> }>;

// Ce que dit Nimbo aujourd'hui. La direction suit son plan (backend demo.py).
const VERDICT: Record<string, string> = {
  Haussier: "Nimbo propose un plan à l'achat",
  Baissier: "Nimbo propose un plan à la vente",
  Neutre: "Nimbo ne propose pas de position",
};

function description(a: AnalysePublique): string {
  return `${a.name} aujourd'hui : cours ${a.price} (${pourcent(a.change)}), score ${a.score} sur 100, `
    + `${VERDICT[a.direction]}. Tendance, élan, volumes, support et résistance, expliqués simplement.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await analyseActif(slug);
  if (a === null) return { title: "Actif introuvable", robots: { index: false } };
  if (a === "indisponible") return { title: "Analyse du jour", robots: { index: false } };
  return {
    title: `${a.name} : l'analyse du jour`,
    description: description(a),
    alternates: { canonical: `/actif/${slug}` },
    openGraph: { type: "article", title: `${a.name} : l'analyse du jour`, description: description(a), url: `/actif/${slug}`, locale: "fr_FR", siteName: "CaptenTDB" },
    twitter: { card: "summary_large_image", title: `${a.name} : l'analyse du jour`, description: description(a) },
  };
}

/** Ce que dit le RSI, en une phrase. */
function lectureRsi(rsi: number | null): string | undefined {
  if (rsi == null) return undefined;
  if (rsi >= 70) return "Au-dessus de 70 : les hausses ont nettement dominé, le mouvement est tendu.";
  if (rsi <= 30) return "Sous 30 : les baisses ont nettement dominé, le mouvement est tendu.";
  return "Entre 30 et 70 : ni excès d'achat, ni excès de vente.";
}

function Chiffre({ titre, valeur, lecon, detail }: Readonly<{ titre: string; valeur: string; lecon?: { n: number; titre: string }; detail?: string }>) {
  return (
    <div className="border-t py-3.5" style={{ borderColor: "var(--cap-line)" }}>
      <dt className="text-[0.92rem] font-semibold" style={{ color: "var(--cap-ink-2)" }}>{titre}</dt>
      <dd className="cap-num mt-0.5 text-[1.3rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{valeur}</dd>
      {detail && <dd className="mt-0.5 text-[0.9rem]" style={{ color: "var(--cap-ink-3)" }}>{detail}</dd>}
      {lecon && (
        <dd className="mt-1 text-[0.9rem]">
          <Link href={`/lecon/${lecon.n}`} className="underline decoration-[color:var(--cap-ambre)] underline-offset-[4px]" style={{ color: "var(--cap-ink)" }}>
            {lecon.titre}
          </Link>
        </dd>
      )}
    </div>
  );
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [a, liste] = await Promise.all([analyseActif(slug), listeActifs()]);
  if (a === null) notFound();

  if (a === "indisponible") {
    return (
      <article className="mx-auto max-w-[46rem] py-16">
        <h1 className="text-[2rem] font-bold" style={{ color: "var(--cap-ink)" }}>L&apos;analyse du jour</h1>
        <p className="mt-3 text-[1.05rem]" style={{ color: "var(--cap-ink-2)" }}>
          Le moteur ne répond pas pour le moment. Revenez dans quelques minutes, ou parcourez les leçons gratuites.
        </p>
        <Link href="/cours" className="mt-6 inline-block underline decoration-[color:var(--cap-ambre)] underline-offset-[5px]">Voir les leçons</Link>
      </article>
    );
  }

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const quand = dateAnalyse(a.analyse_a);
  const autres = liste.filter((x) => x.id !== slug);
  const memes = autres.filter((x) => x.categorie === a.categorie).slice(0, 6);
  const ailleurs = autres.filter((x) => x.categorie !== a.categorie).slice(0, 6 - Math.min(memes.length, 3));
  // \s couvre déjà les espaces insécables du séparateur de milliers.
  const unite = a.price.replace(/^[\d\s,.\-−]+/, "").trim();
  const decimales = a.ticker.endsWith("=X") ? 4 : 2;
  const suffixe = unite ? ` ${unite}` : "";
  const prixNombre = (v: number | null) => {
    if (v == null) return "n.d.";
    return v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + suffixe;
  };
  const rsiLecture = lectureRsi(a.rsi);
  const dernier = a.series[a.series.length - 1];
  const cote = a.moyennes.ema200 != null && dernier >= a.moyennes.ema200 ? "au-dessus" : "en dessous";
  const positionMoyenne = a.moyennes.ema200 == null ? undefined
    : `Le cours est ${cote} de sa tendance de long terme.`;

  const donnees = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${a.name} : l'analyse du jour`,
    description: description(a),
    url: `${SITE}/actif/${slug}`,
    inLanguage: "fr",
    dateModified: a.analyse_a,
    about: { "@type": "Thing", name: a.name, alternateName: a.ticker },
    publisher: { "@type": "Organization", name: "CaptenTDB", url: SITE },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Analyses du jour", item: `${SITE}/actifs` },
        { "@type": "ListItem", position: 2, name: a.name, item: `${SITE}/actif/${slug}` },
      ],
    },
  };

  return (
    <article className="mx-auto max-w-[46rem] py-10 sm:py-14">
      <script type="application/ld+json" nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }} />

      <nav aria-label="Fil d'Ariane" className="mb-5 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>
        <Link href="/actifs" className="underline underline-offset-[4px]">Analyses du jour</Link>
        <span aria-hidden> · </span>
        <span>{a.categorie}</span>
      </nav>

      <p className="cap-dateline text-[0.95rem]">Analyse du {quand}, heure de Paris</p>

      <h1 className="mt-5 text-[clamp(2rem,6vw,2.9rem)] font-bold leading-[1.08] tracking-[-0.018em]" style={{ color: "var(--cap-ink)" }}>
        {a.name} : l&apos;analyse du jour
      </h1>

      <p className="mt-4 text-[1.1rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {a.name}, {a.presentation}. Le cours est à <strong className="cap-num" style={{ color: "var(--cap-ink)" }}>{a.price}</strong>{" "}
        (<span className="cap-num" style={{ color: a.change >= 0 ? "var(--cap-up)" : "var(--cap-down)" }}>{pourcent(a.change)}</span> sur la séance).
        Le moteur de CaptenTDB lui donne aujourd&apos;hui un score de{" "}
        <strong className="cap-num" style={{ color: "var(--cap-ink)" }}>{a.score} sur 100</strong>, et{" "}
        <strong style={{ color: "var(--cap-ink)" }}>{VERDICT[a.direction]}</strong>{" "}
        aujourd&apos;hui.
      </p>

      <figure className="mt-8 rounded-[16px] p-4 sm:p-6" style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
        <div className="h-[220px] w-full sm:h-[260px]">
          <AnalysisVisual prix={a.price} series={{ points: a.series, support: a.support, resistance: a.resistance }} className="h-full w-full" />
        </div>
        <figcaption className="mt-3 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>
          Les {a.series.length} dernières séances, avec le support et la résistance que retient le moteur.
        </figcaption>
      </figure>

      <section className="mt-10" aria-labelledby="lecture">
        <h2 id="lecture" className="text-[1.5rem] font-bold" style={{ color: "var(--cap-ink)" }}>Ce que lit le moteur</h2>
        <ul className="mt-4 space-y-3">
          {a.reasons.map((r) => (
            <li key={r} className="flex gap-3 text-[1.05rem] leading-relaxed" style={{ color: "var(--cap-ink)" }}>
              <span aria-hidden className="mt-[0.8rem] h-[2px] w-3 shrink-0" style={{ backgroundColor: "var(--cap-ambre)" }} />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="chiffres">
        <h2 id="chiffres" className="text-[1.5rem] font-bold" style={{ color: "var(--cap-ink)" }}>Les chiffres du jour</h2>
        <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
          <Chiffre titre="Sur une semaine" valeur={pourcent(a.performance["1w"])} />
          <Chiffre titre="Sur un mois" valeur={pourcent(a.performance["1m"])} />
          <Chiffre titre="Sur trois mois" valeur={pourcent(a.performance["3m"])} />
          <Chiffre titre="Depuis le 1er janvier" valeur={pourcent(a.performance.ytd)} />
          <Chiffre titre="RSI sur 14 séances" valeur={a.rsi == null ? "n.d." : a.rsi.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            detail={rsiLecture} lecon={{ n: 4, titre: "Comprendre le RSI" }} />
          <Chiffre titre="Moyenne mobile 200 séances" valeur={prixNombre(a.moyennes.ema200)}
            detail={positionMoyenne}
            lecon={{ n: 6, titre: "Comprendre les moyennes mobiles" }} />
          <Chiffre titre="Support" valeur={prixNombre(a.support)} detail="Le niveau où le prix a récemment cessé de baisser."
            lecon={{ n: 33, titre: "Comprendre supports et résistances" }} />
          <Chiffre titre="Résistance" valeur={prixNombre(a.resistance)} detail="Le niveau où le prix a récemment cessé de monter." />
          <Chiffre titre="Tendance hebdomadaire" valeur={a.tendance_hebdo} detail="La même lecture, sur des bougies d'une semaine." />
          <Chiffre titre="Agitation du marché" valeur={a.risk} detail="La volatilité du jour comparée à celle de l'actif sur un an." />
        </dl>
      </section>

      <AppelActif symbole={a.ticker} nom={a.name} />

      <section className="mt-12" aria-labelledby="questions">
        <h2 id="questions" className="text-[1.5rem] font-bold" style={{ color: "var(--cap-ink)" }}>Questions fréquentes</h2>
        <dl className="cap-qr mt-4">
          <div className="cap-qr-item">
            <dt>Faut-il acheter {a.name} aujourd&apos;hui ?</dt>
            <dd>
              CaptenTDB ne dit à personne quoi acheter ou vendre : cette page décrit ce que lit un moteur d&apos;analyse
              technique, sans tenir compte de votre situation. Aujourd&apos;hui, {VERDICT[a.direction]}.
              Pour vous faire votre avis sans rien risquer, entraînez-vous avec de l&apos;argent fictif.
            </dd>
          </div>
          <div className="cap-qr-item">
            <dt>Comment cette analyse est-elle faite ?</dt>
            <dd>
              Le moteur lit les séances passées de {a.name} : la tendance (la position du cours face à ses moyennes),
              l&apos;élan (la vitesse du mouvement), les volumes et l&apos;agitation du marché, et en tire un score sur 100.
              Nimbo ne propose une position que si le score est net et que le plan tient : un stop raisonnable, un
              objectif qui vaut le risque, une tendance de fond qui ne s&apos;y oppose pas.
            </dd>
          </div>
          <div className="cap-qr-item">
            <dt>À quelle fréquence la page est-elle mise à jour ?</dt>
            <dd>
              Toutes les dix minutes environ, sur les cours du marché ({a.ticker}). Les cours peuvent avoir quelques minutes
              de retard. Hors séance, la page montre la dernière clôture.
            </dd>
          </div>
          <div className="cap-qr-item">
            <dt>Puis-je m&apos;entraîner sur {a.name} sans risquer d&apos;argent ?</dt>
            <dd>
              Oui : avec un compte gratuit, vous recevez 10 000 € fictifs, vous ouvrez des positions sur {a.name} aux vrais
              cours, et Nimbo vous explique chaque décision, y compris quand il vaut mieux attendre.
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 text-[0.9rem] leading-relaxed" style={{ color: "var(--cap-ink-3)" }}>
        Contenu pédagogique, pas un conseil en investissement. Les performances passées ne préjugent pas des performances
        futures. Investir comporte un risque de perte en capital.
      </p>

      {(memes.length > 0 || ailleurs.length > 0) && (
        <nav className="mt-12 border-t pt-6" style={{ borderColor: "var(--cap-line-strong)" }} aria-label="Autres analyses du jour">
          <h2 className="text-[1.2rem] font-bold" style={{ color: "var(--cap-ink)" }}>Les autres analyses du jour</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {[...memes, ...ailleurs].map((x) => (
              <li key={x.id}>
                <Link href={`/actif/${x.id}`} className="flex min-h-[44px] items-center justify-between gap-3 border-b text-[1rem]"
                  style={{ borderColor: "var(--cap-line)", color: "var(--cap-ink)" }}>
                  <span>{x.nom}</span>
                  <span className="text-[0.88rem]" style={{ color: "var(--cap-ink-3)" }}>{x.categorie}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/actifs" className="mt-4 inline-block underline decoration-[color:var(--cap-ambre)] underline-offset-[5px]" style={{ color: "var(--cap-ink)" }}>
            Toutes les analyses du jour
          </Link>
        </nav>
      )}
    </article>
  );
}

"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue, type Variants } from "framer-motion";
import { Nimbo, useAnimationsEnabled } from "@/components/design-system";
import { NuageImage } from "@/components/design-system/NuageImage";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * Les effets de la page de présentation.
 *
 * LE PARTI PRIS : le ciel est le sujet. On arrive sous les nuages, ils
 * s'ouvrent ; en descendant on les traverse ; les éléments sortent de la
 * brume plutôt que de glisser. Tout joue sur la même métaphore que le reste du
 * site — un marché illisible qui s'éclaircit — au lieu d'empiler des effets.
 *
 * LES RÈGLES, TENUES PARTOUT :
 *   · seuls transform, opacity et filter s'animent (aucune mise en page) ;
 *   · « réduire les animations » (système) et l'interrupteur du site coupent
 *     tout : les éléments sont alors simplement posés ;
 *   · rien ne bloque la lecture : aucun effet ne précède le contenu de plus
 *     d'une seconde et demie, et l'ouverture du ciel ne se joue qu'une fois
 *     par visite.
 */

export function useEffetsActifs() {
  // useMouvementReduit est faux au premier rendu (serveur comme navigateur),
  // puis vrai si l'appareil le demande : pas d'écart à l'hydratation.
  const reduit = useMouvementReduit();
  const [anim] = useAnimationsEnabled();
  return !reduit && anim;
}

/**
 * Vrai une fois le ciel ouvert (ou tout de suite s'il n'y a pas d'ouverture).
 * Ce qui se dessine en haut de page attend ce moment : sinon il se dessinait
 * sous les nuages, sans personne pour le voir.
 */
export function useCielOuvert() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const d = document.documentElement;
    const lire = () => setOuvert(!d.classList.contains("ciel-intro") || d.classList.contains("ciel-parti"));
    lire();
    const obs = new MutationObserver(lire);
    obs.observe(d, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return ouvert;
}

/* ── Un nuage ─────────────────────────────────────────────────────────── */

export function Nuage({ forme = 0, retourne, className, style, flou = 2.4, prioritaire }: {
  forme?: number; retourne?: boolean; className?: string; style?: React.CSSProperties; flou?: number; prioritaire?: boolean;
}) {
  // Une image déjà prête : bouger ou grossir un nuage ne le redessine plus.
  return <NuageImage forme={forme} retourne={retourne} flou={flou} className={className} style={style} prioritaire={prioritaire} />;
}

/* ── 1. L'envol ──────────────────────────────────────────────────────── */

/**
 * À chaque arrivée sur le site (chargement ou rafraîchissement), l'écran est
 * rempli de nuages, sur quatre profondeurs, qui respirent doucement. Au
 * premier geste — défilement, clic, toucher, touche du clavier — on
 * s'envole : les plans de nuages foncent vers nous l'un après l'autre en
 * accélérant, comme un avion qui traverse la couche, et l'on débouche sur la
 * page.
 *
 * Toujours évitable : n'importe quel geste lance la séquence (2 s), et un
 * vrai bouton la déclenche au clavier. Aucune intro si le système demande
 * moins d'animations ou si l'interrupteur du site est coupé.
 *
 * Tout le mouvement est en CSS, donc exécuté par la carte graphique, avec des
 * nuages déjà prêts (public/nuages) : rien ne dépend du JavaScript de la
 * page, occupé à démarrer au même moment.
 */
type Nue = { x: number; y: number; w: number; f: number; r?: boolean };
type Plan = { s: number; o: number; nuages: Nue[] };

const PLANS: Plan[] = [
  // Le plus proche d'abord : c'est lui qu'on traverse en premier.
  { s: 1, o: 1, nuages: [
    { x: -18, y: -8, w: 78, f: 0 }, { x: 42, y: 4, w: 82, f: 2, r: true },
    { x: 2, y: 44, w: 88, f: 1 }, { x: -28, y: 58, w: 62, f: 3, r: true }, { x: 56, y: 62, w: 60, f: 0 },
  ] },
  { s: 0.74, o: 0.96, nuages: [
    { x: 8, y: -4, w: 64, f: 1, r: true }, { x: -14, y: 34, w: 66, f: 0 }, { x: 46, y: 38, w: 62, f: 3 },
  ] },
  { s: 0.55, o: 0.92, nuages: [
    { x: 22, y: 12, w: 56, f: 2 }, { x: -2, y: 50, w: 56, f: 1, r: true }, { x: 50, y: 54, w: 50, f: 0 },
  ] },
  { s: 0.4, o: 0.86, nuages: [
    { x: 24, y: 24, w: 52, f: 3 }, { x: 4, y: 4, w: 46, f: 0, r: true }, { x: 50, y: 10, w: 44, f: 2 },
  ] },
];

const DUREE_VOL = 2.1;            // chaque plan
const ECART_PLANS = 0.24;         // entre deux plans
const FIN_VOL = DUREE_VOL + ECART_PLANS * (PLANS.length - 1);

/* Lu avant le premier affichage : décide s'il y a une intro, sans attendre
   React. Remonte aussi la page en haut au rafraîchissement, pour que le vol
   débouche toujours sur l'accueil. */
const DECISION = `try{var d=document.documentElement;var off=localStorage.getItem('tdb_animations')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;if(off){d.classList.add('anim-off','ciel-vu')}else{d.classList.add('ciel-intro');window.__cielJoue=true;if('scrollRestoration' in history)history.scrollRestoration='manual';window.scrollTo(0,0)}}catch(e){document.documentElement.classList.add('ciel-vu')}`;

function cssEnvol(): string {
  const r: string[] = [];
  PLANS.forEach((pl, i) => {
    const fin = pl.s * 5.2;
    r.push(`@keyframes cv-plan${i}{0%{transform:scale(${pl.s});opacity:${pl.o}}55%{opacity:${pl.o}}100%{transform:scale(${fin.toFixed(2)});opacity:0}}`);
    r.push(`.ciel-rideau .cv-plan${i}{transform:scale(${pl.s});opacity:${pl.o}}`);
    r.push(`.ciel-rideau.vol .cv-plan${i}{animation:cv-plan${i} ${DUREE_VOL}s cubic-bezier(.55,0,.85,.35) ${(i * ECART_PLANS).toFixed(2)}s both}`);
  });
  // En attendant le geste : chaque plan respire, à son rythme.
  r.push(`@keyframes cv-souffle{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(1.2%,-1%,0) scale(1.035)}}`);
  PLANS.forEach((_, i) => r.push(`.ciel-rideau .cv-souffle${i}{animation:cv-souffle ${9 + i * 2.5}s ease-in-out ${-i * 1.7}s infinite}`));
  // Le ciel derrière les nuages s'efface pendant la traversée.
  r.push(`@keyframes cv-fond{from{opacity:1}to{opacity:0}}.ciel-rideau.vol .cv-fond{animation:cv-fond ${(FIN_VOL * 0.55).toFixed(2)}s ease-in ${(FIN_VOL * 0.35).toFixed(2)}s both}`);
  // L'invitation.
  r.push(`@keyframes cv-invite{0%,100%{transform:translate3d(0,0,0);opacity:.55}50%{transform:translate3d(0,6px,0);opacity:1}}`);
  r.push(`.cv-fleche{animation:cv-invite 1.8s ease-in-out infinite}`);
  r.push(`@keyframes cv-apparait{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}.cv-invitation{animation:cv-apparait .7s ease-out .25s both}`);
  r.push(`.ciel-rideau.vol .cv-invitation{opacity:0;transition:opacity .25s ease-out;animation:none}`);
  // LE FILET DE SÉCURITÉ. Si le JavaScript tarde ou échoue (réseau lent,
  // bloqueur, erreur), rien n'ouvrirait le ciel et le visiteur resterait
  // devant des nuages. Au bout de cinq secondes, le rideau s'efface de
  // lui-même, en CSS pur.
  r.push(`@keyframes cv-secours{to{opacity:0;visibility:hidden}}.ciel-rideau:not(.vol){animation:cv-secours .6s ease-out 5s forwards}`);
  r.push(`.ciel-vu .ciel-rideau{display:none}`);
  return r.join("");
}

export function cielEnCours(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __cielJoue?: boolean }).__cielJoue);
}

export function OuvertureDuCiel() {
  const [etat, setEtat] = useState<"attente" | "vol" | "fini">("attente");
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (!cielEnCours()) {
      // Arrivée par un lien interne (le script de décision n'a pas tourné)
      // ou animations coupées : pas d'intro, la page s'affiche tout de suite.
      html.classList.add("ciel-vu");
      setEtat("fini");
      return;
    }
    // Pendant l'attente, la page ne défile pas : le premier geste sert à
    // entrer, pas à glisser sous les nuages.
    const ancien = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    let parti = false;
    const minuteries: ReturnType<typeof setTimeout>[] = [];
    const empeche = (e: Event) => { if (!parti || html.style.overflow === "hidden") e.preventDefault(); };
    const lance = () => {
      if (parti) return;
      parti = true;
      setEtat("vol");
      // Le titre commence à sortir de la brume pendant que les derniers
      // nuages passent : on débouche sur la page sans temps mort.
      minuteries.push(setTimeout(() => html.classList.add("ciel-parti"), FIN_VOL * 450));
      minuteries.push(setTimeout(() => {
        html.style.overflow = ancien;
        setEtat("fini");
      }, FIN_VOL * 1000 + 80));
    };
    const surTouche = (e: KeyboardEvent) => {
      if (["Tab", "Shift", "Alt", "Control", "Meta"].includes(e.key)) return;
      if ([" ", "ArrowDown", "PageDown", "End", "Enter"].includes(e.key)) e.preventDefault();
      lance();
    };
    const surRoue = (e: WheelEvent) => { empeche(e); lance(); };
    const surToucher = (e: TouchEvent) => { empeche(e); lance(); };
    window.addEventListener("wheel", surRoue, { passive: false });
    window.addEventListener("touchmove", surToucher, { passive: false });
    window.addEventListener("keydown", surTouche);
    window.addEventListener("pointerdown", lance);
    bouton.current?.focus({ preventScroll: true });
    // LE CIEL S'OUVRE DE LUI-MÊME. Attendre un geste laissait le visiteur
    // devant un écran de nuages sans message : beaucoup ne cliquaient pas.
    // Un court instant pour voir Nimbo, puis la traversée part seule.
    minuteries.push(setTimeout(lance, 2600));
    return () => {
      window.removeEventListener("wheel", surRoue);
      window.removeEventListener("touchmove", surToucher);
      window.removeEventListener("keydown", surTouche);
      window.removeEventListener("pointerdown", lance);
      minuteries.forEach(clearTimeout);
      html.style.overflow = ancien;
    };
  }, []);

  if (etat === "fini") return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECISION }} />
      <style dangerouslySetInnerHTML={{ __html: cssEnvol() }} />
      {/* Le rideau garde les clics jusqu'à la fin du vol : sinon le toucher
          qui lance la séquence « traversait » et activait le lien caché
          dessous (mesuré : il ouvrait la page d'inscription). */}
      <div className={`ciel-rideau fixed inset-0 z-[60] overflow-hidden${etat === "vol" ? " vol" : ""}`}>
        <div aria-hidden className="cv-fond absolute inset-0" style={{ backgroundColor: "var(--cap-bg)", willChange: "opacity" }} />
        {/* Du plus lointain au plus proche, pour que le proche soit devant. */}
        {[...PLANS].map((pl, i) => ({ pl, i })).reverse().map(({ pl, i }) => (
          <div key={i} aria-hidden className={`cv-plan${i} absolute inset-0`} style={{ willChange: "transform, opacity", transformOrigin: "50% 50%" }}>
            <div className={`cv-souffle${i} absolute inset-0`}>
              {pl.nuages.map((n, k) => (
                // Largeur en vmax : la plus grande dimension de l'écran. En
                // vw, un téléphone en portrait laissait des trous de ciel.
                <div key={k} className="absolute" style={{ left: `${n.x}vw`, top: `${n.y}vh`, width: `${n.w}vmax`, marginLeft: `calc(${n.w / 2}vw - ${n.w / 2}vmax)` }}>
                  <Nuage prioritaire forme={n.f} retourne={n.r} flou={i === 0 ? 3.5 : 2.4} style={{ width: "100%", height: "auto" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Nimbo et le nom, au milieu des nuages : on sait tout de suite où
            l'on arrive. */}
        <div className="cv-invitation pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 pb-[8vh]">
          <Nimbo humeur="salue" taille={132} label="" />
          <p className="text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.03em]"
            style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
            CaptenTDB
          </p>
          <p className="text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>Les marchés, au-dessus des nuages.</p>
        </div>
        {/* L'invitation : un vrai bouton, pour le clavier et les lecteurs d'écran. */}
        <div className="cv-invitation absolute inset-x-0 bottom-[9vh] flex flex-col items-center gap-3">
          <button ref={bouton} type="button"
            className="rounded-full px-5 py-2.5 text-[0.95rem] font-medium outline-none transition-colors focus-visible:ring-2"
            style={{ color: "var(--cap-ink)", backgroundColor: "rgba(255,255,255,0.55)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
            Découvrir CaptenTDB
          </button>
          <span className="text-[0.8rem]" style={{ color: "var(--cap-ink-2)" }}>ou patientez une seconde</span>
          <svg aria-hidden className="cv-fleche" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--cap-ink-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </>
  );
}

/** Le contenu du haut de page se met au point quand le ciel s'ouvre. */
export function MiseAuPoint({ children, className }: { children: React.ReactNode; className?: string }) {
  // À la sortie des nuages, la page arrive en léger zoom et en fondu (CSS).
  return (
    <div className={`cap-mise-au-point ${className ?? ""}`}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-arrivee{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.ciel-intro .cap-mise-au-point{opacity:0}
.ciel-intro.ciel-parti .cap-mise-au-point{animation:cap-arrivee 1.3s cubic-bezier(.16,1,.3,1) both}
.anim-off .cap-mise-au-point{opacity:1;animation:none}` }} />
      {children}
    </div>
  );
}

/**
 * Des nuages au tout premier plan, en bas du premier écran : grands, flous
 * comme ce qui est trop près de l'objectif, ils remontent plus vite que la
 * page quand on défile et passent devant elle. C'est ce qui donne la
 * profondeur — on ne regarde plus un ciel, on est dedans.
 */
export function PremierPlan() {
  const actifs = useEffetsActifs();
  const { scrollY } = useScroll();
  const montee = useTransform(scrollY, [0, 900], [0, -420]);
  if (!actifs) return null;
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[100svh] z-20 h-[60vh] lg:top-[94vh]"
      style={{ y: montee, willChange: "transform" }}>
      {/* La lente dérive est une animation CSS : elle tourne sur la carte
          graphique, sans occuper le JavaScript de la page. */}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-derive-a{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(6%,-4%,0)}}
@keyframes cap-derive-b{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-6%,-4%,0)}}` }} />
      {[
        { left: "-18%", top: "10%", w: "52%", forme: 0, anim: "cap-derive-a 34s ease-in-out infinite" },
        { left: "62%", top: "0%", w: "56%", forme: 2, anim: "cap-derive-b 42s ease-in-out infinite" },
      ].map((n, i) => (
        <div key={i} className="absolute" style={{ left: n.left, top: n.top, width: n.w, opacity: 0.92, animation: n.anim, willChange: "transform" }}>
          <Nuage forme={n.forme} retourne={i === 1} flou={7} style={{ width: "100%", height: "auto" }} />
        </div>
      ))}
    </motion.div>
  );
}

/** Au survol, le bouton lâche quelques bouffées de nuage. */
export function Bouffees({ children, className }: { children: React.ReactNode; className?: string }) {
  const actifs = useEffetsActifs();
  const [salves, setSalves] = useState<number[]>([]);
  const lance = () => {
    if (!actifs) return;
    const id = Date.now();
    setSalves((v) => [...v.slice(-2), id]);
    setTimeout(() => setSalves((v) => v.filter((x) => x !== id)), 1400);
  };
  return (
    <div className={`relative ${className ?? ""}`} onPointerEnter={lance} onFocus={lance}>
      {children}
      {salves.map((id) => (
        <span key={id} aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 9 }, (_, k) => {
            const angle = (k / 9) * Math.PI * 2 + (id % 7);
            const d = 46 + (k % 3) * 16, taille = 22 + (k % 4) * 9;
            return (
              <motion.span key={k} className="absolute left-1/2 top-1/2 rounded-full"
                style={{ width: taille, height: taille, marginLeft: -taille / 2, marginTop: -taille / 2,
                         // Des bords doux par le dégradé lui-même, sans filtre de flou.
                         background: "radial-gradient(circle at 45% 40%, #fff 0%, var(--cap-cloud-mid) 45%, transparent 70%)" }}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0.95 }}
                animate={{ x: Math.cos(angle) * d * 2.2, y: Math.sin(angle) * d, scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.1 + (k % 3) * 0.15, ease: [0.16, 1, 0.3, 1] }} />
            );
          })}
        </span>
      ))}
    </div>
  );
}

/* ── 2. Les mots qui sortent de la brume ──────────────────────────────── */

/**
 * Chaque mot arrive flou, un peu bas et incliné, puis se met au point :
 * comme une lettre qu'on lit à travers une vitre embuée qui s'éclaircit.
 */
export function Mots({ texte, delai = 0, pas = 0.07, className, style }: {
  texte: string; delai?: number; pas?: number; className?: string; style?: React.CSSProperties;
}) {
  // En CSS, pour la même raison que l'ouverture : les mots arrivent pendant
  // que la page démarre, et une animation JavaScript hoquetait alors.
  // Le délai tient compte de l'ouverture du ciel (classe posée avant
  // l'affichage par le script de décision) ; rien ne bouge si les
  // animations sont coupées ou réduites.
  const mots = texte.split(" ");
  return (
    <span className={className} style={{ ...style, perspective: "800px", display: "inline" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-mot{from{opacity:0;transform:translate3d(0,.55em,0) rotateX(55deg)}to{opacity:1;transform:none}}
.cap-mot{display:inline-block;transform-origin:50% 100%;animation:cap-mot .9s cubic-bezier(.16,1,.3,1) calc(var(--d) + .3s) both}
.ciel-intro .cap-mot{opacity:0;animation:none}
.ciel-intro.ciel-parti .cap-mot{animation:cap-mot .9s cubic-bezier(.16,1,.3,1) calc(var(--d) + .1s) both}
.anim-off .cap-mot{animation:none}
@media (prefers-reduced-motion: reduce){.cap-mot{animation:none}}` }} />
      {mots.map((m, i) => (
        <span key={i} className="inline-block whitespace-pre">
          <span className="cap-mot" style={{ ["--d" as string]: `${(delai + i * pas).toFixed(2)}s` }}>{m}</span>
          {i < mots.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ── 3. L'apparition dans la brume (remplace Reveal sur cette page) ───── */

const brume: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.965 },
  shown: { opacity: 1, y: 0, scale: 1 },
};

export function Reveal({ children, delay = 0, className, as = "div" }: {
  children: React.ReactNode; delay?: number; className?: string; as?: "div" | "li" | "span";
}) {
  const actifs = useEffetsActifs();
  const Comp = motion[as];
  // Sans effets : état final, posé explicitement. Le premier rendu se fait
  // toujours avec effets (le mouvement réduit n'est connu qu'ensuite) ; sans
  // ce « shown » forcé, l'élément restait figé à son état caché.
  if (!actifs) return <Comp className={className} variants={brume} initial={false} animate="shown" transition={{ duration: 0 }}>{children}</Comp>;
  return (
    <Comp className={className} variants={brume} initial="hidden" whileInView="shown"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.95, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </Comp>
  );
}

export function RevealGroup({ children, gap = 0.1, delay = 0, className }: {
  children: React.ReactNode; gap?: number; delay?: number; className?: string;
}) {
  const actifs = useEffetsActifs();
  if (!actifs) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap, delayChildren: delay } } }}>
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, as = "div" }: {
  children: React.ReactNode; className?: string; as?: "div" | "li";
}) {
  const actifs = useEffetsActifs();
  const Comp = motion[as];
  if (!actifs) return <Comp className={className} variants={brume} initial={false} animate="shown" transition={{ duration: 0 }}>{children}</Comp>;
  return (
    <Comp className={className} variants={brume} transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </Comp>
  );
}

/* ── 4. La carte qui s'incline sous le curseur ────────────────────────── */

/**
 * Inclinaison 3D qui suit la souris, avec un reflet de lumière qui glisse sur
 * la surface. Sur écran tactile, rien : pas de souris, pas d'inclinaison.
 */
export function Inclinaison({ children, className, force = 9 }: {
  children: React.ReactNode; className?: string; force?: number;
}) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5), py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [force, -force]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-force, force]), { stiffness: 150, damping: 18 });
  const reflet = useTransform([px, py] as MotionValue<number>[], ([x, y]: number[]) =>
    `radial-gradient(600px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.28), transparent 45%)`);
  const [survol, setSurvol] = useState(false);

  if (!actifs) return <div className={className}>{children}</div>;
  return (
    <div style={{ perspective: 1400 }} className={className}>
      <motion.div ref={ref} className="relative" style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width); py.set((e.clientY - r.top) / r.height);
          setSurvol(true);
        }}
        onPointerLeave={() => { px.set(0.5); py.set(0.5); setSurvol(false); }}>
        {children}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]"
          // Pas de mode de fusion : il forçait à recomposer toute la carte à
          // chaque image pendant que les nuages défilaient derrière.
          style={{ background: reflet, opacity: survol ? 0.6 : 0, transition: "opacity 300ms", borderRadius: "var(--cap-r-xl)" }} />
      </motion.div>
    </div>
  );
}

/* ── 5. Le bouton aimanté ─────────────────────────────────────────────── */

export function Aimant({ children, className, force = 0.3 }: {
  children: React.ReactNode; className?: string; force?: number;
}) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 15 }), y = useSpring(0, { stiffness: 220, damping: 15 });
  if (!actifs) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} className={`inline-block ${className ?? ""}`} style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * force);
        y.set((e.clientY - (r.top + r.height / 2)) * force);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}

/* ── 7. La traversée des nuages entre deux sections ───────────────────── */

/**
 * Une rangée de nuages à la frontière de deux sections. En la traversant, elle
 * s'ouvre par le milieu, comme quand l'avion sort de la couche : les nuages
 * de gauche filent à gauche, ceux de droite à droite, et grossissent en
 * passant devant.
 */
const CSS_TRAVERSEE = `.cap-tr{--p:0}
.cap-tr-rang{--t:clamp(0,(var(--p) - var(--p0)) / (var(--p1) - var(--p0)),1);
  transform:translate3d(calc(var(--x0) + (var(--x1) - var(--x0)) * var(--t)),calc((var(--p) - .5) * var(--py)),0) scale(calc(var(--s0) + (var(--s1) - var(--s0)) * var(--t)));
  opacity:calc(var(--om) * min(clamp(0,(var(--p) - var(--oa)) / (var(--ob) - var(--oa)),1),clamp(0,(var(--od) - var(--p)) / (var(--od) - var(--oc)),1)))}
.cap-tr-voile{opacity:calc(.5 * min(clamp(0,(var(--p) - .3) / .15,1),clamp(0,(.62 - var(--p)) / .17,1)))}
@keyframes cap-tr-flotte{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(var(--fx),-1.4vh,0)}}
.cap-tr-flotte{animation:cap-tr-flotte var(--fd) ease-in-out infinite}
.anim-off .cap-tr-flotte{animation:none}`;

/**
 * Trois plans, comme une vraie couche nuageuse vue d'avion : le lointain,
 * petit et pâle, s'écarte à peine ; le milieu s'ouvre ; le proche, flou et
 * grossissant, passe devant et file vers les bords. Chaque plan monte à sa
 * propre vitesse (parallaxe), et chaque nuage flotte doucement sur place.
 *
 * Tout est calculé en CSS à partir d'une seule variable (--p) : il y avait
 * ici douze valeurs animées recalculées en JavaScript à chaque pixel.
 */
const PLANS_TRAVERSEE: {
  cote: "g" | "d"; formes: number[]; largeur: string; flou: number;
  x: [string, string]; s: [number, number]; p: [number, number]; o: [number, number, number, number]; om: number; py: string;
}[] = [
  // Le lointain.
  { cote: "g", formes: [3, 1], largeur: "44%", flou: 7, x: ["4vw", "-26vw"], s: [0.78, 0.95], p: [0.05, 0.85], o: [0.02, 0.2, 0.62, 0.86], om: 0.7, py: "-60px" },
  { cote: "d", formes: [2, 0], largeur: "44%", flou: 7, x: ["-4vw", "26vw"], s: [0.78, 0.95], p: [0.05, 0.85], o: [0.02, 0.2, 0.62, 0.86], om: 0.7, py: "-60px" },
  // Le milieu.
  { cote: "g", formes: [0, 2], largeur: "56%", flou: 3.5, x: ["0vw", "-55vw"], s: [0.85, 1.15], p: [0.12, 0.75], o: [0, 0.2, 0.6, 0.85], om: 1, py: "-110px" },
  { cote: "d", formes: [1, 3], largeur: "56%", flou: 3.5, x: ["0vw", "55vw"], s: [0.85, 1.15], p: [0.12, 0.75], o: [0, 0.2, 0.6, 0.85], om: 1, py: "-110px" },
  // Le proche.
  { cote: "g", formes: [1], largeur: "64%", flou: 5, x: ["-8vw", "-95vw"], s: [1, 1.5], p: [0.25, 0.7], o: [0.2, 0.38, 0.55, 0.72], om: 1, py: "-200px" },
  { cote: "d", formes: [0], largeur: "64%", flou: 5, x: ["8vw", "95vw"], s: [1, 1.5], p: [0.25, 0.7], o: [0.2, 0.38, 0.55, 0.72], om: 1, py: "-200px" },
];

export function Traversee({ hauteur = 560 }: { hauteur?: number }) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  // Hors de l'écran, la traversée n'existe pas : ni nuages ni calcul. Sans
  // ça, les cinq traversées recalculaient leurs douze mouvements à chaque
  // pixel de défilement, même tout en haut de la page.
  const proche = useInView(ref, { margin: "400px 0px 400px 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (proche) ref.current?.style.setProperty("--p", v.toFixed(4));
  });
  useEffect(() => { ref.current?.style.setProperty("--p", scrollYProgress.get().toFixed(4)); }, [proche, scrollYProgress]);

  // La couleur de la section suivante. Deux sections de fonds différents se
  // touchaient sur une ligne droite, et c'est elle qu'on voyait quand les
  // nuages s'écartaient : le ciel semblait coupé net. Un fondu vers cette
  // couleur, sous les nuages, finit exactement à la frontière.
  const [fond, setFond] = useState<string | null>(null);
  useEffect(() => {
    const lire = () => {
      // Sans fond propre, la section laisse voir celui de la page : on le
      // cherche en remontant.
      const vide = (c: string) => !c || c === "rgba(0, 0, 0, 0)" || c === "transparent";
      let e = ref.current?.nextElementSibling as HTMLElement | null;
      let c = e ? getComputedStyle(e).backgroundColor : "";
      e = ref.current?.parentElement ?? null;
      while (vide(c) && e) { c = getComputedStyle(e).backgroundColor; e = e.parentElement; }
      setFond(vide(c) ? null : c);
    };
    lire();
    // Le thème (clair / sombre) change la couleur.
    const obs = new MutationObserver(lire);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => obs.disconnect();
  }, [actifs]);

  if (!actifs) return null;
  return (
    // La bande est aussi haute que les nuages grossis : rien ne dépasse, donc
    // rien n'est coupé net par une ligne droite. Elle chevauche les deux
    // sections voisines (marges négatives) pour ne pas allonger la page.
    <div ref={ref} aria-hidden className="cap-tr pointer-events-none relative z-10 overflow-hidden"
      style={{ height: hauteur, marginTop: -hauteur / 2 + 40, marginBottom: -hauteur / 2 + 40 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_TRAVERSEE }} />
      {fond && (
        <div className="absolute inset-x-0 top-0"
          style={{ height: hauteur / 2 + 40, background: `linear-gradient(to bottom, transparent 38%, ${fond})` }} />
      )}
      {proche && PLANS_TRAVERSEE.map((r, k) => (
        <Fragment key={k}>
          {k === 4 && (
            <div className="cap-tr-voile absolute inset-0"
              style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--cap-cloud-light), transparent 75%)" }} />
          )}
          <div className={`cap-tr-rang absolute top-0 flex h-full items-center ${r.cote === "g" ? "-left-[6%] justify-start" : "-right-[6%] justify-end"}`}
            style={{ width: "72%", willChange: "transform, opacity",
              ["--x0" as string]: r.x[0], ["--x1" as string]: r.x[1], ["--s0" as string]: r.s[0], ["--s1" as string]: r.s[1],
              ["--p0" as string]: r.p[0], ["--p1" as string]: r.p[1], ["--oa" as string]: r.o[0], ["--ob" as string]: r.o[1],
              ["--oc" as string]: r.o[2], ["--od" as string]: r.o[3], ["--om" as string]: r.om, ["--py" as string]: r.py }}>
            {r.formes.map((f, i) => (
              <div key={i} className="cap-tr-flotte" style={{ width: r.largeur, marginLeft: i ? "-16%" : 0, marginTop: i ? "5%" : 0, flexShrink: 0,
                ["--fx" as string]: `${(r.cote === "g" ? -1 : 1) * (0.8 + i * 0.5)}vw`, ["--fd" as string]: `${11 + k * 1.7 + i * 2.3}s` }}>
                <Nuage forme={f} retourne={r.cote === "d"} flou={r.flou} style={{ width: "100%", height: "auto" }} />
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/* ── 8. L'élévation au défilement ─────────────────────────────────────── */

/**
 * La carte du produit arrive couchée, comme vue de loin, et se redresse face
 * au lecteur à mesure qu'il descend.
 */
export function Redressement({ children, className }: { children: React.ReactNode; className?: string }) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(p, [0, 1], [22, 0]);
  const scale = useTransform(p, [0, 1], [0.9, 1]);
  const y = useTransform(p, [0, 1], [60, 0]);
  if (!actifs) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className} style={{ perspective: 1600 }}>
      <motion.div style={{ rotateX, scale, y, transformOrigin: "50% 100%" }}>{children}</motion.div>
    </div>
  );
}

/* ── 9. Le tracé qui suit le défilement ───────────────────────────────── */

export function useProgression(ref: React.RefObject<HTMLElement>, offset: ["start end" | "start center" | "start start", "end center" | "end end" | "center center"] = ["start center", "end center"]) {
  const { scrollYProgress } = useScroll({ target: ref, offset });
  return useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
}

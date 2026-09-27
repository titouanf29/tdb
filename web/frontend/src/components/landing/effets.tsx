"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform, type MotionValue, type Variants } from "framer-motion";
import { useAnimationsEnabled } from "@/components/design-system";
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

/* ── Un nuage ─────────────────────────────────────────────────────────── */

export function Nuage({ forme = 0, retourne, className, style, flou = 2.4, prioritaire }: {
  forme?: number; retourne?: boolean; className?: string; style?: React.CSSProperties; flou?: number; prioritaire?: boolean;
}) {
  // Une image déjà prête : bouger ou grossir un nuage ne le redessine plus.
  return <NuageImage forme={forme} retourne={retourne} flou={flou} className={className} style={style} prioritaire={prioritaire} />;
}

/* ── 1. L'ouverture du ciel ───────────────────────────────────────────── */

type Masse = { x: number; y: number; w: number; forme: number; cote: -1 | 1; retard: number };

/** Trois profondeurs : on sort de la couche comme un avion. */
const PROCHES: Masse[] = [
  { x: -30, y: 20, w: 95, forme: 0, cote: -1, retard: 0 },
  { x: 35, y: 30, w: 100, forme: 2, cote: 1, retard: 0.04 },
  { x: -10, y: 55, w: 90, forme: 1, cote: -1, retard: 0.08 },
];
const MILIEU: Masse[] = [
  { x: -12, y: -6, w: 62, forme: 0, cote: -1, retard: 0.12 },
  { x: 42, y: -8, w: 64, forme: 2, cote: 1, retard: 0.1 },
  { x: -18, y: 32, w: 70, forme: 1, cote: -1, retard: 0.18 },
  { x: 44, y: 28, w: 66, forme: 0, cote: 1, retard: 0.16 },
];
const LOINTAINS: Masse[] = [
  { x: 4, y: 4, w: 40, forme: 2, cote: -1, retard: 0.3 },
  { x: 52, y: 8, w: 44, forme: 3, cote: 1, retard: 0.34 },
];

/**
 * À l'arrivée, l'écran est sous les nuages ; ils s'écartent en 1,7 s et
 * découvrent la page. Une fois par visite : la seconde fois, ce serait
 * attendre pour rien.
 *
 * LES NUAGES SONT LÀ DÈS LE PREMIER AFFICHAGE. Attendre React pour les
 * dessiner laissait voir un ciel vide pendant le chargement, puis faisait
 * surgir les nuages d'un coup. Un petit script lu avant l'affichage décide :
 * déjà vu, animations coupées ou réduites → la classe « ciel-vu » les masque
 * avant même qu'ils soient peints ; sinon il note la visite et laisse jouer.
 */
const DECISION = `try{var d=document.documentElement;var off=localStorage.getItem('tdb_animations')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;if(off)d.classList.add('anim-off');if(off||sessionStorage.getItem('cap_ciel_ouvert')){d.classList.add('ciel-vu')}else{window.__cielJoue=true;sessionStorage.setItem('cap_ciel_ouvert','1')}}catch(e){document.documentElement.classList.add('ciel-vu')}`;

/* L'ouverture en CSS : une fois lancées, ces animations sont confiées à la
   carte graphique et ne dépendent plus du JavaScript de la page — qui, à
   l'arrivée, est justement occupé à démarrer. Pilotées par framer-motion,
   elles hoquetaient à chaque fois que React travaillait. */
function cssOuverture(): string {
  const regle = (cls: string, de: string, a: string, duree: number, delai: number, courbe: string) =>
    `@keyframes ${cls}{from{transform:${de};opacity:1}to{transform:${a};opacity:0}}` +
    `.ciel-rideau .${cls}{transform:${de}}` +
    `.ciel-rideau.ouvre .${cls}{animation:${cls} ${duree}s ${courbe} ${delai}s both}`;
  const out: string[] = [];
  LOINTAINS.forEach((n, i) => out.push(regle(`co-l${i}`, "translate3d(0,0,0)", "translate3d(0,-35vh,0)", 2.1, 0.2 + n.retard, "cubic-bezier(.4,0,.2,1)")));
  MILIEU.forEach((n, i) => out.push(regle(`co-m${i}`, "translate3d(0,0,0) scale(1.12)", `translate3d(${n.cote * 100}vw,0,0) scale(1.55)`, 1.9, 0.15 + n.retard, "cubic-bezier(.7,0,.3,1)")));
  PROCHES.forEach((n, i) => out.push(regle(`co-p${i}`, "translate3d(0,0,0) scale(1.2)", `translate3d(${n.cote * 75}vw,14vh,0) scale(1.8)`, 1.5, 0.1 + n.retard, "cubic-bezier(.55,0,.3,1)")));
  out.push(`@keyframes co-fond{from{opacity:1}to{opacity:0}}.ciel-rideau.ouvre .co-fond{animation:co-fond .9s ease-out .35s both}`);
  out.push(`.ciel-vu .ciel-rideau{display:none}`);
  return out.join("");
}

export function cielEnCours(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __cielJoue?: boolean }).__cielJoue);
}

export function OuvertureDuCiel() {
  const [etat, setEtat] = useState<"attente" | "ouvre" | "fini">("attente");
  const rideau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cielEnCours()) {
      // Arrivée sans rechargement (lien interne) : le script de décision n'a
      // pas tourné ; on pose la classe pour que le titre n'attende pas un
      // ciel qui ne s'ouvrira pas.
      document.documentElement.classList.add("ciel-vu");
      setEtat("fini");
      return;
    }
    let vivant = true;
    let fin: ReturnType<typeof setTimeout> | undefined;
    // ON NE PART QUE QUAND TOUT EST PRÊT. Démarrer l'animation pendant que la
    // page démarre (React) et que les images se décodent, c'était la
    // garantie de saccades à l'arrivée. Le ciel reste couvert, immobile — ce
    // qui ne se voit pas — jusqu'à ce que les nuages soient décodés et que le
    // navigateur ait un instant de libre ; au plus 1,2 s.
    const images = Array.from(rideau.current?.querySelectorAll("img") ?? []);
    const decodees = Promise.all(images.map((i) => i.decode().catch(() => undefined)));
    const delai = new Promise((r) => setTimeout(r, 1200));
    Promise.race([decodees, delai]).then(() => {
      const partir = () => {
        if (!vivant) return;
        setEtat("ouvre");
        fin = setTimeout(() => setEtat("fini"), 2600);
      };
      const w = window as unknown as { requestIdleCallback?: (f: () => void, o: { timeout: number }) => void };
      if (w.requestIdleCallback) w.requestIdleCallback(partir, { timeout: 250 });
      else setTimeout(partir, 60);
    });
    return () => { vivant = false; if (fin) clearTimeout(fin); };
  }, []);

  if (etat === "fini") return null;
  const ouvre = etat === "ouvre";
  const masse = (cls: string, n: Masse, flou: number) => (
    <div key={cls} className={`${cls} absolute`} style={{ left: `${n.x}vw`, top: `${n.y}vh`, width: `${n.w}vw`, willChange: "transform, opacity" }}>
      <Nuage prioritaire forme={n.forme} retourne={n.cote > 0} style={{ width: "100%", height: "auto" }} flou={flou} />
    </div>
  );
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECISION }} />
      <style>{cssOuverture()}</style>
      <div ref={rideau} aria-hidden className={`ciel-rideau pointer-events-none fixed inset-0 z-[60] overflow-hidden${ouvre ? " ouvre" : ""}`}>
        <div className="co-fond absolute inset-0" style={{ backgroundColor: "var(--cap-bg)", willChange: "opacity" }} />
        {/* Au loin, les nuages s'élèvent ; au milieu, la couche s'ouvre par
            le centre ; tout près, on les traverse. */}
        {LOINTAINS.map((n, i) => masse(`co-l${i}`, n, 2.4))}
        {MILIEU.map((n, i) => masse(`co-m${i}`, n, 3))}
        {PROCHES.map((n, i) => masse(`co-p${i}`, n, 4))}
      </div>
    </>
  );
}

/** Le contenu du haut de page se met au point quand le ciel s'ouvre. */
export function MiseAuPoint({ children, className }: { children: React.ReactNode; className?: string }) {
  // Un simple fondu, en CSS, seulement quand le ciel s'ouvre.
  return (
    <div className={`cap-mise-au-point ${className ?? ""}`}>
      <style>{`@keyframes cap-fondu{from{opacity:0}to{opacity:1}}
.cap-mise-au-point{animation:cap-fondu 1.2s cubic-bezier(.22,1,.36,1) 1.4s both}
.ciel-vu .cap-mise-au-point,.anim-off .cap-mise-au-point{animation:none}`}</style>
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
    <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[84vh] z-20 h-[60vh] sm:top-[70vh]"
      style={{ y: montee, willChange: "transform" }}>
      {/* La lente dérive est une animation CSS : elle tourne sur la carte
          graphique, sans occuper le JavaScript de la page. */}
      <style>{`@keyframes cap-derive-a{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(6%,-4%,0)}}
@keyframes cap-derive-b{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-6%,-4%,0)}}`}</style>
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
      <style>{`@keyframes cap-mot{from{opacity:0;transform:translate3d(0,.55em,0) rotateX(55deg)}to{opacity:1;transform:none}}
.cap-mot{display:inline-block;transform-origin:50% 100%;animation:cap-mot .9s cubic-bezier(.16,1,.3,1) calc(var(--d) + 1.9s) both}
.ciel-vu .cap-mot{animation-delay:calc(var(--d) + .3s)}
.anim-off .cap-mot{animation:none}
@media (prefers-reduced-motion: reduce){.cap-mot{animation:none}}`}</style>
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
  if (!actifs) return <Comp className={className}>{children}</Comp>;
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
  if (!actifs) return <Comp className={className}>{children}</Comp>;
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
export function Traversee({ hauteur = 560 }: { hauteur?: number }) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  // Hors de l'écran, la traversée n'existe pas : ni nuages ni calcul. Sans
  // ça, les cinq traversées recalculaient leurs douze mouvements à chaque
  // pixel de défilement, même tout en haut de la page.
  const proche = useInView(ref, { margin: "400px 0px 400px 0px" });
  if (!actifs) return null;
  return (
    // La bande est aussi haute que les nuages grossis : rien ne dépasse, donc
    // rien n'est coupé net par une ligne droite. Elle chevauche les deux
    // sections voisines (marges négatives) pour ne pas allonger la page.
    <div ref={ref} aria-hidden className="pointer-events-none relative z-10 overflow-hidden"
      style={{ height: hauteur, marginTop: -hauteur / 2 + 40, marginBottom: -hauteur / 2 + 40 }}>
      {proche && <CoucheTraversee cible={ref} />}
    </div>
  );
}

function CoucheTraversee({ cible }: { cible: React.RefObject<HTMLDivElement> }) {
  // Directement lié au défilement, sans ressort : le nuage suit le doigt ou
  // la molette au pixel près, et s'arrête avec lui. Un ressort continuait de
  // calculer après l'arrêt et donnait une impression de flottement saccadé.
  const { scrollYProgress: p } = useScroll({ target: cible, offset: ["start end", "end start"] });
  const milieuG = useTransform(p, [0.15, 0.75], ["0vw", "-55vw"]);
  const milieuD = useTransform(p, [0.15, 0.75], ["0vw", "55vw"]);
  const procheG = useTransform(p, [0.25, 0.7], ["-8vw", "-95vw"]);
  const procheD = useTransform(p, [0.25, 0.7], ["8vw", "95vw"]);
  const echMilieu = useTransform(p, [0, 0.75], [0.85, 1.15]);
  const echProche = useTransform(p, [0.2, 0.7], [1, 1.45]);
  const opMilieu = useTransform(p, [0, 0.2, 0.6, 0.85], [0, 1, 0.9, 0]);
  const opProche = useTransform(p, [0.2, 0.38, 0.55, 0.72], [0, 1, 1, 0]);
  const voile = useTransform(p, [0.3, 0.45, 0.6], [0, 0.5, 0]);

  const rangee = (x: MotionValue<string>, echelle: MotionValue<number>, opacite: MotionValue<number>,
                  cote: "g" | "d", formes: number[], largeur: string, flou: number) => (
    <motion.div className={`absolute top-0 flex h-full items-center ${cote === "g" ? "-left-[6%] justify-start" : "-right-[6%] justify-end"}`}
      style={{ x, scale: echelle, opacity: opacite, width: "72%", willChange: "transform, opacity" }}>
      {formes.map((f, i) => (
        <Nuage key={i} forme={f} retourne={cote === "d"} flou={flou}
          style={{ width: largeur, height: "auto", marginLeft: i ? "-16%" : 0, marginTop: i ? "5%" : 0 }} />
      ))}
    </motion.div>
  );
  return (
    <>
      {rangee(milieuG, echMilieu, opMilieu, "g", [0, 2], "56%", 3)}
      {rangee(milieuD, echMilieu, opMilieu, "d", [1, 3], "56%", 3)}
      <motion.div className="absolute inset-0"
        style={{ opacity: voile, background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--cap-cloud-light), transparent 75%)" }} />
      {rangee(procheG, echProche, opProche, "g", [1], "64%", 5)}
      {rangee(procheD, echProche, opProche, "d", [0], "64%", 5)}
    </>
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

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue, type Variants } from "framer-motion";
import { SILHOUETTES, useAnimationsEnabled } from "@/components/design-system";
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

export function Nuage({ forme = 0, retourne, className, style, flou = 2.4 }: {
  forme?: number; retourne?: boolean; className?: string; style?: React.CSSProperties; flou?: number;
}) {
  const id = useId().replace(/:/g, "");
  const { lobes, base } = SILHOUETTES[forme % SILHOUETTES.length];
  return (
    <svg viewBox="0 0 200 100" aria-hidden className={className} style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cap-cloud-light)" />
          <stop offset="55%" stopColor="var(--cap-cloud-mid)" />
          <stop offset="100%" stopColor="var(--cap-cloud-shade)" />
        </linearGradient>
        <filter id={`${id}-s`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={flou} />
        </filter>
      </defs>
      <g filter={`url(#${id}-s)`} fill={`url(#${id}-f)`} transform={retourne ? "translate(200,0) scale(-1,1)" : undefined}>
        <ellipse cx={base[0]} cy={base[1]} rx={base[2]} ry={base[3]} />
        {lobes.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
      </g>
    </svg>
  );
}

/* ── 1. L'ouverture du ciel ───────────────────────────────────────────── */

const RIDEAU: { x: number; y: number; w: number; forme: number; cote: -1 | 1; retard: number }[] = [
  { x: -12, y: -6, w: 70, forme: 0, cote: -1, retard: 0.05 },
  { x: 38, y: -10, w: 74, forme: 2, cote: 1, retard: 0 },
  { x: -20, y: 30, w: 80, forme: 1, cote: -1, retard: 0.12 },
  { x: 40, y: 26, w: 78, forme: 0, cote: 1, retard: 0.08 },
  { x: -8, y: 62, w: 72, forme: 3, cote: -1, retard: 0.18 },
  { x: 36, y: 60, w: 76, forme: 1, cote: 1, retard: 0.14 },
  { x: 12, y: 14, w: 64, forme: 2, cote: -1, retard: 0.22 },
  { x: 20, y: 44, w: 66, forme: 3, cote: 1, retard: 0.26 },
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
const DECISION = `try{var d=document.documentElement;if(sessionStorage.getItem('cap_ciel_ouvert')||localStorage.getItem('tdb_animations')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('ciel-vu')}else{window.__cielJoue=true;sessionStorage.setItem('cap_ciel_ouvert','1')}}catch(e){document.documentElement.classList.add('ciel-vu')}`;

export function cielEnCours(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __cielJoue?: boolean }).__cielJoue);
}

export function OuvertureDuCiel() {
  const [etat, setEtat] = useState<"attente" | "ouvre" | "fini">("attente");

  useEffect(() => {
    if (!cielEnCours()) { setEtat("fini"); return; }
    setEtat("ouvre");
    const t = setTimeout(() => setEtat("fini"), 2300);
    return () => clearTimeout(t);
  }, []);

  if (etat === "fini") return null;
  const ouvre = etat === "ouvre";
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECISION }} />
      <style>{`.ciel-vu .ciel-rideau{display:none}`}</style>
      <div aria-hidden className="ciel-rideau pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ backgroundColor: "var(--cap-bg)" }}
          initial={{ opacity: 1 }} animate={ouvre ? { opacity: 0 } : undefined}
          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }} />
        {RIDEAU.map((n, i) => (
          <motion.div key={i} className="absolute" style={{ left: `${n.x}vw`, top: `${n.y}vh`, width: `${n.w}vw` }}
            initial={{ x: 0, scale: 1.15, opacity: 1 }}
            animate={ouvre ? { x: `${n.cote * 95}vw`, scale: 1.6, opacity: 0 } : undefined}
            transition={{ duration: 1.7, delay: 0.15 + n.retard, ease: [0.65, 0, 0.35, 1] }}>
            <Nuage forme={n.forme} retourne={n.cote > 0} style={{ width: "100%", height: "auto" }} flou={3} />
          </motion.div>
        ))}
      </div>
    </>
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
  const actifs = useEffetsActifs();
  // Si le ciel s'ouvre, les mots attendent qu'il soit à moitié ouvert.
  const [attente] = useState(() => (cielEnCours() ? 0.75 : 0));
  if (!actifs) return <span className={className} style={style}>{texte}</span>;
  const mots = texte.split(" ");
  return (
    <span className={className} style={{ ...style, perspective: "800px", display: "inline" }}>
      {mots.map((m, i) => (
        <span key={i} className="inline-block overflow-visible whitespace-pre">
          <motion.span className="inline-block" style={{ transformOrigin: "50% 100%" }}
            initial={{ opacity: 0, y: "0.55em", rotateX: 55, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: attente + delai + i * pas, ease: [0.16, 1, 0.3, 1] }}>
            {m}
          </motion.span>
          {i < mots.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ── 3. L'apparition dans la brume (remplace Reveal sur cette page) ───── */

const brume: Variants = {
  hidden: { opacity: 0, y: 42, scale: 0.965, filter: "blur(10px)" },
  shown: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
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
    `radial-gradient(600px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.35), transparent 45%)`);
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
          style={{ background: reflet, opacity: survol ? 1 : 0, transition: "opacity 300ms", borderRadius: "var(--cap-r-xl)", mixBlendMode: "soft-light" }} />
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
export function Traversee({ hauteur = 480, centre }: { hauteur?: number; centre?: (p: MotionValue<number>) => React.ReactNode }) {
  const actifs = useEffetsActifs();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const gauche = useTransform(p, [0.15, 0.75], ["0vw", "-55vw"]);
  const droite = useTransform(p, [0.15, 0.75], ["0vw", "55vw"]);
  const echelle = useTransform(p, [0, 0.75], [0.85, 1.15]);
  const opacite = useTransform(p, [0, 0.2, 0.6, 0.85], [0, 1, 0.9, 0]);

  if (!actifs) return null;
  return (
    // La bande est aussi haute que les nuages grossis : rien ne dépasse, donc
    // rien n'est coupé net par une ligne droite — un nuage tranché ne
    // ressemble plus à un nuage. Elle chevauche les deux sections voisines
    // (marges négatives) pour ne pas allonger la page.
    <div ref={ref} aria-hidden className="pointer-events-none relative z-10 overflow-hidden" style={{ height: hauteur, marginTop: -hauteur / 2 + 40, marginBottom: -hauteur / 2 + 40 }}>
      {/* Ce qui se cache derrière la couche, révélé quand elle s'ouvre. */}
      {centre?.(p)}
      {[{ cote: gauche, pos: "-left-[8%]", formes: [0, 2] }, { cote: droite, pos: "-right-[8%]", formes: [1, 3] }].map((g, k) => (
        <motion.div key={k} className={`absolute top-0 flex h-full w-[70%] items-center ${g.pos}`}
          style={{ x: g.cote, scale: echelle, opacity: opacite }}>
          {g.formes.map((f, i) => (
            <Nuage key={i} forme={f} retourne={k === 1} flou={3}
              style={{ width: "58%", height: "auto", marginLeft: i ? "-14%" : 0, marginTop: i ? "6%" : 0 }} />
          ))}
        </motion.div>
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26 });
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

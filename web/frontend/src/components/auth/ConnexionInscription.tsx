"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Button, CaptenLogo, Checkbox, CloudBank, Contours, Field, FormError, LiveBackdrop, Num, Text, TextInput,
} from "@/components/design-system";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

/**
 * Connexion et inscription dans une seule carte, à volet coulissant.
 *
 * Une moitié porte le formulaire, l'autre un volet d'encre qui invite à
 * passer à l'autre formulaire ; quand on accepte, le volet glisse à sa
 * nouvelle place et découvre l'autre formulaire. À l'arrivée, la carte se
 * redresse, le volet entre par son côté, les champs suivent un par un. Un
 * envoi fait patienter le bouton avec trois points ambre ; une erreur fait
 * dire le problème et secoue le formulaire ; une réussite efface l'écran
 * avant de partir vers l'espace.
 *
 * Tout cela dans la charte : Public Sans, l'encre pour le volet, le papier
 * pour la carte, l'ambre pour marquer (le point du bouton, les points
 * d'attente, le bout du trait), le ciel calme des pages d'entrée. Les
 * animations passent par element.animate() et se taisent quand la personne
 * a demandé moins de mouvement ou coupé les animations du site.
 *
 * L'adresse suit le formulaire affiché (/login, /register), sans recharger.
 */

export type ModeAuth = "login" | "signup";

const EASE = "cubic-bezier(.2, .7, .2, 1)";
const SLIDE = "cubic-bezier(.76, 0, .18, 1)";

function animations(): boolean {
  if (typeof window === "undefined" || typeof Element.prototype.animate !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try { if (localStorage.getItem("tdb_animations") === "off") return false; } catch { /* navigation privée */ }
  return true;
}
const large = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
const pointeurFin = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function ConnexionInscription({ initial }: { initial: ModeAuth }) {
  const router = useRouter();
  const [mode, setMode] = useState<ModeAuth>(initial);
  const screen = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const cardBg = useRef<HTMLSpanElement>(null);
  const volet = useRef<HTMLElement>(null);
  const voletBg = useRef<HTMLSpanElement>(null);
  const legal = useRef<HTMLParagraphElement>(null);
  const paneLogin = useRef<HTMLDivElement>(null), paneSignup = useRef<HTMLDivElement>(null);
  const copieLogin = useRef<HTMLDivElement>(null), copieSignup = useRef<HTMLDivElement>(null);
  const paneDe = (m: ModeAuth) => (m === "login" ? paneLogin : paneSignup).current;
  const copieDe = (m: ModeAuth) => (m === "login" ? copieLogin : copieSignup).current;
  const run = useRef(0);
  // Ce qu'on a mesuré juste avant de changer de formulaire, pour faire glisser
  // le volet de son ancienne place à la nouvelle.
  const avant = useRef<{ volet: DOMRect; card: DOMRect; legal: DOMRect; pane: DOMRect; fantome: HTMLElement | null } | null>(null);

  const focaliser = useCallback((m: ModeAuth) => {
    const pane = paneDe(m);
    if (!pane) return;
    // Au doigt, pas de focus sur un champ : le clavier masquerait la moitié de l'écran.
    const cible = pointeurFin() ? pane.querySelector<HTMLElement>("input") : pane.querySelector<HTMLElement>("h1");
    cible?.focus({ preventScroll: true });
    // Les références ne changent pas d'un rendu à l'autre.
  }, []);

  /** Les éléments du formulaire et du volet arrivent l'un après l'autre. */
  const reveler = useCallback((m: ModeAuth, delai = 0) => {
    const pane = paneDe(m);
    if (pane) {
      const items = [...pane.children].flatMap((c) => (c.matches("form") ? [...c.children] : [c])) as HTMLElement[];
      items.forEach((el, i) => el.animate(
        [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
        { duration: 520, delay: delai + i * 48, easing: EASE, fill: "backwards" },
      ));
    }
    const copie = copieDe(m);
    if (copie) {
      [...copie.children].forEach((el, i) => el.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 480, delay: delai + 160 + i * 70, easing: EASE, fill: "backwards" },
      ));
    }
  }, []);

  // L'arrivée : la carte se redresse, le volet entre par son côté, les champs suivent.
  useEffect(() => {
    if (animations()) {
      const cote = initial === "signup" ? -1 : 1;
      top.current?.animate([{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: EASE });
      card.current?.animate(
        [{ opacity: 0, transform: "perspective(1200px) rotateX(18deg) translateY(60px) scale(.94)" }, { opacity: 1, transform: "perspective(1200px) rotateX(0deg) translateY(0) scale(1)" }],
        { duration: 1000, easing: EASE },
      );
      volet.current?.animate(
        [{ opacity: 0, transform: large() ? `translateX(${cote * 70}px)` : `translateY(${cote * -44}px)` }, { opacity: 1, transform: "none" }],
        { duration: 900, delay: 260, easing: EASE, fill: "backwards" },
      );
      legal.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 700, fill: "backwards" });
      reveler(initial, 380);
    }
    focaliser(initial);
  }, [initial, reveler, focaliser]);

  // Le changement de formulaire : le volet glisse et découvre le nouveau formulaire.
  const basculer = useCallback(async (vers: ModeAuth) => {
    if (vers === mode) return;
    const courant = ++run.current;
    try { window.history.replaceState(null, "", vers === "signup" ? "/register" : "/login"); } catch { /* adresse inchangée */ }
    const v = volet.current, cb = cardBg.current, lg = legal.current, ancien = paneDe(mode), copie = copieDe(mode);
    if (!animations() || !v || !cb || !lg || !ancien) {
      setMode(vers);
      return;
    }
    const couvert = large();
    const mesure = (el: Element) => el.getBoundingClientRect();
    const rects = { volet: mesure(v), card: mesure(cb), legal: mesure(lg), pane: mesure(ancien) };
    // Côte à côte, l'ancien formulaire reste en place jusqu'à ce que le volet
    // passe dessus (une copie inerte) ; sur téléphone, il s'efface d'abord.
    const fantome = couvert ? (ancien.cloneNode(true) as HTMLElement) : null;
    const partants = [copie, ...(couvert ? [] : [ancien])].filter(Boolean) as HTMLElement[];
    const anims = partants.map((el) => el.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-10px)" }],
      { duration: 170, easing: "ease-in", fill: "forwards" },
    ));
    await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    anims.forEach((a) => a.cancel());
    if (courant !== run.current) return;
    avant.current = { ...rects, fantome };
    setMode(vers);
  }, [mode]);

  // Juste après le changement : les trajets, à partir des mesures d'avant.
  useLayoutEffect(() => {
    const a = avant.current;
    avant.current = null;
    const v = volet.current, vb = voletBg.current, cb = cardBg.current, lg = legal.current, c = card.current;
    if (!a || !v || !vb || !cb || !lg || !c) return;
    const mesure = (el: Element) => el.getBoundingClientRect();
    const apres = { volet: mesure(v), card: mesure(cb), legal: mesure(lg) };
    const dx = a.volet.left - apres.volet.left;
    const dy = a.volet.top - apres.volet.top;
    const timing = { duration: 780, easing: SLIDE };
    const glisse = v.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], timing);
    // Le fond du volet s'étire dans le sens du trajet, puis reprend sa forme.
    vb.animate([{ transform: "none" }, { transform: Math.abs(dx) > Math.abs(dy) ? "scaleX(1.2)" : "scaleY(1.24)", offset: 0.5 }, { transform: "none" }], timing);
    cb.animate([{ transform: `scaleY(${a.card.height / apres.card.height})` }, { transform: "none" }], timing);
    lg.animate([{ transform: `translateY(${a.legal.top - apres.legal.top}px)` }, { transform: "none" }], timing);
    if (a.fantome) {
      const f = a.fantome;
      const cadre = mesure(c);
      f.hidden = false;
      f.inert = true;
      f.setAttribute("aria-hidden", "true");
      f.querySelectorAll("[id], [for], [name]").forEach((n) => { n.removeAttribute("id"); n.removeAttribute("for"); n.removeAttribute("name"); });
      f.querySelectorAll<HTMLElement>("input, button, a").forEach((n) => { n.tabIndex = -1; });
      Object.assign(f.style, { position: "absolute", zIndex: "1", left: `${a.pane.left - cadre.left}px`, top: `${a.pane.top - cadre.top}px`, width: `${a.pane.width}px`, pointerEvents: "none" });
      c.append(f);
      const retirer = () => f.remove();
      f.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.72 }, { opacity: 0 }], timing).finished.then(retirer, retirer);
    }
    reveler(mode, 200);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
    glisse.finished.then(() => focaliser(mode)).catch(() => {});
  }, [mode, reveler, focaliser]);

  /** Une fois connecté : l'écran s'efface, puis on part vers l'espace. */
  const reussir = useCallback(() => {
    const partir = () => router.push("/dashboard");
    if (!animations() || !card.current || !screen.current) { partir(); return; }
    card.current.animate([{ transform: "none" }, { transform: "translateY(-28px) scale(.97)" }], { duration: 360, easing: EASE, fill: "forwards" });
    screen.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: "ease-in", fill: "forwards" }).finished.then(partir, partir);
  }, [router]);

  return (
    <div ref={screen} className="cap av-screen relative overflow-hidden" data-mode={mode}>
      <Contours className="absolute inset-x-0 top-0 h-[340px] w-full" lines={3} opacity={0.5} />
      <LiveBackdrop clouds={false} opacity={0.4} />
      <CloudBank />

      <header ref={top} className="av-top relative">
        <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="CaptenTDB, accueil" style={{ color: "var(--cap-ink)" }}>
          <CaptenLogo size={22} />
        </Link>
        <LanguageToggle variant="compact" />
      </header>

      <main ref={card} className="av-card relative" aria-live="polite">
        <span ref={cardBg} className="av-card-bg" aria-hidden="true" />

        <div className="av-forms">
          <div ref={paneLogin} className="av-pane" hidden={mode !== "login"}>
            <h1 tabIndex={-1}>Se connecter</h1>
            <p className="av-intro">Reprenez où vous en étiez.</p>
            <FormulaireConnexion onSucces={reussir} />
          </div>
          <div ref={paneSignup} className="av-pane" hidden={mode !== "signup"}>
            <h1 tabIndex={-1}>Créer mon espace</h1>
            <p className="av-intro">Dix mille euros fictifs, les vrais cours, et Nimbo pour expliquer.</p>
            <FormulaireInscription onSucces={reussir} />
          </div>
        </div>

        {/* Le volet : il invite à passer à l'autre formulaire, et glisse à sa place quand on accepte. */}
        <aside ref={volet} className="av-volet" aria-label="Autre formulaire">
          <span ref={voletBg} className="av-volet-bg" aria-hidden="true" />
          <div ref={copieLogin} className="av-volet-copy" hidden={mode !== "login"}>
            <h2>Pas encore de compte ?</h2>
            <p>Dix mille euros fictifs, les vrais marchés, et un guide qui explique chaque décision. Gratuit, sans carte bancaire.</p>
            <BoutonVolet onClick={() => basculer("signup")}>Créer mon compte</BoutonVolet>
          </div>
          <div ref={copieSignup} className="av-volet-copy" hidden={mode !== "signup"}>
            <h2>Déjà un compte ?</h2>
            <p>Vos positions, votre journal et vos analyses vous attendent, dans l&apos;état où vous les avez laissés.</p>
            <BoutonVolet onClick={() => basculer("login")}>Se connecter</BoutonVolet>
          </div>
        </aside>
      </main>

      <p ref={legal} className="av-legal relative">
        <span style={{ color: "var(--cap-ink-3)" }}>Argent virtuel uniquement</span>
        {[
          { href: "/cgu", label: "CGU" },
          { href: "/politique-de-confidentialite", label: "Confidentialité" },
          { href: "/mentions-legales", label: "Mentions légales" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--cap-ink)]" style={{ color: "var(--cap-ink-3)" }}>
            {l.label}
          </Link>
        ))}
      </p>
    </div>
  );
}

/** Le bouton du volet : papier sur l'encre, point ambre, flèche, comme sur l'accueil. */
function BoutonVolet({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="av-ghost group inline-flex h-12 items-center justify-center gap-2.5 rounded-[12px] px-5 text-[0.95rem] font-semibold"
      style={{ backgroundColor: "#F6F2EA", color: "var(--cap-navy)" }}>
      <span aria-hidden className="h-2 w-2 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: "var(--cap-ambre)" }} />
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: "var(--cap-amber-ink)" }} />
    </button>
  );
}

/** Le bouton d'envoi : celui du site, avec trois points ambre pendant l'attente. */
function BoutonEnvoi({ occupe, children }: { occupe: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className={`relative w-full ${occupe ? "av-busy" : ""}`} aria-busy={occupe || undefined}>
      <span className="av-submit-label inline-flex items-center gap-2">{children}</span>
      <span className="av-dots" aria-hidden="true"><i /><i /><i /></span>
    </Button>
  );
}

/** Une adresse e-mail plausible, sans expression régulière gourmande. */
function emailValide(a: string): boolean {
  const i = a.indexOf("@");
  if (i <= 0 || a.indexOf("@", i + 1) !== -1 || /\s/.test(a)) return false;
  const domaine = a.slice(i + 1);
  const point = domaine.lastIndexOf(".");
  return point > 0 && domaine.length - point - 1 >= 2;
}
function erreurDeLEmail(a: string): string {
  if (!a) return "Indiquez votre adresse e-mail.";
  return emailValide(a) ? "" : "Cette adresse e-mail n'est pas valide (exemple : vous@exemple.com).";
}
function erreurDuPseudo(p: string): string {
  if (!p) return "Choisissez un pseudo.";
  if (p.length < 3) return "Trop court : 3 caractères au moins.";
  if (p.length > 30) return "Trop long : 30 caractères au plus.";
  if (!/^[A-Za-zÀ-ÿ0-9_.\- ]+$/.test(p)) return "Le pseudo ne peut contenir que des lettres, des chiffres, des espaces et les signes . - _";
  return "";
}
function erreurDuMotDePasse(p: string): string {
  if (!p) return "Choisissez un mot de passe.";
  if (p.length < 8) return `Trop court : 8 caractères au moins (encore ${8 - p.length}).`;
  if (!/[A-Za-z]/.test(p)) return "Ajoutez au moins une lettre.";
  if (!/\d/.test(p)) return "Ajoutez au moins un chiffre.";
  if (new TextEncoder().encode(p).length > 72) return "Trop long : raccourcissez-le un peu.";
  return "";
}
function erreurDeConfirmation(c: string, p: string): string {
  if (!c) return "Retapez le mot de passe.";
  return c === p ? "" : "Les deux mots de passe ne correspondent pas.";
}

/** Secoue le formulaire quand une erreur arrive. */
function secouer(form: HTMLFormElement | null) {
  if (!form || !animations()) return;
  form.animate([0, -9, 7, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: "ease-out" });
}

function FormulaireConnexion({ onSucces }: { onSucces: () => void }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [essaye, setEssaye] = useState(false);
  const adresse = email.trim();
  const erreurEmail = erreurDeLEmail(adresse);
  const erreurMdp = password ? "" : "Indiquez votre mot de passe.";

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occupe) return;
    setError("");
    setEssaye(true);
    if (erreurEmail || erreurMdp) {
      document.getElementById(erreurEmail ? "login-email" : "login-password")?.focus();
      secouer(form.current);
      return;
    }
    setOccupe(true);
    try {
      await login(adresse, password, rememberMe);
      onSucces();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
      secouer(form.current);
      setOccupe(false);
    }
  };

  return (
    <form ref={form} onSubmit={envoyer} className="av-form" noValidate>
      {error && <FormError>{error}</FormError>}
      <Field label="Adresse e-mail" htmlFor="login-email" error={essaye && erreurEmail ? erreurEmail : undefined}>
        <div className="av-champ">
          <TextInput id="login-email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com"
            autoComplete="email" required invalid={!!error || !!(essaye && erreurEmail)} />
        </div>
      </Field>
      <Field label="Mot de passe" htmlFor="login-password" error={essaye && erreurMdp ? erreurMdp : undefined}>
        <div className="av-champ">
          <TextInput id="login-password" type="password" value={password} onChange={setPassword} placeholder="••••••••"
            autoComplete="current-password" required invalid={!!error || !!(essaye && erreurMdp)} />
        </div>
      </Field>
      <div className="-mt-2 flex justify-end">
        <Link href="/forgot-password" className="inline-flex min-h-[44px] items-center text-[0.84rem] underline underline-offset-2 transition-colors hover:text-[color:var(--cap-ink)]" style={{ color: "var(--cap-ocean)" }}>
          Mot de passe oublié ?
        </Link>
      </div>
      <Checkbox checked={rememberMe} onChange={setRememberMe}>Rester connecté sur cet appareil</Checkbox>
      <BoutonEnvoi occupe={occupe}>Ouvrir mon espace</BoutonEnvoi>
    </form>
  );
}

function FormulaireInscription({ onSucces }: { onSucces: () => void }) {
  const { register } = useAuth();
  const { t } = useLanguage();
  const form = useRef<HTMLFormElement>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [touches, setTouches] = useState<Record<string, boolean>>({});
  const [essaye, setEssaye] = useState(false);
  const vu = (champ: string) => essaye || touches[champ];
  const toucher = (champ: string) => setTouches((x) => ({ ...x, [champ]: true }));

  // Les mêmes règles que le serveur, dites sous chaque champ.
  const pseudo = username.trim().replace(/\s+/g, " ");
  const erreurPseudo = erreurDuPseudo(pseudo);
  const adresse = email.trim();
  const erreurEmail = erreurDeLEmail(adresse);
  const erreurMdp = erreurDuMotDePasse(password);
  const erreurConfirm = erreurDeConfirmation(confirm, password);
  const montreMdp = password.length > 0 || essaye;
  const montreConfirm = confirm.length > 0 || essaye;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occupe) return;
    setError("");
    setEssaye(true);
    // TOUT CE QUI MANQUE, D'UN COUP, case comprise. Le bandeau ne disait que
    // la première erreur et la case oubliée n'apparaissait qu'une fois les
    // champs corrigés : un visiteur a eu l'impression d'être refusé deux fois.
    const manques = [
      ["reg-username", "le pseudo", erreurPseudo], ["reg-email", "l'adresse e-mail", erreurEmail],
      ["reg-password", "le mot de passe", erreurMdp], ["reg-confirm", "la confirmation", erreurConfirm],
      ["reg-accepte", "les conditions", accepted ? "" : "cochez la case pour les accepter"],
    ].filter(([, , m]) => m);
    if (manques.length > 0) {
      const liste = manques.map(([, quoi, m]) => `${quoi} (${m.charAt(0).toLowerCase()}${m.slice(1).replace(/\.$/, "")})`);
      setError(manques.length === 1
        ? `Il manque ${liste[0]}.`
        : `Il manque ${manques.length} choses : ${liste.join(", ")}.`);
      document.getElementById(manques[0][0])?.focus();
      secouer(form.current);
      return;
    }
    setOccupe(true);
    try {
      await register(adresse, password, pseudo, pseudo);
      onSucces();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
      secouer(form.current);
      setOccupe(false);
    }
  };

  return (
    <form ref={form} onSubmit={envoyer} className="av-form" noValidate>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3.5 py-3"
        style={{ borderRadius: "var(--cap-r-md)", backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
        <Num className="whitespace-nowrap text-[1.05rem] font-medium">10 000 €</Num>
        <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>virtuels, crédités à l&apos;ouverture</span>
      </div>
      {error && <FormError>{error}</FormError>}
      <Field label="Nom d'utilisateur" htmlFor="reg-username" hint="3 à 30 caractères : lettres, chiffres, espaces, . - _"
        error={vu("pseudo") && erreurPseudo ? erreurPseudo : undefined}>
        <div className="av-champ">
          <TextInput id="reg-username" value={username} onChange={setUsername} onBlur={() => toucher("pseudo")} placeholder="votre pseudo"
            autoComplete="username" required invalid={!!(vu("pseudo") && erreurPseudo)} />
        </div>
      </Field>
      <Field label="Adresse e-mail" htmlFor="reg-email" hint="Elle ne sert qu'à votre compte : pas de newsletter, pas de publicité, jamais vendue ni cédée."
        error={vu("email") && erreurEmail ? erreurEmail : undefined}>
        <div className="av-champ">
          <TextInput id="reg-email" type="email" value={email} onChange={setEmail} onBlur={() => toucher("email")} placeholder="vous@exemple.com"
            autoComplete="email" required invalid={!!(vu("email") && erreurEmail)} />
        </div>
      </Field>
      <Field label="Mot de passe" htmlFor="reg-password" hint="8 caractères au moins, avec une lettre et un chiffre"
        error={montreMdp && erreurMdp ? erreurMdp : undefined}>
        <div className="av-champ">
          <TextInput id="reg-password" type="password" value={password} onChange={setPassword} placeholder="••••••••"
            autoComplete="new-password" required invalid={!!(montreMdp && erreurMdp)} />
        </div>
      </Field>
      <Field label="Confirmer le mot de passe" htmlFor="reg-confirm" error={montreConfirm && erreurConfirm ? erreurConfirm : undefined}>
        <div className="av-champ">
          <TextInput id="reg-confirm" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••"
            autoComplete="new-password" required invalid={!!(montreConfirm && erreurConfirm)} />
        </div>
      </Field>
      <Checkbox id="reg-accepte" checked={accepted} onChange={setAccepted} invalid={essaye && !accepted}>
        J&apos;accepte les{" "}
        <Link href="/cgu" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>conditions d&apos;utilisation</Link>{" "}
        et la{" "}
        <Link href="/politique-de-confidentialite" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>politique de confidentialité</Link>
        , et je confirme avoir au moins 18 ans.
      </Checkbox>
      <BoutonEnvoi occupe={occupe}>Créer mon compte</BoutonEnvoi>
      <Text size="caption" tone="faint">
        CaptenTDB est une plateforme éducative. Aucune somme réelle ne transite par le site et aucun conseil en investissement n&apos;est fourni.
      </Text>
    </form>
  );
}

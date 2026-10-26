import { CHAPITRES, ORDRE, fiche } from "./catalogue";

/**
 * Les leçons portent le numéro de leur vidéo (l'adresse /lecon/28 est celle
 * qu'on donne sur TikTok), mais ce numéro ne dit rien à qui suit le parcours
 * dans l'ordre logique. Dans le texte, « leçon 16 » devient donc le titre de
 * la leçon, avec un lien ; à l'écran, on numérote dans le chapitre.
 */

const titre = (n: number) => fiche(n)?.court;

function remplacer(texte: string, lien: boolean): string {
  const nom = (n: number) => {
    const t = titre(n);
    if (!t) return null;
    return lien ? `« <a href="/lecon/${n}" class="cap-lien">${t}</a> »` : `« ${t} »`;
  };
  return texte
    .replace(/\bleçons (\d{1,2}) à (\d{1,2})\b/g, (m, a, b) => {
      const x = nom(Number(a)), y = nom(Number(b));
      return x && y ? `leçons ${x} à ${y}` : m;
    })
    .replace(/\bleçons (\d{1,2}) et (\d{1,2})\b/g, (m, a, b) => {
      const x = nom(Number(a)), y = nom(Number(b));
      return x && y ? `leçons ${x} et ${y}` : m;
    })
    .replace(/\bleçon (\d{1,2})\b/g, (m, a) => {
      const x = nom(Number(a));
      return x ? `leçon ${x}` : m;
    });
}

/** Pour du HTML : les renvois deviennent des liens vers la leçon. */
export const lier = (html: string) => remplacer(html, true);
/** Pour du texte brut (le quiz) : le titre, sans lien. */
export const nommer = (texte: string) => remplacer(texte, false);

/** La place d'une leçon dans son chapitre : « leçon 3 sur 7 ». */
export function place(numero: number): { chapitre: number; titreChapitre: string; rang: number; total: number } | null {
  const k = CHAPITRES.findIndex((c) => c.lecons.includes(numero));
  if (k < 0) return null;
  const c = CHAPITRES[k];
  return { chapitre: k, titreChapitre: c.titre, rang: c.lecons.indexOf(numero) + 1, total: c.lecons.length };
}

/** Le rang dans tout le parcours, de 1 à N. */
export const rangGlobal = (numero: number) => ORDRE.indexOf(numero) + 1;

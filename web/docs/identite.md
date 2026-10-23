# L'identité de CaptenTDB

**Une publication sous les nuages.** Le site se lit comme un journal
financier sérieux, écrit en français, posé dans un ciel clair. Il ne
ressemble pas à un modèle de site : chaque élément ci-dessous remplace un
réflexe de modèle générique, et c'est cette liste qui fait l'identité.

Les règles vivent dans le code : `web/frontend/src/styles/capten.css` (tout le
site, sous `.cap`) et `src/components/landing/vitrine.css` (page de
présentation seulement).

---

## La voix

| Élément | La règle | À la place de |
|---|---|---|
| Titres | **Bodoni Moda**, la Didone de la presse financière ; optique automatique pour le grand titre, optique 14 dessous | une sans-serif grasse partout ; Fraunces, Playfair, Instrument Serif |
| Texte | **Schibsted Grotesk**, grotesque dessinée pour un groupe de presse | Inter, Plus Jakarta Sans, DM Sans, Geist, Space Grotesk |
| Chiffres | Schibsted en chiffres tabulaires (seuls les chiffres sont tabulaires, la virgule et le point gardent leur chasse) ; **Bodoni Moda** pour les grands montants | une police de terminal |
| Étiquettes | italique serif, précédée d'un trait ambre (ou du numéro de chapitre sur la page de présentation) | petites capitales espacées |
| Ponctuation | virgule, deux-points ou point ; décimales à la virgule ; espace fine avant les milliers | tirets cadratins ; « 1.42 % » |

## La couleur

- **L'encre** (`--cap-navy`, `--cap-ink`) : le texte et le bouton principal.
- **Le ciel** : des fonds clairs, les nuages, des feuilles légèrement
  translucides qui les laissent passer.
- **L'ambre** (`--cap-ambre`, `#e5a83a`) : le soleil du logo. Il sert à une
  seule chose, **marquer** : le point du bouton principal, le trait sous
  l'option choisie, le soulignement d'un lien, un chiffre mis en avant. Jamais
  en aplat, jamais en fond de bouton.
- Vert et rouge : seulement pour une hausse ou une baisse.

## Les éléments signature

1. **La ligne datée** (`<LigneDatee />` dans un `.cap-dateline`) : « Samedi
   17 octobre, 18 h 21. Paris et New York sont fermés, la crypto cote. » Elle
   ouvre la page de présentation et l'accueil connecté, comme la date en tête
   d'un journal.
2. **Le bouton principal** : encre, point ambre à gauche, flèche. Le
   secondaire n'est pas une boîte : un lien souligné d'ambre.
3. **Le trait ambre** sous ce qui est choisi : onglets, sélecteurs, menu. Pas
   de pastille grise.
4. **Les chapitres** : sur la page de présentation, chaque section porte son
   numéro en chiffres romains.
5. **Le sommaire** (`.cap-sommaire`) : une liste de parties s'écrit comme une
   table des matières (numéro italique, titre, points de conduite, texte).
   Pas de grille d'icônes dans des carrés arrondis.
6. **Les questions-réponses** (`.cap-qr`) : composées comme un entretien,
   « Q. » en ambre, réponses visibles. Pas d'accordéon à « + ».
7. **Les chiffres dans le texte** (`.cap-chiffre`) : écrits dans une phrase,
   surlignés d'ambre, plutôt qu'un bandeau de cases.
8. **Nimbo** : un guide discret, qui explique. Petit, jamais une mascotte qui
   occupe l'écran.

## Ce qu'on ne fait pas

- Badge pilule au-dessus d'un titre, rangée de coches « Gratuit · Sans carte ·
  … », triade séparée par des points médians.
- Cartes blanches identiques avec ombre portée, partout.
- Grille de fonctionnalités à icônes, FAQ en accordéon.
- Boutons secondaires bordés de gris avec une icône.
- Le même gabarit (étiquette, titre en deux lignes, paragraphe, widget à
  droite) répété de section en section.
- Un ton enjoué ou des emojis : le site reste sérieux.

## Avant de livrer un écran

- Lire la page à voix haute : est-ce qu'elle sonne comme un journal, ou comme
  un modèle ?
- L'ambre marque-t-il quelque chose de précis, et seulement ça ?
- Aucun tiret cadratin, des nombres à la française.

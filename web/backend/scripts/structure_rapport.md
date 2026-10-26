# Moteur de structure / Fibonacci / confluence — rapport de mesure (v1.0, septembre 2026)

## Ce qui a été construit

| Module | Rôle | Réutilise |
|---|---|---|
| `api/routes/_structure.py` | swings à 3 échelles (mineure k=3 / ≥2 ATR, intermédiaire k=5 / ≥3 ATR, majeure k=10 / ≥6 ATR), structure HH/HL/LH/LL et rupture, jambe active (candidat vs confirmé), retracements 23,6–78,6 %, extensions 127,2–261,8 %, zones ±0,25 ATR, âge, confiance explicable, marché bruité | `_figures.pivots()`, `_indicators.atr_wilder()`, `_scoring.resample_ohlcv()` / `HIGHER_TF` |
| `api/routes/_confluence.py` | 9 familles à une voix chacune (FIBONACCI, MULTI_UNITES, SUPPORT_RESISTANCE, STRUCTURE, TENDANCE, MOMENTUM, VOLUME, VOLATILITE, PRIX), confirmations ET contradictions, clusters multi-échelles/multi-unités sans chaînage, situations A–E du brief | sortie de `compute_score()` (RSI, MACD, OBV, CMF, ADX/DI, EMA, percentile de volatilité) — rien n'est recalculé |
| `analysis.py` | bloc `contexte_technique` (versionné, `shadow: true`, `poids: 0`) dans la réponse | ~15 ms par analyse ; absent du scanner |

Score officiel : **inchangé** (vérifié en comparant l'ancien et le nouveau serveur sur 8 actifs / 6 unités, à prix égal).

## Causalité (pas de regard vers le futur, pas de repainting)

`tests/test_structure.py` (14 tests) :
- un pivot confirmé n'est jamais modifié ni supprimé par l'arrivée de bougies futures ;
- remplacer tout le futur par des valeurs absurdes ne change pas la lecture à la date t ;
- **marche aléatoire** : être dans une zone de repli d'une jambe haussière n'annonce pas la hausse (~50 %, dans ±3 erreurs-types) — une fuite du futur ferait échouer ce test ;
- la fin de jambe « candidate » (extrême en cours, pas encore confirmé) est signalée : c'est le seul élément qui évolue, et il s'allonge sans réécrire le passé.

## Méthode

`scripts/mesurer_structure.py` rejoue chaque date du panel de 40 actifs (actions, indices, or/pétrole/argent, FX, crypto) avec l'historique TRONQUÉ à cette date et les fonctions de production (score, portes, plan de l'écran, `contexte_technique`). `scripts/analyser_structure.py` découpe l'historique de chaque actif en trois périodes successives (40 / 30 / 30 %). Aucun réglage n'a été choisi sur les données (tous fixés a priori) : un effet n'est retenu que s'il garde son signe et dépasse deux erreurs-types sur les périodes 2 ET 3. Les erreurs-types sont corrigées du chevauchement des horizons (× √(horizon / pas)) — sans cette correction, trois effets de hasard passaient le seuil en journalier.

Unités : 1 h (Day Trading, 40 077 dates), journalier (Swing, 20 772), 3 jours (13 247), hebdomadaire (Long terme, 9 878).

## Résultats

**① A/B sur les achats du moteur** (BASE, BASE + FIB, BASE + CONFLUENCE, BASE + FIB + CONTEXTE) : aucune différence qui tienne. En journalier, les achats du moteur dans une zone de repli sont trop rares pour conclure (31 sur la période 1, moins ensuite) ; hors zone, ils rapportent comme l'ensemble. En 1 h, filtrer par la confluence (sans B ni E) ne sort pas l'intraday de sa perte (−0,09 / −0,19 / −0,07 R contre −0,08 / −0,16 / −0,13 R). « ≥ 3 familles alignées » : +0,14 / −0,01 / +0,14 R en 1 h, dans le bruit.

**② Réaction aux zones sans le moteur** (rendement futur en ATR, zone de repli 38,2–61,8 % d'une jambe haussière contre les autres positions dans la correction) : aucun effet stable à +5, +10, +20 ou +50 bougies, dans aucune unité. Aucun ratio (38,2 / 50 / 61,8 / 78,6 %) ne se distingue de façon stable.

**③ Par régime, classe d'actifs, volatilité, force de tendance, structure intacte ou rompue** : aucun sous-groupe stable.

**④ À score égal** (l'information est-elle NOUVELLE par rapport au moteur ?) : non — aucune tranche de score où la zone change le résultat de façon stable.

## Conclusion

Sur ce panel, les zones de Fibonacci, leurs clusters et la confluence par familles **n'apportent pas d'information stable** pour décider d'un trade, en plus de ce que le moteur sait déjà. Conformément au brief (« si Fibonacci n'améliore pas suffisamment le système : ne pas l'intégrer au score principal ») :

- `poids` reste à **0** et `FIBONACCI_SHADOW_MODE` à **True** ;
- le moteur reste en place, calculé et testé : il DÉCRIT la géométrie du mouvement (jambe, phase, retracement, structure intacte ou rompue, contradictions) sans prétendre prédire ;
- la mesure se relance à l'identique (`mesurer_structure.py` puis `analyser_structure.py`) quand l'historique aura grandi.

## Proposition

1. **Pas d'intégration au score.**
2. **Utilisation comme contexte descriptif**, avec la mesure dite honnêtement : par exemple dans les « Compléments » de l'analyse (« Correction de 40 % de la dernière hausse (309,90 → 345,34), sur le 38,2 % ; structure HH/HL intacte »), et comme données structurées pour l'assistant IA — sans jamais la présenter comme un signal.
3. Les modules d'extension prévus par le brief (éventails, zones temporelles, harmoniques) ne sont **pas** justifiés tant que le noyau ne montre rien.

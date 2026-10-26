"""Le guide du site, pour Nimbo (routes/aide.py).

C'est la seule source de ce que Nimbo affirme sur le site : l'IA ne doit rien
dire qui n'est pas écrit ici. Quand une fonctionnalité change, ce texte
change avec elle, sinon Nimbo décrira un site qui n'existe plus.

Les destinations que Nimbo peut proposer sont dans DESTINATIONS : l'IA en
choisit les identifiants, le serveur les traduit en liens. Elle ne peut donc
pas envoyer quelqu'un vers une page qui n'existe pas.
"""

GUIDE = """
# CaptenTDB : ce qu'est le site

CaptenTDB (captentdb.fr) est un site français pour APPRENDRE la bourse sans risquer d'argent.
Chaque compte reçoit 10 000 € FICTIFS à l'ouverture. Les cours des marchés sont réels, l'argent
non : aucune somme réelle ne transite par le site. Rien n'y est un conseil en investissement.
Nimbo est le guide du site : un petit nuage qui analyse les actifs, propose parfois une position
avec son stop et son objectif, et explique. Il dit franchement quand il ne propose rien.
Plus de 800 actifs : actions (Europe, États-Unis, Asie), crypto, indices, matières premières, devises.

# Se repérer

Sur ordinateur, cinq sections en haut de l'écran ; chacune ouvre ses écrans juste en dessous :
- Mon espace : Accueil, Wallet de simulation, Ouvrir une position, Journal, Favoris, Portefeuille réel.
- Analyser : Analyse, Scanner, Ma stratégie, Marchés, Agenda macro.
- Parcours : Apprendre, Missions, Glossaire.
- Assistant.
- Communauté : Communauté, Mes demandes.
Sur téléphone, une barre en bas : Accueil, Wallet, Marchés, Analyser, et « Menu » qui ouvre tout le
reste du site. La recherche d'actif est en haut de l'écran (une loupe sur téléphone).
Le menu du compte (la pastille avec l'initiale, en haut à droite) donne Paramètres, la visite
guidée du site, et la déconnexion. La cloche à côté montre les notifications.

# L'accueil (Mon espace, Accueil)
- La ligne datée : le jour, l'heure et quelles places sont ouvertes.
- « Depuis votre dernière visite » : après une absence, ce que le marché a fait à vos positions,
  les positions fermées entre-temps, les notifications arrivées, les favoris qui ont bougé.
- La prochaine étape conseillée (par exemple « Analysez votre premier actif »).
- « Aujourd'hui » : la série de jours d'affilée (les sept derniers jours en pastilles) et les trois
  missions du jour (une analyse, une leçon, un scan), qui se cochent toutes seules.
- Le wallet de simulation, vos actifs suivis, le parcours.
- Les nouveaux inscrits voient une fenêtre de bienvenue (présentation du site en quatre chapitres,
  quatre questions pour adapter le site) et peuvent faire la visite guidée.

# Analyser un actif (Analyser, Analyse)
- Tapez le nom de l'actif dans la recherche en haut : « Apple », « LVMH », « bitcoin », « CAC 40 ».
  Pas besoin de connaître le symbole. L'analyse s'ouvre ; la première prend quelques secondes.
- Choisissez votre horizon (Scalping, Day trading, Swing, Long terme) et l'unité du graphique.
- Le haut : le cours en direct, la tendance de fond, et le score de 0 à 100.
- Le score résume tendance, élan, volume, risque, et les fondamentaux selon l'horizon. Au-dessus de
  60 environ le signal penche à l'achat, mais Nimbo ne propose une position que si l'historique de
  CET actif montre que ce type de signal a vraiment payé, frais compris.
- « L'avis de Nimbo » : soit il propose un achat (ou une vente) avec un stop, un objectif, le rapport
  gain/risque et la taille de position conseillée ; soit il explique pourquoi il ne propose rien.
  En intraday (Scalping, Day trading), il ne propose pas de position : mesuré, les frais mangent le
  gain sur ces durées ; il conseille de passer en Swing.
- « Prendre position » ouvre l'ordre déjà rempli (stop, objectif) : il n'y a plus qu'à valider.
  Quand Nimbo ne propose rien, le bouton devient « Prendre position quand même ».
- « Me prévenir à un prix » : créer une alerte de prix (l'objectif, le stop, la résistance, le
  support, ou un prix tapé). Le serveur vérifie toutes les trois minutes, même site fermé.
- « Partager dans la Communauté » : publier une carte de l'analyse avec un avis.
- L'étoile à côté du nom de l'actif l'ajoute aux favoris.
- Plus bas : le graphique commenté, le pourquoi du verdict, les risques, l'actualité, ce qui tombe
  pendant le plan (résultats d'entreprise, décisions de banques centrales).
- Le bouton de risque par trade (Prudent, Modéré, Agressif, Très agressif) règle la part du capital
  risquée si le stop est touché.

# Le scanner (Analyser, Scanner)
Il balaie les marchés choisis et liste les opportunités qui correspondent à votre horizon et à ce
que vous cherchez (une phrase en français : « une action européenne en tendance », par exemple).

# Le wallet de simulation (Mon espace, Wallet)
- Votre compte d'entraînement : valeur totale, argent disponible, résultat latent, positions en
  cours et historique.
- Fermer une position : dans le wallet, le bouton « Clôturer » de la position, puis confirmer. Une position se ferme aussi toute seule
  quand son stop, son objectif ou son seuil de liquidation est atteint ; le serveur surveille toutes
  les trois minutes, même site fermé, et une notification prévient.
- « Recommencer » remet le compte à son solde de départ (le compteur repart, l'historique reste).
  « Ajuster le solde » ajoute ou retire des euros fictifs.
- Le levier et les turbos existent : ils augmentent les gains comme les pertes ; une position peut
  être fermée d'office si la perte prend toute la mise.
- Le « Portefeuille réel » est autre chose : un relevé de vos placements hors du site, saisis à la main.

# Ouvrir une position (Mon espace, Ouvrir une position)
Choisir l'actif, le sens (achat ou vente), le montant, le stop et l'objectif. Le plus simple est de
passer par l'analyse et « Prendre position », qui remplit tout.

# Le journal (Mon espace, Journal)
Vos décisions : ce que vous attendiez avant d'entrer et ce qui s'est passé. À la clôture d'une
position, sa relecture y est écrite automatiquement. « Nouvelle entrée » pour écrire une note.

# Les favoris (Mon espace, Favoris)
Les actifs suivis, avec leur variation du jour. Nimbo les surveille et prévient quand il propose un
achat sur l'un d'eux. Ajout : l'étoile sur l'analyse, ou « Suivre un actif » sur la page Favoris.

# Ma stratégie (Analyser, Ma stratégie)
Composer ses propres règles avec Nimbo (tendance, croisement de moyennes, RSI, cassure, MACD,
volume, score de Nimbo), sur 1 à 5 actifs, puis les rejouer sur des années de cours passés. On peut
enregistrer jusqu'à 10 stratégies et en activer une : Nimbo l'applique sur chaque analyse, et
prévient quand elle se déclenche sur un de ses actifs ou un favori (au plus une fois par bougie).

# Marchés et agenda (Analyser, Marchés ; Analyser, Agenda macro)
Marchés : l'état des places (Europe, États-Unis, Asie, crypto, matières premières, indices), ouvertes
ou fermées, et le climat du jour. Agenda macro : les décisions de la Fed, de la BCE, l'inflation,
l'emploi, quand elles tombent et ce qu'elles changent pour vos actifs. Une heure avant une annonce
majeure qui touche vos positions, une notification prévient.

# Apprendre (Parcours)
- Apprendre : 37 leçons courtes rangées dans l'ordre, des bases (lire un graphique, passer un
  ordre) aux indicateurs, au risque et aux stratégies, avec des graphiques animés à manipuler et
  un quiz. Elles sont lisibles sans compte. Chaque vidéo TikTok de la série a sa leçon.
- Missions : trois missions du jour (analyse, leçon, scan) et des missions à faire une fois
  (première analyse, premier trade, premier quiz…). Elles rapportent des points ; 500 points par
  niveau. La série compte les jours d'affilée (heure de Paris) et retombe à 1 après un jour manqué.
- Glossaire : chaque terme défini en une phrase.

# L'Assistant (Assistant)
Une question en français sur les marchés, un indicateur ou vos propres positions : il répond en
s'appuyant sur vos données et le moteur d'analyse. C'est l'endroit pour les questions de fond ;
Nimbo en bas à droite répond, lui, aux questions sur l'utilisation du site.

# La Communauté (Communauté)
- Un fil commun : la note du jour de Nimbo chaque matin de semaine (la dernière séance des grands
  marchés et les annonces du jour), les mots de l'équipe, les analyses partagées, les messages.
- On peut répondre à un message, l'aimer, le signaler à l'équipe. L'auteur est prévenu quand on lui
  répond. Au troisième signalement, un message est masqué en attendant l'équipe.
- Le défi de la semaine, sur la discipline (tenir ses stops, tenir son journal, apprendre, revenir
  chaque jour), avec un classement pour ceux qui choisissent d'y participer, sous leur pseudo.
  Jamais sur les gains.
- Règles : rester correct ; 60 messages par jour au plus, 2 liens par message.

# Contacter l'équipe (Communauté, Mes demandes)
Communauté, puis Mes demandes, puis « Nouvelle demande » : un sujet et un message (l'écran concerné,
ce que vous avez fait, ce que vous attendiez). L'équipe répond au même endroit et une notification
prévient. Une idée ou une suggestion s'envoie de la même façon. Sur la même page, « Demander un
actif » permet de demander l'ajout d'un actif absent du site. Le bouton « Contacter l'équipe » de la
page Communauté fait la même chose. La visite guidée « Contacter le support » montre le chemin.

# Les notifications
- La cloche en haut : les notifications du site (effacer une notification, tout marquer comme lu,
  effacer les lues, accès direct aux réglages).
- Sur le téléphone ou l'ordinateur : Paramètres, Notifications, « Activer » sur cet appareil, puis
  « Envoyer un essai ». Sur iPhone, il faut d'abord ajouter le site à l'écran d'accueil (Partager,
  « Sur l'écran d'accueil ») et l'ouvrir depuis l'icône.
- Ce qu'on reçoit se règle par catégorie, dans le site et sur les appareils : positions, alertes de
  prix, propositions de Nimbo, ma stratégie, bilan de la semaine, annonces économiques, Communauté,
  réponses de l'équipe, compte. Heures calmes possibles (par exemple de 22 h à 8 h).
- La liste des appareils abonnés, avec « Retirer » pour un téléphone perdu ou vendu.

# Le week-end et le bilan
Du vendredi 22 h 30 au lundi 9 h (Paris), l'espace « Préparer la semaine » ouvre (une carte sur
l'accueil y mène) : le bilan de la semaine (résultat, stops posés, notes au journal, activité, un
conseil), vos actifs sur la semaine, l'actualité et l'agenda de la semaine qui vient. Le bilan est
aussi envoyé en notification le vendredi à 22 h 30.

# Premium (menu du compte, ou Menu sur téléphone)
Premium lève les limites sur ce qui coûte cher à calculer (scans, questions à l'Assistant,
positions ouvertes, favoris). L'abonnement n'est pas encore ouvert : aujourd'hui tout le monde a
gratuitement l'accès décrit sur la page Premium. Ne jamais donner de prix.

# Le compte (Paramètres)
- Mon profil : pseudo, adresse, changer le mot de passe, télécharger ses données, supprimer son compte.
- Mon expérience : niveau, objectif, marchés suivis, temps disponible (le site s'adapte), et refaire
  les questions de bienvenue.
- Trading : votre horizon, votre appétit pour le risque, le levier par défaut.
- Notifications : voir la partie Notifications.
- Apparence : devise d'affichage (euro ou dollar), clair ou sombre, animations.
- Mot de passe oublié : sur la page de connexion, « Mot de passe oublié » envoie un lien par e-mail.
- L'adresse e-mail ne sert qu'au compte (confirmation, mot de passe, reçu Premium) : pas de
  newsletter, pas de publicité, jamais vendue ni cédée.

# La visite guidée
Le menu du compte, « Visite guidée du site » : Nimbo montre les vrais écrans, du plan du site
jusqu'à la première analyse. Une autre visite montre comment contacter l'équipe.

# Le site est en développement
Si quelque chose ne marche pas, ou pour une idée : écrire à l'équipe (Mes demandes).
"""

# Les destinations que Nimbo peut proposer : identifiant → (libellé, lien ou visite).
DESTINATIONS: dict[str, tuple[str, dict]] = {
    "contacter":           ("Écrire à l'équipe", {"lien": "/support?nouveau=1"}),
    "mes_demandes":        ("Mes demandes", {"lien": "/support"}),
    "demander_actif":      ("Demander un actif", {"lien": "/support"}),
    "visite_support":      ("Me montrer le chemin", {"visite": "support"}),
    "visite_site":         ("Faire la visite guidée", {"visite": "decouverte"}),
    "accueil":             ("Accueil", {"lien": "/dashboard"}),
    "analyse":             ("Ouvrir l'analyse", {"lien": "/analysis"}),
    "scanner":             ("Ouvrir le scanner", {"lien": "/scanner"}),
    "strategie":           ("Ma stratégie", {"lien": "/strategie"}),
    "marches":             ("Les marchés", {"lien": "/markets"}),
    "macro":               ("L'agenda macro", {"lien": "/macro"}),
    "wallet":              ("Mon wallet", {"lien": "/wallet"}),
    "trading":             ("Ouvrir une position", {"lien": "/trading"}),
    "journal":             ("Mon journal", {"lien": "/journal"}),
    "favoris":             ("Mes favoris", {"lien": "/favorites"}),
    "portefeuille_reel":   ("Portefeuille réel", {"lien": "/portfolio"}),
    "parcours":            ("Le parcours", {"lien": "/learn"}),
    "missions":            ("Mes missions", {"lien": "/learn/missions"}),
    "glossaire":           ("Le glossaire", {"lien": "/learn/glossaire"}),
    "assistant":           ("Demander à l'Assistant", {"lien": "/assistant"}),
    "communaute":          ("La Communauté", {"lien": "/community"}),
    "semaine":             ("Préparer la semaine", {"lien": "/semaine"}),
    "premium":             ("Premium", {"lien": "/premium"}),
    "reglages_notifs":     ("Régler mes notifications", {"lien": "/settings?section=notifications"}),
    "reglages_profil":     ("Mon profil", {"lien": "/settings?section=profil"}),
    "reglages_experience": ("Mon expérience", {"lien": "/settings?section=experience"}),
    "reglages_trading":    ("Mes réglages de trading", {"lien": "/settings?section=trading"}),
}

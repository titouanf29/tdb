"""
Service Calendrier Économique - Événements macro, banques centrales, FED speeches
Dates 2025-2026, horaires UTC, résumés IA, opt-in/out notifications
"""
import logging
import asyncio
import aiohttp
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

# ============================================================
# CALENDRIER FIXE 2025-2026
# Toutes les heures sont en UTC
# ============================================================

# FOMC meetings 2025 (décision taux 14h00 UTC, conférence de presse 14h30 UTC)
FOMC_DATES_2025 = [
    {"date": "2025-01-29", "time_utc": "19:00", "press_conf": True},
    {"date": "2025-03-19", "time_utc": "18:00", "press_conf": True},
    {"date": "2025-05-07", "time_utc": "18:00", "press_conf": True},
    {"date": "2025-06-18", "time_utc": "18:00", "press_conf": True},
    {"date": "2025-07-30", "time_utc": "18:00", "press_conf": True},
    {"date": "2025-09-17", "time_utc": "18:00", "press_conf": True},
    {"date": "2025-11-05", "time_utc": "19:00", "press_conf": True},
    {"date": "2025-12-17", "time_utc": "19:00", "press_conf": True},
]

# FOMC meetings 2026
FOMC_DATES_2026 = [
    {"date": "2026-01-28", "time_utc": "19:00", "press_conf": True},
    {"date": "2026-03-18", "time_utc": "18:00", "press_conf": True},
    {"date": "2026-04-29", "time_utc": "18:00", "press_conf": True},
    {"date": "2026-06-17", "time_utc": "18:00", "press_conf": True},
    {"date": "2026-07-29", "time_utc": "18:00", "press_conf": True},
    {"date": "2026-09-16", "time_utc": "18:00", "press_conf": True},
    {"date": "2026-11-04", "time_utc": "19:00", "press_conf": True},
    {"date": "2026-12-16", "time_utc": "19:00", "press_conf": True},
]

# Discours importants FED 2025-2026 (Jackson Hole, témoignages Congrès, etc.)
FED_SPEECHES_2025_2026 = [
    # Jackson Hole Symposium (fin août chaque année ~14:00 UTC)
    {"date": "2025-08-22", "time_utc": "14:00", "name": "Discours Powell - Jackson Hole", "type": "FED_SPEECH"},
    {"date": "2026-08-28", "time_utc": "14:00", "name": "Discours Powell - Jackson Hole", "type": "FED_SPEECH"},
    # Témoignages Humphrey-Hawkins devant le Congrès (2x/an, ~15:00 UTC)
    {"date": "2025-02-11", "time_utc": "15:00", "name": "Témoignage Powell - Sénat", "type": "FED_TESTIMONY"},
    {"date": "2025-02-12", "time_utc": "15:00", "name": "Témoignage Powell - Chambre", "type": "FED_TESTIMONY"},
    {"date": "2025-07-08", "time_utc": "14:00", "name": "Témoignage Powell - Sénat", "type": "FED_TESTIMONY"},
    {"date": "2025-07-09", "time_utc": "14:00", "name": "Témoignage Powell - Chambre", "type": "FED_TESTIMONY"},
    {"date": "2026-02-10", "time_utc": "15:00", "name": "Témoignage Powell - Sénat", "type": "FED_TESTIMONY"},
    {"date": "2026-07-07", "time_utc": "14:00", "name": "Témoignage Powell - Sénat", "type": "FED_TESTIMONY"},
]

# Réunions BCE (Banque Centrale Européenne) 2025-2026 (13:15 UTC décision, 13:45 UTC conf)
ECB_DATES_2025 = [
    {"date": "2025-01-30", "time_utc": "13:15"},
    {"date": "2025-03-06", "time_utc": "13:15"},
    {"date": "2025-04-17", "time_utc": "13:15"},
    {"date": "2025-06-05", "time_utc": "13:15"},
    {"date": "2025-07-24", "time_utc": "13:15"},
    {"date": "2025-09-11", "time_utc": "13:15"},
    {"date": "2025-10-30", "time_utc": "13:15"},
    {"date": "2025-12-18", "time_utc": "13:15"},
]

ECB_DATES_2026 = [
    {"date": "2026-01-29", "time_utc": "13:15"},
    {"date": "2026-03-05", "time_utc": "13:15"},
    {"date": "2026-04-16", "time_utc": "13:15"},
    {"date": "2026-06-04", "time_utc": "13:15"},
    {"date": "2026-07-23", "time_utc": "13:15"},
    {"date": "2026-09-10", "time_utc": "13:15"},
    {"date": "2026-10-29", "time_utc": "13:15"},
    {"date": "2026-12-17", "time_utc": "13:15"},
]

# Banque d'Angleterre (BOE) 2025-2026 (12:00 UTC)
BOE_DATES_2025 = [
    {"date": "2025-02-06", "time_utc": "12:00"},
    {"date": "2025-03-20", "time_utc": "12:00"},
    {"date": "2025-05-08", "time_utc": "11:00"},
    {"date": "2025-06-19", "time_utc": "11:00"},
    {"date": "2025-08-07", "time_utc": "11:00"},
    {"date": "2025-09-18", "time_utc": "11:00"},
    {"date": "2025-11-06", "time_utc": "12:00"},
    {"date": "2025-12-18", "time_utc": "12:00"},
]

# Sources news économiques (pour résumés)
NEWS_SOURCES = {
    "FED": [
        "https://www.federalreserve.gov/newsevents/pressreleases.htm",
        "https://www.reuters.com/markets/us",
        "https://www.bloomberg.com/economics"
    ],
    "ECB": [
        "https://www.ecb.europa.eu/press/pr/date/",
        "https://www.reuters.com/markets/europe"
    ]
}


class EconomicCalendarService:
    """Service calendrier économique avec événements FED, BCE, données macro"""

    def __init__(self):
        self._cache = {}
        self._cache_ttl = 3600
        # Tracking des événements pour lesquels un résumé a été publié
        self._summaries_sent = set()  # "EVENT_DATE" strings
        self._upcoming_notifs_sent = set()  # Pour les alertes "dans X heures"

        self.major_events = {
            'FOMC': {
                'name': '🏛️ FOMC — Décision taux Fed',
                'impact': 'CRITIQUE',
                'emoji': '🏛️',
                'description': 'Décision Fed sur les taux + conférence de presse Powell',
                'affects': ['USD', 'STOCKS', 'CRYPTO', 'BONDS', 'FOREX', 'GOLD'],
                'source': 'federalreserve.gov'
            },
            'FED_SPEECH': {
                'name': '🎤 Discours Powell (Jackson Hole)',
                'impact': 'CRITIQUE',
                'emoji': '🎤',
                'description': 'Discours du président de la Fed — orientation politique monétaire',
                'affects': ['USD', 'STOCKS', 'CRYPTO', 'BONDS', 'FOREX'],
                'source': 'federalreserve.gov'
            },
            'FED_TESTIMONY': {
                'name': '🏛️ Témoignage Powell — Congrès',
                'impact': 'ÉLEVÉ',
                'emoji': '🏛️',
                'description': 'Témoignage semestriel devant le Congrès sur la politique monétaire',
                'affects': ['USD', 'STOCKS', 'FOREX'],
                'source': 'federalreserve.gov'
            },
            'ECB': {
                'name': '🇪🇺 BCE — Décision taux',
                'impact': 'CRITIQUE',
                'emoji': '🇪🇺',
                'description': 'Réunion BCE: décision taux + conférence de presse Lagarde',
                'affects': ['EUR', 'STOCKS EU', 'BONDS EU', 'FOREX'],
                'source': 'ecb.europa.eu'
            },
            'BOE': {
                'name': '🇬🇧 BOE — Décision taux',
                'impact': 'ÉLEVÉ',
                'emoji': '🇬🇧',
                'description': 'Banque d\'Angleterre: décision taux directeurs',
                'affects': ['GBP', 'FOREX'],
                'source': 'bankofengland.co.uk'
            },
            'CPI': {
                'name': '📊 CPI USA — Inflation',
                'impact': 'ÉLEVÉ',
                'emoji': '📊',
                'description': 'Indice des prix à la consommation US (8:30 AM ET / 13:30 UTC)',
                'affects': ['USD', 'STOCKS', 'BONDS'],
                'source': 'bls.gov'
            },
            'NFP': {
                'name': '👷 NFP — Emploi US',
                'impact': 'ÉLEVÉ',
                'emoji': '👷',
                'description': 'Non-Farm Payrolls (8:30 AM ET / 13:30 UTC)',
                'affects': ['USD', 'STOCKS', 'FOREX'],
                'source': 'bls.gov'
            },
            'GDP': {
                'name': '📈 PIB US — Croissance',
                'impact': 'MOYEN',
                'emoji': '📈',
                'description': 'Rapport PIB trimestriel US',
                'affects': ['USD', 'STOCKS'],
                'source': 'bea.gov'
            },
            'PMI': {
                'name': '🏭 PMI — Activité éco',
                'impact': 'MOYEN',
                'emoji': '🏭',
                'description': 'Indice directeurs d\'achats',
                'affects': ['USD', 'STOCKS'],
                'source': 'ismworld.org'
            },
        }

    # ============================================================
    # RÉCUPÉRATION DES ÉVÉNEMENTS
    # ============================================================

    def _all_events_list(self) -> List[Dict]:
        """Retourne la liste complète de tous les événements hardcodés"""
        all_events = []

        # FOMC
        for e in FOMC_DATES_2025 + FOMC_DATES_2026:
            all_events.append({
                'type': 'FOMC',
                'date_str': e['date'],
                'time_utc': e['time_utc'],
                'press_conf': e.get('press_conf', False),
                **self.major_events['FOMC']
            })

        # FED speeches
        for e in FED_SPEECHES_2025_2026:
            ev_type = e['type']
            all_events.append({
                'type': ev_type,
                'date_str': e['date'],
                'time_utc': e['time_utc'],
                'name': e['name'],
                **{k: v for k, v in self.major_events.get(ev_type, self.major_events['FED_SPEECH']).items() if k != 'name'}
            })

        # ECB
        for e in ECB_DATES_2025 + ECB_DATES_2026:
            all_events.append({
                'type': 'ECB',
                'date_str': e['date'],
                'time_utc': e['time_utc'],
                **self.major_events['ECB']
            })

        # BOE
        for e in BOE_DATES_2025:
            all_events.append({
                'type': 'BOE',
                'date_str': e['date'],
                'time_utc': e['time_utc'],
                **self.major_events['BOE']
            })

        return all_events

    async def get_upcoming_events(self, days_ahead: int = 14) -> List[Dict]:
        """Récupère les événements à venir avec heures UTC"""
        events = []
        now_utc = datetime.now(timezone.utc)
        end_utc = now_utc + timedelta(days=days_ahead)

        for e in self._all_events_list():
            try:
                dt_str = f"{e['date_str']} {e['time_utc']}"
                event_dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)

                if now_utc <= event_dt <= end_utc:
                    days_until = (event_dt - now_utc).days
                    hours_until = (event_dt - now_utc).total_seconds() / 3600

                    events.append({
                        **e,
                        'datetime_utc': event_dt,
                        'days_until': days_until,
                        'hours_until': round(hours_until, 1),
                    })
            except Exception as ex:
                logger.debug(f"Erreur parsing event {e}: {ex}")

        # Ajouter NFP et CPI dynamiquement
        events.extend(await self._get_recurring_events(now_utc, end_utc))

        events.sort(key=lambda x: x['datetime_utc'])
        return events

    async def _get_recurring_events(self, now_utc: datetime, end_utc: datetime) -> List[Dict]:
        """Calcule les dates récurrentes (NFP, CPI) pour la fenêtre donnée"""
        events = []

        for month_offset in range(3):
            check = now_utc + timedelta(days=30 * month_offset)

            # NFP: 1er vendredi du mois à 13:30 UTC
            nfp_dt = self._get_first_weekday(check.year, check.month, weekday=4)  # vendredi
            nfp_dt = nfp_dt.replace(hour=13, minute=30, tzinfo=timezone.utc)
            if now_utc <= nfp_dt <= end_utc:
                events.append({
                    'type': 'NFP', 'date_str': nfp_dt.strftime('%Y-%m-%d'),
                    'time_utc': '13:30', 'datetime_utc': nfp_dt,
                    'days_until': (nfp_dt - now_utc).days,
                    'hours_until': round((nfp_dt - now_utc).total_seconds() / 3600, 1),
                    **self.major_events['NFP']
                })

            # CPI: ~2ème semaine du mois à 13:30 UTC (vers le 11-15)
            for day in range(10, 16):
                try:
                    cpi_dt = datetime(check.year, check.month, day, 13, 30, tzinfo=timezone.utc)
                    if cpi_dt.weekday() in (1, 2, 3):  # Mar/Mer/Jeu
                        if now_utc <= cpi_dt <= end_utc:
                            events.append({
                                'type': 'CPI', 'date_str': cpi_dt.strftime('%Y-%m-%d'),
                                'time_utc': '13:30', 'datetime_utc': cpi_dt,
                                'days_until': (cpi_dt - now_utc).days,
                                'hours_until': round((cpi_dt - now_utc).total_seconds() / 3600, 1),
                                **self.major_events['CPI']
                            })
                        break
                except Exception:
                    pass

        return events

    def _get_first_weekday(self, year: int, month: int, weekday: int) -> datetime:
        """Retourne le premier jour de la semaine (0=lun, 4=ven) du mois"""
        first = datetime(year, month, 1)
        days_ahead = (weekday - first.weekday()) % 7
        return first + timedelta(days=days_ahead)

    # ============================================================
    # FORMATAGE POUR TELEGRAM
    # ============================================================

    def format_calendar_message(self, events: List[Dict], compact: bool = False) -> str:
        """Formate les événements pour affichage Telegram avec heures UTC + Paris"""
        if not events:
            return (
                "📅 **CALENDRIER ÉCONOMIQUE**\n\n"
                "✅ Aucun événement majeur prévu cette semaine."
            )

        text = "📅 **CALENDRIER ÉCONOMIQUE**\n"
        text += "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        # Icône d'impact
        impact_map = {
            'CRITIQUE': '🔴🔴', 'ÉLEVÉ': '🔴', 'MOYEN': '🟡', 'LOW': '🟢', 'HIGH': '🔴', 'MEDIUM': '🟡'
        }

        for event in events[:12]:
            emoji = event.get('emoji', '📌')
            name = event.get('name', 'Événement')
            impact = event.get('impact', 'MOYEN')
            days = event.get('days_until', 0)
            hours = event.get('hours_until', 0)
            ev_type = event.get('type', '')

            # Heure UTC et Paris
            dt_utc = event.get('datetime_utc')
            if dt_utc:
                time_utc = dt_utc.strftime('%H:%M UTC')
                # Convertir en heure Paris (UTC+1 hiver / UTC+2 été — approximation simple)
                from datetime import date as dt_date
                paris_offset = 2 if dt_utc.month in range(3, 11) else 1
                time_paris = (dt_utc + timedelta(hours=paris_offset)).strftime('%H:%M')
                date_str = dt_utc.strftime('%d/%m/%Y')
                time_display = f"{time_utc} ({time_paris} Paris)"
            else:
                date_str = event.get('date_str', '?')
                time_display = event.get('time_utc', '?') + ' UTC'

            # Timing
            if hours < 1:
                timing = "🔴 **MAINTENANT**"
            elif hours < 24:
                timing = f"⏰ Dans **{hours:.0f}h**"
            elif days == 1:
                timing = "📅 **DEMAIN**"
            else:
                timing = f"📅 Dans {days}j"

            impact_icon = impact_map.get(impact, '🟡')

            text += f"{emoji} **{name}**\n"
            text += f"   {impact_icon} {date_str} — {time_display}\n"
            text += f"   {timing}"

            # Note conférence de presse pour FOMC
            if ev_type == 'FOMC' and event.get('press_conf'):
                text += " | 🎤 +30min conf. presse"

            text += "\n\n"

        text += "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        text += "🔴🔴 Critique | 🔴 Élevé | 🟡 Moyen\n"
        text += "_Heures en UTC (Temps Universel Coordonné)_"

        return text

    def format_event_alert(self, event: Dict, hours_before: float) -> str:
        """Formate une alerte pré-événement"""
        emoji = event.get('emoji', '📌')
        name = event.get('name', 'Événement')
        dt_utc = event.get('datetime_utc')
        affects = event.get('affects', [])

        paris_offset = 2 if dt_utc and dt_utc.month in range(3, 11) else 1
        if dt_utc:
            time_utc = dt_utc.strftime('%H:%M UTC')
            time_paris = (dt_utc + timedelta(hours=paris_offset)).strftime('%H:%M')
        else:
            time_utc = time_paris = '?'

        if hours_before < 1:
            timing_text = f"dans **{int(hours_before * 60)} minutes**"
        else:
            timing_text = f"dans **{hours_before:.0f} heure(s)**"

        text = f"⚡ **ALERTE ÉVÉNEMENT MAJEUR**\n\n"
        text += f"{emoji} **{name}**\n\n"
        text += f"⏰ **Heure:** {time_utc} ({time_paris} Paris)\n"
        text += f"📍 **Timing:** {timing_text}\n"

        if affects:
            text += f"📊 **Marchés impactés:** {', '.join(affects)}\n"

        text += f"\n💡 _Surveillez les marchés — forte volatilité attendue_"
        return text

    # ============================================================
    # RÉSUMÉS POST-ÉVÉNEMENT (via IA)
    # ============================================================

    async def generate_event_summary(self, event: Dict, groq_api_key: str = None) -> Optional[str]:
        """
        Génère un résumé de l'événement après qu'il ait eu lieu.
        Utilise GROQ/news pour créer un résumé sourcé avec avis IA.
        """
        ev_type = event.get('type', '')
        name = event.get('name', 'Événement')
        dt_utc = event.get('datetime_utc')

        if not groq_api_key:
            try:
                import config as cfg
                groq_api_key = getattr(cfg, 'GROQ_API_KEY', None)
            except Exception:
                pass

        if not groq_api_key:
            return self._generate_basic_summary(event)

        # Construire le prompt pour l'IA
        date_str = dt_utc.strftime('%d %B %Y') if dt_utc else 'récemment'

        prompts_by_type = {
            'FOMC': f"""Résume la réunion FOMC de la Fed du {date_str}.
Inclus: décision sur les taux, ton Powell (hawkish/dovish), perspectives économiques, réaction des marchés.
Format: 3-4 paragraphes, sourcé (Fed, Bloomberg, Reuters).
Termine par: "🤖 Analyse IA: [conséquences probables pour USD, actions, crypto]" """,

            'FED_SPEECH': f"""Résume le discours de Jerome Powell du {date_str}.
Inclus: thèmes principaux, signal sur la politique monétaire, réaction des marchés.
Format: 2-3 paragraphes concis, sourcé.
Termine par: "🤖 Analyse IA: [impact probable sur les marchés]" """,

            'ECB': f"""Résume la réunion de la BCE du {date_str}.
Inclus: décision sur les taux, déclarations Lagarde, perspectives économiques eurozone.
Format: 3 paragraphes, sourcé (ECB, Bloomberg, Reuters).
Termine par: "🤖 Analyse IA: [conséquences pour EUR, marchés européens]" """,

            'CPI': f"""Résume les données d'inflation CPI US publiées le {date_str}.
Inclus: chiffre publié vs estimations, composantes principales, implications pour la Fed.
Format: 2-3 paragraphes, sourcé (BLS.gov, Bloomberg).
Termine par: "🤖 Analyse IA: [impact probable sur USD, taux, marchés]" """,

            'NFP': f"""Résume le rapport emploi NFP américain du {date_str}.
Inclus: créations d'emplois (vs estimations), taux chômage, salaires horaires.
Format: 2-3 paragraphes, sourcé (BLS.gov, Reuters).
Termine par: "🤖 Analyse IA: [implications pour politique Fed et marchés]" """,
        }

        prompt = prompts_by_type.get(ev_type, f"""Résume l'événement économique "{name}" du {date_str}.
Inclus les points clés et réaction des marchés.
Termine par: "🤖 Analyse IA: [conséquences pour les marchés]" """)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {
                                "role": "system",
                                "content": "Tu es un analyste financier expert. Tes résumés sont précis, sourcés (Reuters, Bloomberg, Fed, BCE) et accessibles. Tu fournis toujours un avis IA sur les conséquences marchés."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 600,
                        "temperature": 0.3
                    },
                    timeout=aiohttp.ClientTimeout(total=20)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data['choices'][0]['message']['content']
                        return self._format_summary_message(event, content)
        except Exception as e:
            logger.error(f"Erreur génération résumé IA: {e}")

        return self._generate_basic_summary(event)

    def _generate_basic_summary(self, event: Dict) -> str:
        """Résumé basique si l'API IA n'est pas disponible"""
        emoji = event.get('emoji', '📌')
        name = event.get('name', 'Événement')
        return (
            f"{emoji} **RÉSUMÉ — {name}**\n\n"
            f"L'événement vient de se terminer.\n\n"
            f"📰 _Pour un résumé complet, consultez:_\n"
            f"• Reuters.com/markets\n"
            f"• Bloomberg.com/economics\n"
            f"• federalreserve.gov (pour les événements Fed)"
        )

    def _format_summary_message(self, event: Dict, ai_content: str) -> str:
        """Formate le message de résumé complet"""
        emoji = event.get('emoji', '📌')
        name = event.get('name', 'Événement')
        source = event.get('source', 'Reuters / Bloomberg')
        dt_utc = event.get('datetime_utc')
        date_str = dt_utc.strftime('%d/%m/%Y à %H:%M UTC') if dt_utc else 'récemment'

        header = (
            f"{emoji} **RÉSUMÉ POST-ÉVÉNEMENT**\n"
            f"**{name}**\n"
            f"_{date_str}_\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        )

        footer = (
            f"\n━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📰 Sources: {source}, Reuters, Bloomberg\n"
            f"_Résumé généré automatiquement — non un conseil en investissement_"
        )

        return header + ai_content + footer

    # ============================================================
    # VÉRIFICATION ÉVÉNEMENTS IMMINENTS (pour loop de notification)
    # ============================================================

    async def check_upcoming_notifications(self) -> List[Dict]:
        """
        Vérifie s'il faut envoyer des alertes pré-événement.
        Retourne la liste des événements à notifier maintenant.
        """
        events = await self.get_upcoming_events(days_ahead=2)
        to_notify = []

        for event in events:
            hours = event.get('hours_until', 999)
            ev_key = f"{event['type']}_{event['date_str']}"

            # Alertes: 24h avant, 2h avant, 30min avant
            for threshold_h, threshold_label in [(24, '24h'), (2, '2h'), (0.5, '30min')]:
                notif_key = f"{ev_key}_{threshold_label}"
                if notif_key not in self._upcoming_notifs_sent:
                    # Fenêtre de 10 minutes autour du seuil
                    if threshold_h - 0.17 <= hours <= threshold_h + 0.17:
                        to_notify.append({**event, 'alert_threshold': threshold_h})
                        self._upcoming_notifs_sent.add(notif_key)
                        break

        return to_notify

    async def check_events_to_summarize(self) -> List[Dict]:
        """
        Vérifie si un événement vient de se terminer et nécessite un résumé.
        Retourne les événements à résumer (passés depuis 30-90 min).
        """
        now_utc = datetime.now(timezone.utc)
        # Chercher dans les dernières 24h
        past_start = now_utc - timedelta(hours=24)

        to_summarize = []
        for e in self._all_events_list():
            try:
                dt_str = f"{e['date_str']} {e['time_utc']}"
                event_dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
                ev_key = f"{e['type']}_{e['date_str']}"

                # L'événement a eu lieu dans les 30-90 minutes
                elapsed_min = (now_utc - event_dt).total_seconds() / 60
                if 30 <= elapsed_min <= 90 and ev_key not in self._summaries_sent:
                    to_summarize.append({
                        **e, 'datetime_utc': event_dt,
                        'days_until': -1, 'hours_until': -elapsed_min / 60
                    })
                    # Ne pas marquer tout de suite — le caller marquera après envoi
            except Exception:
                pass

        return to_summarize

    def mark_summary_sent(self, event: Dict):
        """Marque un événement comme résumé envoyé"""
        ev_key = f"{event['type']}_{event['date_str']}"
        self._summaries_sent.add(ev_key)

    # ============================================================
    # RISQUE ÉVÉNEMENT (pour analyses IA)
    # ============================================================

    async def check_event_risk(self, symbol: str = None, market: str = None) -> Dict:
        """Évalue le risque d'événement pour un actif/marché"""
        events = await self.get_upcoming_events(days_ahead=3)
        relevant = []

        for event in events:
            affects = event.get('affects', [])
            if market == 'CRYPTO' and 'CRYPTO' in affects:
                relevant.append(event)
            elif market in ['USA', 'EUROPE'] and any(a in affects for a in ['USD', 'STOCKS', 'EUR']):
                relevant.append(event)
            elif market == 'FOREX' and any(a in affects for a in ['USD', 'EUR', 'GBP', 'FOREX']):
                relevant.append(event)
            elif not market:
                relevant.append(event)

        impact_vals = {'CRITIQUE': 3, 'ÉLEVÉ': 2, 'HIGH': 2, 'MOYEN': 1, 'MEDIUM': 1}
        critical_soon = any(
            impact_vals.get(e['impact'], 0) >= 3 and e['hours_until'] <= 24
            for e in relevant
        )
        high_soon = any(
            impact_vals.get(e['impact'], 0) >= 2 and e['hours_until'] <= 48
            for e in relevant
        )

        if critical_soon:
            return {'risk_level': 'CRITIQUE', 'events': relevant,
                    'recommendation': '⛔ Événement CRITIQUE imminent. Réduire exposition ou stopper le trading.'}
        elif high_soon:
            return {'risk_level': 'ÉLEVÉ', 'events': relevant,
                    'recommendation': '⚠️ Événement majeur dans 48h. Gérer le risque avec des stops serrés.'}
        elif relevant:
            return {'risk_level': 'MOYEN', 'events': relevant,
                    'recommendation': '📅 Événements à surveiller cette semaine.'}
        else:
            return {'risk_level': 'FAIBLE', 'events': [],
                    'recommendation': '✅ Pas d\'événement majeur prévu. Conditions normales.'}


# Instance globale
economic_calendar = EconomicCalendarService()

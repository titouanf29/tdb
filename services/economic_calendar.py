"""
Service Calendrier Économique - Événements macro et earnings
Fed, CPI, NFP, GDP, Earnings dates
"""
import logging
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import yfinance as yf

logger = logging.getLogger(__name__)


class EconomicCalendarService:
    """Service pour récupérer les événements économiques importants"""

    def __init__(self):
        # Cache pour éviter trop de requêtes
        self._cache = {}
        self._cache_ttl = 3600  # 1 heure

        # Événements économiques majeurs (dates approximatives récurrentes)
        self.major_events = {
            'FOMC': {
                'name': 'Réunion Fed (FOMC)',
                'impact': 'HIGH',
                'emoji': '🏛️',
                'description': 'Décision sur les taux directeurs',
                'affects': ['USD', 'STOCKS', 'CRYPTO', 'BONDS']
            },
            'CPI': {
                'name': 'Inflation (CPI)',
                'impact': 'HIGH',
                'emoji': '📊',
                'description': 'Indice des prix à la consommation',
                'affects': ['USD', 'STOCKS', 'BONDS']
            },
            'NFP': {
                'name': 'Emploi US (NFP)',
                'impact': 'HIGH',
                'emoji': '👷',
                'description': 'Non-Farm Payrolls - Créations d\'emplois',
                'affects': ['USD', 'STOCKS']
            },
            'GDP': {
                'name': 'PIB US',
                'impact': 'MEDIUM',
                'emoji': '📈',
                'description': 'Croissance économique trimestrielle',
                'affects': ['USD', 'STOCKS']
            },
            'RETAIL': {
                'name': 'Ventes au détail',
                'impact': 'MEDIUM',
                'emoji': '🛒',
                'description': 'Consommation des ménages',
                'affects': ['USD', 'STOCKS']
            },
            'PMI': {
                'name': 'PMI Manufacturier',
                'impact': 'MEDIUM',
                'emoji': '🏭',
                'description': 'Indice des directeurs d\'achats',
                'affects': ['USD', 'STOCKS']
            },
            'JOBLESS': {
                'name': 'Inscriptions chômage',
                'impact': 'LOW',
                'emoji': '📋',
                'description': 'Demandes hebdomadaires d\'allocations',
                'affects': ['USD']
            }
        }

        # Calendrier 2024-2025 des événements FOMC (approximatif)
        self.fomc_dates_2025 = [
            '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
            '2025-07-30', '2025-09-17', '2025-11-05', '2025-12-17'
        ]

        # CPI généralement publié le 2ème mardi du mois
        # NFP généralement publié le 1er vendredi du mois

    async def get_upcoming_events(self, days_ahead: int = 7) -> List[Dict]:
        """
        Récupère les événements économiques à venir

        Args:
            days_ahead: Nombre de jours à regarder

        Returns:
            Liste des événements triés par date
        """
        events = []
        today = datetime.now()
        end_date = today + timedelta(days=days_ahead)

        # Vérifier les dates FOMC
        for date_str in self.fomc_dates_2025:
            event_date = datetime.strptime(date_str, '%Y-%m-%d')
            if today <= event_date <= end_date:
                days_until = (event_date - today).days
                events.append({
                    'type': 'FOMC',
                    'date': event_date,
                    'days_until': days_until,
                    **self.major_events['FOMC']
                })

        # Calculer les dates CPI et NFP pour le mois en cours et suivant
        for month_offset in range(2):
            check_date = today + timedelta(days=30 * month_offset)

            # NFP: 1er vendredi du mois
            nfp_date = self._get_first_friday(check_date.year, check_date.month)
            if today <= nfp_date <= end_date:
                days_until = (nfp_date - today).days
                events.append({
                    'type': 'NFP',
                    'date': nfp_date,
                    'days_until': days_until,
                    **self.major_events['NFP']
                })

            # CPI: ~13ème jour du mois (approximatif)
            cpi_date = datetime(check_date.year, check_date.month, 13)
            if today <= cpi_date <= end_date:
                days_until = (cpi_date - today).days
                events.append({
                    'type': 'CPI',
                    'date': cpi_date,
                    'days_until': days_until,
                    **self.major_events['CPI']
                })

        # Trier par date
        events.sort(key=lambda x: x['date'])

        return events

    def _get_first_friday(self, year: int, month: int) -> datetime:
        """Trouve le premier vendredi du mois"""
        first_day = datetime(year, month, 1)
        days_until_friday = (4 - first_day.weekday()) % 7
        return first_day + timedelta(days=days_until_friday)

    async def get_earnings_calendar(self, symbols: List[str]) -> List[Dict]:
        """
        Récupère les dates de publication des résultats pour une liste de symboles

        Args:
            symbols: Liste des symboles à vérifier

        Returns:
            Liste des earnings à venir
        """
        earnings = []

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                calendar = ticker.calendar

                if calendar is not None and not calendar.empty:
                    # Récupérer la date des earnings
                    if 'Earnings Date' in calendar.index:
                        earnings_date = calendar.loc['Earnings Date']
                        if isinstance(earnings_date, (list, tuple)) and len(earnings_date) > 0:
                            next_earnings = earnings_date[0]
                            if isinstance(next_earnings, datetime):
                                days_until = (next_earnings - datetime.now()).days
                                if 0 <= days_until <= 30:  # Dans les 30 prochains jours
                                    earnings.append({
                                        'symbol': symbol,
                                        'date': next_earnings,
                                        'days_until': days_until,
                                        'type': 'EARNINGS',
                                        'name': f'Résultats {symbol}',
                                        'impact': 'HIGH',
                                        'emoji': '📊'
                                    })
            except Exception as e:
                logger.debug(f"Erreur récupération earnings {symbol}: {e}")
                continue

        # Trier par date
        earnings.sort(key=lambda x: x['date'])

        return earnings

    async def check_event_risk(self, symbol: str = None, market: str = None) -> Dict:
        """
        Vérifie le risque d'événement pour un symbole ou marché

        Returns:
            {
                'risk_level': 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE',
                'events': [...],
                'recommendation': str
            }
        """
        events = await self.get_upcoming_events(days_ahead=3)

        # Filtrer les événements pertinents
        relevant_events = []
        for event in events:
            affects = event.get('affects', [])
            if market == 'CRYPTO' and 'CRYPTO' in affects:
                relevant_events.append(event)
            elif market in ['USA', 'EUROPE'] and ('USD' in affects or 'STOCKS' in affects):
                relevant_events.append(event)
            elif not market:  # Si pas de marché spécifié, inclure tous
                relevant_events.append(event)

        # Vérifier les earnings si symbole fourni
        if symbol:
            earnings = await self.get_earnings_calendar([symbol])
            relevant_events.extend(earnings)

        # Déterminer le niveau de risque
        risk_level = 'NONE'
        high_impact_soon = any(
            e['impact'] == 'HIGH' and e['days_until'] <= 1
            for e in relevant_events
        )
        medium_impact_soon = any(
            e['impact'] in ['HIGH', 'MEDIUM'] and e['days_until'] <= 2
            for e in relevant_events
        )

        if high_impact_soon:
            risk_level = 'HIGH'
            recommendation = "⚠️ ATTENTION: Événement majeur imminent. Éviter de prendre de nouvelles positions ou réduire l'exposition."
        elif medium_impact_soon:
            risk_level = 'MEDIUM'
            recommendation = "📊 Événement à surveiller. Gérer le risque avec des stops serrés."
        elif relevant_events:
            risk_level = 'LOW'
            recommendation = "📅 Événements à venir cette semaine. Rester vigilant."
        else:
            recommendation = "✅ Pas d'événement majeur prévu. Conditions normales de trading."

        return {
            'risk_level': risk_level,
            'events': relevant_events,
            'recommendation': recommendation
        }

    def format_calendar_message(self, events: List[Dict]) -> str:
        """Formate les événements pour affichage Telegram"""
        if not events:
            return "📅 **CALENDRIER ÉCONOMIQUE**\n\n✅ Aucun événement majeur prévu cette semaine."

        text = "📅 **CALENDRIER ÉCONOMIQUE**\n"
        text += "━" * 25 + "\n\n"

        for event in events[:10]:  # Max 10 événements
            emoji = event.get('emoji', '📌')
            name = event.get('name', 'Événement')
            date = event.get('date')
            days = event.get('days_until', 0)
            impact = event.get('impact', 'MEDIUM')

            # Format date
            if isinstance(date, datetime):
                date_str = date.strftime('%d/%m %H:%M') if date.hour else date.strftime('%d/%m')
            else:
                date_str = str(date)

            # Impact indicator
            impact_emoji = '🔴' if impact == 'HIGH' else '🟡' if impact == 'MEDIUM' else '🟢'

            # Days indicator
            if days == 0:
                days_str = "AUJOURD'HUI"
            elif days == 1:
                days_str = "DEMAIN"
            else:
                days_str = f"J-{days}"

            text += f"{emoji} **{name}**\n"
            text += f"   {impact_emoji} {date_str} ({days_str})\n\n"

        text += "━" * 25 + "\n"
        text += "🔴 Impact élevé | 🟡 Modéré | 🟢 Faible"

        return text


# Instance globale
economic_calendar = EconomicCalendarService()

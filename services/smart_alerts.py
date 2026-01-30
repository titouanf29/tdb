"""
Service Smart Alerts - Alertes intelligentes basées sur patterns et confluence
Détecte les opportunités de trading et envoie des alertes personnalisées
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class AlertType(Enum):
    """Types d'alertes disponibles"""
    PATTERN = "pattern"              # Pattern technique détecté
    CONFLUENCE = "confluence"        # Confluence multi-timeframe
    SMART_MONEY = "smart_money"      # Signal Smart Money
    STRUCTURE = "structure"          # Changement de structure
    PRICE_TARGET = "price_target"    # Prix cible atteint
    ECONOMIC_EVENT = "economic"      # Événement économique
    EARNINGS = "earnings"            # Résultats d'entreprise


class AlertPriority(Enum):
    """Priorité des alertes"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class Alert:
    """Structure d'une alerte"""
    alert_type: AlertType
    priority: AlertPriority
    symbol: str
    title: str
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    expires_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        """Vérifie si l'alerte est expirée"""
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at

    def to_dict(self) -> Dict:
        """Convertit en dictionnaire"""
        return {
            'type': self.alert_type.value,
            'priority': self.priority.value,
            'symbol': self.symbol,
            'title': self.title,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }


class SmartAlertsService:
    """Service de gestion des alertes intelligentes"""

    def __init__(self):
        # Cache des alertes récentes (évite les doublons)
        self._recent_alerts: Dict[str, datetime] = {}
        self._alert_cooldown = 3600  # 1 heure entre alertes similaires

        # Configuration des seuils
        self.thresholds = {
            'confluence_score': 70,      # Score minimum pour alerte confluence
            'pattern_confidence': 0.7,   # Confiance minimum pour patterns
            'smart_money_score': 60,     # Score minimum Smart Money
            'structure_change': True,    # Alerter sur changements de structure
        }

        # Priorités par type de signal
        self.signal_priorities = {
            'bullish_engulfing': AlertPriority.HIGH,
            'bearish_engulfing': AlertPriority.HIGH,
            'morning_star': AlertPriority.HIGH,
            'evening_star': AlertPriority.HIGH,
            'head_shoulders': AlertPriority.CRITICAL,
            'inv_head_shoulders': AlertPriority.CRITICAL,
            'ascending_triangle': AlertPriority.MEDIUM,
            'descending_triangle': AlertPriority.MEDIUM,
            'double_top': AlertPriority.HIGH,
            'double_bottom': AlertPriority.HIGH,
            'bullish_flag': AlertPriority.MEDIUM,
            'bearish_flag': AlertPriority.MEDIUM,
            'order_block': AlertPriority.HIGH,
            'fair_value_gap': AlertPriority.MEDIUM,
            'liquidity_sweep': AlertPriority.HIGH,
            'bos_bullish': AlertPriority.HIGH,
            'bos_bearish': AlertPriority.HIGH,
            'choch_bullish': AlertPriority.CRITICAL,
            'choch_bearish': AlertPriority.CRITICAL,
        }

    def _get_alert_key(self, symbol: str, alert_type: str, signal: str) -> str:
        """Génère une clé unique pour une alerte"""
        return f"{symbol}_{alert_type}_{signal}"

    def _is_alert_in_cooldown(self, alert_key: str) -> bool:
        """Vérifie si une alerte similaire a été envoyée récemment"""
        if alert_key not in self._recent_alerts:
            return False

        last_alert_time = self._recent_alerts[alert_key]
        cooldown_expires = last_alert_time + timedelta(seconds=self._alert_cooldown)

        return datetime.now() < cooldown_expires

    def _register_alert(self, alert_key: str):
        """Enregistre une alerte envoyée"""
        self._recent_alerts[alert_key] = datetime.now()

        # Nettoyer les anciennes entrées
        cutoff = datetime.now() - timedelta(seconds=self._alert_cooldown * 2)
        self._recent_alerts = {
            k: v for k, v in self._recent_alerts.items()
            if v > cutoff
        }

    async def analyze_for_alerts(self, symbol: str, analysis_result: Dict) -> List[Alert]:
        """
        Analyse les résultats et génère des alertes si nécessaire

        Args:
            symbol: Symbole analysé
            analysis_result: Résultat de l'analyse du MarketAnalyzer

        Returns:
            Liste des alertes générées
        """
        alerts = []

        # 1. Vérifier les patterns détectés
        pattern_alerts = self._check_pattern_alerts(symbol, analysis_result)
        alerts.extend(pattern_alerts)

        # 2. Vérifier la confluence multi-timeframe
        confluence_alerts = self._check_confluence_alerts(symbol, analysis_result)
        alerts.extend(confluence_alerts)

        # 3. Vérifier les signaux Smart Money
        smart_money_alerts = self._check_smart_money_alerts(symbol, analysis_result)
        alerts.extend(smart_money_alerts)

        # 4. Vérifier les changements de structure
        structure_alerts = self._check_structure_alerts(symbol, analysis_result)
        alerts.extend(structure_alerts)

        # Filtrer les alertes en cooldown
        filtered_alerts = []
        for alert in alerts:
            alert_key = self._get_alert_key(symbol, alert.alert_type.value, alert.title)
            if not self._is_alert_in_cooldown(alert_key):
                self._register_alert(alert_key)
                filtered_alerts.append(alert)

        return filtered_alerts

    def _check_pattern_alerts(self, symbol: str, analysis: Dict) -> List[Alert]:
        """Vérifie les patterns techniques pour alertes"""
        alerts = []

        patterns = analysis.get('patterns', {})
        candlestick_patterns = patterns.get('candlestick', [])
        chart_patterns = patterns.get('chart', [])

        # Patterns chandeliers
        for pattern in candlestick_patterns:
            pattern_name = pattern.get('pattern', '')
            confidence = pattern.get('confidence', 0)
            signal = pattern.get('signal', '')

            if confidence >= self.thresholds['pattern_confidence']:
                priority = self.signal_priorities.get(pattern_name, AlertPriority.MEDIUM)

                emoji = '🟢' if signal == 'bullish' else '🔴' if signal == 'bearish' else '⚪'

                alerts.append(Alert(
                    alert_type=AlertType.PATTERN,
                    priority=priority,
                    symbol=symbol,
                    title=f"Pattern: {pattern_name.replace('_', ' ').title()}",
                    message=f"{emoji} {pattern_name.replace('_', ' ').title()} détecté sur {symbol}\n"
                            f"Signal: {signal.upper()}\n"
                            f"Confiance: {confidence*100:.0f}%",
                    details={
                        'pattern': pattern_name,
                        'signal': signal,
                        'confidence': confidence
                    },
                    timestamp=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=24)
                ))

        # Patterns chartistes
        for pattern in chart_patterns:
            pattern_name = pattern.get('pattern', '')
            signal = pattern.get('signal', '')
            target = pattern.get('target')

            priority = self.signal_priorities.get(pattern_name, AlertPriority.MEDIUM)
            emoji = '🟢' if signal == 'bullish' else '🔴' if signal == 'bearish' else '⚪'

            message = f"{emoji} {pattern_name.replace('_', ' ').title()} détecté sur {symbol}\n"
            message += f"Signal: {signal.upper()}"
            if target:
                message += f"\nObjectif: ${target:.2f}"

            alerts.append(Alert(
                alert_type=AlertType.PATTERN,
                priority=priority,
                symbol=symbol,
                title=f"Chart Pattern: {pattern_name.replace('_', ' ').title()}",
                message=message,
                details=pattern,
                timestamp=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=48)
            ))

        return alerts

    def _check_confluence_alerts(self, symbol: str, analysis: Dict) -> List[Alert]:
        """Vérifie la confluence multi-timeframe pour alertes"""
        alerts = []

        confluence = analysis.get('confluence', {})
        score = confluence.get('score', 0)
        direction = confluence.get('direction', 'neutral')
        alignment = confluence.get('alignment', {})

        if score >= self.thresholds['confluence_score'] and direction != 'neutral':
            priority = AlertPriority.HIGH if score >= 80 else AlertPriority.MEDIUM

            # Compter les timeframes alignés
            aligned_count = sum(1 for tf, dir in alignment.items() if dir == direction)
            total_tf = len(alignment)

            emoji = '🟢' if direction == 'bullish' else '🔴'

            alerts.append(Alert(
                alert_type=AlertType.CONFLUENCE,
                priority=priority,
                symbol=symbol,
                title=f"Confluence {direction.upper()}",
                message=f"{emoji} **CONFLUENCE DÉTECTÉE** sur {symbol}\n\n"
                        f"Direction: {direction.upper()}\n"
                        f"Score: {score}/100\n"
                        f"Alignement: {aligned_count}/{total_tf} timeframes\n\n"
                        f"💡 Opportunité de trading à fort potentiel",
                details={
                    'score': score,
                    'direction': direction,
                    'alignment': alignment
                },
                timestamp=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=12)
            ))

        return alerts

    def _check_smart_money_alerts(self, symbol: str, analysis: Dict) -> List[Alert]:
        """Vérifie les signaux Smart Money pour alertes"""
        alerts = []

        smart_money = analysis.get('smart_money', {})

        # Order Blocks
        order_blocks = smart_money.get('order_blocks', [])
        for ob in order_blocks:
            if ob.get('strength', 0) >= 0.7:
                ob_type = ob.get('type', 'unknown')
                price_range = f"${ob.get('low', 0):.2f} - ${ob.get('high', 0):.2f}"

                emoji = '🟢' if ob_type == 'bullish' else '🔴'

                alerts.append(Alert(
                    alert_type=AlertType.SMART_MONEY,
                    priority=AlertPriority.HIGH,
                    symbol=symbol,
                    title=f"Order Block {ob_type.title()}",
                    message=f"{emoji} **ORDER BLOCK** détecté sur {symbol}\n\n"
                            f"Type: {ob_type.upper()}\n"
                            f"Zone: {price_range}\n"
                            f"Force: {ob.get('strength', 0)*100:.0f}%\n\n"
                            f"🏦 Zone institutionnelle potentielle",
                    details=ob,
                    timestamp=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=48)
                ))

        # Fair Value Gaps
        fvgs = smart_money.get('fair_value_gaps', [])
        for fvg in fvgs[:2]:  # Max 2 FVG alertes
            fvg_type = fvg.get('type', 'unknown')
            fvg_size = fvg.get('size_pct', 0)

            if fvg_size >= 0.5:  # FVG significatif (>0.5%)
                emoji = '🟢' if fvg_type == 'bullish' else '🔴'

                alerts.append(Alert(
                    alert_type=AlertType.SMART_MONEY,
                    priority=AlertPriority.MEDIUM,
                    symbol=symbol,
                    title=f"Fair Value Gap {fvg_type.title()}",
                    message=f"{emoji} **FVG** détecté sur {symbol}\n\n"
                            f"Type: {fvg_type.upper()}\n"
                            f"Taille: {fvg_size:.2f}%\n\n"
                            f"📊 Zone de déséquilibre prix/volume",
                    details=fvg,
                    timestamp=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=24)
                ))

        # Liquidity Zones
        liquidity = smart_money.get('liquidity_zones', {})
        above = liquidity.get('above_price', [])
        below = liquidity.get('below_price', [])

        # Alerte si liquidité proche (dans les 2%)
        current_price = analysis.get('current_price', 0)
        if current_price > 0:
            for liq in above[:1]:
                distance = (liq - current_price) / current_price * 100
                if distance <= 2:
                    alerts.append(Alert(
                        alert_type=AlertType.SMART_MONEY,
                        priority=AlertPriority.MEDIUM,
                        symbol=symbol,
                        title="Liquidité Proche",
                        message=f"⚠️ **LIQUIDITÉ** proche sur {symbol}\n\n"
                                f"Zone: ${liq:.2f} ({distance:.1f}% au-dessus)\n\n"
                                f"🎯 Potentiel mouvement de chasse aux stops",
                        details={'zone': liq, 'distance_pct': distance, 'direction': 'above'},
                        timestamp=datetime.now(),
                        expires_at=datetime.now() + timedelta(hours=12)
                    ))

        return alerts

    def _check_structure_alerts(self, symbol: str, analysis: Dict) -> List[Alert]:
        """Vérifie les changements de structure de marché pour alertes"""
        alerts = []

        if not self.thresholds['structure_change']:
            return alerts

        structure = analysis.get('market_structure', {})

        # Break of Structure (BOS)
        bos = structure.get('bos')
        if bos:
            bos_type = bos.get('type', 'unknown')
            bos_level = bos.get('level', 0)

            emoji = '🟢' if 'bullish' in bos_type else '🔴'
            priority = self.signal_priorities.get(bos_type, AlertPriority.HIGH)

            alerts.append(Alert(
                alert_type=AlertType.STRUCTURE,
                priority=priority,
                symbol=symbol,
                title=f"Break of Structure {bos_type.replace('bos_', '').title()}",
                message=f"{emoji} **BREAK OF STRUCTURE** sur {symbol}\n\n"
                        f"Type: {bos_type.upper()}\n"
                        f"Niveau cassé: ${bos_level:.2f}\n\n"
                        f"📈 Continuation de tendance probable",
                details=bos,
                timestamp=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=24)
            ))

        # Change of Character (CHoCH)
        choch = structure.get('choch')
        if choch:
            choch_type = choch.get('type', 'unknown')
            choch_level = choch.get('level', 0)

            emoji = '🟢' if 'bullish' in choch_type else '🔴'
            priority = self.signal_priorities.get(choch_type, AlertPriority.CRITICAL)

            alerts.append(Alert(
                alert_type=AlertType.STRUCTURE,
                priority=priority,
                symbol=symbol,
                title=f"Change of Character {choch_type.replace('choch_', '').title()}",
                message=f"{emoji} **CHANGE OF CHARACTER** sur {symbol}\n\n"
                        f"⚠️ SIGNAL MAJEUR - Renversement potentiel\n\n"
                        f"Type: {choch_type.upper()}\n"
                        f"Niveau: ${choch_level:.2f}\n\n"
                        f"🔄 Changement de tendance possible",
                details=choch,
                timestamp=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=48)
            ))

        return alerts

    async def check_price_target_alerts(
        self,
        symbol: str,
        current_price: float,
        targets: Dict
    ) -> List[Alert]:
        """
        Vérifie si un prix cible est atteint

        Args:
            symbol: Symbole
            current_price: Prix actuel
            targets: Dictionnaire des cibles (entry, stop_loss, take_profit)

        Returns:
            Liste des alertes
        """
        alerts = []

        entry = targets.get('entry', 0)
        stop_loss = targets.get('stop_loss', 0)
        take_profits = targets.get('take_profit', [])

        # Alerte entrée atteinte
        if entry > 0:
            distance_to_entry = abs(current_price - entry) / entry * 100
            if distance_to_entry <= 0.5:  # Dans les 0.5% de l'entrée
                alerts.append(Alert(
                    alert_type=AlertType.PRICE_TARGET,
                    priority=AlertPriority.HIGH,
                    symbol=symbol,
                    title="Prix d'entrée atteint",
                    message=f"🎯 **ENTRÉE** atteinte sur {symbol}\n\n"
                            f"Prix actuel: ${current_price:.2f}\n"
                            f"Prix d'entrée: ${entry:.2f}\n\n"
                            f"✅ Opportunité d'entrer en position",
                    details={'entry': entry, 'current': current_price},
                    timestamp=datetime.now(),
                    expires_at=datetime.now() + timedelta(hours=1)
                ))

        # Alerte stop loss proche
        if stop_loss > 0:
            distance_to_sl = abs(current_price - stop_loss) / current_price * 100
            if distance_to_sl <= 1:  # Dans les 1% du stop
                alerts.append(Alert(
                    alert_type=AlertType.PRICE_TARGET,
                    priority=AlertPriority.CRITICAL,
                    symbol=symbol,
                    title="Stop Loss proche",
                    message=f"⚠️ **STOP LOSS** proche sur {symbol}\n\n"
                            f"Prix actuel: ${current_price:.2f}\n"
                            f"Stop Loss: ${stop_loss:.2f}\n"
                            f"Distance: {distance_to_sl:.2f}%\n\n"
                            f"🛡️ Gérer le risque!",
                    details={'stop_loss': stop_loss, 'current': current_price},
                    timestamp=datetime.now(),
                    expires_at=datetime.now() + timedelta(minutes=30)
                ))

        # Alerte take profit atteint
        for i, tp in enumerate(take_profits, 1):
            if tp > 0:
                distance_to_tp = abs(current_price - tp) / tp * 100
                if distance_to_tp <= 0.5:
                    alerts.append(Alert(
                        alert_type=AlertType.PRICE_TARGET,
                        priority=AlertPriority.HIGH,
                        symbol=symbol,
                        title=f"Take Profit {i} atteint",
                        message=f"🎉 **TAKE PROFIT {i}** atteint sur {symbol}\n\n"
                                f"Prix actuel: ${current_price:.2f}\n"
                                f"TP{i}: ${tp:.2f}\n\n"
                                f"💰 Considérer prise de profits",
                        details={'take_profit': tp, 'tp_level': i, 'current': current_price},
                        timestamp=datetime.now(),
                        expires_at=datetime.now() + timedelta(hours=1)
                    ))

        return alerts

    def format_alert_message(self, alert: Alert) -> str:
        """
        Formate une alerte pour affichage Telegram

        Args:
            alert: L'alerte à formater

        Returns:
            Message formaté
        """
        # Header avec priorité
        priority_emoji = {
            AlertPriority.LOW: '📢',
            AlertPriority.MEDIUM: '📣',
            AlertPriority.HIGH: '🔔',
            AlertPriority.CRITICAL: '🚨'
        }

        header_emoji = priority_emoji.get(alert.priority, '📢')
        priority_text = alert.priority.name

        # Type d'alerte
        type_emoji = {
            AlertType.PATTERN: '📊',
            AlertType.CONFLUENCE: '🎯',
            AlertType.SMART_MONEY: '🏦',
            AlertType.STRUCTURE: '📈',
            AlertType.PRICE_TARGET: '💰',
            AlertType.ECONOMIC_EVENT: '📅',
            AlertType.EARNINGS: '📋'
        }

        type_icon = type_emoji.get(alert.alert_type, '📌')

        # Construction du message
        text = f"{header_emoji} **ALERTE {priority_text}** {header_emoji}\n"
        text += "━" * 25 + "\n\n"
        text += f"{type_icon} **{alert.symbol}**\n\n"
        text += alert.message + "\n\n"
        text += "━" * 25 + "\n"
        text += f"🕐 {alert.timestamp.strftime('%H:%M:%S')}"

        return text

    def format_alerts_summary(self, alerts: List[Alert]) -> str:
        """
        Formate un résumé de plusieurs alertes

        Args:
            alerts: Liste des alertes

        Returns:
            Message formaté
        """
        if not alerts:
            return "✅ Aucune alerte active"

        # Trier par priorité
        alerts.sort(key=lambda x: x.priority.value, reverse=True)

        text = "🔔 **ALERTES SMART** 🔔\n"
        text += "━" * 25 + "\n\n"

        # Grouper par priorité
        critical = [a for a in alerts if a.priority == AlertPriority.CRITICAL]
        high = [a for a in alerts if a.priority == AlertPriority.HIGH]
        medium = [a for a in alerts if a.priority == AlertPriority.MEDIUM]
        low = [a for a in alerts if a.priority == AlertPriority.LOW]

        if critical:
            text += "🚨 **CRITIQUES**\n"
            for a in critical[:3]:
                text += f"  • {a.symbol}: {a.title}\n"
            text += "\n"

        if high:
            text += "🔔 **HAUTES**\n"
            for a in high[:5]:
                text += f"  • {a.symbol}: {a.title}\n"
            text += "\n"

        if medium:
            text += "📣 **MOYENNES**\n"
            for a in medium[:5]:
                text += f"  • {a.symbol}: {a.title}\n"
            text += "\n"

        if low:
            text += f"📢 **BASSES**: {len(low)} alerte(s)\n\n"

        text += "━" * 25 + "\n"
        text += f"Total: {len(alerts)} alerte(s) active(s)"

        return text


# Instance globale
smart_alerts = SmartAlertsService()

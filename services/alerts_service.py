"""
Service d'alertes de prix et monitoring
Gere les alertes personnalisees, divergences RSI, et watchlist intelligente
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

from database.manager import db_manager
from services.market_data import market_data_service
import config


class AlertsService:
    """Service de gestion des alertes de prix"""

    def __init__(self):
        self.running = False
        self.check_interval = 60  # Verifier toutes les 60 secondes

    async def start(self, bot):
        """Demarre le service d'alertes"""
        self.bot = bot
        self.running = True
        print("[ALERTS] Service d'alertes demarre")
        asyncio.create_task(self._alert_loop())

    def stop(self):
        """Arrete le service"""
        self.running = False
        print("[ALERTS] Service d'alertes arrete")

    async def _alert_loop(self):
        """Boucle principale de verification des alertes"""
        while self.running:
            try:
                await self._check_price_alerts()
                await self._check_smart_watchlist()
                await self._check_conditional_orders()
            except Exception as e:
                print(f"[ALERTS] Erreur dans la boucle: {e}")

            await asyncio.sleep(self.check_interval)

    # ===== ALERTES DE PRIX PERSONNALISEES =====

    async def create_alert(self, telegram_id: int, symbol: str, market: str,
                          condition: str, target_price: float) -> Dict:
        """Cree une nouvelle alerte de prix"""
        try:
            alert_id = await db_manager.create_price_alert(
                telegram_id, symbol, market, condition, target_price
            )
            return {
                'success': True,
                'alert_id': alert_id,
                'message': f"Alerte creee: {symbol} {condition} {target_price}"
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def get_user_alerts(self, telegram_id: int) -> List[Dict]:
        """Recupere les alertes actives d'un utilisateur"""
        return await db_manager.get_user_price_alerts(telegram_id)

    async def delete_alert(self, alert_id: int, telegram_id: int) -> bool:
        """Supprime une alerte"""
        return await db_manager.delete_price_alert(alert_id, telegram_id)

    async def _check_price_alerts(self):
        """Verifie toutes les alertes actives"""
        alerts = await db_manager.get_all_active_alerts()

        for alert in alerts:
            try:
                current_price = await market_data_service.get_current_price(alert['asset_symbol'])
                if not current_price:
                    continue

                triggered = False
                if alert['condition'] == 'above' and current_price >= alert['target_price']:
                    triggered = True
                elif alert['condition'] == 'below' and current_price <= alert['target_price']:
                    triggered = True

                if triggered:
                    await self._send_alert_notification(alert, current_price)
                    await db_manager.mark_alert_triggered(alert['id'])

            except Exception as e:
                print(f"[ALERTS] Erreur verification alerte {alert['id']}: {e}")

    async def _send_alert_notification(self, alert: Dict, current_price: float):
        """Envoie une notification d'alerte declenchee"""
        condition_text = "au-dessus de" if alert['condition'] == 'above' else "en-dessous de"

        message = (
            f"🚨 ALERTE PRIX DECLENCHEE!\n\n"
            f"📊 {alert['asset_symbol']}\n"
            f"💰 Prix actuel: ${current_price:,.2f}\n"
            f"🎯 Condition: {condition_text} ${alert['target_price']:,.2f}\n\n"
            f"L'alerte a ete desactivee automatiquement."
        )

        try:
            await self.bot.send_message(chat_id=alert['telegram_id'], text=message)
        except Exception as e:
            print(f"[ALERTS] Erreur envoi notification: {e}")

    # ===== WATCHLIST INTELLIGENTE =====

    async def add_to_watchlist(self, telegram_id: int, symbol: str, market: str,
                               threshold: float = 5.0) -> Dict:
        """Ajoute un actif a la watchlist intelligente"""
        try:
            current_price = await market_data_service.get_current_price(symbol)
            await db_manager.add_to_smart_watchlist(
                telegram_id, symbol, market, threshold, current_price
            )
            return {
                'success': True,
                'message': f"{symbol} ajoute a la watchlist (seuil: {threshold}%)"
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def get_watchlist(self, telegram_id: int) -> List[Dict]:
        """Recupere la watchlist d'un utilisateur"""
        return await db_manager.get_smart_watchlist(telegram_id)

    async def remove_from_watchlist(self, telegram_id: int, symbol: str) -> bool:
        """Retire un actif de la watchlist"""
        return await db_manager.remove_from_smart_watchlist(telegram_id, symbol)

    async def _check_smart_watchlist(self):
        """Verifie les mouvements sur les watchlists"""
        watchlist_items = await db_manager.get_all_watchlist_items()

        for item in watchlist_items:
            try:
                if item['alerts_today'] >= 3:  # Max 3 alertes par jour par actif
                    continue

                current_price = await market_data_service.get_current_price(item['asset_symbol'])
                if not current_price or not item['last_price']:
                    await db_manager.update_watchlist_price(item['id'], current_price)
                    continue

                change_percent = ((current_price - item['last_price']) / item['last_price']) * 100

                if abs(change_percent) >= item['alert_threshold']:
                    await self._send_watchlist_alert(item, current_price, change_percent)
                    await db_manager.update_watchlist_price(item['id'], current_price)
                    await db_manager.increment_watchlist_alerts(item['id'])

            except Exception as e:
                print(f"[ALERTS] Erreur watchlist {item['asset_symbol']}: {e}")

    async def _send_watchlist_alert(self, item: Dict, price: float, change: float):
        """Envoie une alerte de mouvement watchlist"""
        emoji = "🟢" if change > 0 else "🔴"
        direction = "hausse" if change > 0 else "baisse"

        message = (
            f"{emoji} MOUVEMENT DETECTE!\n\n"
            f"📊 {item['asset_symbol']}\n"
            f"💰 Prix: ${price:,.2f}\n"
            f"📈 Variation: {change:+.2f}% ({direction})\n"
            f"⏰ Seuil configure: {item['alert_threshold']}%"
        )

        try:
            await self.bot.send_message(chat_id=item['telegram_id'], text=message)
        except Exception as e:
            print(f"[ALERTS] Erreur envoi watchlist alert: {e}")

    # ===== ORDRES CONDITIONNELS (SL/TP AUTO) =====

    async def create_conditional_order(self, telegram_id: int, position_id: int,
                                       order_type: str, trigger_price: float) -> Dict:
        """Cree un ordre conditionnel"""
        try:
            order_id = await db_manager.create_conditional_order(
                telegram_id, position_id, order_type, trigger_price
            )
            return {
                'success': True,
                'order_id': order_id,
                'message': f"Ordre {order_type} cree a ${trigger_price}"
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _check_conditional_orders(self):
        """Verifie les ordres conditionnels"""
        orders = await db_manager.get_active_conditional_orders()

        for order in orders:
            try:
                position = await db_manager.get_position_by_id(order['position_id'])
                if not position or position['status'] != 'open':
                    await db_manager.deactivate_conditional_order(order['id'])
                    continue

                current_price = await market_data_service.get_current_price(position['asset_symbol'])
                if not current_price:
                    continue

                should_trigger = False
                if order['order_type'] == 'stop_loss':
                    if position['direction'] == 'LONG' and current_price <= order['trigger_price']:
                        should_trigger = True
                    elif position['direction'] == 'SHORT' and current_price >= order['trigger_price']:
                        should_trigger = True
                elif order['order_type'] == 'take_profit':
                    if position['direction'] == 'LONG' and current_price >= order['trigger_price']:
                        should_trigger = True
                    elif position['direction'] == 'SHORT' and current_price <= order['trigger_price']:
                        should_trigger = True

                if should_trigger:
                    await self._execute_conditional_order(order, position, current_price)

            except Exception as e:
                print(f"[ALERTS] Erreur ordre conditionnel {order['id']}: {e}")

    async def _execute_conditional_order(self, order: Dict, position: Dict, price: float):
        """Execute un ordre conditionnel"""
        # Fermer la position
        close_reason = 'sl' if order['order_type'] == 'stop_loss' else 'tp1'
        result = await db_manager.close_position(position['position_code'], price, close_reason)

        if result:
            await db_manager.mark_order_triggered(order['id'])

            emoji = "🛑" if order['order_type'] == 'stop_loss' else "🎯"
            order_name = "STOP-LOSS" if order['order_type'] == 'stop_loss' else "TAKE-PROFIT"

            pnl = result.get('pnl', 0)
            pnl_emoji = "🟢" if pnl >= 0 else "🔴"

            message = (
                f"{emoji} ORDRE {order_name} EXECUTE!\n\n"
                f"📊 {position['asset_symbol']} ({position['direction']})\n"
                f"💰 Prix de fermeture: ${price:,.2f}\n"
                f"{pnl_emoji} PnL: ${pnl:+,.2f}\n\n"
                f"Position fermee automatiquement."
            )

            try:
                await self.bot.send_message(chat_id=order['telegram_id'], text=message)
            except Exception as e:
                print(f"[ALERTS] Erreur envoi notification ordre: {e}")


# Instance globale
alerts_service = AlertsService()

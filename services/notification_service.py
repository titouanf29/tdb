"""
Service de Notifications - Alertes push en temps reel
Gere les alertes de prix, volatilite et ordres SL/TP
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import yfinance as yf
from telegram import Bot
from database.manager import db_manager


class NotificationService:
    """Service de notifications push"""

    def __init__(self):
        self.bot: Optional[Bot] = None
        self.running = False
        self._price_check_task = None
        self._volatility_check_task = None
        self._sltp_check_task = None

        # Cache des derniers prix pour calculer la volatilite
        self._price_history: Dict[str, List[Dict]] = {}

        # Intervalles de verification (en secondes)
        self.price_check_interval = 60      # 1 minute
        self.volatility_check_interval = 120  # 2 minutes
        self.sltp_check_interval = 30       # 30 secondes

    async def start(self, bot: Bot):
        """Demarre le service de notifications"""
        self.bot = bot
        self.running = True

        # Demarrer les taches de verification
        # NOTE: Les alertes de prix sont gerees par alerts_service.py pour eviter les doublons
        # self._price_check_task = asyncio.create_task(self._price_alert_loop())
        self._volatility_check_task = asyncio.create_task(self._volatility_alert_loop())
        self._sltp_check_task = asyncio.create_task(self._sltp_check_loop())

        print("✅ NotificationService started (volatility + SL/TP)")

    async def stop(self):
        """Arrete le service"""
        self.running = False

        for task in [self._price_check_task, self._volatility_check_task, self._sltp_check_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        print("🛑 NotificationService stopped")

    # ===== ALERTES DE PRIX =====

    async def _price_alert_loop(self):
        """Boucle de verification des alertes de prix"""
        while self.running:
            try:
                await self._check_price_alerts()
            except Exception as e:
                print(f"❌ Price alert error: {e}")

            await asyncio.sleep(self.price_check_interval)

    async def _check_price_alerts(self):
        """Verifie toutes les alertes de prix actives"""
        alerts = await db_manager.get_all_active_alerts()

        if not alerts:
            return

        # Grouper par symbole pour optimiser les appels API
        symbols = list(set(a['asset_symbol'] for a in alerts))
        prices = await self._get_multiple_prices(symbols)

        for alert in alerts:
            symbol = alert['asset_symbol']
            if symbol not in prices:
                continue

            current_price = prices[symbol]
            target_price = alert['target_price']
            condition = alert['condition']

            triggered = False
            if condition == 'above' and current_price >= target_price:
                triggered = True
            elif condition == 'below' and current_price <= target_price:
                triggered = True

            if triggered:
                await self._send_price_alert(alert, current_price)
                await db_manager.deactivate_alert(alert['id'])

    async def _send_price_alert(self, alert: Dict, current_price: float):
        """Envoie une notification d'alerte de prix"""
        if not self.bot:
            return

        cond_text = "atteint" if alert['condition'] == 'above' else "descendu sous"
        emoji = "🚀" if alert['condition'] == 'above' else "📉"

        message = f"""
{emoji} **ALERTE PRIX DECLENCHEE**
━━━━━━━━━━━━━━━━━━━━

📊 **{alert['asset_symbol']}**
💰 Prix actuel: ${current_price:,.2f}
🎯 Objectif: ${alert['target_price']:,.2f}

✅ Le prix a {cond_text} votre cible!
"""

        try:
            await self.bot.send_message(
                chat_id=alert['user_id'],
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"❌ Failed to send alert to {alert['user_id']}: {e}")

    # ===== ALERTES DE VOLATILITE =====

    async def _volatility_alert_loop(self):
        """Boucle de verification des alertes de volatilite"""
        while self.running:
            try:
                await self._check_volatility_alerts()
            except Exception as e:
                print(f"❌ Volatility alert error: {e}")

            await asyncio.sleep(self.volatility_check_interval)

    async def _check_volatility_alerts(self):
        """Verifie les mouvements de volatilite sur la watchlist"""
        watchlist_items = await db_manager.get_all_watchlist_items()

        if not watchlist_items:
            return

        symbols = list(set(w['asset_symbol'] for w in watchlist_items))
        prices = await self._get_multiple_prices(symbols)

        now = datetime.now()

        for item in watchlist_items:
            symbol = item['asset_symbol']
            if symbol not in prices:
                continue

            current_price = prices[symbol]
            threshold = item['alert_threshold']

            # Initialiser l'historique si necessaire
            if symbol not in self._price_history:
                self._price_history[symbol] = []

            # Ajouter le prix actuel
            self._price_history[symbol].append({
                'price': current_price,
                'time': now
            })

            # Garder seulement les 60 derniers points (1h a 1min d'intervalle)
            self._price_history[symbol] = self._price_history[symbol][-60:]

            # Verifier le mouvement sur les 5 derniers points minimum
            if len(self._price_history[symbol]) >= 5:
                prices_list = [p['price'] for p in self._price_history[symbol][-10:]]
                min_price = min(prices_list)
                max_price = max(prices_list)

                if min_price > 0:
                    movement = ((max_price - min_price) / min_price) * 100

                    if movement >= threshold:
                        await self._send_volatility_alert(item, current_price, movement)
                        # Eviter les alertes repetees - reinitialiser l'historique
                        self._price_history[symbol] = []

    async def _send_volatility_alert(self, item: Dict, current_price: float, movement: float):
        """Envoie une notification d'alerte de volatilite"""
        if not self.bot:
            return

        emoji = "🔥" if movement > 5 else "⚡"

        message = f"""
{emoji} **ALERTE VOLATILITE**
━━━━━━━━━━━━━━━━━━━━

📊 **{item['asset_symbol']}**
💰 Prix actuel: ${current_price:,.2f}
📈 Mouvement: {movement:.1f}%

⚠️ Mouvement superieur a votre seuil ({item['alert_threshold']}%)
"""

        try:
            await self.bot.send_message(
                chat_id=item['user_id'],
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"❌ Failed to send volatility alert to {item['user_id']}: {e}")

    # ===== ORDRES SL/TP =====

    async def _sltp_check_loop(self):
        """Boucle de verification des ordres SL/TP"""
        while self.running:
            try:
                await self._check_sltp_orders()
            except Exception as e:
                print(f"❌ SL/TP check error: {e}")

            await asyncio.sleep(self.sltp_check_interval)

    async def _check_sltp_orders(self):
        """Verifie et execute les ordres SL/TP"""
        orders = await db_manager.get_pending_conditional_orders()

        if not orders:
            return

        symbols = list(set(o['asset_symbol'] for o in orders))
        prices = await self._get_multiple_prices(symbols)

        for order in orders:
            symbol = order['asset_symbol']
            if symbol not in prices:
                continue

            current_price = prices[symbol]
            executed = False
            execution_type = None

            # Verifier Stop Loss
            if order['stop_loss'] and current_price <= order['stop_loss']:
                executed = True
                execution_type = 'STOP_LOSS'
                execution_price = order['stop_loss']

            # Verifier Take Profit
            elif order['take_profit'] and current_price >= order['take_profit']:
                executed = True
                execution_type = 'TAKE_PROFIT'
                execution_price = order['take_profit']

            if executed:
                await self._execute_sltp_order(order, execution_type, execution_price, current_price)

    async def _execute_sltp_order(self, order: Dict, execution_type: str,
                                   trigger_price: float, current_price: float):
        """Execute un ordre SL/TP"""
        user_id = order['user_id']
        symbol = order['asset_symbol']
        quantity = order['quantity']

        # Calculer le P&L
        entry_price = order.get('entry_price', current_price)
        pnl = (current_price - entry_price) * quantity

        # Mettre a jour la position dans le wallet
        try:
            # Vendre la position
            await db_manager.update_position_after_sltp(
                user_id=user_id,
                symbol=symbol,
                quantity=quantity,
                execution_price=current_price,
                pnl=pnl
            )

            # Marquer l'ordre comme execute
            await db_manager.mark_order_executed(order['id'], execution_type, current_price)

            # Envoyer notification
            await self._send_sltp_notification(order, execution_type, current_price, pnl)

        except Exception as e:
            print(f"❌ Failed to execute SL/TP order {order['id']}: {e}")

    async def _send_sltp_notification(self, order: Dict, execution_type: str,
                                       execution_price: float, pnl: float):
        """Envoie une notification d'execution SL/TP"""
        if not self.bot:
            return

        if execution_type == 'STOP_LOSS':
            emoji = "🛑"
            title = "STOP LOSS DECLENCHE"
        else:
            emoji = "🎯"
            title = "TAKE PROFIT ATTEINT"

        pnl_emoji = "🟢" if pnl >= 0 else "🔴"

        message = f"""
{emoji} **{title}**
━━━━━━━━━━━━━━━━━━━━

📊 **{order['asset_symbol']}**
📦 Quantite: {order['quantity']}
💰 Prix execution: ${execution_price:,.2f}

{pnl_emoji} **P&L: ${pnl:+,.2f}**

✅ Position automatiquement fermee
"""

        try:
            await self.bot.send_message(
                chat_id=order['user_id'],
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"❌ Failed to send SL/TP notification to {order['user_id']}: {e}")

    # ===== UTILITAIRES =====

    async def _get_multiple_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Recupere les prix de plusieurs symboles"""
        prices = {}

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                data = ticker.fast_info
                price = data.get('lastPrice') or data.get('regularMarketPrice')
                if price:
                    prices[symbol] = price
            except:
                continue

        return prices

    async def send_custom_notification(self, user_id: int, message: str):
        """Envoie une notification personnalisee"""
        if not self.bot:
            return False

        try:
            await self.bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown'
            )
            return True
        except:
            return False


# Instance globale
notification_service = NotificationService()

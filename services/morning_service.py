"""
Service de Resume Matinal et Export
Resume automatique a 8h, export PDF/CSV des performances
"""
import asyncio
import io
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import pytz

from database.manager import db_manager
from services.market_data import market_data_service
from ai.analyzer import analyzer
from utils.asset_names import get_asset_display_name
import config

# Import optionnel pour PDF
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import cm
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("[MORNING] ReportLab non disponible - export PDF desactive")


class MorningService:
    """Service de resume matinal et export"""

    def __init__(self):
        self.running = False
        self.morning_hour = 8  # 8h du matin
        self.timezone = pytz.timezone('Europe/Paris')

    async def start(self, bot):
        """Demarre le service"""
        self.bot = bot
        self.running = True
        print("[MORNING] Service de resume matinal demarre")
        asyncio.create_task(self._morning_loop())

    def stop(self):
        """Arrete le service"""
        self.running = False

    async def _morning_loop(self):
        """Boucle pour envoyer le resume matinal"""
        while self.running:
            try:
                now = datetime.now(self.timezone)

                # Verifier si c'est l'heure du resume (8h)
                if now.hour == self.morning_hour and now.minute < 5:
                    await self._send_morning_summaries()
                    # Attendre 1h pour eviter les doublons
                    await asyncio.sleep(3600)
                else:
                    # Verifier toutes les 5 minutes
                    await asyncio.sleep(300)

            except Exception as e:
                print(f"[MORNING] Erreur: {e}")
                await asyncio.sleep(60)

    async def _send_morning_summaries(self):
        """Envoie les resumes matinaux aux utilisateurs abonnes"""
        users = await db_manager.get_users_with_daily_summary()

        for user in users:
            try:
                summary = await self.generate_morning_summary(user['telegram_id'])
                await self.bot.send_message(
                    chat_id=user['telegram_id'],
                    text=summary,
                    parse_mode='HTML'
                )
            except Exception as e:
                print(f"[MORNING] Erreur envoi resume {user['telegram_id']}: {e}")

    async def generate_morning_summary(self, telegram_id: int) -> str:
        """Genere le resume matinal personnalise"""
        now = datetime.now(self.timezone)

        # 1. Performances du wallet
        wallet = await db_manager.get_wallet(telegram_id)
        positions = await db_manager.get_open_positions(telegram_id)

        # 2. Marches overnight
        markets_summary = await self._get_overnight_markets()

        # 3. Favoris de l'utilisateur
        favorites = await db_manager.get_favorites(telegram_id)
        favorites_perfs = []
        for fav in favorites[:5]:
            try:
                data = await market_data_service.get_historical_data(
                    fav['asset_symbol'], period='2d', interval='1d'
                )
                if data is not None and len(data) >= 2:
                    perf = ((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1) * 100
                    favorites_perfs.append({
                        'symbol': fav['asset_symbol'],
                        'perf': perf,
                        'price': data['Close'].iloc[-1]
                    })
            except:
                pass

        # 4. Alertes actives
        alerts = await db_manager.get_user_price_alerts(telegram_id)

        # Construire le message
        message = f"☀️ <b>RESUME MATINAL</b> - {now.strftime('%d/%m/%Y')}\n"
        message += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Wallet
        if wallet:
            total_pnl = wallet['total_pnl']
            pnl_emoji = "🟢" if total_pnl >= 0 else "🔴"
            message += f"💼 <b>Votre Wallet</b>\n"
            message += f"   Solde: ${wallet['balance']:,.2f}\n"
            message += f"   {pnl_emoji} PnL Total: ${total_pnl:+,.2f}\n"
            message += f"   Positions ouvertes: {len(positions)}\n\n"

        # Marches overnight
        message += f"🌍 <b>Marches cette nuit</b>\n"
        for market, perf in markets_summary.items():
            emoji = "🟢" if perf >= 0 else "🔴"
            message += f"   {emoji} {market}: {perf:+.2f}%\n"
        message += "\n"

        # Favoris
        if favorites_perfs:
            message += f"⭐ <b>Vos Favoris</b>\n"
            for fav in favorites_perfs:
                emoji = "🟢" if fav['perf'] >= 0 else "🔴"
                name = get_asset_display_name(fav['symbol'])
                display = f"{fav['symbol']} ({name})" if name != fav['symbol'] else fav['symbol']
                message += f"   {emoji} {display}: ${fav['price']:,.2f} ({fav['perf']:+.2f}%)\n"
            message += "\n"

        # Alertes
        if alerts:
            message += f"🔔 <b>Alertes Actives</b>: {len(alerts)}\n\n"

        # Conseil du jour (simple)
        tip = self._get_daily_tip()
        message += f"💡 <b>Conseil du jour</b>\n{tip}\n\n"

        message += "Bonne journee de trading! 📈"

        return message

    async def _get_overnight_markets(self) -> Dict[str, float]:
        """Recupere les performances des marches overnight"""
        markets = {
            'S&P 500': '^GSPC',
            'Nasdaq': '^IXIC',
            'Bitcoin': 'BTC-USD',
            'Or': 'GC=F',
            'EUR/USD': 'EURUSD=X'
        }

        results = {}
        for name, symbol in markets.items():
            try:
                data = await market_data_service.get_historical_data(symbol, period='2d', interval='1d')
                if data is not None and len(data) >= 2:
                    perf = ((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1) * 100
                    results[name] = perf
            except:
                pass

        return results

    def _get_daily_tip(self) -> str:
        """Retourne un conseil aleatoire"""
        tips = [
            "Ne risquez jamais plus de 2% de votre capital sur un seul trade.",
            "Un bon trader est un trader patient. Attendez les meilleures opportunites.",
            "Toujours utiliser un stop-loss pour proteger votre capital.",
            "Le marche a toujours raison. N'insistez pas contre la tendance.",
            "Diversifiez vos positions pour reduire le risque global.",
            "Gardez un journal de trading pour analyser vos erreurs.",
            "Les emotions sont l'ennemi du trader. Restez rationnel.",
            "N'investissez jamais de l'argent que vous ne pouvez pas perdre.",
            "La gestion du risque est plus importante que la strategie d'entree.",
            "Prenez des profits partiels pour securiser vos gains."
        ]
        from random import choice
        return choice(tips)

    # ===== EXPORT CSV =====

    async def export_history_csv(self, telegram_id: int, period_days: int = 30) -> Optional[io.BytesIO]:
        """Exporte l'historique des trades en CSV"""
        from_date = datetime.now() - timedelta(days=period_days)
        history = await db_manager.get_position_history(telegram_id, from_date=from_date.date())

        if not history:
            return None

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            'Date Ouverture', 'Date Fermeture', 'Symbole', 'Marche',
            'Direction', 'Prix Entree', 'Prix Sortie', 'Montant',
            'Levier', 'PnL', 'PnL %', 'Duree (min)', 'Raison Cloture'
        ])

        # Donnees
        for pos in history:
            writer.writerow([
                pos.get('opened_at', ''),
                pos.get('closed_at', ''),
                pos.get('asset_symbol', ''),
                pos.get('market', ''),
                pos.get('direction', ''),
                f"${pos.get('entry_price', 0):,.2f}",
                f"${pos.get('exit_price', 0):,.2f}",
                f"${pos.get('amount', 0):,.2f}",
                pos.get('leverage', 1),
                f"${pos.get('pnl', 0):+,.2f}",
                f"{pos.get('pnl_percent', 0):+.2f}%",
                pos.get('duration_minutes', 0),
                pos.get('close_reason', '')
            ])

        # Statistiques
        writer.writerow([])
        writer.writerow(['STATISTIQUES'])

        total_trades = len(history)
        winning_trades = len([p for p in history if p['pnl'] > 0])
        total_pnl = sum(p['pnl'] for p in history)
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        writer.writerow(['Total trades', total_trades])
        writer.writerow(['Trades gagnants', winning_trades])
        writer.writerow(['Win rate', f"{win_rate:.1f}%"])
        writer.writerow(['PnL Total', f"${total_pnl:+,.2f}"])

        # Convertir en bytes
        output.seek(0)
        buf = io.BytesIO()
        buf.write(output.getvalue().encode('utf-8'))
        buf.seek(0)

        return buf

    # ===== EXPORT PDF =====

    async def export_history_pdf(self, telegram_id: int, period_days: int = 30) -> Optional[io.BytesIO]:
        """Exporte l'historique des trades en PDF"""
        if not REPORTLAB_AVAILABLE:
            return None

        from_date = datetime.now() - timedelta(days=period_days)
        history = await db_manager.get_position_history(telegram_id, from_date=from_date.date())
        wallet = await db_manager.get_wallet(telegram_id)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)

        elements = []
        styles = getSampleStyleSheet()

        # Titre
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1  # Center
        )
        elements.append(Paragraph("RAPPORT DE TRADING", title_style))
        elements.append(Paragraph(f"Periode: {period_days} derniers jours", styles['Normal']))
        elements.append(Paragraph(f"Genere le: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Resume wallet
        elements.append(Paragraph("<b>RESUME WALLET</b>", styles['Heading2']))
        if wallet:
            wallet_data = [
                ['Solde actuel', f"${wallet['balance']:,.2f}"],
                ['Solde initial', f"${wallet['initial_balance']:,.2f}"],
                ['PnL Total', f"${wallet['total_pnl']:+,.2f}"],
                ['Rendement', f"{((wallet['balance']/wallet['initial_balance'])-1)*100:+.2f}%"]
            ]
            wallet_table = Table(wallet_data, colWidths=[6*cm, 6*cm])
            wallet_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            elements.append(wallet_table)
        elements.append(Spacer(1, 20))

        # Statistiques
        elements.append(Paragraph("<b>STATISTIQUES</b>", styles['Heading2']))

        total_trades = len(history)
        winning = len([p for p in history if p['pnl'] > 0])
        losing = len([p for p in history if p['pnl'] < 0])
        total_pnl = sum(p['pnl'] for p in history)
        win_rate = (winning / total_trades * 100) if total_trades > 0 else 0

        stats_data = [
            ['Total des trades', str(total_trades)],
            ['Trades gagnants', f"{winning} ({win_rate:.1f}%)"],
            ['Trades perdants', str(losing)],
            ['PnL Total', f"${total_pnl:+,.2f}"],
        ]

        if history:
            best_trade = max(history, key=lambda x: x['pnl'])
            worst_trade = min(history, key=lambda x: x['pnl'])
            stats_data.append(['Meilleur trade', f"${best_trade['pnl']:+,.2f} ({best_trade['asset_symbol']})"])
            stats_data.append(['Pire trade', f"${worst_trade['pnl']:+,.2f} ({worst_trade['asset_symbol']})"])

        stats_table = Table(stats_data, colWidths=[6*cm, 6*cm])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 20))

        # Historique des trades
        elements.append(Paragraph("<b>HISTORIQUE DES TRADES</b>", styles['Heading2']))

        if history:
            # Header
            trade_data = [['Date', 'Symbole', 'Dir.', 'Entree', 'Sortie', 'PnL']]

            for pos in history[:50]:  # Limiter a 50 pour le PDF
                pnl_str = f"${pos['pnl']:+,.2f}"
                trade_data.append([
                    pos['closed_at'][:10] if pos['closed_at'] else 'N/A',
                    pos['asset_symbol'],
                    pos['direction'],
                    f"${pos['entry_price']:,.2f}",
                    f"${pos['exit_price']:,.2f}",
                    pnl_str
                ])

            trade_table = Table(trade_data, colWidths=[2.5*cm, 2.5*cm, 1.5*cm, 3*cm, 3*cm, 2.5*cm])
            trade_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(trade_table)
        else:
            elements.append(Paragraph("Aucun trade sur cette periode.", styles['Normal']))

        # Footer
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("Genere par TDB Trading Bot - Paper Trading", styles['Normal']))

        doc.build(elements)
        buf.seek(0)

        return buf


# Instance globale
morning_service = MorningService()

"""
Script de vérification de la base de données
"""
import asyncio
import aiosqlite
import sys

DATABASE_PATH = "database/trading_bot.db"

async def check_db():
    """Vérifie le contenu de la base de données"""

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Récupérer tous les utilisateurs et leurs paramètres
        async with db.execute("""
            SELECT
                telegram_id,
                trading_style,
                risk_per_position,
                max_leverage,
                max_daily_loss,
                stop_loss_mandatory,
                ai_aggressiveness,
                detail_level,
                theme,
                chart_type,
                notifications_enabled,
                summary_time,
                scan_enabled,
                scan_frequency,
                score_min,
                max_alerts_per_day,
                scan_weekends
            FROM user_settings
        """) as cursor:
            rows = await cursor.fetchall()

            if not rows:
                print("❌ Aucun utilisateur dans la base de données")
                print("\n💡 Envoyez /start dans Telegram pour créer votre profil utilisateur")
                return

            print(f"\n✅ {len(rows)} utilisateur(s) trouvé(s) dans la base de données\n")
            print("=" * 80)

            for row in rows:
                print(f"\n👤 User ID: {row[0]}")
                print(f"   📊 Trading:")
                print(f"      • Style: {row[1]}")
                print(f"      • Risque/position: {row[2]}%")
                print(f"      • Levier max: ×{row[3]}")
                print(f"      • Perte max quotidienne: {row[4]}%")
                print(f"      • Stop Loss obligatoire: {'✅ Oui' if row[5] else '❌ Non'}")
                print(f"   🤖 IA:")
                print(f"      • Agressivité: {row[6]}")
                print(f"      • Niveau détail: {row[7]}")
                print(f"   🎨 Interface:")
                print(f"      • Thème: {row[8]}")
                print(f"      • Type de graphiques: {row[9]}")
                print(f"   🔔 Notifications:")
                print(f"      • Activées: {'✅ Oui' if row[10] else '❌ Non'}")
                print(f"      • Heure résumé: {row[11]}")
                print(f"   🔍 Scan Auto:")
                print(f"      • Activé: {'✅ Oui' if row[12] else '❌ Non'}")
                print(f"      • Fréquence: {row[13]}s ({row[13]//60}min)" if row[13] >= 60 else f"      • Fréquence: {row[13]}s")
                print(f"      • Score minimum: {row[14]}/100")
                print(f"      • Alertes max/jour: {row[15]}")
                print(f"      • Scan week-end: {'✅ Oui' if row[16] else '❌ Non'}")
                print("=" * 80)

if __name__ == "__main__":
    asyncio.run(check_db())

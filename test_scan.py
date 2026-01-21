"""
Script de test pour le scan automatique
"""
import asyncio
from database.manager import db_manager

async def test_scan():
    """Teste le scan automatique"""

    print("🔍 Test du scan automatique\n")

    # 1. Vérifier les utilisateurs avec scan activé
    print("1️⃣ Vérification des utilisateurs avec scan activé...")
    users = await db_manager.get_users_with_scan_enabled()

    if not users:
        print("   ❌ Aucun utilisateur avec scan activé")
        print("\n💡 Solution:")
        print("   1. Lancez le bot: python3 main.py")
        print("   2. Dans Telegram, envoyez /start")
        print("   3. Allez dans /menu → Scan Auto → Activer le scan")
        return

    print(f"   ✅ {len(users)} utilisateur(s) trouvé(s)\n")

    # 2. Afficher la config de chaque utilisateur
    for user in users:
        print(f"👤 User ID: {user['telegram_id']}")
        print(f"   📊 Scan activé: {'✅' if user['scan_enabled'] else '❌'}")
        print(f"   ⏱️ Fréquence: {user['scan_frequency']}s")
        print(f"   🎯 Score min: {user['score_min']}/100")
        print(f"   🔔 Alertes max/jour: {user['max_alerts_per_day']}")
        print(f"   📅 Scan week-end: {'✅' if user['scan_weekends'] else '❌'}")
        print()

    # 3. Vérifier si c'est le week-end
    from datetime import datetime
    now = datetime.now()
    is_weekend = now.weekday() >= 5

    if is_weekend:
        print("⚠️  Attention: Nous sommes le week-end!")
        for user in users:
            if not user['scan_weekends']:
                print(f"   User {user['telegram_id']}: Scan week-end désactivé")
        print()

    # 4. Test de scan manuel
    print("4️⃣ Test de scan manuel...")
    from services.auto_scanner import AutoScannerService
    from telegram import Bot

    # Note: Le bot doit avoir un token valide
    try:
        import config
        bot = Bot(token=config.TELEGRAM_TOKEN)
        scanner = AutoScannerService(bot)

        for user in users:
            print(f"\n🔍 Test scan pour user {user['telegram_id']}...")
            await scanner.scan_for_user(user)

    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        print("\n💡 Pour tester complètement, lancez le bot avec: python3 main.py")

if __name__ == "__main__":
    asyncio.run(test_scan())

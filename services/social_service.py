"""
Service Social - Leaderboard, Badges, Challenges, Quiz
"""
import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

from database.manager import db_manager
import config


class SocialService:
    """Service de fonctionnalites sociales et gamification"""

    def __init__(self):
        self.running = False

    async def start(self, bot):
        """Demarre le service social"""
        self.bot = bot
        self.running = True
        print("[SOCIAL] Service social demarre")
        asyncio.create_task(self._social_loop())

    def stop(self):
        """Arrete le service"""
        self.running = False

    async def _social_loop(self):
        """Boucle de mise a jour du leaderboard et challenges"""
        while self.running:
            try:
                await self._update_leaderboard()
                await self._check_challenges()
            except Exception as e:
                print(f"[SOCIAL] Erreur: {e}")

            await asyncio.sleep(3600)  # Toutes les heures

    # ===== LEADERBOARD =====

    async def opt_in_leaderboard(self, telegram_id: int, display_name: str = None) -> Dict:
        """Inscrit un utilisateur au leaderboard"""
        if not display_name:
            display_name = f"Trader_{telegram_id % 10000}"

        await db_manager.opt_in_leaderboard(telegram_id, display_name)
        return {'success': True, 'display_name': display_name}

    async def opt_out_leaderboard(self, telegram_id: int) -> Dict:
        """Desinscrit un utilisateur du leaderboard"""
        await db_manager.opt_out_leaderboard(telegram_id)
        return {'success': True}

    async def get_leaderboard(self, period: str = 'weekly', limit: int = 10) -> List[Dict]:
        """Recupere le classement"""
        return await db_manager.get_leaderboard(period, limit)

    async def get_user_rank(self, telegram_id: int) -> Optional[Dict]:
        """Recupere le rang d'un utilisateur"""
        return await db_manager.get_user_leaderboard_rank(telegram_id)

    async def _update_leaderboard(self):
        """Met a jour les stats du leaderboard"""
        participants = await db_manager.get_leaderboard_participants()

        for user in participants:
            try:
                stats = await db_manager.calculate_user_trading_stats(user['telegram_id'])
                await db_manager.update_leaderboard_stats(user['telegram_id'], stats)
            except Exception as e:
                print(f"[SOCIAL] Erreur update leaderboard {user['telegram_id']}: {e}")

    # ===== BADGES =====

    async def check_and_award_badges(self, telegram_id: int) -> List[Dict]:
        """Verifie et attribue les badges merites"""
        new_badges = []

        # Recuperer les stats de l'utilisateur
        stats = await db_manager.calculate_user_trading_stats(telegram_id)
        quiz_stats = await db_manager.get_user_quiz_stats(telegram_id)

        # Recuperer tous les badges
        all_badges = await db_manager.get_all_badges()

        # Recuperer les badges deja obtenus
        user_badges = await db_manager.get_user_badges(telegram_id)
        earned_codes = [b['code'] for b in user_badges]

        for badge in all_badges:
            if badge['code'] in earned_codes:
                continue

            earned = False

            # Verifier les conditions
            if badge['condition_type'] == 'trades_count':
                earned = stats['total_trades'] >= badge['condition_value']

            elif badge['condition_type'] == 'win_streak':
                earned = stats['current_streak'] >= badge['condition_value']

            elif badge['condition_type'] == 'pnl_total':
                earned = stats['total_pnl'] >= badge['condition_value']

            elif badge['condition_type'] == 'quiz_count':
                if quiz_stats:
                    earned = quiz_stats['total_questions'] >= badge['condition_value']

            elif badge['condition_type'] == 'early_trade':
                earned = stats.get('has_early_trade', False)

            elif badge['condition_type'] == 'night_trade':
                earned = stats.get('has_night_trade', False)

            if earned:
                await db_manager.award_badge(telegram_id, badge['id'])
                new_badges.append(badge)

        return new_badges

    async def get_user_badges(self, telegram_id: int) -> List[Dict]:
        """Recupere les badges d'un utilisateur"""
        return await db_manager.get_user_badges(telegram_id)

    async def notify_new_badge(self, telegram_id: int, badge: Dict):
        """Notifie l'obtention d'un nouveau badge"""
        message = (
            f"🏅 NOUVEAU BADGE DEBLOQUE!\n\n"
            f"{badge['emoji']} {badge['name']}\n"
            f"📝 {badge['description']}\n\n"
            f"Continuez comme ca!"
        )

        try:
            await self.bot.send_message(chat_id=telegram_id, text=message)
        except Exception as e:
            print(f"[SOCIAL] Erreur notification badge: {e}")

    # ===== CHALLENGES HEBDOMADAIRES =====

    async def get_active_challenge(self) -> Optional[Dict]:
        """Recupere le challenge actif"""
        return await db_manager.get_active_challenge()

    async def join_challenge(self, telegram_id: int) -> Dict:
        """Rejoint le challenge actif"""
        challenge = await self.get_active_challenge()
        if not challenge:
            return {'success': False, 'error': 'Pas de challenge actif'}

        await db_manager.join_challenge(challenge['id'], telegram_id)
        return {'success': True, 'challenge': challenge}

    async def get_challenge_leaderboard(self, challenge_id: int = None) -> List[Dict]:
        """Recupere le classement du challenge"""
        if not challenge_id:
            challenge = await self.get_active_challenge()
            if not challenge:
                return []
            challenge_id = challenge['id']

        return await db_manager.get_challenge_leaderboard(challenge_id)

    async def _check_challenges(self):
        """Verifie et cree les challenges hebdomadaires"""
        challenge = await self.get_active_challenge()

        if not challenge:
            await self._create_weekly_challenge()
        else:
            # Mettre a jour les scores
            participants = await db_manager.get_challenge_participants(challenge['id'])
            for p in participants:
                score = await self._calculate_challenge_score(p['telegram_id'], challenge)
                await db_manager.update_challenge_score(challenge['id'], p['telegram_id'], score)

    async def _create_weekly_challenge(self):
        """Cree un nouveau challenge hebdomadaire"""
        today = datetime.now()
        # Lundi de cette semaine
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)

        challenge_types = [
            {
                'type': 'best_pnl',
                'description': 'Meilleur PnL de la semaine',
                'prize': 'Badge "Champion de la Semaine"'
            },
            {
                'type': 'most_trades',
                'description': 'Plus grand nombre de trades',
                'prize': 'Badge "Trader Actif"'
            },
            {
                'type': 'best_trade',
                'description': 'Meilleur trade unique',
                'prize': 'Badge "Coup de Maitre"'
            }
        ]

        challenge = random.choice(challenge_types)

        await db_manager.create_weekly_challenge(
            week_start=monday.date(),
            week_end=sunday.date(),
            challenge_type=challenge['type'],
            description=challenge['description'],
            prize=challenge['prize']
        )

    async def _calculate_challenge_score(self, telegram_id: int, challenge: Dict) -> float:
        """Calcule le score pour un challenge"""
        history = await db_manager.get_position_history(
            telegram_id,
            from_date=challenge['week_start'],
            to_date=challenge['week_end']
        )

        if challenge['challenge_type'] == 'best_pnl':
            return sum(p['pnl'] for p in history)
        elif challenge['challenge_type'] == 'most_trades':
            return len(history)
        elif challenge['challenge_type'] == 'best_trade':
            if history:
                return max(p['pnl'] for p in history)
            return 0

        return 0

    # ===== QUIZ TRADING =====

    async def get_daily_quiz(self, telegram_id: int) -> Optional[Dict]:
        """Recupere le quiz du jour"""
        # Verifier si deja fait aujourd'hui
        stats = await db_manager.get_user_quiz_stats(telegram_id)
        if stats and stats['last_quiz_date'] == datetime.now().date().isoformat():
            return None

        # Recuperer une question aleatoire
        question = await db_manager.get_random_quiz_question()
        return question

    async def answer_quiz(self, telegram_id: int, question_id: int, answer: int) -> Dict:
        """Repond a une question de quiz"""
        question = await db_manager.get_quiz_question(question_id)
        if not question:
            return {'success': False, 'error': 'Question non trouvee'}

        is_correct = answer == question['correct_answer']
        points = question['points'] if is_correct else 0

        # Mettre a jour les stats
        await db_manager.update_quiz_stats(telegram_id, is_correct, points)

        # Verifier les badges
        new_badges = await self.check_and_award_badges(telegram_id)

        options = json.loads(question['options'])

        return {
            'success': True,
            'is_correct': is_correct,
            'correct_answer': question['correct_answer'],
            'correct_option': options[question['correct_answer']],
            'explanation': question['explanation'],
            'points_earned': points,
            'new_badges': new_badges
        }

    async def get_quiz_stats(self, telegram_id: int) -> Dict:
        """Recupere les stats quiz d'un utilisateur"""
        stats = await db_manager.get_user_quiz_stats(telegram_id)
        if not stats:
            return {
                'total_questions': 0,
                'correct_answers': 0,
                'total_points': 0,
                'accuracy': 0,
                'current_streak': 0,
                'best_streak': 0
            }

        accuracy = (stats['correct_answers'] / stats['total_questions'] * 100) if stats['total_questions'] > 0 else 0

        return {
            'total_questions': stats['total_questions'],
            'correct_answers': stats['correct_answers'],
            'total_points': stats['total_points'],
            'accuracy': accuracy,
            'current_streak': stats['current_streak'],
            'best_streak': stats['best_streak']
        }


# Instance globale
social_service = SocialService()

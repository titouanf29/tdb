"""
Utilitaire de Pagination - Gestion des listes longues avec navigation
"""
from typing import List, Any, Dict, Callable, Optional
from telegram import InlineKeyboardButton, InlineKeyboardMarkup


class Paginator:
    """Gestionnaire de pagination pour les listes Telegram"""

    def __init__(self, items_per_page: int = 5):
        self.items_per_page = items_per_page

    def paginate(self, items: List[Any], page: int = 1) -> Dict[str, Any]:
        """
        Pagine une liste d'items

        Returns:
            {
                'items': items de la page courante,
                'page': numero de page actuel,
                'total_pages': nombre total de pages,
                'total_items': nombre total d'items,
                'has_prev': bool,
                'has_next': bool
            }
        """
        total_items = len(items)
        total_pages = max(1, (total_items + self.items_per_page - 1) // self.items_per_page)

        # Normaliser le numero de page
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * self.items_per_page
        end_idx = start_idx + self.items_per_page

        return {
            'items': items[start_idx:end_idx],
            'page': page,
            'total_pages': total_pages,
            'total_items': total_items,
            'has_prev': page > 1,
            'has_next': page < total_pages
        }

    def create_navigation_buttons(self, callback_prefix: str, current_page: int,
                                   total_pages: int, back_callback: Optional[str] = None) -> List[List[InlineKeyboardButton]]:
        """
        Cree les boutons de navigation

        Args:
            callback_prefix: Prefixe pour les callbacks (ex: "alerts_page")
            current_page: Page actuelle
            total_pages: Nombre total de pages
            back_callback: Callback pour le bouton retour (optionnel)

        Returns:
            Liste de rangees de boutons
        """
        buttons = []
        nav_row = []

        # Bouton precedent
        if current_page > 1:
            nav_row.append(InlineKeyboardButton(
                "◀️ Préc.",
                callback_data=f"{callback_prefix}_{current_page - 1}"
            ))

        # Indicateur de page
        nav_row.append(InlineKeyboardButton(
            f"📄 {current_page}/{total_pages}",
            callback_data="page_info"
        ))

        # Bouton suivant
        if current_page < total_pages:
            nav_row.append(InlineKeyboardButton(
                "Suiv. ▶️",
                callback_data=f"{callback_prefix}_{current_page + 1}"
            ))

        if nav_row:
            buttons.append(nav_row)

        # Bouton retour
        if back_callback:
            buttons.append([InlineKeyboardButton("🔙 Retour", callback_data=back_callback)])

        return buttons

    def format_page_info(self, page_data: Dict[str, Any]) -> str:
        """Formate l'info de pagination pour affichage"""
        return f"Page {page_data['page']}/{page_data['total_pages']} ({page_data['total_items']} éléments)"


class PaginatedList:
    """Helper pour creer des listes paginee formatees"""

    def __init__(self, title: str, items: List[Any], formatter: Callable[[Any, int], str],
                 callback_prefix: str, back_callback: str, items_per_page: int = 5):
        """
        Args:
            title: Titre de la liste
            items: Liste complete des items
            formatter: Fonction(item, index) -> str pour formater chaque item
            callback_prefix: Prefixe pour les callbacks de pagination
            back_callback: Callback pour retour
            items_per_page: Nombre d'items par page
        """
        self.title = title
        self.items = items
        self.formatter = formatter
        self.callback_prefix = callback_prefix
        self.back_callback = back_callback
        self.paginator = Paginator(items_per_page)

    def render(self, page: int = 1) -> tuple:
        """
        Rend la page demandee

        Returns:
            (text, reply_markup)
        """
        page_data = self.paginator.paginate(self.items, page)

        # Construire le texte
        text = f"{self.title}\n"
        text += "━" * 20 + "\n\n"

        if page_data['items']:
            start_idx = (page_data['page'] - 1) * self.paginator.items_per_page
            for i, item in enumerate(page_data['items']):
                text += self.formatter(item, start_idx + i + 1) + "\n"

            text += f"\n{self.paginator.format_page_info(page_data)}"
        else:
            text += "Aucun élément à afficher."

        # Construire le clavier
        keyboard = self.paginator.create_navigation_buttons(
            self.callback_prefix,
            page_data['page'],
            page_data['total_pages'],
            self.back_callback
        )

        return text, InlineKeyboardMarkup(keyboard)


# Fonctions utilitaires pour les differentes listes

def format_alert_item(alert: Dict, index: int) -> str:
    """Formate un item d'alerte"""
    cond = ">" if alert['condition'] == 'above' else "<"
    status = "🟢" if alert['active'] else "🔴"
    return f"{index}. {status} {alert['asset_symbol']} {cond} ${alert['target_price']:,.2f}"


def format_watchlist_item(item: Dict, index: int) -> str:
    """Formate un item de watchlist"""
    return f"{index}. {item['asset_symbol']} (seuil: {item['alert_threshold']}%)"


def format_leaderboard_item(leader: Dict, index: int) -> str:
    """Formate un item du leaderboard"""
    medals = ['🥇', '🥈', '🥉']
    medal = medals[index - 1] if index <= 3 else f"{index}."
    name = leader.get('display_name', 'Anonyme')
    pnl = leader.get('total_pnl', 0)
    return f"{medal} {name}: ${pnl:+,.2f}"


def format_badge_item(badge: Dict, index: int) -> str:
    """Formate un item de badge"""
    return f"{badge['emoji']} {badge['name']}"


def format_history_item(item: Dict, index: int) -> str:
    """Formate un item d'historique"""
    date = item.get('created_at', '')[:10]
    symbol = item.get('asset_symbol', 'N/A')
    return f"{index}. [{date}] {symbol}"


# Instance globale
paginator = Paginator()

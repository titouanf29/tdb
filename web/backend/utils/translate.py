"""
Utilitaire de traduction vers le français
"""


def translate_to_french(text: str) -> str:
    """Traduit un texte en français. Retourne le texte original si la traduction échoue."""
    if not text or not text.strip():
        return text
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source="auto", target="fr").translate(text)
        return translated if translated else text
    except Exception:
        return text


def translate_news_items(news_items: list) -> list:
    """
    Traduit les titres et résumés d'une liste d'articles en français.
    Chaque item doit avoir les clés 'title' et optionnellement 'summary'.
    """
    if not news_items:
        return news_items

    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source="auto", target="fr")

        translated = []
        for item in news_items:
            item = dict(item)
            if item.get("title"):
                try:
                    item["title"] = translator.translate(item["title"]) or item["title"]
                except Exception:
                    pass
            if item.get("summary"):
                try:
                    item["summary"] = translator.translate(item["summary"]) or item["summary"]
                except Exception:
                    pass
            translated.append(item)
        return translated
    except Exception:
        return news_items

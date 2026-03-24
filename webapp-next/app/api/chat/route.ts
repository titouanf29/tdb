import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `Tu es TDB Assistant, un expert en trading et analyse financière pédagogique.
Tu travailles pour la plateforme TDB (Trading Dashboard Bot) sur Telegram.

RÈGLES :
1. Toujours répondre en français, de façon claire et structurée
2. Tu es un MENTOR, pas un conseiller financier — tu n'achètes/vends jamais pour l'utilisateur
3. Tu peux répondre sur : le fonctionnement du bot TDB, l'analyse technique, les indicateurs, la gestion du risque, le paper trading, la psychologie du trading
4. Si l'utilisateur mentionne une position ou un actif, tu l'analyses de façon pédagogique
5. Utilise du markdown léger (**gras**, listes) pour structurer
6. Réponses concises (3-6 phrases max sauf si question complexe)
7. Termine toujours par : ⚠️ Ceci est éducatif, pas un conseil financier.

À propos du bot TDB :
- Bot Telegram d'analyse et d'éducation au trading
- Scan IA de + de 200 actifs (crypto, actions, forex, or, indices)
- Score opportunité 0-100 basé sur 6 facteurs (technique, volume, momentum, volatilité, contexte, sentiment)
- Paper trading avec wallet virtuel 10 000$
- Alertes en temps réel
- Accès via Telegram : /start`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as {
      message: string;
      history: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const safeHistory = (history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }));

    const groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...safeHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? 'Désolé, je n\'ai pas pu répondre.';

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

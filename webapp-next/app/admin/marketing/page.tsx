import type { Metadata } from 'next';
import { LogoutButton } from './LogoutButton';

export const metadata: Metadata = {
  title: 'Stratégie Marketing | Admin',
  robots: { index: false, follow: false },
};

// ── Small primitives ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-title)',
        fontSize: '1.3rem',
        color: 'var(--text)',
        borderLeft: '3px solid var(--blue)',
        paddingLeft: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${accent ? 'rgba(45,124,255,0.35)' : 'var(--line)'}`,
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
    }}>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.88rem',
        background: 'var(--surface)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: '0.7rem 1rem',
                textAlign: 'left',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontWeight: 600,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '1px solid var(--line)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '0.65rem 1rem',
                  color: j === 0 ? 'var(--text)' : 'var(--muted)',
                  fontWeight: j === 0 ? 500 : 400,
                  verticalAlign: 'top',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ label, color = 'blue' }: { label: string; color?: 'blue' | 'green' | 'violet' | 'red' }) {
  const colors: Record<string, string> = {
    blue: 'rgba(45,124,255,0.15)',
    green: 'rgba(41,225,124,0.12)',
    violet: 'rgba(119,107,255,0.15)',
    red: 'rgba(255,77,109,0.15)',
  };
  const textColors: Record<string, string> = {
    blue: 'var(--blue)',
    green: 'var(--green)',
    violet: 'var(--violet)',
    red: '#ff4d6d',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: '99px',
      background: colors[color],
      color: textColors[color],
      fontSize: '0.78rem',
      fontWeight: 600,
      marginRight: '0.4rem',
      marginBottom: '0.3rem',
    }}>{label}</span>
  );
}

function KpiCard({ label, m3, m6, m12 }: { label: string; m3: string; m6: string; m12: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '1.1rem 1.25rem',
    }}>
      <p style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{label}</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {[['M3', m3, 'var(--blue)'], ['M6', m6, 'var(--violet)'], ['M12', m12, 'var(--green)']].map(([period, value, color]) => (
          <div key={period as string} style={{ flex: 1 }}>
            <p style={{ color: color as string, fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700 }}>{value}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{period as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--blue)', background: 'rgba(45,124,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 600 }}>ADMIN</span>
            <span style={{ color: 'var(--line)', fontSize: '0.9rem' }}>›</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Marketing</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
            CMO Playbook 2026
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Stratégie marketing complète — Horizon 12 mois · Objectif : 10 000 utilisateurs actifs
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* 1. Positionnement */}
      <Section title="1. Positionnement & UVP">
        <Card accent>
          <p style={{ color: 'var(--text)', fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6 }}>
            "CaptenTDB est la seule plateforme qui t'apprend à analyser les marchés avec une IA, gratuitement, sans jargon et sans te promettre de t'enrichir."
          </p>
        </Card>

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Différenciation vs concurrents</h3>
        <Table
          headers={['Concurrent', 'Leur angle', 'Notre avantage']}
          rows={[
            ['TradingView', 'Pro, technique, payant', 'Pédagogique, gratuit, IA intégrée'],
            ['Investopedia', 'Encyclopédique, froid', 'Interactif, scanner live, outil + cours'],
            ['BoursoBank', 'Courtier avant tout', 'Education first, pas d\'intention de vente'],
            ['YouTube traders', 'Spectacle, richesse rapide', 'Crédibilité, données réelles, pas de hype'],
            ['Financer.com', 'Comparateur produits', 'Pratique, wallet virtuel, apprentissage actif'],
          ]}
        />

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.25rem 0 0.75rem' }}>Taglines à tester en A/B</h3>
        <div>
          {[
            ['Principal', 'La bourse, enfin claire.', 'green'],
            ['Alternative 1', 'Apprends à trader — avant d\'investir un centime.', 'blue'],
            ['Alternative 2', 'L\'IA analyse. Toi, tu comprends.', 'violet'],
            ['Alternative 3', 'Ton premier outil de trading. Gratuit. Sérieux.', 'blue'],
          ].map(([label, text, color]) => (
            <Card key={label as string}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Pill label={label as string} color={color as 'blue' | 'green' | 'violet'} />
                <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>{text as string}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* 2. Personas */}
      <Section title="2. Personas Cibles">
        {[
          {
            name: 'Lucas, l\'étudiant curieux',
            age: '20–25 ans',
            trigger: 'Je veux comprendre comment ça marche avant de risquer mes économies',
            canaux: ['TikTok', 'YouTube Shorts', 'Reddit r/finances'],
            pain: 'A peur de "tout perdre", ne sait pas par où commencer. Cherche une explication claire sans payer.',
          },
          {
            name: 'Camille, la salariée en reconversion',
            age: '28–38 ans',
            trigger: 'Je veux investir intelligemment mais sans me faire arnaquer',
            canaux: ['LinkedIn', 'Newsletter', 'Blog SEO'],
            pain: 'Pas le temps pour des formations longues. Cherche un outil pratique, pas une école à 2 000€.',
          },
          {
            name: 'Mehdi, le trader débutant actif',
            age: '25–35 ans',
            trigger: 'Je cherche des signaux fiables et des outils d\'analyse gratuits',
            canaux: ['X/Twitter', 'Discord', 'Telegram'],
            pain: 'A déjà un compte courtier, fait des erreurs. Veut des signaux, des indicateurs, de la méthode.',
          },
          {
            name: 'Jean-Pierre, le curieux de 50 ans',
            age: '45–60 ans',
            trigger: 'Je veux comprendre les actions et la crypto sans me faire avoir',
            canaux: ['Blog SEO', 'Newsletter', 'Google'],
            pain: 'Méfiant des arnaques, cherche une source crédible. Préfère articles longs et formats structurés.',
          },
        ].map(p => (
          <Card key={p.name}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <p style={{ fontFamily: 'var(--font-title)', color: 'var(--text)', fontWeight: 600, marginBottom: '0.3rem' }}>{p.name}</p>
                <Pill label={p.age} color="blue" />
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>{p.pain}</p>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Trigger</p>
                <p style={{ color: 'var(--green)', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '0.75rem' }}>"{p.trigger}"</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Canaux</p>
                <div>{p.canaux.map(c => <Pill key={c} label={c} color="violet" />)}</div>
              </div>
            </div>
          </Card>
        ))}
      </Section>

      {/* 3. Contenu */}
      <Section title="3. Stratégie de Contenu">

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '0 0 0.75rem' }}>3.1 Blog SEO — Clusters thématiques</h3>
        <Table
          headers={['Cluster', 'Article pilier', 'Articles satellites']}
          rows={[
            ['Apprendre le trading', '"Comment lire un graphique boursier en 2026"', 'RSI expliqué, MACD débutant, chandeliers japonais'],
            ['Crypto débutants', '"Bitcoin vs Ethereum : lequel choisir ?"', 'DeFi expliqué, risques crypto, wallet froid vs chaud'],
            ['Forex', '"Comment fonctionne le marché des devises ?"', 'EUR/USD analyse, levier expliqué, pip et lot'],
            ['Outils gratuits', '"Les 5 meilleurs outils d\'analyse technique gratuits"', 'CaptenTDB vs TradingView, scanner IA, backtesting'],
            ['Psychologie trading', '"Pourquoi 80% des traders perdent de l\'argent"', 'Biais cognitifs, plan de trading, discipline'],
            ['Marchés 2026', '"Quelles actions regarder au Q2 2026 ?"', 'Tech US, CAC 40, marchés émergents'],
          ]}
        />
        <Card>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>Cadence :</strong> 2 articles/semaine M1–M3, puis 1/semaine · Format : 1 500–2 500 mots · 1 screenshot CaptenTDB intégré naturellement · CTA intermédiaire vers le scanner IA · Schema FAQ pour rich snippets Google
          </p>
        </Card>

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>3.2 TikTok / Reels / Shorts</h3>
        <Table
          headers={['Format', 'Description', 'Durée', 'Fréq.']}
          rows={[
            ['"Explique-moi X en 30s"', 'RSI, MACD, P/E ratio...', '15–30s', '3×/sem'],
            ['"Ce signal veut dire quoi ?"', 'Capture CaptenTDB + explication', '20–45s', '2×/sem'],
            ['"Avant/Après"', 'Erreur classique → méthode correcte', '30–60s', '1×/sem'],
            ['"Market update"', 'Résumé marchés de la semaine', '60s', '1×/sem'],
            ['"Mythe vs Réalité"', '"Le trading c\'est un casino" → démystif.', '30–60s', '1×/sem'],
          ]}
        />

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>Hooks TikTok (copier/coller)</h3>
        {[
          'Tu penses que le trading c\'est trop compliqué ? Regarde ça.',
          '1 indicateur. 30 secondes. Tu vas comprendre pourquoi tes trades ratent.',
          'Ce que ton courtier ne t\'explique JAMAIS.',
          'J\'ai analysé 500 actifs avec l\'IA. Voilà ce que j\'ai trouvé.',
        ].map(hook => (
          <Card key={hook}>
            <p style={{ color: 'var(--text)', fontSize: '0.9rem', fontStyle: 'italic' }}>"{hook}"</p>
          </Card>
        ))}

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>3.3 Séquence email de bienvenue (14 jours)</h3>
        <Table
          headers={['Email', 'Jour', 'Contenu']}
          rows={[
            ['E1', 'J+0', 'Bienvenue + tour du produit (vidéo 2 min)'],
            ['E2', 'J+2', '"Voici ton premier actif à analyser" (guide pas à pas)'],
            ['E3', 'J+5', '"Les 3 erreurs du débutant" (contenu éducatif)'],
            ['E4', 'J+7', 'Témoignage utilisateur + "Et toi, tu en es où ?"'],
            ['E5', 'J+9', 'Présentation du wallet virtuel'],
            ['E6', 'J+12', 'Les marchés expliqués + quiz interactif'],
            ['E7', 'J+14', 'Recap + invitation communauté (Telegram/Discord)'],
          ]}
        />
      </Section>

      {/* 4. Lead Magnets */}
      <Section title="4. Lead Magnets">
        {[
          {
            title: 'Guide du Débutant (PDF)',
            tag: 'Email requis',
            color: 'green' as const,
            desc: '15–20 pages aux couleurs CaptenTDB : Glossaire, 5 indicateurs essentiels, méthode DYOR, grille de décision. Distribution : landing dédiée, bio TikTok, articles de blog.',
          },
          {
            title: 'Mini-cours email "Trader en 7 jours"',
            tag: 'Séquence auto',
            color: 'blue' as const,
            desc: '7 emails de 5 min/jour : comment marche la bourse, lire un graphique, RSI, MACD, volumes, plan de trading, passage à la pratique. Valeur équivalent formation à 97€ — offerte.',
          },
          {
            title: 'Screener Watchlist (Google Sheets / Notion)',
            tag: 'Template',
            color: 'violet' as const,
            desc: 'Fichier de suivi d\'actifs avec formules et colonnes pré-remplies. CTA : "Copie ce template et suis tes actifs comme un pro."',
          },
          {
            title: 'Quiz : Quel type d\'investisseur es-tu ?',
            tag: 'Interactif',
            color: 'blue' as const,
            desc: '8 questions, 4 profils (Prudent, Équilibré, Offensif, Day Trader). Email personnalisé selon le profil + recommandations d\'actifs. Idéal pour la segmentation.',
          },
        ].map(lm => (
          <Card key={lm.title}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem' }}>{lm.title}</p>
                  <Pill label={lm.tag} color={lm.color} />
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>{lm.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </Section>

      {/* 5. KPIs */}
      <Section title="5. KPIs & Objectifs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <KpiCard label="Utilisateurs inscrits" m3="500" m6="2 500" m12="10 000" />
          <KpiCard label="DAU (Daily Active)" m3="50" m6="400" m12="2 000" />
          <KpiCard label="Trafic organique/mois" m3="1 000" m6="5 000" m12="20 000" />
          <KpiCard label="Abonnés newsletter" m3="200" m6="1 000" m12="5 000" />
          <KpiCard label="Abonnés TikTok" m3="500" m6="5 000" m12="20 000" />
          <KpiCard label="Taux rétention J7" m3="20%" m6="30%" m12="40%" />
          <KpiCard label="Taux conversion landing" m3="8%" m6="12%" m12="15%" />
          <KpiCard label="Articles de blog publiés" m3="20" m6="50" m12="100" />
        </div>

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>Outils de mesure (gratuits)</h3>
        <Table
          headers={['Outil', 'Usage']}
          rows={[
            ['Google Analytics 4', 'Trafic, conversions, comportement utilisateur'],
            ['Google Search Console', 'Performance SEO, mots-clés, indexation'],
            ['Hotjar (gratuit)', 'Heatmaps landing page, enregistrements sessions'],
            ['Brevo (ex-Sendinblue)', 'Email marketing + automation (gratuit ≤ 300 mails/jour)'],
          ]}
        />
      </Section>

      {/* 6. Calendrier */}
      <Section title="6. Calendrier Éditorial — Q2 2026">
        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '0 0 0.75rem' }}>Avril 2026 — Lancement contenu</h3>
        <Table
          headers={['Semaine', 'Blog', 'TikTok/Reels', 'Newsletter', 'X/Twitter']}
          rows={[
            ['S1 (31/3–6/4)', '"Comment lire un graphique"', 'RSI expliqué en 30s', 'Lancement du blog', 'Thread : 7 erreurs débutant'],
            ['S2 (7–13/4)', '"RSI : tout ce qu\'il faut savoir"', 'Avant/Après sans méthode', 'Spotlight NVDA', 'Tweet quotidien marché'],
            ['S3 (14–20/4)', '"MACD pour les nuls"', '"Ce signal = achat ou vente ?"', 'Leçon : le MACD', 'Thread : anatomie d\'un signal'],
            ['S4 (21–27/4)', '"Crypto vs Actions"', 'Wallet virtuel : comment ça marche', 'Analyse rétrospective', 'Stats hebdo marchés'],
          ]}
        />

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>Mai 2026 — Lead Magnets & Croissance</h3>
        <Card>
          <ul style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 2, margin: 0, paddingLeft: '1.2rem' }}>
            <li>Lancement du guide PDF débutant (Lead Magnet #1)</li>
            <li>Lancement du mini-cours email 7 jours (Lead Magnet #2)</li>
            <li>Campagne storytelling TikTok : "30 jours avec le wallet virtuel"</li>
            <li>Recherche active du premier partenariat créateur (≤ 50K abonnés)</li>
          </ul>
        </Card>

        <h3 style={{ color: 'var(--text)', fontSize: '0.95rem', margin: '1.5rem 0 0.75rem' }}>Juin 2026 — Communauté & Rétention</h3>
        <Card>
          <ul style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 2, margin: 0, paddingLeft: '1.2rem' }}>
            <li>Lancement du Discord (si {'>'} 500 membres)</li>
            <li>Premier live YouTube ou Instagram : analyse de marché en direct</li>
            <li>Enquête NPS auprès des utilisateurs actifs</li>
            <li>Préparation lancement Product Hunt</li>
          </ul>
        </Card>
      </Section>

      {/* 7. Roadmap */}
      <Section title="7. Roadmap Marketing — Priorités par Phase">
        {[
          {
            phase: 'Phase 1 — Fondations',
            period: 'M1–M2 · À faire maintenant',
            color: 'green' as const,
            items: [
              'Installer Google Analytics 4 + Search Console',
              'Créer les comptes TikTok et X/Twitter',
              'Publier les 10 premiers articles de blog',
              'Créer le Lead Magnet #1 (guide PDF)',
              'Mettre en place la séquence email de bienvenue (7 emails)',
              'Ajouter social proof sur la landing (compteur, témoignages, badges)',
            ],
          },
          {
            phase: 'Phase 2 — Traction',
            period: 'M3–M5',
            color: 'blue' as const,
            items: [
              'Lancer le mini-cours email 7 jours',
              'Atteindre 5K abonnés TikTok',
              '20 articles de blog publiés',
              'Premier partenariat créateur YouTube/TikTok',
              'Lancer Meta Ads (budget 150€/mois)',
            ],
          },
          {
            phase: 'Phase 3 — Scale',
            period: 'M6–M12',
            color: 'violet' as const,
            items: [
              'Lancement Product Hunt',
              'Campagne Google Ads Search (200€/mois)',
              'Programme de referral intégré au produit',
              'Première couverture presse (TechCrunch FR, BFM Business)',
              'Objectif : 10 000 utilisateurs actifs',
            ],
          },
        ].map(ph => (
          <Card key={ph.phase}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Pill label={ph.phase} color={ph.color} />
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{ph.period}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 2 }}>
              {ph.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        ))}
      </Section>

      {/* 8. Red flags */}
      <Section title="8. Red Flags & Conformité AMF">
        <Table
          headers={['A ne JAMAIS faire', 'Pourquoi']}
          rows={[
            ['"Multiplie ton capital par 10"', 'Interdit AMF/ACPR, perte de crédibilité immédiate'],
            ['Afficher des performances passées sans disclaimer', 'Non-conforme à la réglementation financière française'],
            ['Promettre des signaux "gagnants"', 'Impossible à garantir, attire les mauvais utilisateurs'],
            ['Cibler des mineurs avec du contenu financier', 'Risque légal et éthique'],
            ['Partenariats avec courtiers non-régulés', 'Responsabilité légale et réputation'],
            ['"Offre limitée à ce soir"', 'Faux scarcity = perte de confiance durable'],
          ]}
        />
        <Card accent>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
            <strong style={{ color: 'var(--text)' }}>Disclaimer légal à intégrer sur le site :</strong><br />
            "Les informations fournies sur CaptenTDB sont à but éducatif uniquement et ne constituent pas un conseil en investissement. Tout investissement comporte des risques, y compris la perte du capital investi. Consultez un conseiller financier agréé pour vos décisions d'investissement."
          </p>
        </Card>
      </Section>

      <p style={{ color: 'var(--line)', fontSize: '0.78rem', textAlign: 'center', marginTop: '2rem' }}>
        Document vivant — dernière révision : mars 2026 · Accès restreint aux admins CaptenTDB
      </p>
    </div>
  );
}

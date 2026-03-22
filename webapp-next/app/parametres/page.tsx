'use client';
import { useState, useEffect } from 'react';
import { TutorialTour } from '@/components/tutorial-tour';

const STORAGE_KEY = 'tdb_user_profile';
const TUTORIAL_SEEN_KEY = 'tdb_tutorial_seen';

type Profile = 'debutant' | 'intermediaire' | 'avance';

const PROFILES = [
  {
    id: 'debutant' as Profile,
    label: 'Débutant',
    emoji: '🌱',
    description: 'Je découvre les marchés financiers',
    color: '#29e17c',
  },
  {
    id: 'intermediaire' as Profile,
    label: 'Intermédiaire',
    emoji: '📈',
    description: 'Je connais les bases, je cherche à progresser',
    color: '#2d7cff',
  },
  {
    id: 'avance' as Profile,
    label: 'Avancé',
    emoji: '⚡',
    description: 'Je trade activement et cherche de la performance',
    color: '#776bff',
  },
];

export default function ParametresPage() {
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [profileDate, setProfileDate] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.profile) setProfile(data.profile);
        if (data.date) {
          setProfileDate(new Date(data.date).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          }));
        }
      } catch {}
    }
    setTutorialSeen(!!localStorage.getItem(TUTORIAL_SEEN_KEY));
  }, []);

  const currentProfile = PROFILES.find((p) => p.id === profile);

  const handleResetProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setProfileDate(null);
  };

  const handleOpenTutorial = () => {
    setTutorialOpen(true);
  };

  return (
    <>
      <TutorialTour
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />

      <main className="container param-page">
        <div className="param-hero">
          <h1 className="param-page-title">Paramètres</h1>
          <p className="param-page-sub">Personnalise ton expérience TDB</p>
        </div>

        {/* Profile section */}
        <section className="param-section">
          <div className="param-section-header">
            <div>
              <h2 className="param-section-title">Profil</h2>
              <p className="param-section-desc">
                Ton profil personnalise les analyses, alertes et recommandations TDB.
              </p>
            </div>
          </div>

          {currentProfile ? (
            <div className="param-profile-card" style={{ '--pc': currentProfile.color } as React.CSSProperties}>
              <div className="param-profile-left">
                <div className="param-profile-emoji">{currentProfile.emoji}</div>
                <div className="param-profile-info">
                  <strong style={{ color: currentProfile.color }}>{currentProfile.label}</strong>
                  <p>{currentProfile.description}</p>
                  {profileDate && <span className="param-profile-date">Configuré le {profileDate}</span>}
                </div>
              </div>
              <button className="btn btn-secondary param-btn-sm" onClick={handleResetProfile}>
                Changer
              </button>
            </div>
          ) : (
            <div className="param-no-profile">
              <span>Aucun profil configuré</span>
              <a href="/" className="btn btn-primary param-btn-sm">Configurer →</a>
            </div>
          )}

          <div className="param-divider" />

          {/* Other settings placeholders */}
          <div className="param-setting-row">
            <div>
              <div className="param-setting-label">Notifications</div>
              <div className="param-setting-desc">Alertes d'opportunités et signaux IA</div>
            </div>
            <div className="param-toggle param-toggle-on" aria-label="Activé">
              <div className="param-toggle-knob" />
            </div>
          </div>

          <div className="param-setting-row">
            <div>
              <div className="param-setting-label">Résumé quotidien</div>
              <div className="param-setting-desc">Synthèse des marchés chaque matin à 08h00</div>
            </div>
            <div className="param-toggle" aria-label="Désactivé">
              <div className="param-toggle-knob" />
            </div>
          </div>

          <div className="param-divider" />

          {/* Tutorial button — bottom of profile section */}
          <div className="param-tutorial-cta">
            <div className="param-tutorial-text">
              <div className="param-tutorial-icon">🎓</div>
              <div>
                <h3 className="param-tutorial-title">Tour de l'application</h3>
                <p className="param-tutorial-desc">
                  {tutorialSeen
                    ? 'Revois toutes les fonctionnalités de TDB à ton rythme.'
                    : 'Découvre toutes les fonctionnalités de TDB en 2 minutes.'}
                </p>
              </div>
            </div>
            <button className="btn btn-secondary param-tutorial-btn" onClick={handleOpenTutorial}>
              {tutorialSeen ? 'Revoir le tour →' : 'Lancer le tour →'}
            </button>
          </div>
        </section>

        {/* Resources */}
        <section className="param-section param-section-links">
          <h2 className="param-section-title">Ressources</h2>
          <div className="param-links-grid">
            <a href="/education" className="param-link-card">
              <span className="param-link-icon">📚</span>
              <div>
                <strong>Éducation</strong>
                <p>Cours et leçons interactives</p>
              </div>
              <span className="param-link-arrow">→</span>
            </a>
            <a href="/fonctionnalites" className="param-link-card">
              <span className="param-link-icon">⚡</span>
              <div>
                <strong>Fonctionnalités</strong>
                <p>Tout ce que TDB peut faire</p>
              </div>
              <span className="param-link-arrow">→</span>
            </a>
            <a href="https://t.me/tdbcapten_bot" target="_blank" rel="noreferrer" className="param-link-card">
              <span className="param-link-icon">🤖</span>
              <div>
                <strong>Bot Telegram</strong>
                <p>Rejoindre et commencer à trader</p>
              </div>
              <span className="param-link-arrow">↗</span>
            </a>
            <a href="/faq" className="param-link-card">
              <span className="param-link-icon">💬</span>
              <div>
                <strong>FAQ</strong>
                <p>Questions fréquentes</p>
              </div>
              <span className="param-link-arrow">→</span>
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

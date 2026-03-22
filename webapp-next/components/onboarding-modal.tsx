'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tdb_user_profile';

type Profile = 'debutant' | 'intermediaire' | 'avance';

const PROFILES = [
  {
    id: 'debutant' as Profile,
    label: 'Débutant',
    emoji: '🌱',
    description: 'Je découvre les marchés financiers',
    details: [
      'Contenu pédagogique en priorité',
      'Explications des termes de base',
      'Alertes simplifiées',
    ],
    color: '#29e17c',
  },
  {
    id: 'intermediaire' as Profile,
    label: 'Intermédiaire',
    emoji: '📈',
    description: 'Je connais les bases, je cherche à progresser',
    details: [
      'Analyses techniques détaillées',
      'Gestion du risque avancée',
      'Accès aux signaux complets',
    ],
    color: '#2d7cff',
  },
  {
    id: 'avance' as Profile,
    label: 'Avancé',
    emoji: '⚡',
    description: 'Je trade activement et cherche de la performance',
    details: [
      'Signaux haute fréquence',
      'Données brutes et paramètres',
      'Analyse multi-marchés',
    ],
    color: '#776bff',
  },
];

const STEPS = [
  {
    title: 'Bienvenue sur TDB',
    subtitle: 'Quel est ton profil de trader ?',
    description: 'En 3 étapes, personnalisons ton expérience pour t\'aider à progresser plus vite.',
  },
  {
    title: 'Ton objectif principal',
    subtitle: 'Que cherches-tu en priorité ?',
  },
  {
    title: 'Tu es prêt !',
    subtitle: 'Ton espace est personnalisé',
  },
];

const OBJECTIVES: Record<Profile, { label: string; icon: string }[]> = {
  debutant: [
    { label: 'Apprendre les bases du trading', icon: '📚' },
    { label: 'Comprendre les graphiques', icon: '📊' },
    { label: 'Éviter les erreurs communes', icon: '🛡️' },
  ],
  intermediaire: [
    { label: 'Améliorer mon win rate', icon: '🎯' },
    { label: 'Optimiser ma gestion du risque', icon: '⚖️' },
    { label: 'Détecter de meilleures opportunités', icon: '🔍' },
  ],
  avance: [
    { label: 'Scanner le marché efficacement', icon: '⚡' },
    { label: 'Obtenir des analyses IA détaillées', icon: '🤖' },
    { label: 'Automatiser mes alertes', icon: '🔔' },
  ],
};

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [objective, setObjective] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 300);
  };

  const handleProfileSelect = (p: Profile) => {
    setProfile(p);
  };

  const handleNext = () => {
    if (step === 0 && profile) {
      setStep(1);
    } else if (step === 1 && objective !== null) {
      setStep(2);
    }
  };

  const handleFinish = () => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, objective, date: new Date().toISOString() }));
    }
    handleClose();
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('tdb:profile-set', { detail: { profile } }));
    // Trigger tutorial tour for new users (small delay so onboarding closes first)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tdb:start-tutorial'));
    }, 400);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, date: new Date().toISOString() }));
    handleClose();
  };

  if (!visible) return null;

  const objectives = profile ? OBJECTIVES[profile] : [];

  return (
    <div className={`onb-overlay${closing ? ' onb-closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}>
      <div className="onb-modal">
        {/* Step indicators */}
        <div className="onb-steps">
          {[0, 1, 2].map(i => (
            <div key={i} className={`onb-step-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
          ))}
        </div>

        <button className="onb-close-btn" onClick={handleDismiss} aria-label="Fermer">×</button>

        {step === 0 && (
          <div className="onb-content">
            <div className="onb-emoji">👋</div>
            <h2 className="onb-title">{STEPS[0].title}</h2>
            <p className="onb-subtitle">{STEPS[0].subtitle}</p>
            <p className="onb-desc">{STEPS[0].description}</p>

            <div className="onb-profiles">
              {PROFILES.map(p => (
                <button
                  key={p.id}
                  className={`onb-profile-card${profile === p.id ? ' selected' : ''}`}
                  style={{ '--profile-color': p.color } as React.CSSProperties}
                  onClick={() => handleProfileSelect(p.id)}
                >
                  <div className="onb-profile-emoji">{p.emoji}</div>
                  <div className="onb-profile-label">{p.label}</div>
                  <div className="onb-profile-desc">{p.description}</div>
                  <ul className="onb-profile-details">
                    {p.details.map((d, i) => (
                      <li key={i}>✓ {d}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary onb-next-btn"
              disabled={!profile}
              onClick={handleNext}
            >
              Continuer →
            </button>
          </div>
        )}

        {step === 1 && profile && (
          <div className="onb-content">
            <div className="onb-emoji">{PROFILES.find(p => p.id === profile)?.emoji}</div>
            <h2 className="onb-title">{STEPS[1].subtitle}</h2>
            <p className="onb-desc">Choisis ta priorité pour personnaliser tes recommandations.</p>

            <div className="onb-objectives">
              {objectives.map((obj, i) => (
                <button
                  key={i}
                  className={`onb-objective-card${objective === i ? ' selected' : ''}`}
                  onClick={() => setObjective(i)}
                >
                  <span className="onb-obj-icon">{obj.icon}</span>
                  <span className="onb-obj-label">{obj.label}</span>
                  {objective === i && <span className="onb-obj-check">✓</span>}
                </button>
              ))}
            </div>

            <div className="onb-btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(0)}>Retour</button>
              <button
                className="btn btn-primary onb-next-btn"
                disabled={objective === null}
                onClick={handleNext}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 2 && profile && (
          <div className="onb-content onb-success">
            <div className="onb-success-ring">
              <span>🎯</span>
            </div>
            <h2 className="onb-title">Profil configuré !</h2>
            <p className="onb-desc">
              Ton espace <strong>{PROFILES.find(p => p.id === profile)?.label}</strong> est prêt.
              Rejoins le bot Telegram pour commencer à analyser les marchés.
            </p>
            <div className="onb-summary">
              <div className="onb-summary-item">
                <span>Profil</span>
                <strong style={{ color: PROFILES.find(p => p.id === profile)?.color }}>
                  {PROFILES.find(p => p.id === profile)?.emoji} {PROFILES.find(p => p.id === profile)?.label}
                </strong>
              </div>
              {objective !== null && (
                <div className="onb-summary-item">
                  <span>Objectif</span>
                  <strong>{objectives[objective]?.label}</strong>
                </div>
              )}
            </div>
            <button className="btn btn-primary onb-finish-btn" onClick={handleFinish}>
              Commencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

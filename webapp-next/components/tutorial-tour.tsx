'use client';
import { useState, useEffect, useCallback } from 'react';

export const TUTORIAL_EVENT = 'tdb:start-tutorial';

// ─── MOCK COMPONENTS ──────────────────────────────────────

function MockAnalyse() {
  return (
    <div className="tut-phone">
      <div className="tut-phone-bar">
        <span className="tut-phone-dot" />
        <span className="tut-phone-name">🤖 TDB Bot</span>
        <span className="tut-phone-online">●</span>
      </div>
      <div className="tut-bubble tut-bubble-bot">
        <div className="tut-bubble-title">📊 <strong>BTC/USD</strong> — Analyse IA</div>
        <div className="tut-score-row">
          <div className="tut-score-track">
            <div className="tut-score-fill" style={{ '--w': '82%' } as React.CSSProperties} />
          </div>
          <span className="tut-score-num">82<small>/100</small></span>
        </div>
        <div className="tut-badge tut-badge-green">OPPORTUNITÉ ÉLEVÉE</div>
        <div className="tut-check-list">
          <div className="tut-check-item" style={{ animationDelay: '0.6s' }}>✅ SMA200 haussière</div>
          <div className="tut-check-item" style={{ animationDelay: '0.85s' }}>✅ Volume +47%</div>
          <div className="tut-check-item" style={{ animationDelay: '1.1s' }}>✅ Momentum positif</div>
        </div>
        <div className="tut-levels">
          <div className="tut-level"><span className="tut-level-lbl">🎯 Entrée</span><strong>68 420</strong></div>
          <div className="tut-level"><span className="tut-level-lbl">🛡️ Stop</span><strong className="tut-red">67 200</strong></div>
          <div className="tut-level"><span className="tut-level-lbl">📈 Target</span><strong className="tut-green">71 000</strong></div>
        </div>
      </div>
    </div>
  );
}

function MockScanner() {
  return (
    <div className="tut-phone">
      <div className="tut-phone-bar">
        <span className="tut-phone-dot" />
        <span className="tut-phone-name">🤖 TDB Bot</span>
        <span className="tut-phone-online">●</span>
      </div>
      <div className="tut-notif-ring">
        <div className="tut-notif-pulse" />
        <div className="tut-notif-icon">🔔</div>
      </div>
      <div className="tut-bubble tut-bubble-bot tut-bubble-alert">
        <div className="tut-alert-header">🚨 OPPORTUNITÉ DÉTECTÉE</div>
        <div className="tut-alert-asset">
          <span>ETH/USD</span>
          <span className="tut-badge tut-badge-blue">Score 77</span>
        </div>
        <div className="tut-alert-time">Il y a 2 min · Crypto · LONG</div>
      </div>
      <div className="tut-bubble tut-bubble-bot tut-bubble-alert" style={{ animationDelay: '0.55s', opacity: 0 }}>
        <div className="tut-alert-header">🚨 OPPORTUNITÉ DÉTECTÉE</div>
        <div className="tut-alert-asset">
          <span>AAPL</span>
          <span className="tut-badge tut-badge-violet">Score 71</span>
        </div>
        <div className="tut-alert-time">Il y a 8 min · USA · LONG</div>
      </div>
    </div>
  );
}

function MockAssistant() {
  return (
    <div className="tut-phone">
      <div className="tut-phone-bar">
        <span className="tut-phone-dot" />
        <span className="tut-phone-name">🤖 TDB Bot</span>
        <span className="tut-phone-online">●</span>
      </div>
      <div className="tut-bubble tut-bubble-user">Comment lire un signal IA ?</div>
      <div className="tut-typing" style={{ animationDelay: '0.4s' }}>
        <span /><span /><span />
      </div>
      <div className="tut-bubble tut-bubble-bot tut-bubble-response" style={{ animationDelay: '1.4s', opacity: 0 }}>
        Un signal TDB inclut un <strong>score 0-100</strong>, une direction LONG/SHORT, des niveaux d&apos;entrée, stop et target — calculés automatiquement.
      </div>
    </div>
  );
}

function MockPaper() {
  return (
    <div className="tut-phone">
      <div className="tut-phone-bar">
        <span className="tut-phone-dot" />
        <span className="tut-phone-name">💼 Mon Wallet</span>
        <span className="tut-phone-online">●</span>
      </div>
      <div className="tut-wallet-balance">
        <div className="tut-wallet-label">Solde virtuel</div>
        <div className="tut-wallet-amount">$10 234<span className="tut-wallet-cents">.50</span></div>
        <div className="tut-wallet-pnl tut-green">▲ +2.3% ce mois</div>
      </div>
      <div className="tut-position">
        <div className="tut-position-header">
          <span>BTC/USD <span className="tut-badge tut-badge-green">LONG</span></span>
          <span className="tut-green tut-pnl-anim">+$234</span>
        </div>
        <div className="tut-position-meta">Entrée: 68 420 · ×2 levier</div>
        <div className="tut-pnl-bar"><div className="tut-pnl-fill" /></div>
      </div>
      <div className="tut-stats-row">
        <div className="tut-stat"><span>Win rate</span><strong className="tut-green">67%</strong></div>
        <div className="tut-stat"><span>Trades</span><strong>24</strong></div>
        <div className="tut-stat"><span>Ratio</span><strong>1:2.4</strong></div>
      </div>
    </div>
  );
}

function MockRisk() {
  return (
    <div className="tut-phone">
      <div className="tut-phone-bar">
        <span className="tut-phone-dot" />
        <span className="tut-phone-name">⚖️ Gestion Risque</span>
        <span className="tut-phone-online">●</span>
      </div>
      <div className="tut-risk-block">
        <div className="tut-risk-row">
          <span>Risque max / position</span>
          <strong>2%</strong>
        </div>
        <div className="tut-risk-row">
          <span>Taille position</span>
          <strong>$200</strong>
        </div>
        <div className="tut-risk-row">
          <span>Stop Loss</span>
          <strong className="tut-red">67 200</strong>
        </div>
      </div>
      <div className="tut-rr-badge">
        <div className="tut-rr-top">
          <div>
            <div className="tut-rr-label">Ratio Risque / Récompense</div>
            <div className="tut-rr-value">1 : 3</div>
          </div>
          <div className="tut-rr-ring">
            <svg viewBox="0 0 36 36" className="tut-rr-svg">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#29e17c" strokeWidth="2.5"
                strokeDasharray="75 25" strokeDashoffset="25" strokeLinecap="round" />
            </svg>
            <span>75%</span>
          </div>
        </div>
        <div className="tut-rr-bars">
          <div className="tut-rr-risk-bar"><div /><span>Risk 1</span></div>
          <div className="tut-rr-reward-bar"><div /><span>Reward 3</span></div>
        </div>
      </div>
      <div className="tut-badge tut-badge-green tut-badge-full">SETUP VALIDÉ ✓</div>
    </div>
  );
}

function MockReady() {
  return (
    <div className="tut-phone tut-phone-ready">
      <div className="tut-ready-glow" />
      <div className="tut-ready-logo">TDB</div>
      <div className="tut-ready-tagline">Assistant IA Trading</div>
      <div className="tut-ready-features">
        {[
          { icon: '🧠', label: 'Analyse IA multi-marchés' },
          { icon: '🔍', label: 'Scanner automatique 24h/24' },
          { icon: '🤖', label: 'Assistant IA personnel' },
          { icon: '💰', label: 'Paper trading 10 000$' },
          { icon: '⚖️', label: 'Gestion du risque intégrée' },
          { icon: '📊', label: 'Tableau de bord complet' },
        ].map((f, i) => (
          <div key={i} className="tut-ready-feature" style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="tut-ready-check">✓</span>
            <span>{f.icon} {f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STEP DEFINITIONS ─────────────────────────────────────

type MockType = 'analyse' | 'scanner' | 'assistant' | 'paper' | 'risk' | 'ready';

const MOCKS: Record<MockType, () => React.JSX.Element> = {
  analyse: MockAnalyse,
  scanner: MockScanner,
  assistant: MockAssistant,
  paper: MockPaper,
  risk: MockRisk,
  ready: MockReady,
};

interface Step {
  id: string;
  icon: string;
  tag: string;
  title: string;
  desc: string;
  mock: MockType;
  color: string;
  isFinal?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'analyse',
    icon: '🧠',
    tag: 'ANALYSE IA',
    title: 'Des signaux ultra-précis, 24h/24',
    desc: "L'IA analyse 25+ indicateurs simultanément — SMA200, Ichimoku, VIX, momentum — et te donne un score clair de 0 à 100 sur chaque opportunité de marché.",
    mock: 'analyse',
    color: '#2d7cff',
  },
  {
    id: 'scanner',
    icon: '🔍',
    tag: 'SCANNER AUTOMATIQUE',
    title: 'Ne rate plus jamais un signal fort',
    desc: "TDB surveille en permanence crypto, forex et indices. Tu reçois une alerte Telegram instantanée dès qu'un setup se forme — sans rien faire de ton côté.",
    mock: 'scanner',
    color: '#776bff',
  },
  {
    id: 'assistant',
    icon: '🤖',
    tag: 'ASSISTANT IA',
    title: 'Ton coach de trading personnel',
    desc: "Pose n'importe quelle question sur un actif, une stratégie ou un indicateur. L'IA te répond comme un trader expérimenté, en quelques secondes.",
    mock: 'assistant',
    color: '#29e17c',
  },
  {
    id: 'paper',
    icon: '💰',
    tag: 'PAPER TRADING',
    title: 'Entraîne-toi avec 10 000$ virtuels',
    desc: "Ouvre des positions simulées en temps réel. Suis ton PnL, ton win rate et ta progression. Apprends à trader comme un pro sans risquer un seul centime.",
    mock: 'paper',
    color: '#f59e0b',
  },
  {
    id: 'risk',
    icon: '⚖️',
    tag: 'GESTION DU RISQUE',
    title: 'Protège ton capital à chaque trade',
    desc: "Stop loss automatique, calcul du position sizing, ratio risque/récompense affiché. Tout est intégré pour que tu trades de manière disciplinée et méthodique.",
    mock: 'risk',
    color: '#ef4444',
  },
  {
    id: 'ready',
    icon: '🚀',
    tag: "C'EST PARTI !",
    title: "Tu es prêt à trader avec l'IA",
    desc: "Rejoins des centaines de traders qui utilisent déjà TDB chaque jour pour analyser les marchés, s'entraîner et progresser. Gratuit, sans risque.",
    mock: 'ready',
    color: '#29e17c',
    isFinal: true,
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────

interface TutorialTourProps {
  autoListen?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function TutorialTour({ autoListen = false, open: openProp, onClose }: TutorialTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!autoListen) return;
    const handler = () => {
      setStep(0);
      setDirection('next');
      setIsOpen(true);
    };
    window.addEventListener(TUTORIAL_EVENT, handler);
    return () => window.removeEventListener(TUTORIAL_EVENT, handler);
  }, [autoListen]);

  useEffect(() => {
    if (openProp === true) {
      setStep(0);
      setDirection('next');
      setIsOpen(true);
    } else if (openProp === false) {
      setIsOpen(false);
    }
  }, [openProp]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
      localStorage.setItem('tdb_tutorial_seen', 'true');
      onClose?.();
    }, 300);
  }, [onClose]);

  const changeStep = (newStep: number) => {
    setDirection(newStep > step ? 'next' : 'prev');
    setStep(newStep);
  };

  if (!isOpen) return null;

  const current = STEPS[step];
  const MockComp = MOCKS[current.mock];

  return (
    <div
      className={`tut-overlay${closing ? ' tut-closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className={`tut-modal${direction === 'prev' ? ' tut-going-prev' : ''}`}>
        {/* Progress bar */}
        <div className="tut-progress-bar">
          <div
            className="tut-progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="tut-header">
          <div className="tut-dots">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                className={`tut-dot${i === step ? ' active' : i < step ? ' done' : ''}`}
                onClick={() => changeStep(i)}
                aria-label={`Étape ${i + 1}`}
              />
            ))}
          </div>
          {!current.isFinal && (
            <button className="tut-skip-btn" onClick={close}>Passer le tour</button>
          )}
        </div>

        {/* Body */}
        <div className="tut-body" key={step}>
          {/* Visual */}
          <div className="tut-visual-wrap">
            <div
              className="tut-visual-glow"
              style={{ background: `radial-gradient(circle at 50% 40%, ${current.color}28, transparent 70%)` }}
            />
            <MockComp />
          </div>

          {/* Text */}
          <div className="tut-text-wrap">
            <span
              className="tut-tag"
              style={{
                color: current.color,
                borderColor: `${current.color}40`,
                background: `${current.color}12`,
              }}
            >
              {current.tag}
            </span>
            <div className="tut-step-icon">{current.icon}</div>
            <h2 className="tut-title">{current.title}</h2>
            <p className="tut-desc">{current.desc}</p>

            <div className="tut-nav">
              {step > 0 ? (
                <button className="btn btn-secondary tut-btn" onClick={() => changeStep(step - 1)}>
                  ← Retour
                </button>
              ) : (
                <div />
              )}
              {!current.isFinal ? (
                <button
                  className="btn btn-primary tut-btn"
                  onClick={() => changeStep(step + 1)}
                  style={{ background: `linear-gradient(135deg, ${current.color}cc, ${current.color})` }}
                >
                  Suivant →
                </button>
              ) : (
                <div className="tut-final-actions">
                  <a
                    href="https://t.me/tdbcapten_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary tut-btn-cta"
                    onClick={close}
                  >
                    Rejoindre le bot 🚀
                  </a>
                  <button className="tut-close-link" onClick={close}>Fermer</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Counter */}
        <div className="tut-counter">{step + 1} / {STEPS.length}</div>
      </div>
    </div>
  );
}

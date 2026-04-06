import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#07070F',
  accent: '#FF2D78',
  purple: '#8B5CF6',
  accentGlow: 'rgba(255,45,120,0.45)',
  white: '#FFFFFF',
  muted: '#6B7280',
  green: '#22C55E',
  amber: '#F59E0B',
};

// ─── Timeline (60fps / 22s = 1320 frames) ────────────────────────────────────
const T = {
  // Scène 1 — Search (0→4.5s / 0→270f)
  searchIn: 20,
  typingStart: 80,
  typingEnd: 240,
  enterPress: 260,

  // Transition navigateur (4.5s→7s / 260→420f)
  transStart: 260,
  transEnd:   420,

  // Scène 3 — Feature cards (7s→13s / 420→780f)
  cardsStart: 440,
  cardStagger: 90,

  // Scène 4 — Stats (13s→17s / 780→1020f)
  statsStart: 780,
  statStagger: 55,

  // Scène 5 — CTA (17s→22s / 1020→1320f)
  ctaStart:   1020,
  ctaButton:  1090,
  endFade:    1230,
};

const URL_TEXT = 'captentdb.fr';

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useFadeUp(start: number, distance = 30, duration = 22) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = spring({frame: frame - start, fps, config: {damping: 20, mass: 0.5, stiffness: 180}});
  const op = interpolate(frame, [start, start + duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {opacity: op, transform: `translateY(${interpolate(sp, [0, 1], [distance, 0])}px)`};
}

function useScaleIn(start: number, stiffness = 200) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = spring({frame: frame - start, fps, config: {damping: 16, mass: 0.4, stiffness}});
  const op = interpolate(frame, [start, start + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {opacity: op, transform: `scale(${interpolate(sp, [0, 1], [0.82, 1])})`};
}

function useSlideLeft(start: number) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = spring({frame: frame - start, fps, config: {damping: 22, mass: 0.5, stiffness: 190}});
  const op = interpolate(frame, [start, start + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {opacity: op, transform: `translateX(${interpolate(sp, [0, 1], [-90, 0])}px)`};
}

function useCounter(target: number, start: number, duration = 90) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return Math.round(p * target);
}

function useTyped(text: string, start: number, fpc = 15) {
  const frame = useCurrentFrame();
  return text.slice(0, Math.max(0, Math.floor((frame - start) / fpc)));
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export const IntroVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [T.endFade, T.endFade + 60], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: C.bg, opacity: fadeOut,
      fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
      overflow: 'hidden',
    }}>
      <AnimatedBackground />
      <GridOverlay />
      <ScanLine />
      <Scene1Search />
      <BrowserTransition />
      <Scene3Cards />
      <Scene4Stats />
      <Scene5CTA />
    </AbsoluteFill>
  );
};

// ─── Fond animé ───────────────────────────────────────────────────────────────
const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const o1x = 15 + 12 * Math.sin(frame / 200);
  const o1y = 20 + 10 * Math.cos(frame / 220);
  const o2x = 78 + 10 * Math.cos(frame / 180);
  const o2y = 68 + 14 * Math.sin(frame / 210);
  const o3x = 50 + 8 * Math.sin(frame / 240 + 1);
  const o3y = 45 + 6 * Math.cos(frame / 230 + 2);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position:'absolute',left:`${o1x}%`,top:`${o1y}%`,width:750,height:750,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(255,45,120,0.18) 0%,transparent 65%)',
        transform:'translate(-50%,-50%)',filter:'blur(30px)'}} />
      <div style={{position:'absolute',left:`${o2x}%`,top:`${o2y}%`,width:650,height:650,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 65%)',
        transform:'translate(-50%,-50%)',filter:'blur(40px)'}} />
      <div style={{position:'absolute',left:`${o3x}%`,top:`${o3y}%`,width:450,height:450,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(255,100,150,0.09) 0%,transparent 70%)',
        transform:'translate(-50%,-50%)',filter:'blur(50px)'}} />
    </AbsoluteFill>
  );
};

const GridOverlay: React.FC = () => (
  <AbsoluteFill style={{
    pointerEvents: 'none',
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
    `,
    backgroundSize: '72px 72px',
  }} />
);

const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const y = (frame * 2.8) % 1980 - 60;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div style={{position:'absolute',left:0,right:0,top:y,height:2,
        background:'linear-gradient(90deg,transparent 0%,rgba(255,45,120,0.2) 50%,transparent 100%)'}} />
    </AbsoluteFill>
  );
};

// ─── SCÈNE 1 : Recherche ──────────────────────────────────────────────────────
const Scene1Search: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = useTyped(URL_TEXT, T.typingStart);
  const barStyle = useFadeUp(T.searchIn, 50, 22);
  const labelStyle = useFadeUp(T.searchIn + 10, 20, 18);

  const beforeEnter = frame < T.enterPress;
  const zoomScale = interpolate(frame, [T.enterPress, T.enterPress + 30], [1, 0.9], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const zoomOp = interpolate(frame, [T.enterPress + 10, T.enterPress + 35], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const enterBtnOp = interpolate(frame, [T.typingEnd, T.typingEnd + 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const cursor = frame % 36 < 18;

  if (frame > T.enterPress + 40) return null;

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        ...labelStyle,
        opacity: (labelStyle.opacity as number) * (beforeEnter ? 1 : zoomOp),
        fontSize: 28, color: C.muted, marginBottom: 34,
        letterSpacing: 3, textTransform: 'uppercase' as const, fontWeight: 500,
      }}>
        ✦ Plateforme éducative de trading ✦
      </div>

      <div style={{
        opacity: beforeEnter ? barStyle.opacity : zoomOp,
        transform: beforeEnter ? barStyle.transform : `scale(${zoomScale})`,
        transformOrigin: 'center center',
        width: 860,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: 60,
        border: `1px solid rgba(255,45,120,0.45)`,
        display: 'flex', alignItems: 'center', padding: '24px 38px', gap: 20,
        boxShadow: `0 0 80px ${C.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        <div style={{fontSize: 38, opacity: 0.6}}>🔍</div>
        <div style={{flex: 1, fontSize: 50, fontWeight: 600, color: C.white, letterSpacing: -1}}>
          {typed}
          <span style={{opacity: (cursor && beforeEnter) ? 1 : 0, color: C.accent}}>|</span>
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          borderRadius: 18, padding: '12px 28px',
          fontSize: 32, fontWeight: 800, color: 'white',
          opacity: typed.length >= URL_TEXT.length ? enterBtnOp : 0,
          boxShadow: `0 4px 20px ${C.accentGlow}`,
        }}>↵</div>
      </div>

      <div style={{display: 'flex', gap: 24, marginTop: 32, opacity: beforeEnter ? 1 : zoomOp}}>
        {['Trading','IA','Gratuit','Scanner','Wallet'].map((tag, i) => (
          <div key={tag} style={{
            fontSize: 22, color: C.muted,
            opacity: interpolate(frame, [T.typingStart + i*18, T.typingStart + i*18 + 14], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          }}>#{tag}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── TRANSITION NAVIGATEUR ────────────────────────────────────────────────────
const BrowserTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const ZOOM_START = T.transStart + 105; // moment où le zoom commence

  // Phase 1 : apparition spring (scale 0.1 → 0.58)
  const appearSp = spring({
    frame: frame - T.transStart,
    fps,
    config: {damping: 20, mass: 0.6, stiffness: 180},
  });
  const appearScale = interpolate(appearSp, [0, 1], [0.1, 0.58]);

  // Phase 2 : zoom doux 0.58 → 1.7 (juste assez pour remplir l'écran)
  const zoomScale = interpolate(
    frame,
    [ZOOM_START, T.transEnd],
    [0.58, 1.7],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     easing: Easing.bezier(0.4, 0, 0.6, 1)} // ease-in-out, pas d'accélération en fin
  );

  const scale = frame < ZOOM_START ? appearScale : zoomScale;

  // Opacité : fondu de sortie commence DÈS le début du zoom → pas de freeze
  const windowOp = interpolate(
    frame,
    [T.transStart, T.transStart + 18, ZOOM_START, T.transEnd],
    [0,            1,                  1,          0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
     easing: Easing.in(Easing.quad)}
  );

  // Barre de progression
  const progressW = interpolate(frame, [T.transStart + 8, T.transStart + 90], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Logo inside browser
  const logoInsideOp = interpolate(frame, [T.transStart + 60, T.transStart + 90], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  if (frame < T.transStart - 2 || frame > T.transEnd + 8) return null;

  return (
    <AbsoluteFill style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        opacity: windowOp,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        width: 980,
        background: '#0D0D1F',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.1),
          0 0 100px rgba(255,45,120,0.35),
          0 60px 120px rgba(0,0,0,0.9)
        `,
      }}>
        {/* Chrome du navigateur */}
        <div style={{
          background: '#16162A',
          padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Boutons macOS */}
          {['#FF5F57','#FFBD2E','#28CA41'].map((col, i) => (
            <div key={i} style={{width: 18, height: 18, borderRadius: '50%', background: col, flexShrink: 0}} />
          ))}

          {/* Barre URL */}
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '11px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid rgba(255,45,120,0.25)',
          }}>
            <span style={{fontSize: 19, opacity: 0.5}}>🔒</span>
            <span style={{
              fontSize: 24, fontWeight: 600,
              background: `linear-gradient(90deg, ${C.white}, rgba(255,255,255,0.7))`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              captentdb.fr
            </span>
            {/* Indicateur live */}
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              opacity: logoInsideOp,
            }}>
              <div style={{width: 8, height: 8, borderRadius: '50%', background: C.green,
                boxShadow: `0 0 8px ${C.green}`}} />
              <span style={{fontSize: 18, color: C.green, fontWeight: 600}}>Live</span>
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div style={{height: 3, background: 'rgba(255,255,255,0.04)', position: 'relative'}}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${progressW}%`,
            background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
            boxShadow: `0 0 12px ${C.accent}`,
          }} />
        </div>

        {/* Zone de contenu */}
        <div style={{
          height: 560,
          background: 'linear-gradient(180deg, #0A0A18 0%, #07070F 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Grille intérieure */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }} />

          {/* Glow central */}
          <div style={{
            position: 'absolute', width: 500, height: 500, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,45,120,0.15) 0%, transparent 65%)`,
            opacity: logoInsideOp,
          }} />

          {/* Logo dans le navigateur */}
          <div style={{opacity: logoInsideOp, textAlign: 'center', position: 'relative'}}>
            <div style={{fontSize: 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1}}>
              <span style={{color: C.white}}>Capten</span>
              <span style={{
                background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>TDB</span>
            </div>
            <div style={{fontSize: 22, color: C.muted, marginTop: 8, letterSpacing: 1}}>
              La bourse, enfin claire.
            </div>
          </div>

          {/* Mini ticker */}
          <div style={{
            opacity: logoInsideOp,
            display: 'flex', gap: 28, marginTop: 8,
          }}>
            {[
              {s:'BTC',v:'+2.14%',up:true},
              {s:'NVDA',v:'+3.87%',up:true},
              {s:'ETH',v:'+4.21%',up:true},
              {s:'TSLA',v:'+5.32%',up:true},
              {s:'ASML',v:'-0.87%',up:false},
            ].map((t, i) => (
              <div key={i} style={{fontSize: 20, display: 'flex', gap: 6, alignItems: 'center'}}>
                <span style={{color: C.muted, fontWeight: 600}}>{t.s}</span>
                <span style={{color: t.up ? C.green : '#EF4444', fontWeight: 700}}>{t.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};


// Ticker bas de page
const TICKS = [
  {s:'BTC',v:'+2.14%',up:true},{s:'NVDA',v:'+3.87%',up:true},
  {s:'ETH',v:'+4.21%',up:true},{s:'TSLA',v:'+5.32%',up:true},
  {s:'AAPL',v:'+1.23%',up:true},{s:'MC.PA',v:'-0.43%',up:false},
  {s:'ASML',v:'-0.87%',up:false},{s:'AIR.PA',v:'+1.05%',up:true},
];

const MiniTicker: React.FC<{startFrame:number}> = ({startFrame}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame,[startFrame,startFrame+18],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const offset = ((frame-startFrame)*1.3) % (TICKS.length*190);
  return (
    <div style={{position:'absolute',bottom:120,left:0,right:0,overflow:'hidden',height:52,opacity:op,
      borderTop:'1px solid rgba(255,255,255,0.06)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{display:'flex',gap:42,alignItems:'center',height:'100%',
        transform:`translateX(-${offset}px)`,whiteSpace:'nowrap' as const}}>
        {[...TICKS,...TICKS,...TICKS,...TICKS].map((t,i)=>(
          <div key={i} style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
            <span style={{color:C.muted,fontSize:21,fontWeight:600}}>{t.s}</span>
            <span style={{color:t.up?C.green:'#EF4444',fontSize:21,fontWeight:700}}>{t.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SCÈNE 3 : Feature cards ──────────────────────────────────────────────────
const FEATURES = [
  {icon:'🤖',title:'Scanner IA',desc:"L'IA analyse 842+ actifs et remonte les meilleures opportunités en temps réel.",tag:'Temps réel',color:C.accent},
  {icon:'💰',title:'Wallet Virtuel',desc:'Entraîne-toi sans risquer un centime. Capital virtuel, P&L réaliste, statistiques.',tag:'0€ de risque',color:C.green},
  {icon:'📊',title:'Signaux clairs',desc:'RSI, MACD, EMA, Score IA — chaque actif décrypté dans un langage simple.',tag:'Décrypté',color:C.purple},
  {icon:'🌍',title:'9 Marchés',desc:'Europe · USA · Asie · Crypto · Matières premières — tout en un seul endroit.',tag:'842+ actifs',color:C.amber},
];

const Scene3Cards: React.FC = () => {
  const frame = useCurrentFrame();
  const titleStyle = useFadeUp(T.cardsStart - 25, 24, 20);
  const c0 = useSlideLeft(T.cardsStart + T.cardStagger * 0);
  const c1 = useSlideLeft(T.cardsStart + T.cardStagger * 1);
  const c2 = useSlideLeft(T.cardsStart + T.cardStagger * 2);
  const c3 = useSlideLeft(T.cardsStart + T.cardStagger * 3);
  const cardStyles = [c0,c1,c2,c3];

  const sceneOp = interpolate(frame,[T.statsStart-35,T.statsStart+10],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});

  if (frame < T.cardsStart - 10 || frame > T.statsStart + 10) return null;

  return (
    <AbsoluteFill style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'0 56px',gap:22,opacity:sceneOp}}>
      <div style={{...titleStyle,fontSize:42,fontWeight:800,color:C.white,textAlign:'center',marginBottom:4}}>
        Une plateforme,{' '}
        <span style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          tout ce qu'il te faut
        </span>
      </div>

      {FEATURES.map((f,i)=>(
        <div key={i} style={{
          ...cardStyles[i],width:'100%',
          background:'rgba(255,255,255,0.03)',backdropFilter:'blur(12px)',
          borderRadius:26,border:'1px solid rgba(255,255,255,0.07)',
          padding:'30px 36px',display:'flex',alignItems:'center',gap:26,
          boxShadow:`0 0 0 1px ${f.color}18,inset 0 1px 0 rgba(255,255,255,0.04)`,
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,
            background:`linear-gradient(180deg,transparent,${f.color},transparent)`,borderRadius:'0 2px 2px 0'}} />
          <div style={{width:80,height:80,borderRadius:20,flexShrink:0,background:`${f.color}18`,
            border:`1px solid ${f.color}40`,display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:34,boxShadow:`0 0 20px ${f.color}22`}}>
            {f.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{fontSize:34,fontWeight:700,color:C.white}}>{f.title}</span>
              <span style={{background:`${f.color}20`,border:`1px solid ${f.color}60`,
                borderRadius:100,padding:'4px 14px',fontSize:20,color:f.color,fontWeight:600}}>
                {f.tag}
              </span>
            </div>
            <div style={{fontSize:25,color:C.muted,lineHeight:1.65}}>{f.desc}</div>
          </div>
          <div style={{fontSize:26,color:f.color,opacity:0.45,flexShrink:0}}>→</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ─── SCÈNE 4 : Stats ──────────────────────────────────────────────────────────
const STATS = [
  {value:842,suffix:'+',label:'Actifs disponibles',icon:'📊',color:C.accent},
  {value:9,suffix:'',label:'Marchés couverts',icon:'🌍',color:C.purple},
  {value:0,suffix:'€',label:'Pour commencer',icon:'🆓',color:C.green},
  {value:30,suffix:'s',label:"D'inscription",icon:'⚡',color:C.amber},
];

const Scene4Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const titleStyle = useFadeUp(T.statsStart, 26, 22);
  const s0 = useScaleIn(T.statsStart + T.statStagger*0);
  const s1 = useScaleIn(T.statsStart + T.statStagger*1);
  const s2 = useScaleIn(T.statsStart + T.statStagger*2);
  const s3 = useScaleIn(T.statsStart + T.statStagger*3);
  const c0 = useCounter(STATS[0].value, T.statsStart + T.statStagger*0, 100);
  const c1 = useCounter(STATS[1].value, T.statsStart + T.statStagger*1, 80);
  const c2 = useCounter(STATS[2].value, T.statsStart + T.statStagger*2, 60);
  const c3 = useCounter(STATS[3].value, T.statsStart + T.statStagger*3, 90);
  const walletStyle = useFadeUp(T.statsStart + 100, 20, 20);

  const sceneOp = interpolate(frame,[T.ctaStart-35,T.ctaStart+10],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});

  if (frame < T.statsStart - 10 || frame > T.ctaStart + 10) return null;

  return (
    <AbsoluteFill style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'0 56px',gap:44,opacity:sceneOp}}>
      <div style={{...titleStyle,textAlign:'center'}}>
        <div style={{fontSize:48,fontWeight:900,color:C.white,marginBottom:10}}>En chiffres</div>
        <div style={{fontSize:30,color:C.muted}}>Tout ça, gratuitement</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:26,width:'100%'}}>
        {STATS.map((stat,i)=>{
          const scales = [s0,s1,s2,s3];
          const counts = [c0,c1,c2,c3];
          return (
            <div key={i} style={{
              ...scales[i],
              background:'rgba(255,255,255,0.03)',backdropFilter:'blur(12px)',
              borderRadius:30,border:`1px solid ${stat.color}25`,
              padding:'42px 28px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,
              boxShadow:`0 0 40px ${stat.color}12,inset 0 1px 0 rgba(255,255,255,0.04)`,
              position:'relative',overflow:'hidden',
            }}>
              <div style={{position:'absolute',inset:0,borderRadius:30,
                background:`radial-gradient(circle at 50% 50%,${stat.color}10 0%,transparent 70%)`}} />
              <div style={{fontSize:44,position:'relative'}}>{stat.icon}</div>
              <div style={{fontSize:84,fontWeight:900,lineHeight:1,letterSpacing:-3,
                color:stat.color,textShadow:`0 0 40px ${stat.color}80`,position:'relative'}}>
                {counts[i]}{stat.suffix}
              </div>
              <div style={{fontSize:26,color:C.muted,fontWeight:500,textAlign:'center',position:'relative'}}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{...walletStyle,width:'100%',
        background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:22,padding:'24px 32px',
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:22,color:C.muted,marginBottom:4}}>Wallet Virtuel</div>
          <div style={{fontSize:42,fontWeight:800,color:C.white}}>$12 438</div>
        </div>
        <WinRateBar startFrame={T.statsStart + 110} />
        <div style={{fontSize:38,fontWeight:800,color:C.green,textShadow:`0 0 20px ${C.green}60`}}>
          +$2 438
        </div>
      </div>
    </AbsoluteFill>
  );
};

const WinRateBar: React.FC<{startFrame:number}> = ({startFrame}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame,[startFrame,startFrame+90],[0,68],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  return (
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:22,color:C.muted,marginBottom:6}}>Win Rate</div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:130,height:8,background:'rgba(255,255,255,0.1)',borderRadius:4,overflow:'hidden'}}>
          <div style={{width:`${w}%`,height:'100%',
            background:`linear-gradient(90deg,${C.accent},${C.purple})`,borderRadius:4}} />
        </div>
        <span style={{fontSize:34,fontWeight:800,color:C.green}}>68%</span>
      </div>
    </div>
  );
};

// ─── SCÈNE 5 : CTA ────────────────────────────────────────────────────────────
const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const logoStyle = useScaleIn(T.ctaStart, 180);
  const tagStyle = useFadeUp(T.ctaStart + 40, 26, 24);
  const subStyle = useFadeUp(T.ctaStart + 80, 22, 22);
  const btnStyle = useFadeUp(T.ctaButton, 32, 24);
  const badgeStyle = useFadeUp(T.ctaButton + 30, 16, 20);
  const pulse = 1 + 0.03 * Math.sin((frame - T.ctaButton) / 28);

  if (frame < T.ctaStart - 10) return null;

  return (
    <AbsoluteFill style={{display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',gap:30}}>
      <div style={{position:'absolute',width:900,height:900,borderRadius:'50%',
        background:`radial-gradient(circle,rgba(255,45,120,0.16) 0%,transparent 60%)`,opacity:logoStyle.opacity}} />
      <div style={{position:'absolute',width:550,height:550,borderRadius:'50%',
        background:`radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 60%)`,
        opacity:logoStyle.opacity,transform:'translate(120px,-90px)'}} />

      <div style={{...logoStyle,textAlign:'center',position:'relative'}}>
        <div style={{fontSize:104,fontWeight:900,letterSpacing:-3,lineHeight:1}}>
          <span style={{color:C.white}}>Capten</span>
          <span style={{background:`linear-gradient(135deg,${C.accent} 0%,${C.purple} 100%)`,
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TDB</span>
        </div>
        <div style={{height:3,marginTop:12,
          background:`linear-gradient(90deg,transparent,${C.accent},${C.purple},transparent)`}} />
      </div>

      <div style={{...tagStyle,fontSize:68,fontWeight:900,color:C.white,
        textAlign:'center',lineHeight:1.15,maxWidth:900}}>
        La bourse,{' '}
        <span style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          enfin claire.
        </span>
      </div>

      <div style={{...subStyle,fontSize:33,color:C.muted,textAlign:'center',maxWidth:740,lineHeight:1.65}}>
        Rejoins 800+ traders actifs.{' '}
        Inscription gratuite en 30 secondes.
      </div>

      <div style={{
        opacity:btnStyle.opacity,
        transform:`${btnStyle.transform} scale(${frame >= T.ctaButton ? pulse : 1})`,
        position:'relative',
      }}>
        <div style={{position:'absolute',inset:-24,borderRadius:130,
          background:`radial-gradient(ellipse,${C.accentGlow} 0%,transparent 70%)`,filter:'blur(22px)'}} />
        <div style={{
          background:`linear-gradient(135deg,${C.accent} 0%,${C.purple} 100%)`,
          borderRadius:100,padding:'40px 94px',
          fontSize:52,fontWeight:900,color:'white',letterSpacing:-1,
          boxShadow:`0 8px 60px ${C.accentGlow},0 0 0 1px rgba(255,255,255,0.1) inset`,
          position:'relative',
        }}>
          captentdb.fr →
        </div>
      </div>

      <div style={{...badgeStyle,display:'flex',gap:30,marginTop:6}}>
        {['Pas de CB requise','0 engagement','100% gratuit'].map(t=>(
          <div key={t} style={{fontSize:26,color:C.muted,display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:C.green,fontWeight:800}}>✓</span> {t}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

import type { Metadata } from 'next';
import { LogoutButton } from './LogoutButton';
import { getAdminPanelData } from '@/lib/admin-panel-data';

export const metadata: Metadata = {
  title: 'Stratégie Marketing | Admin',
  robots: { index: false, follow: false },
};

const CATEGORY_LABELS: Record<string, string> = {
  remotion: '🎬 Remotion (vidéos)',
  tiktok: '📱 TikTok / Reels',
  blog: '📝 Blog SEO',
  twitter: '🐦 X / Twitter',
  newsletter: '📧 Newsletter',
  general: '⚡ Général',
};

const CATEGORY_ORDER = ['remotion', 'tiktok', 'blog', 'twitter', 'newsletter', 'general'];

function asValue(unit: 'percent' | 'count' | 'currency' | 'days', value: number): string {
  switch (unit) {
    case 'percent': return `${value}%`;
    case 'currency': return `${value}€`;
    case 'days': return `${value}j`;
    default: return value.toLocaleString('fr-FR');
  }
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '1rem 1.2rem',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text)',
  marginBottom: '0.8rem',
  marginTop: 0,
};

export default function MarketingPage() {
  const panel = getAdminPanelData();

  const promptsByCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: panel.prompts.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>ADMIN · PLAN MARKETING PERSONNEL</p>
          <h1 style={{ fontFamily: 'var(--font-title)', color: 'var(--text)', marginBottom: '0.4rem' }}>
            CMO Playbook — Guide opérable
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: '700px', margin: 0 }}>
            {panel.northStar}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div style={{ ...card, marginBottom: '2rem' }}>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
          Endpoint: <code>/api/admin/panel</code> · Mis à jour: {new Date(panel.generatedAt).toLocaleString('fr-FR')}
        </p>
      </div>

      {/* ── UVP ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Proposition de valeur unique</h2>
        <div style={{ ...card, borderLeft: '4px solid var(--blue)' }}>
          <p style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '1.05rem', margin: '0 0 1rem' }}>
            "{panel.uvp}"
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Segments cibles</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{panel.strategy.segments.map(s => <li key={s} style={{ color: 'var(--text)', marginBottom: '0.25rem' }}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Value props</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{panel.strategy.valueProps.map(v => <li key={v} style={{ color: 'var(--text)', marginBottom: '0.25rem' }}>{v}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Taglines ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Taglines (A/B testables)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          {panel.taglines.map((t) => (
            <div key={t.text} style={{ ...card, borderLeft: t.isPrimary ? '4px solid var(--blue)' : '1px solid var(--line)' }}>
              {t.isPrimary && <p style={{ color: 'var(--blue)', fontSize: '0.75rem', fontWeight: 700, margin: '0 0 0.4rem', textTransform: 'uppercase' }}>Principale</p>}
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.4rem' }}>"{t.text}"</p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>{t.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Personas ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Personas — À qui tu parles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          {panel.personas.map((p) => (
            <article key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ color: 'var(--text)', margin: 0, fontSize: '1rem' }}>{p.name}</h3>
                <span style={{ color: 'var(--muted)', fontSize: '0.78rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{p.age}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 0.6rem' }}>{p.description}</p>
              <p style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '0.85rem', margin: '0 0 0.6rem' }}>{p.trigger}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: '0 0 0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>Canaux</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                {p.channels.map(c => <span key={c} style={{ background: 'var(--line)', borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', color: 'var(--text)' }}>{c}</span>)}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}><strong style={{ color: 'var(--text)' }}>Ton :</strong> {p.tone}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── KPIs ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>KPIs cibles (M3 / M6 / M12)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          {panel.kpis.map((kpi) => (
            <article key={kpi.id} style={card}>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.78rem', textTransform: 'uppercase' }}>{kpi.label}</p>
              <p style={{ color: 'var(--text)', marginTop: '0.6rem', fontWeight: 700, fontSize: '1rem' }}>
                M3 {asValue(kpi.unit, kpi.m3)} · M6 {asValue(kpi.unit, kpi.m6)} · M12 {asValue(kpi.unit, kpi.m12)}
              </p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.8rem' }}>Owner: {kpi.owner}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Prompts Claude ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Prompts Claude — Copie-colle et envoie</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          Ces prompts sont prêts à être copiés et envoyés directement à Claude Code pour créer du contenu marketing.
        </p>
        {promptsByCategory.map(({ cat, label, items }) => (
          <div key={cat} style={{ marginBottom: '1.8rem' }}>
            <h3 style={{ color: 'var(--blue)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
              {label}
            </h3>
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {items.map((prompt) => (
                <article key={prompt.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '1rem' }}>
                    <h4 style={{ color: 'var(--text)', margin: 0, fontSize: '0.95rem' }}>{prompt.title}</h4>
                    <span style={{ background: 'var(--line)', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{prompt.id}</span>
                  </div>
                  <p style={{ color: 'var(--muted)', margin: '0 0 0.8rem', fontSize: '0.85rem' }}>{prompt.description}</p>
                  <pre style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '0.9rem',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    lineHeight: 1.6,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                  }}>
                    {prompt.prompt}
                  </pre>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Checklist par phase ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Checklist — Quoi faire et quand</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {panel.phaseChecklists.map((phase) => (
            <article key={phase.phase} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ color: 'var(--text)', margin: 0 }}>{phase.phase}</h3>
                <span style={{ background: 'var(--blue)', color: 'white', borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>{phase.period}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.3rem 1.5rem' }}>
                {phase.tasks.map((task) => (
                  <li key={task} style={{ color: 'var(--text)', fontSize: '0.88rem', marginBottom: '0.2rem', lineHeight: 1.5 }}>{task}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── Canaux ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Plan canaux</h2>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {panel.channels.map((channel) => (
            <article key={channel.channel} style={card}>
              <h3 style={{ color: 'var(--text)', margin: '0 0 0.3rem' }}>{channel.channel}</h3>
              <p style={{ color: 'var(--muted)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>{channel.objective}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.5rem' }}><strong>Cadence :</strong> {channel.cadence}</p>
              <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem' }}>{channel.hooks.map(h => <li key={h} style={{ color: 'var(--text)', fontSize: '0.88rem' }}>{h}</li>)}</ul>
              <p style={{ color: 'var(--blue)', margin: 0 }}><strong>CTA :</strong> {channel.cta}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Content Engine ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Content engine — Rythme hebdomadaire</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          <article style={card}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Slots hebdo</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{panel.contentEngine.weeklySlots.map(s => <li key={s} style={{ color: 'var(--text)', fontSize: '0.88rem', marginBottom: '0.3rem' }}>{s}</li>)}</ul>
          </article>
          <article style={card}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Clusters SEO</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{panel.contentEngine.seoClusters.map(s => <li key={s} style={{ color: 'var(--text)', fontSize: '0.88rem', marginBottom: '0.3rem' }}>{s}</li>)}</ul>
          </article>
          <article style={card}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Lead magnets</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{panel.contentEngine.leadMagnets.map(s => <li key={s} style={{ color: 'var(--text)', fontSize: '0.88rem', marginBottom: '0.3rem' }}>{s}</li>)}</ul>
          </article>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Roadmap trimestrielle</h2>
        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)' }}>
            <thead>
              <tr>
                {['Quarter', 'Objectif', 'Mouvements clés', 'Budget', 'Impact'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)', fontSize: '0.82rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panel.roadmap.map((q) => (
                <tr key={q.quarter} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{q.quarter}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{q.objective}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', fontSize: '0.85rem' }}>{q.keyMoves.join(' · ')}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>{q.budgetEUR.toLocaleString('fr-FR')}€</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', fontSize: '0.85rem' }}>{q.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Experiments ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>Expériences growth priorisées</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.9rem' }}>
          {panel.experiments.map((exp) => (
            <article key={exp.id} style={card}>
              <p style={{ margin: '0 0 0.4rem', color: 'var(--muted)', fontSize: '0.78rem' }}>{exp.id.toUpperCase()} · Effort {exp.effort}</p>
              <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 0.4rem' }}>{exp.hypothesis}</p>
              <p style={{ color: 'var(--text)', margin: 0 }}><strong>Metric :</strong> {exp.metric}</p>
              <p style={{ color: 'var(--text)', margin: 0 }}><strong>Lift cible :</strong> {exp.targetLift}</p>
              <p style={{ color: 'var(--muted)', margin: 0 }}><strong>Fenêtre :</strong> {exp.window}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Red Flags ── */}
      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={sectionTitle}>🚫 Ce qu'il ne faut JAMAIS faire</h2>
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {panel.redFlags.map((r) => (
            <article key={r.action} style={{ ...card, borderLeft: '4px solid #ef4444' }}>
              <p style={{ color: '#ef4444', fontWeight: 700, margin: '0 0 0.3rem', fontSize: '0.95rem' }}>❌ {r.action}</p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>{r.reason}</p>
            </article>
          ))}
          <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
            <p style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.5rem' }}>Disclaimer légal — à intégrer partout</p>
            <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
              "Les informations fournies sur CaptenTDB sont à but éducatif uniquement et ne constituent pas un conseil en investissement. Tout investissement comporte des risques, y compris la perte du capital investi."
            </p>
            <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
              À placer : pied de page du site · fin de chaque article · description YouTube · footer newsletter · sous-titres vidéos
            </p>
          </div>
        </div>
      </section>

      {/* ── Risk Register ── */}
      <section>
        <h2 style={sectionTitle}>Risk register</h2>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {panel.riskRegister.map((r) => (
            <article key={r.risk} style={card}>
              <p style={{ color: 'var(--text)', margin: 0, fontWeight: 600 }}>{r.risk}</p>
              <p style={{ color: 'var(--muted)', margin: '0.4rem 0' }}>{r.mitigation}</p>
              <p style={{ color: 'var(--blue)', margin: 0, fontSize: '0.85rem' }}>Owner : {r.owner}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}

import type { Metadata } from 'next';
import { LogoutButton } from './LogoutButton';
import { getAdminPanelData } from '@/lib/admin-panel-data';

export const metadata: Metadata = {
  title: 'Stratégie Marketing | Admin',
  robots: { index: false, follow: false },
};

function asValue(unit: 'percent' | 'count' | 'currency' | 'days', value: number): string {
  switch (unit) {
    case 'percent':
      return `${value}%`;
    case 'currency':
      return `${value}€`;
    case 'days':
      return `${value}j`;
    default:
      return value.toLocaleString('fr-FR');
  }
}

function PriorityBadge({ p }: { p: 1 | 2 | 3 }) {
  const map = {
    1: { label: 'Priorité 1', color: 'var(--red)' },
    2: { label: 'Priorité 2', color: 'var(--amber)' },
    3: { label: 'Priorité 3', color: 'var(--green)' },
  } as const;

  return (
    <span style={{
      border: `1px solid ${map[p].color}`,
      color: map[p].color,
      borderRadius: 999,
      padding: '0.1rem 0.55rem',
      fontSize: '0.72rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {map[p].label}
    </span>
  );
}

export default function MarketingPage() {
  const panel = getAdminPanelData();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--blue)', marginBottom: '0.4rem' }}>ADMIN · MARKETING · PRIVÉ</p>
          <h1 style={{ fontFamily: 'var(--font-title)', color: 'var(--text)', marginBottom: '0.4rem' }}>Plan marketing CaptenTDB (interne)</h1>
          <p style={{ color: 'var(--muted)', maxWidth: '900px', marginBottom: '0.35rem' }}>{panel.northStar}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>{panel.confidentiality}</p>
        </div>
        <LogoutButton />
      </header>

      <section style={{ marginBottom: '1.2rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.82rem' }}>
            Endpoint sécurisé disponible: <code>/api/admin/panel</code> · Généré: {new Date(panel.generatedAt).toLocaleString('fr-FR')}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Positionnement & UVP</h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.2rem' }}>
          <p style={{ color: 'var(--text)', marginTop: 0 }}>{panel.strategy.positioning}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Segments</h3>
              <ul>{panel.strategy.segments.map(s => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Value props</h3>
              <ul>{panel.strategy.valueProps.map(v => <li key={v} style={{ color: 'var(--text)' }}>{v}</li>)}</ul>
            </div>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Taglines A/B</h3>
              <ul>{panel.strategy.taglines.map(t => <li key={t} style={{ color: 'var(--text)' }}>{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Priorités stratégiques</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {panel.priorities.map((item) => (
            <article key={item.title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.9rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center' }}>
                <p style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>{item.title}</p>
                <PriorityBadge p={item.priority} />
              </div>
              <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Personas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {panel.personas.map((p) => (
            <article key={p.name} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
              <p style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>{p.name}</p>
              <p style={{ color: 'var(--muted)', margin: '0.3rem 0 0.6rem', fontSize: '0.84rem' }}>{p.age} · {p.trigger}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.35rem', fontSize: '0.82rem' }}><strong>Pains:</strong> {p.pains.join(' · ')}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.35rem', fontSize: '0.82rem' }}><strong>Canaux:</strong> {p.channels.join(' · ')}</p>
              <p style={{ color: 'var(--blue)', margin: 0, fontSize: '0.82rem' }}><strong>Offre:</strong> {p.offer}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>KPIs cibles (M3/M6/M12)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
          {panel.kpis.map((kpi) => (
            <article key={kpi.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.76rem', textTransform: 'uppercase' }}>{kpi.label}</p>
              <p style={{ color: 'var(--text)', margin: '0.5rem 0 0', fontWeight: 700 }}>
                M3 {asValue(kpi.unit, kpi.m3)} · M6 {asValue(kpi.unit, kpi.m6)} · M12 {asValue(kpi.unit, kpi.m12)}
              </p>
              <p style={{ color: 'var(--muted)', margin: '0.35rem 0 0', fontSize: '0.8rem' }}>Owner: {kpi.owner}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Canaux d’acquisition</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {panel.channels.map((ch) => (
            <article key={ch.channel} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center' }}>
                <p style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>{ch.channel}</p>
                <PriorityBadge p={ch.priority} />
              </div>
              <p style={{ color: 'var(--muted)', margin: '0.45rem 0' }}>{ch.objective}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.4rem', fontSize: '0.84rem' }}><strong>Cadence:</strong> {ch.cadence}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.4rem', fontSize: '0.84rem' }}><strong>Hooks:</strong> {ch.hooks.join(' · ')}</p>
              <p style={{ color: 'var(--blue)', margin: 0, fontSize: '0.84rem' }}><strong>CTA:</strong> {ch.cta}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Roadmap trimestrielle</h2>
        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)' }}>
            <thead>
              <tr>
                {['Quarter', 'Objectif', 'Mouvements clés', 'Budget', 'Impact'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)', fontSize: '0.78rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panel.roadmap.map((r) => (
                <tr key={r.quarter} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', fontWeight: 700 }}>{r.quarter}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{r.objective}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{r.keyMoves.join(' · ')}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{r.budgetEUR}€ / mois</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{r.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Content engine & Growth experiments</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Slots hebdo</h3>
            <ul>{panel.contentEngine.weeklySlots.map((s) => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>SEO clusters</h3>
            <ul>{panel.contentEngine.seoClusters.map((s) => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Hooks sociaux</h3>
            <ul>{panel.contentEngine.socialHooks.map((s) => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {panel.experiments.map((exp) => (
            <article key={exp.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem' }}>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.76rem' }}>{exp.id.toUpperCase()} · Effort {exp.effort}</p>
              <p style={{ color: 'var(--text)', margin: '0.45rem 0', fontWeight: 700 }}>{exp.hypothesis}</p>
              <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.84rem' }}><strong>Metric:</strong> {exp.metric}</p>
              <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.84rem' }}><strong>Lift cible:</strong> {exp.targetLift}</p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.84rem' }}><strong>Fenêtre:</strong> {exp.window}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Budget mensuel de lancement</h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem 1rem' }}>
          <p style={{ color: 'var(--text)' }}>
            Fourchette: <strong>{panel.budget.minimum}€</strong> à <strong>{panel.budget.target}€</strong> / mois
          </p>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {panel.budget.lines.map((line) => (
              <div key={line.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid var(--line)', paddingTop: '0.6rem' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>{line.name}</p>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.82rem' }}>{line.notes}</p>
                </div>
                <p style={{ margin: 0, color: 'var(--blue)', fontWeight: 700 }}>{line.monthlyEUR}€</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.7rem' }}>Risk register</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {panel.riskRegister.map((risk) => (
            <article key={risk.risk} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.95rem 1rem' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>{risk.risk}</p>
              <p style={{ margin: '0.4rem 0', color: 'var(--muted)' }}>{risk.mitigation}</p>
              <p style={{ margin: 0, color: 'var(--blue)', fontSize: '0.84rem' }}>Owner: {risk.owner}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

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

export default function MarketingPage() {
  const panel = getAdminPanelData();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>ADMIN · PANEL MARKETING</p>
          <h1 style={{ fontFamily: 'var(--font-title)', color: 'var(--text)', marginBottom: '0.4rem' }}>
            CMO Playbook — version opérable
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: '700px' }}>
            {panel.northStar}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div style={{ marginBottom: '2rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1rem 1.2rem' }}>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
          Endpoint disponible: <code>/api/admin/panel</code> · Dernière génération: {new Date(panel.generatedAt).toLocaleString('fr-FR')}
        </p>
      </div>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Positionnement stratégique</h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.2rem' }}>
          <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>{panel.strategy.positioning}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Segments</h3>
              <ul>{panel.strategy.segments.map(s => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Value props</h3>
              <ul>{panel.strategy.valueProps.map(v => <li key={v} style={{ color: 'var(--text)' }}>{v}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>KPIs cibles (M3 / M6 / M12)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          {panel.kpis.map((kpi) => (
            <article key={kpi.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.78rem', textTransform: 'uppercase' }}>{kpi.label}</p>
              <p style={{ color: 'var(--text)', marginTop: '0.6rem', fontWeight: 700 }}>
                M3 {asValue(kpi.unit, kpi.m3)} · M6 {asValue(kpi.unit, kpi.m6)} · M12 {asValue(kpi.unit, kpi.m12)}
              </p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.8rem' }}>Owner: {kpi.owner}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Plan canaux</h2>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {panel.channels.map((channel) => (
            <article key={channel.channel} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.2rem' }}>
              <h3 style={{ color: 'var(--text)', margin: 0 }}>{channel.channel}</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>{channel.objective}</p>
              <p style={{ color: 'var(--text)', margin: '0 0 0.6rem' }}><strong>Cadence:</strong> {channel.cadence}</p>
              <ul style={{ marginTop: 0 }}>{channel.hooks.map(h => <li key={h} style={{ color: 'var(--text)' }}>{h}</li>)}</ul>
              <p style={{ color: 'var(--blue)', marginBottom: 0 }}><strong>CTA:</strong> {channel.cta}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Roadmap trimestrielle</h2>
        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)' }}>Quarter</th>
                <th style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)' }}>Objectif</th>
                <th style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)' }}>Mouvements clés</th>
                <th style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)' }}>Budget</th>
                <th style={{ textAlign: 'left', padding: '0.8rem', color: 'var(--muted)' }}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {panel.roadmap.map((q) => (
                <tr key={q.quarter} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{q.quarter}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{q.objective}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{q.keyMoves.join(' · ')}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{q.budgetEUR.toLocaleString('fr-FR')}€</td>
                  <td style={{ padding: '0.8rem', color: 'var(--text)' }}>{q.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Expériences growth priorisées</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.9rem' }}>
          {panel.experiments.map((exp) => (
            <article key={exp.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.78rem' }}>{exp.id.toUpperCase()} · Effort {exp.effort}</p>
              <p style={{ color: 'var(--text)', fontWeight: 600 }}>{exp.hypothesis}</p>
              <p style={{ color: 'var(--text)', margin: 0 }}><strong>Metric:</strong> {exp.metric}</p>
              <p style={{ color: 'var(--text)', margin: 0 }}><strong>Lift cible:</strong> {exp.targetLift}</p>
              <p style={{ color: 'var(--muted)', margin: 0 }}><strong>Fenêtre:</strong> {exp.window}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Content engine</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Slots hebdo</h3>
            <ul>{panel.contentEngine.weeklySlots.map(s => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Clusters SEO</h3>
            <ul>{panel.contentEngine.seoClusters.map(s => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
            <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Lead magnets</h3>
            <ul>{panel.contentEngine.leadMagnets.map(s => <li key={s} style={{ color: 'var(--text)' }}>{s}</li>)}</ul>
          </article>
        </div>
      </section>

      <section>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.8rem' }}>Risk register</h2>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {panel.riskRegister.map((r) => (
            <article key={r.risk} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.2rem' }}>
              <p style={{ color: 'var(--text)', margin: 0, fontWeight: 600 }}>{r.risk}</p>
              <p style={{ color: 'var(--muted)', margin: '0.4rem 0' }}>{r.mitigation}</p>
              <p style={{ color: 'var(--blue)', margin: 0 }}>Owner: {r.owner}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

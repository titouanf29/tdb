'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin/marketing';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        router.push(next);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Erreur inconnue');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(45,124,255,0.15)',
            marginBottom: '1rem',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
            Espace Admin
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Connecte-toi avec ton adresse email admin</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--muted)',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@captentdb.fr"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                background: 'var(--bg-soft)',
                border: `1px solid ${error ? '#ff4d6d' : 'var(--line)'}`,
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ff4d6d', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              padding: '0.7rem',
              background: loading ? 'var(--surface-2)' : 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-title)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading || !email ? 'not-allowed' : 'pointer',
              opacity: loading || !email ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Vérification…' : 'Accéder'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

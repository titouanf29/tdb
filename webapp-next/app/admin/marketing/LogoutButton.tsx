'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '0.4rem 0.9rem',
        background: 'transparent',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        color: 'var(--muted)',
        fontSize: '0.82rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      Déconnexion
    </button>
  );
}

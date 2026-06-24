'use client'

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/admin-logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-2xs text-muted hover:text-ink transition-colors uppercase tracking-widest"
    >
      Sair
    </button>
  )
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

function Avatar({ name, size = 34 }) {
  const initials = (name || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const colors = [
    ['#6366f1','#8b5cf6'], ['#0891b2','#06b6d4'], ['#059669','#10b981'],
    ['#d97706','#f59e0b'], ['#dc2626','#ef4444'], ['#7c3aed','#a78bfa'],
  ];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const [c1, c2] = colors[idx];
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size > 30 ? 10 : 8,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 30 ? 13 : 11,
      fontWeight: 700, color: 'white', flexShrink: 0,
      letterSpacing: '0.5px',
    }}>
      {initials}
    </div>
  );
}

export default function Sidebar({ session, mobileOpen = false, onMobileClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const mainLinks = [
    { href: '/', icon: '📋', label: 'Leads', id: 'nav-leads' },
  ];

  const followUpLinks = [
    { href: '/follow-up-1', icon: '📞', label: 'Follow Up 1', id: 'nav-fu1' },
    { href: '/follow-up-2', icon: '🔁', label: 'Follow Up 2', id: 'nav-fu2' },
  ];

  const supportLinks = [
    { href: '/support', icon: '🎯', label: 'Support', id: 'nav-support' },
  ];

  const adminLinks = [
    { href: '/analytics', icon: '📊', label: 'Analytics', id: 'nav-analytics' },
    { href: '/settings', icon: '⚙️', label: 'Settings', id: 'nav-settings' },
  ];

  const isSupport = session?.role === 'support';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isAdmin = session?.role === 'admin';

  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">💬</div>
        <div>
          <h1>WATI CRM</h1>
          <span>WhatsApp Leads</span>
        </div>
        {onMobileClose && (
          <button className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Close menu">✕</button>
        )}
      </div>

      {/* User card */}
      <div className="sidebar-user">
        <Avatar name={session?.name} size={34} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{session?.name || 'User'}</div>
          <div className="sidebar-user-role">{session?.role || 'telecaller'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>

        {mainLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            id={link.id}
            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <span className="icon">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}

        {(isAdmin || !isSupport) && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Follow Ups</div>
            {followUpLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                id={link.id}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
              >
                <span className="icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </>
        )}

        {(isAdmin || isSupport) && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Support</div>
            {supportLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                id={link.id}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
              >
                <span className="icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Admin</div>
            {adminLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                id={link.id}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
              >
                <span className="icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {isAdmin && (
          <a href="/api/export" className="sidebar-footer-btn" id="export-btn">
            <span className="icon" style={{ fontSize: 16 }}>📥</span>
            <span>Export Excel</span>
          </a>
        )}
        <button onClick={handleLogout} className="sidebar-footer-btn danger">
          <span className="icon" style={{ fontSize: 16 }}>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

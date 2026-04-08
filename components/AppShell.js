'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ session, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile nav)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (!session) {
    return <main className="main-content">{children}</main>;
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="mobile-topbar">
        <button
          className="mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
        <div className="mobile-brand">
          <span>💬</span>
          <strong>WATI CRM</strong>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        session={session}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ── */}
      <main className="main-content">
        {children}
      </main>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '⚡', title: 'Instant Lead Assignment', desc: 'New chats auto-routed to free agents' },
    { icon: '📊', title: 'Advanced Analytics', desc: 'Real-time conversion & performance insights' },
    { icon: '💬', title: 'Full Chat History', desc: 'Every WhatsApp message in one place' },
    { icon: '🎯', title: 'Smart Load Balancing', desc: 'Fairest distribution across your team' },
  ];

  return (
    <div className="login-page">

      {/* Left — dark branding panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">💬</div>
          <h1>WATI CRM</h1>
          <p>WhatsApp Lead Management Platform</p>
        </div>

        <div className="login-features">
          {features.map(f => (
            <div key={f.title} className="login-feature">
              <div className="login-feature-icon">{f.icon}</div>
              <div className="login-feature-text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative dots */}
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 6, zIndex: 1,
        }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === 1 ? '#6366f1' : 'rgba(255,255,255,0.2)',
            }} />
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div className="login-right">
        <div className="login-form-box">
          <h2>Welcome back</h2>
          <p>Sign in to manage your WhatsApp leads</p>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="login-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, padding: 2,
                  }}
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Contact your admin to get login credentials
          </p>
        </div>
      </div>
    </div>
  );
}

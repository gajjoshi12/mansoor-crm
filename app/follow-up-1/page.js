'use client';

import { useState, useEffect, useCallback } from 'react';
import LeadDetailModal from '@/components/LeadDetailModal';

export default function FollowUp1Page() {
  const [fu1Leads, setFu1Leads]       = useState([]);
  const [ncLeads, setNcLeads]         = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingId, setUpdatingId]   = useState(null);
  const [session, setSession]         = useState(null);
  const [search, setSearch]           = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/leads?status=follow_up_1&limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
        fetch(`/api/leads?status=interested_no_convert&limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setFu1Leads(d1.leads || []);
      setNcLeads(d2.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchTelecallers = useCallback(async () => {
    try {
      const res = await fetch('/api/telecallers');
      setTelecallers(await res.json() || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setSession(d.user); });
    fetchTelecallers();
  }, [fetchTelecallers]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    const interval = setInterval(fetchLeads, 20000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const quickUpdate = async (leadId, newStatus, e) => {
    e.stopPropagation();
    setUpdatingId(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchLeads();
    } catch {}
    finally { setUpdatingId(null); }
  };

  const total = fu1Leads.length + ncLeads.length;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2>📞 Follow Up 1</h2>
          <div className="pulse-dot green" title="Live – refreshing every 20s" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} leads</span>
        </div>
        <div className="page-header-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="leads-container">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : (
          <>
            {/* ── Follow Up 1 Section ── */}
            <div className="fu-section-header">
              <span className="fu-section-badge fu-badge-fu1">Follow Up 1</span>
              <span className="fu-section-count">{fu1Leads.length} leads</span>
              <span className="fu-section-desc">Called once — waiting for callback</span>
            </div>

            {fu1Leads.length === 0 ? (
              <div className="empty-state" style={{ marginBottom: 32 }}>
                <span className="empty-icon">📭</span>
                <p>No Follow Up 1 leads</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', marginBottom: 32 }}>
                <LeadsTable
                  leads={fu1Leads}
                  telecallers={telecallers}
                  session={session}
                  updatingId={updatingId}
                  onSelect={setSelectedLead}
                  onQuickUpdate={quickUpdate}
                  context="fu1"
                />
              </div>
            )}

            {/* ── Interested but No Convert Section ── */}
            <div className="fu-section-header" style={{ marginTop: 8 }}>
              <span className="fu-section-badge fu-badge-nc">Interested but No Convert</span>
              <span className="fu-section-count">{ncLeads.length} leads</span>
              <span className="fu-section-desc">Support team forwarded — retry needed</span>
            </div>

            {ncLeads.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✨</span>
                <p>No forwarded leads</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
                <LeadsTable
                  leads={ncLeads}
                  telecallers={telecallers}
                  session={session}
                  updatingId={updatingId}
                  onSelect={setSelectedLead}
                  onQuickUpdate={quickUpdate}
                  context="nc"
                />
              </div>
            )}
          </>
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal
          leadId={selectedLead.id}
          onClose={() => { setSelectedLead(null); fetchLeads(); }}
          telecallers={telecallers}
          session={session}
        />
      )}
    </>
  );
}

function LeadsTable({ leads, telecallers, session, updatingId, onSelect, onQuickUpdate, context }) {
  const isAdmin = session?.role === 'admin';
  return (
    <table className="leads-table">
      <thead>
        <tr>
          <th style={{ width: 50, textAlign: 'center' }}>#</th>
          <th>Lead</th>
          <th className="col-hide-mobile">Last Message</th>
          <th className="col-hide-mobile">Last Activity</th>
          <th className="col-hide-mobile">Status</th>
          {isAdmin && <th className="col-hide-mobile">Agent</th>}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead, idx) => (
          <tr
            key={lead.id}
            onClick={() => onSelect(lead)}
            style={{ opacity: updatingId === lead.id ? 0.45 : 1 }}
          >
            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12 }}>
              {idx + 1}
            </td>
            <td>
              <div className="lead-cell">
                <LeadAvatar name={lead.name || lead.phone} />
                <div>
                  <div className="lead-name">{lead.name || 'Unknown'}</div>
                  <div className="lead-phone">{formatPhone(lead.phone)}</div>
                </div>
              </div>
            </td>
            <td className="col-hide-mobile"><div className="lead-message">{lead.last_message || '—'}</div></td>
            <td className="col-hide-mobile"><div style={{ fontSize: 13 }}>{formatTime(lead.last_activity)}</div></td>
            <td className="col-hide-mobile">
              <span className={`status-badge status-${(lead.status || '').replace(/_/g, '-')}`}>
                {statusDot(lead.status)} {statusLabel(lead.status)}
              </span>
            </td>
            {isAdmin && (
              <td className="col-hide-mobile">
                <div className="lead-assignee">
                  {lead.telecaller_name
                    ? <><LeadAvatar name={lead.telecaller_name} size={22} /> {lead.telecaller_name}</>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
              </td>
            )}
            <td onClick={e => e.stopPropagation()}>
              <div className="quick-actions">
                <button className="qa-btn qa-interested" onClick={e => onQuickUpdate(lead.id, 'interested', e)}>✓ Int.</button>
                <button className="qa-btn qa-not-interested" onClick={e => onQuickUpdate(lead.id, 'not_interested', e)}>✗ No</button>
                <button className="qa-btn qa-call-later" onClick={e => onQuickUpdate(lead.id, 'follow_up_2', e)}>🔁 FU2</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeadAvatar({ name, size = 32 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const palette = [['#6366f1','#8b5cf6'],['#0891b2','#06b6d4'],['#059669','#10b981'],['#d97706','#f59e0b'],['#dc2626','#ef4444'],['#7c3aed','#a78bfa']];
  const [c1, c2] = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div className="lead-avatar" style={{ background: `linear-gradient(135deg,${c1},${c2})`, width: size, height: size, fontSize: size > 28 ? 12 : 10 }}>
      {initials}
    </div>
  );
}

function statusLabel(s) {
  return { new:'New', contacted:'Called', interested:'Interested', not_interested:'Not Interested', follow_up_1:'Follow Up 1', follow_up_2:'Follow Up 2', interested_no_convert:'No Convert', converted:'Converted', closed:'Closed' }[s] || (s || '');
}
function statusDot(s) {
  return { new:'🔵', contacted:'🟡', interested:'🟢', not_interested:'🔴', follow_up_1:'🟠', follow_up_2:'🔶', interested_no_convert:'🟣', converted:'🏆', closed:'⚫' }[s] || '⚪';
}
function formatPhone(phone) {
  if (!phone) return '—';
  if (phone.length === 12 && phone.startsWith('91')) return `+91 ${phone.slice(2,7)} ${phone.slice(7)}`;
  if (phone.length === 10) return `${phone.slice(0,5)} ${phone.slice(5)}`;
  return phone;
}
function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(String(ts).includes('Z') || String(ts).includes('+') ? ts : ts + 'Z');
    const diff = (Date.now() - d) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return d.toLocaleDateString('en-IN');
  } catch { return '—'; }
}

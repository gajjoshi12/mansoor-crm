'use client';

import { useState, useEffect, useCallback } from 'react';
import LeadDetailModal from '@/components/LeadDetailModal';

export default function SupportPage() {
  const [leads, setLeads]             = useState([]);
  const [convertedLeads, setConverted] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingId, setUpdatingId]   = useState(null);
  const [session, setSession]         = useState(null);
  const [search, setSearch]           = useState('');
  const [showConverted, setShowConverted] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const a = assignedFilter ? `&assigned=${assignedFilter}` : '';

      const [r1, r2] = await Promise.all([
        fetch(`/api/leads?status=interested&limit=200${q}${a}`),
        fetch(`/api/leads?status=converted&limit=200${q}${a}`),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setLeads(d1.leads || []);
      setConverted(d2.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search, assignedFilter]);

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

  const isAdmin   = session?.role === 'admin';
  const isSupport = session?.role === 'support';

  // Support members for filter dropdown (admin only)
  const supportMembers = telecallers.filter(t => t.role === 'support' && t.active);

  const convRate = leads.length + convertedLeads.length > 0
    ? ((convertedLeads.length / (leads.length + convertedLeads.length)) * 100).toFixed(0)
    : '—';

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2>🎯 {isAdmin ? 'Support — All Leads' : 'My Support Leads'}</h2>
          <div className="pulse-dot green" title="Live – refreshing every 20s" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leads.length} pending</span>
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
          {isAdmin && supportMembers.length > 0 && (
            <select
              className="filter-select"
              value={assignedFilter}
              onChange={e => setAssignedFilter(e.target.value)}
            >
              <option value="">All Support Members</option>
              {supportMembers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConverted(v => !v)}
          >
            {showConverted ? '▲ Hide' : '🏆 Show'} Converted ({convertedLeads.length})
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-icon green">🟢</div>
          <div className="kpi-info">
            <div className="kpi-value">{leads.length}</div>
            <div className="kpi-label">Pending</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon teal">🏆</div>
          <div className="kpi-info">
            <div className="kpi-value">{convertedLeads.length}</div>
            <div className="kpi-label">Converted</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple">📊</div>
          <div className="kpi-info">
            <div className="kpi-value">{convRate}{convRate !== '—' ? '%' : ''}</div>
            <div className="kpi-label">Conv. Rate</div>
          </div>
        </div>
        {isAdmin && (
          <div className="kpi-card">
            <div className="kpi-icon blue">👥</div>
            <div className="kpi-info">
              <div className="kpi-value">{supportMembers.length}</div>
              <div className="kpi-label">Team Size</div>
            </div>
          </div>
        )}
      </div>

      <div className="leads-container">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : (
          <>
            {/* ── Pending Interested Leads ── */}
            <div className="fu-section-header">
              <span className="fu-section-badge fu-badge-interested">Interested Leads</span>
              <span className="fu-section-count">{leads.length} leads</span>
              <span className="fu-section-desc">
                {isSupport ? 'Assigned to you — convert or forward back to Follow Up 1' : 'Try to convert — or forward back to Follow Up 1'}
              </span>
            </div>

            {leads.length === 0 ? (
              <div className="empty-state" style={{ marginBottom: 32 }}>
                <span className="empty-icon">✨</span>
                <p>{isSupport ? 'No leads assigned to you right now' : 'No interested leads'}</p>
                <small>Leads marked Interested by telecallers are auto-assigned here</small>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', marginBottom: 32 }}>
                <table className="leads-table" id="support-leads-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>#</th>
                      <th>Lead</th>
                      <th className="col-hide-mobile">Last Message</th>
                      <th className="col-hide-mobile">Last Activity</th>
                      {isAdmin && <th className="col-hide-mobile">Assigned To</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, idx) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        id={`support-row-${lead.id}`}
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
                        {isAdmin && (
                          <td className="col-hide-mobile">
                            <div className="lead-assignee">
                              {lead.telecaller_name
                                ? <><LeadAvatar name={lead.telecaller_name} size={22} />{' '}{lead.telecaller_name}</>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </div>
                          </td>
                        )}
                        <td onClick={e => e.stopPropagation()}>
                          <div className="quick-actions">
                            <button
                              className="qa-btn qa-converted"
                              onClick={e => quickUpdate(lead.id, 'converted', e)}
                            >
                              🏆 Convert
                            </button>
                            <button
                              className="qa-btn qa-no-convert"
                              onClick={e => quickUpdate(lead.id, 'interested_no_convert', e)}
                              title="Forward to Follow Up 1 — Interested but No Convert"
                            >
                              ↩ Back to FU1
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Converted Leads (collapsible) ── */}
            {showConverted && (
              <>
                <div className="fu-section-header">
                  <span className="fu-section-badge fu-badge-converted">Converted</span>
                  <span className="fu-section-count">{convertedLeads.length} leads</span>
                  <span className="fu-section-desc">Successfully closed by support team</span>
                </div>
                {convertedLeads.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">🏆</span>
                    <p>No converted leads yet</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50, textAlign: 'center' }}>#</th>
                          <th>Lead</th>
                          <th className="col-hide-mobile">Last Message</th>
                          <th className="col-hide-mobile">Status</th>
                          {isAdmin && <th className="col-hide-mobile">Assigned To</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {convertedLeads.map((lead, idx) => (
                          <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
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
                            <td className="col-hide-mobile">
                              <span className="status-badge status-converted">🏆 Converted</span>
                            </td>
                            {isAdmin && (
                              <td className="col-hide-mobile">
                                <div className="lead-assignee">
                                  {lead.telecaller_name
                                    ? <><LeadAvatar name={lead.telecaller_name} size={22} />{' '}{lead.telecaller_name}</>
                                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Support Team Leaderboard (admin only) ── */}
            {isAdmin && supportMembers.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div className="fu-section-header">
                  <span className="fu-section-badge" style={{ background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-border)' }}>Team Performance</span>
                  <span className="fu-section-count">{supportMembers.length} members</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {supportMembers.map(member => {
                    const memberPending   = leads.filter(l => l.assigned_to === member.id).length;
                    const memberConverted = convertedLeads.filter(l => l.assigned_to === member.id).length;
                    const memberTotal     = memberPending + memberConverted;
                    const memberRate      = memberTotal > 0 ? ((memberConverted / memberTotal) * 100).toFixed(0) : 0;
                    return (
                      <div key={member.id} className="kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                          <LeadAvatar name={member.name} size={36} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{member.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{member.username}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>
                            {memberRate}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, width: '100%', fontSize: 12 }}>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', background: 'var(--green-bg)', borderRadius: 6 }}>
                            <div style={{ fontWeight: 800, color: 'var(--green)', fontSize: 16 }}>{memberPending}</div>
                            <div style={{ color: 'var(--text-muted)' }}>Pending</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', background: '#ecfeff', borderRadius: 6 }}>
                            <div style={{ fontWeight: 800, color: '#0e7490', fontSize: 16 }}>{memberConverted}</div>
                            <div style={{ color: 'var(--text-muted)' }}>Converted</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

/* ── Helpers ── */
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

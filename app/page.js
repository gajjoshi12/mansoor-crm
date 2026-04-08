'use client';

import { useState, useEffect, useCallback } from 'react';
import LeadDetailModal from '@/components/LeadDetailModal';

/* ─── Avatar helper ─── */
function Avatar({ name, size = 34 }) {
  const initials = (name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const palette = [
    ['#6366f1','#8b5cf6'], ['#0891b2','#06b6d4'], ['#059669','#10b981'],
    ['#d97706','#f59e0b'], ['#dc2626','#ef4444'], ['#7c3aed','#a78bfa'],
  ];
  const [c1, c2] = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div className="lead-avatar" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, width: size, height: size }}>
      {initials}
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [sources, setSources]       = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [kpi, setKpi]               = useState({ total: 0, today: 0, pending: 0, closed: 0, interested: 0, notInterested: 0 });

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [session, setSession]         = useState(null);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (assignedFilter) params.set('assigned', assignedFilter);
      params.set('page', page.toString());

      const res  = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setSources(data.source_numbers || []);

      // Build KPI from returned data (quick approximation)
      if (!search && statusFilter === 'all' && !sourceFilter && !assignedFilter && page === 1) {
        const ls = data.leads || [];
        setKpi(prev => ({ ...prev, total: data.total || 0 }));
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, assignedFilter, page]);

  const fetchKpi = useCallback(async () => {
    try {
      const res  = await fetch('/api/analytics');
      const data = await res.json();
      if (data.statusCounts) {
        const sc = data.statusCounts;
        setKpi({
          total:        data.total || 0,
          today:        data.today || 0,
          pending:      (sc.newLeads || 0) + (sc.contacted || 0) + (sc.callLater || 0),
          closed:       sc.closed || 0,
          interested:   sc.interested || 0,
          notInterested: sc.notInterested || 0,
        });
      }
    } catch { /* ignore — KPI is optional */ }
  }, []);

  const fetchTelecallers = useCallback(async () => {
    try {
      const res  = await fetch('/api/telecallers');
      setTelecallers(await res.json() || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchTelecallers();
  }, [fetchLeads, fetchTelecallers]);

  useEffect(() => {
    fetchKpi();
    const interval = setInterval(() => { fetchLeads(); fetchKpi(); }, 20000);
    return () => clearInterval(interval);
  }, [fetchLeads, fetchKpi]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setSession(d.user);
    });
  }, []);

  const quickUpdate = async (leadId, newStatus, e) => {
    e.stopPropagation();
    setUpdatingId(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch {}
    finally { setUpdatingId(null); }
  };

  const isAdmin   = session?.role === 'admin';
  const offset    = (page - 1) * 50;
  const totalPages = Math.ceil(total / 50);
  const statuses   = ['all','new','contacted','interested','not_interested','follow_up_1','follow_up_2','interested_no_convert','converted','closed'];

  const kpiCards = [
    { icon: '📋', label: 'Total Leads',    value: kpi.total,         color: 'blue',   key: 'total' },
    { icon: '✨', label: 'New Today',       value: kpi.today,         color: 'purple', key: 'today' },
    { icon: '⏳', label: 'Pending',         value: kpi.pending,       color: 'orange', key: 'pending' },
    { icon: '💚', label: 'Interested',      value: kpi.interested,    color: 'green',  key: 'interested' },
    { icon: '🚫', label: 'Not Interested',  value: kpi.notInterested, color: 'red',    key: 'not_interested' },
    { icon: '✅', label: 'Closed',          value: kpi.closed,        color: 'teal',   key: 'closed' },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>{isAdmin ? 'All Leads' : 'My Leads'}</h2>
          <div className="pulse-dot green" title="Live – refreshing every 20s" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {total.toLocaleString()} leads
          </span>
        </div>
        <div className="page-header-actions">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              id="leads-search"
              type="text"
              placeholder="Search name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            id="filter-status"
            className="filter-select"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {statuses.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : statusLabel(s)}
              </option>
            ))}
          </select>
          {isAdmin && (
            <>
              <select
                id="filter-source"
                className="filter-select"
                value={sourceFilter}
                onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Sources</option>
                {sources.map(s => (
                  <option key={s.source_number} value={s.source_number}>
                    {s.source_label ? `${s.source_label} (${s.source_number})` : s.source_number}
                  </option>
                ))}
              </select>
              <select
                id="filter-assigned"
                className="filter-select"
                value={assignedFilter}
                onChange={e => { setAssignedFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Agents</option>
                <option value="unassigned">Unassigned</option>
                {telecallers.filter(t => t.active && t.role === 'telecaller').map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        {kpiCards.map(k => (
          <div
            key={k.key}
            className="kpi-card"
            onClick={() => { setStatusFilter(k.key === 'total' || k.key === 'today' ? 'all' : k.key); setPage(1); }}
            style={{ cursor: 'pointer' }}
          >
            <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
            <div className="kpi-info">
              <div className="kpi-value">{k.value.toLocaleString()}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="leads-container">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : leads.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No leads found</p>
            <small>
              {search || statusFilter !== 'all' || sourceFilter || assignedFilter
                ? 'Try adjusting your filters or search'
                : isAdmin
                  ? 'Send a webhook to /api/webhook to start receiving leads'
                  : 'No leads assigned to you yet — check back soon'}
            </small>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <table className="leads-table" id="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>#</th>
                    <th>Lead</th>
                    <th className="col-hide-mobile">Last Message</th>
                    <th className="col-hide-mobile">Received</th>
                    <th>Status</th>
                    {isAdmin && <th className="col-hide-mobile">Source</th>}
                    {isAdmin && <th className="col-hide-mobile">Agent</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      id={`lead-row-${lead.id}`}
                      style={{ opacity: updatingId === lead.id ? 0.45 : 1 }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12 }}>
                        {offset + idx + 1}
                      </td>
                      <td>
                        <div className="lead-cell">
                          <Avatar name={lead.name || lead.phone} size={34} />
                          <div>
                            <div className="lead-name">{lead.name || 'Unknown'}</div>
                            <div className="lead-phone">{formatPhone(lead.phone)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="col-hide-mobile">
                        <div className="lead-message">{lead.last_message || '—'}</div>
                      </td>
                      <td className="col-hide-mobile">
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{formatTime(lead.created_at)}</div>
                        {lead.last_activity !== lead.created_at && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            active {formatTime(lead.last_activity)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${(lead.status || '').replace(/_/g, '-')}`}>
                          {statusDot(lead.status)} {statusLabel(lead.status)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="col-hide-mobile">
                          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                            {lead.source_label ? (
                              <span style={{ fontSize:11, fontWeight:700, color:'#25d366', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'2px 7px', whiteSpace:'nowrap', display:'inline-block' }}>
                                {lead.source_label}
                              </span>
                            ) : null}
                            <span className="lead-source" style={{ fontSize:11 }}>{lead.source_number || '—'}</span>
                          </div>
                        </td>
                      )}
                      {isAdmin && (
                        <td className="col-hide-mobile">
                          <div className="lead-assignee">
                            {lead.telecaller_name
                              ? <><Avatar name={lead.telecaller_name} size={22} /> {lead.telecaller_name}</>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </td>
                      )}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="quick-actions">
                          {/* Follow Up 1 leads → can go to FU2, Interested, Not Interested */}
                          {lead.status === 'follow_up_1' && (
                            <>
                              <button className="qa-btn qa-interested" onClick={e => quickUpdate(lead.id, 'interested', e)}>✓ Int.</button>
                              <button className="qa-btn qa-not-interested" onClick={e => quickUpdate(lead.id, 'not_interested', e)}>✗ No</button>
                              <button className="qa-btn qa-call-later" onClick={e => quickUpdate(lead.id, 'follow_up_2', e)}>🔁 FU2</button>
                            </>
                          )}
                          {/* Follow Up 2 leads → final: Interested or Not Interested only */}
                          {lead.status === 'follow_up_2' && (
                            <>
                              <button className="qa-btn qa-interested" onClick={e => quickUpdate(lead.id, 'interested', e)}>✓ Int.</button>
                              <button className="qa-btn qa-not-interested" onClick={e => quickUpdate(lead.id, 'not_interested', e)}>✗ No</button>
                            </>
                          )}
                          {/* Interested No Convert (in FU1 section) */}
                          {lead.status === 'interested_no_convert' && (
                            <>
                              <button className="qa-btn qa-interested" onClick={e => quickUpdate(lead.id, 'interested', e)}>✓ Int.</button>
                              <button className="qa-btn qa-not-interested" onClick={e => quickUpdate(lead.id, 'not_interested', e)}>✗ No</button>
                              <button className="qa-btn qa-call-later" onClick={e => quickUpdate(lead.id, 'follow_up_2', e)}>🔁 FU2</button>
                            </>
                          )}
                          {/* New / Contacted leads → normal flow */}
                          {['new','contacted'].includes(lead.status) && (
                            <>
                              <button className="qa-btn qa-interested" onClick={e => quickUpdate(lead.id, 'interested', e)}>✓ Int.</button>
                              <button className="qa-btn qa-not-interested" onClick={e => quickUpdate(lead.id, 'not_interested', e)}>✗ No</button>
                              <button className="qa-btn qa-call-later" onClick={e => quickUpdate(lead.id, 'follow_up_1', e)}>↻ Later</button>
                            </>
                          )}
                          {/* Support: Converted leads or Interested leads */}
                          {lead.status === 'interested' && (
                            <button className="qa-btn qa-converted" onClick={e => quickUpdate(lead.id, 'converted', e)}>🏆 Conv.</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {page} / {totalPages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal
          leadId={selectedLead.id}
          onClose={() => { setSelectedLead(null); fetchLeads(); fetchKpi(); }}
          telecallers={telecallers}
          session={session}
        />
      )}
    </>
  );
}

/* ─── Helpers ─── */
function statusLabel(s) {
  return {
    new: 'New', contacted: 'Called', interested: 'Interested',
    not_interested: 'Not Interested', 'follow-up': 'Follow Up 1',
    follow_up_1: 'Follow Up 1', follow_up_2: 'Follow Up 2',
    interested_no_convert: 'No Convert', converted: 'Converted', closed: 'Closed',
  }[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
}
function statusDot(s) {
  return {
    new: '🔵', contacted: '🟡', interested: '🟢', not_interested: '🔴',
    'follow-up': '🟠', follow_up_1: '🟠', follow_up_2: '🔶',
    interested_no_convert: '🟣', converted: '🏆', closed: '⚫',
  }[s] || '⚪';
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
    if (typeof ts === 'number' || (!isNaN(ts) && !String(ts).includes('-'))) {
      ts = new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)).toISOString();
    }
    const d = new Date(String(ts).includes('Z') || String(ts).includes('+') ? ts : ts + 'Z');
    const diff = (Date.now() - d) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return d.toLocaleDateString('en-IN');
  } catch { return '—'; }
}

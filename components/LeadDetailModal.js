'use client';

import { useState, useEffect, useRef } from 'react';

function statusLabel(s) {
  return {
    new: 'New', contacted: 'Called', interested: 'Interested',
    not_interested: 'Not Interested', 'follow-up': 'Follow Up 1',
    follow_up_1: 'Follow Up 1', follow_up_2: 'Follow Up 2',
    interested_no_convert: 'No Convert', converted: 'Converted', closed: 'Closed',
  }[s] || (s || '');
}

// Returns available actions based on current status and role
function getStatusActions(currentStatus, role) {
  if (role === 'support') {
    return [
      { value: 'converted',      label: '🏆 Converted',       cls: 'sa-converted' },
      { value: 'interested_no_convert', label: '↩ Back to FU1', cls: 'sa-no-convert' },
    ];
  }
  if (currentStatus === 'follow_up_2') {
    return [
      { value: 'interested',     label: '✅ Interested',       cls: 'sa-interested' },
      { value: 'not_interested', label: '❌ Not Interested',   cls: 'sa-not-interested' },
    ];
  }
  if (currentStatus === 'follow_up_1' || currentStatus === 'interested_no_convert') {
    return [
      { value: 'interested',     label: '✅ Interested',       cls: 'sa-interested' },
      { value: 'not_interested', label: '❌ Not Interested',   cls: 'sa-not-interested' },
      { value: 'follow_up_2',    label: '🔁 Call Later',       cls: 'sa-call-later' },
    ];
  }
  // Default: new / contacted
  return [
    { value: 'contacted',      label: '📞 Called',          cls: 'sa-called' },
    { value: 'interested',     label: '✅ Interested',       cls: 'sa-interested' },
    { value: 'not_interested', label: '❌ Not Interested',   cls: 'sa-not-interested' },
    { value: 'follow_up_1',    label: '↻ Call Later',        cls: 'sa-call-later' },
    { value: 'closed',         label: '🔒 Closed',           cls: 'sa-closed' },
  ];
}

function formatTime(ts, full = false) {
  if (!ts) return '—';
  try {
    if (typeof ts === 'number' || (!isNaN(ts) && !String(ts).includes('-'))) {
      ts = new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)).toISOString();
    }
    const d = new Date(String(ts).includes('Z') || String(ts).includes('+') ? ts : ts + 'Z');
    if (full) return d.toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
    const diff = (Date.now() - d) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff/1440)}d ago`;
    return d.toLocaleDateString('en-IN');
  } catch { return '—'; }
}

function Avatar({ name, size = 48 }) {
  const initials = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const palette = [['#6366f1','#8b5cf6'],['#0891b2','#06b6d4'],['#059669','#10b981'],['#d97706','#f59e0b'],['#dc2626','#ef4444'],['#7c3aed','#a78bfa']];
  const [c1,c2] = palette[(name?.charCodeAt(0)||0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius: size > 36 ? 14 : 10, background:`linear-gradient(135deg,${c1},${c2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: size > 36 ? 18 : 12, fontWeight:700, color:'white', flexShrink:0, letterSpacing:'0.5px' }}>
      {initials}
    </div>
  );
}

export default function LeadDetailModal({ leadId, telecallers, onClose, session }) {
  const [lead, setLead]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteInput, setNoteInput] = useState('');
  const [savingStatus, setSaving] = useState(false);
  const [toast, setToast]         = useState(null);
  const chatRef = useRef(null);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      setLead(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLead(); }, [leadId]);
  useEffect(() => {
    if (activeTab === 'conversation' && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [lead?.messages, activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: newStatus }),
      });
      setLead(prev => ({ ...prev, status: newStatus }));
      showToast(`Marked as ${statusLabel(newStatus)}`);
    } catch { showToast('Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const updateAssignment = async (telecallerId) => {
    try {
      const val = telecallerId === '' ? null : parseInt(telecallerId);
      await fetch(`/api/leads/${leadId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ assigned_to: val }),
      });
      const tc = telecallers.find(t => t.id === val);
      setLead(prev => ({ ...prev, assigned_to: val, telecaller_name: tc?.name || null }));
      showToast(tc ? `Assigned to ${tc.name}` : 'Unassigned');
    } catch { showToast('Failed', 'error'); }
  };

  const updateName = async (newName) => {
    if (!newName.trim()) return;
    try {
      await fetch(`/api/leads/${leadId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: newName }),
      });
      setLead(prev => ({ ...prev, name: newName }));
      showToast('Name saved');
    } catch {}
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      await fetch(`/api/leads/${leadId}/notes`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ content: noteInput, author: session?.name || 'Agent' }),
      });
      setNoteInput('');
      fetchLead();
      showToast('Note added');
    } catch { showToast('Failed', 'error'); }
  };

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ padding:48, textAlign:'center', maxHeight:200, justifyContent:'center' }}>
        <div className="loader-spinner" style={{ margin:'0 auto' }} />
      </div>
    </div>
  );

  if (!lead) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ padding:48, textAlign:'center', justifyContent:'center' }}>
        <p>Lead not found</p>
      </div>
    </div>
  );

  const msgCount  = lead.messages?.length || 0;
  const noteCount = lead.notes?.length || 0;
  const isAdmin   = session?.role === 'admin';
  const firstMsg  = lead.messages?.[0];
  const statusActions = getStatusActions(lead.status, session?.role);

  const TABS = [
    { id:'overview',     label:'Overview',       badge: null },
    { id:'conversation', label:'Conversation',   badge: msgCount },
    { id:'notes',        label:'Notes',          badge: noteCount },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} id="lead-detail-modal">
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Avatar name={lead.name || lead.phone} size={44} />
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <h3>{lead.name || 'Unknown Lead'}</h3>
                <span className={`status-badge status-${(lead.status||'').replace(/_/g,'-')}`}>
                  {statusLabel(lead.status)}
                </span>
                {lead.source_label && (
                  <span style={{ fontSize:11, fontWeight:700, color:'#15803d', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'2px 8px' }}>
                    📱 {lead.source_label}
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                {lead.phone} · {firstMsg ? `First message ${formatTime(firstMsg.timestamp)}` : `Created ${formatTime(lead.created_at)}`}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href={`tel:${lead.phone}`} className="btn-call" id="modal-call-btn">📞 Call</a>
            <button className="modal-close" onClick={onClose} id="modal-close-btn">✕</button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="modal-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`modal-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {t.badge !== null && t.badge > 0 && (
                <span className="modal-tab-badge">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="modal-body">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Info grid */}
              <div className="lead-detail-grid">
                <div className="lead-detail-item">
                  <label>Phone</label>
                  <span style={{ fontFamily:'monospace' }}>{lead.phone}</span>
                </div>
                <div className="lead-detail-item">
                  <label>Source WhatsApp</label>
                  <span style={{ color:'var(--accent)' }}>{lead.source_number || '—'}</span>
                </div>
                <div className="lead-detail-item">
                  <label>Name</label>
                  <input
                    type="text"
                    defaultValue={lead.name}
                    onBlur={e => { if (e.target.value !== lead.name) updateName(e.target.value); }}
                    style={{
                      background:'transparent', border:'1px solid transparent', borderRadius:4,
                      color:'var(--text-primary)', padding:'2px 6px', fontSize:13.5, fontWeight:500,
                      fontFamily:'inherit', width:'100%', transition:'border-color 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor='var(--border)'; }}
                    placeholder="Click to edit…"
                    id="lead-name-input"
                  />
                </div>
                <div className="lead-detail-item">
                  <label>First Message</label>
                  <span style={{ fontSize:13 }}>
                    {firstMsg ? formatTime(firstMsg.timestamp, true) : formatTime(lead.created_at, true)}
                  </span>
                </div>
                <div className="lead-detail-item">
                  <label>Last Activity</label>
                  <span style={{ fontSize:13 }}>{formatTime(lead.last_activity, true)}</span>
                </div>
                <div className="lead-detail-item">
                  <label>Messages / Notes</label>
                  <span style={{ fontSize:13 }}>
                    <strong>{msgCount}</strong> messages · <strong>{noteCount}</strong> notes
                  </span>
                </div>
                {isAdmin && (
                  <div className="lead-detail-item" style={{ gridColumn:'1/-1' }}>
                    <label>Assigned To</label>
                    <select
                      style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:13, color:'var(--text-primary)', fontFamily:'inherit', width:'auto' }}
                      value={lead.assigned_to || ''}
                      onChange={e => updateAssignment(e.target.value)}
                      id="assign-select"
                    >
                      <option value="">👤 Unassigned</option>
                      {telecallers.filter(t => t.active).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!isAdmin && lead.telecaller_name && (
                  <div className="lead-detail-item">
                    <label>Assigned To</label>
                    <span>👤 {lead.telecaller_name}</span>
                  </div>
                )}
              </div>

              {/* Status actions */}
              <div className="modal-section">
                <h4>Update Status</h4>
                <div className="status-action-row">
                  {statusActions.map(a => (
                    <button
                      key={a.value}
                      className={`status-action-btn ${a.cls}`}
                      onClick={() => updateStatus(a.value)}
                      disabled={savingStatus || lead.status === a.value}
                      title={lead.status === a.value ? 'Current status' : `Mark as ${statusLabel(a.value)}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of last message */}
              {lead.last_message && (
                <div className="modal-section">
                  <h4>Last Message</h4>
                  <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'12px 14px', fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                    {lead.last_message}
                  </div>
                </div>
              )}
            </>
          )}

          {/* CONVERSATION TAB */}
          {activeTab === 'conversation' && (
            <div className="modal-section" style={{ marginBottom:0 }}>
              <h4>💬 {msgCount} message{msgCount !== 1 ? 's' : ''}</h4>
              <div className="chat-container" ref={chatRef} style={{ maxHeight: '54vh' }}>
                {msgCount > 0 ? (
                  lead.messages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.direction}`}>
                      <div>{msg.content}</div>
                      <div className="msg-time">{formatTime(msg.timestamp, true)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                    No messages yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="modal-section" style={{ marginBottom:0 }}>
              <h4>📝 {noteCount} note{noteCount !== 1 ? 's' : ''}</h4>
              <div className="notes-list" style={{ marginBottom:12 }}>
                {noteCount > 0 ? (
                  lead.notes.map(note => (
                    <div key={note.id} className="note-item">
                      <div className="note-meta">
                        <strong>{note.author}</strong> · {formatTime(note.created_at, true)}
                      </div>
                      <div className="note-content">{note.content}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding:'16px 0', color:'var(--text-muted)', fontSize:13 }}>
                    No notes yet — add one below
                  </div>
                )}
              </div>
              <div className="add-note-form">
                <input
                  type="text"
                  placeholder={`Add a note… (as ${session?.name || 'you'})`}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                  id="note-content-input"
                />
                <button className="btn btn-primary btn-sm" onClick={addNote} id="add-note-btn">Add</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import ExportModal from '@/components/ExportModal';

export default function SettingsPage() {
  const [allUsers, setAllUsers]       = useState([]);
  const [newName, setNewName]         = useState('');
  const [newPhone, setNewPhone]       = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]         = useState('telecaller');
  const [toast, setToast]             = useState(null);
  const [copied, setCopied]           = useState(false);

  // WATI Sources state
  const [watiSources, setWatiSources] = useState([]);
  const [srcPhone, setSrcPhone]       = useState('');
  const [srcLabel, setSrcLabel]       = useState('');
  const [srcCallers, setSrcCallers]   = useState([]);
  const [copiedSrcId, setCopiedSrcId] = useState(null);
  const [webhookUrl, setWebhookUrl]   = useState('/api/webhook');
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchUsers = async () => {
    const res  = await fetch('/api/telecallers');
    const data = await res.json();
    setAllUsers(data || []);
  };

  const fetchSources = async () => {
    const res  = await fetch('/api/sources');
    const data = await res.json();
    setWatiSources(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
    fetchSources();
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);


  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const createAccount = async () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showToast('Name, username, and password are required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/telecallers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone, username: newUsername, password: newPassword, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to create account', 'error');
        return;
      }
      setNewName(''); setNewPhone(''); setNewUsername(''); setNewPassword(''); setNewRole('telecaller');
      fetchUsers();
      showToast(`${newRole === 'support' ? 'Support member' : newRole === 'admin' ? 'Admin' : 'Telecaller'} account created`);
    } catch {
      showToast('Failed to create account', 'error');
    }
  };

  const toggleActive = async (id) => {
    try {
      await fetch('/api/telecallers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });
      fetchUsers();
    } catch { showToast('Failed to toggle', 'error'); }
  };

  const deleteUser = async (id) => {
    try {
      await fetch('/api/telecallers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchUsers();
      showToast('User deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const deleteAll = async () => {
    try {
      await fetch('/api/telecallers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      fetchUsers();
      showToast('All accounts deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };



  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Webhook URL copied!');
  };

  const addSource = async () => {
    if (!srcPhone.trim() || !srcLabel.trim()) {
      showToast('Phone number and label are required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: srcPhone.trim(), label: srcLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to add', 'error'); return; }
      // Save caller assignments if any were selected
      if (srcCallers.length > 0) {
        await fetch('/api/sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.id, callers: srcCallers }),
        });
      }
      setSrcPhone(''); setSrcLabel(''); setSrcCallers([]);
      fetchSources();
      showToast(`Source "${srcLabel.trim()}" added!`);
    } catch { showToast('Failed to add source', 'error'); }
  };

  const deleteSource = async (id) => {
    try {
      await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchSources();
      showToast('Source deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const copySrcUrl = (phone, id) => {
    const url = `${webhookUrl}?source=${phone}`;
    navigator.clipboard.writeText(url);
    setCopiedSrcId(id);
    setTimeout(() => setCopiedSrcId(null), 2000);
    showToast('Webhook URL copied!');
  };

  const updateSourceCallers = async (id, callers) => {
    try {
      await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, callers }),
      });
      fetchSources();
      showToast('Assigned callers updated');
    } catch { showToast('Failed to update callers', 'error'); }
  };

  const handleDangerAction = async (action, confirmText) => {
    const promptValue = window.prompt(`Type "${confirmText}" to confirm this action. It CANNOT be undone.`);
    if (promptValue !== confirmText) {
      showToast('Action cancelled', 'error');
      return;
    }
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed', 'error'); return; }
      showToast(data.message);
      fetchUsers();
      fetchSources();
      if (action === 'full_reset') {
        setTimeout(() => window.location.href = '/', 1500);
      }
    } catch {
      showToast('Failed to perform action', 'error');
    }
  };

  const telecallers    = allUsers.filter(u => u.role === 'telecaller');
  const supportMembers = allUsers.filter(u => u.role === 'support');
  const admins         = allUsers.filter(u => u.role === 'admin');

  return (
    <>
      <div className="page-header">
        <h2>⚙️ Settings</h2>
        <div className="page-header-actions">
          <button onClick={() => setShowExportModal(true)} className="btn btn-primary" id="export-settings-btn">📥 Export All Leads</button>
        </div>
      </div>

      <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} />

      <div className="settings-container">

        {/* ── Webhook URL ── */}
        <div className="settings-section">
          <h3>🔗 Webhook URL</h3>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>
            Configure this URL in your WATI dashboard under <strong>Webhooks</strong>. Every new WhatsApp message will be auto-assigned to your telecaller team.
          </p>
          <div className="webhook-url-box">
            <code id="webhook-url">{webhookUrl}</code>
            <button className="btn btn-primary btn-sm" onClick={copyWebhookUrl} id="copy-webhook-btn">
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <div style={{ marginTop:14, padding:'12px 14px', background:'var(--blue-bg)', border:'1px solid var(--blue-border)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--blue)' }}>
            <strong>Expected payload:</strong>{' '}
            <code style={{ fontFamily:'monospace', fontSize:11 }}>
              {`{ "phone": "919876543210", "name": "John", "message": "Hi", "source_number": "+91XXXXXXXXXX" }`}
            </code>
          </div>
        </div>

        {/* ── WATI Sources (Multi-number) ── */}
        <div className="settings-section">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <h3 style={{ margin:0 }}>📱 WATI WhatsApp Numbers</h3>
            <span style={{ fontSize:12, background:'var(--blue-bg)', padding:'3px 10px', borderRadius:20, border:'1px solid var(--blue-border)', color:'var(--blue)', fontWeight:600 }}>
              {watiSources.length} Number{watiSources.length !== 1 ? 's' : ''} Registered
            </span>
          </div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>
            Register each of your WATI WhatsApp numbers with a <strong>tag/label</strong> (e.g. &ldquo;Mansoor Ads&rdquo;, &ldquo;Mayank Ads&rdquo;). The system generates a unique webhook URL per number — paste it into WATI&rsquo;s webhook settings for that number. Leads will be automatically tagged with the label.
          </p>

          {/* Add new source form */}
          <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:16 }}>
            <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
              <input
                type="text" placeholder="WhatsApp Number (e.g. 9643665868)"
                value={srcPhone} onChange={e => setSrcPhone(e.target.value)}
                style={{ flex:'1 1 200px', fontSize:13, padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--bg-primary)', color:'var(--text-primary)', outline:'none' }}
                id="src-phone-input"
              />
              <input
                type="text" placeholder="Label (e.g. Mansoor Ads)"
                value={srcLabel} onChange={e => setSrcLabel(e.target.value)}
                style={{ flex:'1 1 180px', fontSize:13, padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--bg-primary)', color:'var(--text-primary)', outline:'none' }}
                id="src-label-input"
              />
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
                Assign Telecallers <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(optional — if none selected, leads go to all active telecallers)</span>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {telecallers.map(tc => {
                  const isSelected = srcCallers.includes(tc.id);
                  return (
                    <label key={tc.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, background: isSelected ? '#ecfeff' : 'var(--bg-primary)', border: `1px solid ${isSelected ? '#0891b2' : 'var(--border)'}`, padding:'4px 8px', borderRadius:20, cursor:'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => setSrcCallers(e.target.checked ? [...srcCallers, tc.id] : srcCallers.filter(id => id !== tc.id))}
                        style={{ margin:0, cursor:'pointer' }}
                      />
                      <span style={{ color: isSelected ? '#0891b2' : 'var(--text-primary)' }}>{tc.name}</span>
                    </label>
                  );
                })}
                {telecallers.length === 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>No telecallers created yet.</span>}
              </div>
            </div>
            <button className="btn btn-primary" onClick={addSource} id="add-src-btn" style={{ whiteSpace:'nowrap' }}>
              ➕ Add Number
            </button>
          </div>

          {/* Sources list */}
          {watiSources.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg-primary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
              No numbers registered yet — add one above
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {watiSources.map(src => {
                const srcUrl = `${webhookUrl}?source=${src.phone}`;
                return (
                  <div key={src.id} style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    {/* Label badge */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:'0 0 auto' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#25d366,#128c7e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📱</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{src.label}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>{src.phone}</div>
                      </div>
                    </div>

                    {/* Generated URL */}
                    <div style={{ flex:1, minWidth:200, background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', fontFamily:'monospace', fontSize:11, color:'var(--text-secondary)', wordBreak:'break-all' }}>
                      {srcUrl}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, flex:'0 0 auto' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => copySrcUrl(src.phone, src.id)}
                        style={{ fontSize:11, whiteSpace:'nowrap' }}
                      >
                        {copiedSrcId === src.id ? '✓ Copied' : '📋 Copy URL'}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => { if(window.confirm(`Delete "${src.label}"?`)) deleteSource(src.id); }}
                        style={{ fontSize:11, color:'var(--red)', border:'1px solid var(--red-border)', background:'var(--red-bg)' }}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Assigned Telecallers — always visible */}
                    <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
                        Assigned Telecallers: <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(none = routes to all active telecallers)</span>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {telecallers.map(tc => {
                          let assigned = [];
                          try { assigned = JSON.parse(src.assigned_callers || '[]'); } catch(e) {}
                          const isAssigned = assigned.includes(tc.id);
                          return (
                            <label key={tc.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, background: isAssigned ? '#ecfeff' : 'var(--bg-secondary)', border: `1px solid ${isAssigned ? '#0891b2' : 'var(--border)'}`, padding:'4px 8px', borderRadius:20, cursor:'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  const newAssigned = e.target.checked
                                    ? [...assigned, tc.id]
                                    : assigned.filter(id => id !== tc.id);
                                  updateSourceCallers(src.id, newAssigned);
                                }}
                                style={{ margin:0, cursor:'pointer' }}
                              />
                              <span style={{ color: isAssigned ? '#0891b2' : 'var(--text-primary)' }}>{tc.name}</span>
                            </label>
                          );
                        })}
                        {telecallers.length === 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>No telecallers created yet.</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Team Overview ── */}
        <div className="settings-section">
          <h3>👥 Team Overview</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12 }}>
            {[
              { label:'Telecallers',      value: telecallers.length,                         icon:'📞', color:'var(--accent)' },
              { label:'Active Callers',   value: telecallers.filter(t=>t.active).length,     icon:'🟢', color:'var(--green)' },
              { label:'Support Members',  value: supportMembers.length,                      icon:'🎯', color:'var(--teal)' },
              { label:'Active Support',   value: supportMembers.filter(t=>t.active).length,  icon:'✅', color:'#0891b2' },
              { label:'Admins',           value: admins.length,                              icon:'👑', color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Telecaller Accounts ── */}
        <div className="settings-section">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <h3 style={{ margin:0 }}>📞 Telecaller Accounts</h3>
            {telecallers.length > 0 && (
              <button className="btn btn-sm" onClick={() => { if(window.confirm('Delete all telecallers?')) deleteAll(); }}
                style={{ fontSize:11, color:'var(--red)', border:'1px solid var(--red-border)', background:'var(--red-bg)' }}>
                🗑️ Delete All
              </button>
            )}
          </div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>
            Telecallers receive new WhatsApp leads (auto-balanced) and manage Follow Up 1 &amp; Follow Up 2 queues.
          </p>

          {telecallers.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg-primary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', marginBottom:16 }}>
              No telecallers yet — create one below
            </div>
          ) : (
            <div className="telecaller-list">
              {telecallers.map(tc => (
                <UserRow key={tc.id} user={tc} onToggle={toggleActive} onDelete={deleteUser} onRefresh={fetchUsers} showToast={showToast} />
              ))}
            </div>
          )}
        </div>

        {/* ── Support Team Accounts ── */}
        <div className="settings-section">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <h3 style={{ margin:0 }}>🎯 Support Team Accounts</h3>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {supportMembers.length > 0 && (
                <button className="btn btn-sm" onClick={() => { if(window.confirm('Delete all support members?')) deleteAll(); }}
                  style={{ fontSize:11, color:'var(--red)', border:'1px solid var(--red-border)', background:'var(--red-bg)' }}>
                  🗑️ Delete All
                </button>
              )}
              <span style={{ fontSize:12, background:'var(--teal-bg)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(8,145,178,0.2)', color:'#0891b2', fontWeight:600 }}>
                Auto-assigned interested leads
              </span>
            </div>
          </div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>
            When a telecaller marks a lead as <strong>Interested</strong>, it is automatically and equally distributed to active support members. They then try to convert or forward back to Follow Up 1.
          </p>

          {supportMembers.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:13, background:'var(--bg-primary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', marginBottom:16 }}>
              No support members yet — create one below
            </div>
          ) : (
            <div className="telecaller-list">
              {supportMembers.map(tc => (
                <UserRow key={tc.id} user={tc} onToggle={toggleActive} onDelete={deleteUser} onRefresh={fetchUsers} showToast={showToast} />
              ))}
            </div>
          )}
        </div>

        {/* ── Create Account Form ── */}
        <div className="settings-section">
          <h3>➕ Create New Account</h3>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>
            Select the role carefully — it determines what the user can see and do.
          </p>

          {/* Role cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:10, marginBottom:20 }}>
            {[
              { value:'telecaller', icon:'📞', title:'Telecaller', desc:'Receives new leads, manages Follow Up 1 & 2', color:'var(--accent)', bg:'var(--purple-bg)', border:'var(--purple-border)' },
              { value:'support',    icon:'🎯', title:'Support',    desc:'Gets auto-assigned interested leads, converts them', color:'#0891b2', bg:'#ecfeff', border:'rgba(8,145,178,0.2)' },
              { value:'admin',      icon:'👑', title:'Admin',      desc:'Full access — all leads, analytics, settings', color:'#d97706', bg:'#fffbeb', border:'rgba(217,119,6,0.2)' },
            ].map(r => (
              <div
                key={r.value}
                onClick={() => setNewRole(r.value)}
                style={{
                  padding:'14px', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)',
                  background: newRole === r.value ? r.bg : 'var(--bg-primary)',
                  border: `2px solid ${newRole === r.value ? r.color : 'var(--border)'}`,
                  boxShadow: newRole === r.value ? `0 0 0 3px ${r.bg}` : 'none',
                }}
              >
                <div style={{ fontSize:20, marginBottom:4 }}>{r.icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color: newRole === r.value ? r.color : 'var(--text-primary)' }}>{r.title}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, lineHeight:1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>

          <div className="add-telecaller-form" style={{ marginBottom:12 }}>
            <input
              type="text" placeholder="Full Name *"
              value={newName} onChange={e => setNewName(e.target.value)}
              id="tc-name-input"
            />
            <input
              type="text" placeholder="Phone (optional)"
              value={newPhone} onChange={e => setNewPhone(e.target.value)}
              id="tc-phone-input"
            />
            <input
              type="text" placeholder="Login Username *"
              value={newUsername} onChange={e => setNewUsername(e.target.value)}
              id="tc-username-input"
            />
            <input
              type="password" placeholder="Login Password *"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createAccount(); }}
              id="tc-password-input"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={createAccount}
            id="add-tc-btn"
            style={{ width:'100%', justifyContent:'center' }}
          >
            {newRole === 'support' ? '🎯 Create Support Account' : newRole === 'admin' ? '👑 Create Admin Account' : '📞 Create Telecaller Account'}
          </button>
        </div>

      </div>

      {/* ── Danger Zone ── */}
      <div className="settings-section" style={{ border:'1px solid var(--red-border)', background:'var(--red-bg)' }}>
        <h3 style={{ color:'var(--red)' }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize:13, color:'var(--red)', opacity:0.8, marginBottom:16 }}>
          These actions are <strong>permanent and cannot be undone</strong>. Please be absolutely certain before proceeding.
        </p>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:280, background:'var(--bg-primary)', padding:16, borderRadius:'var(--radius-sm)', border:'1px solid var(--red-border)' }}>
            <h4 style={{ margin:'0 0 4px 0', fontSize:14 }}>Delete All Leads</h4>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 12px 0' }}>Wipes out all leads, messages, and notes. Keeps your staff accounts and WATI sources intact.</p>
            <button className="btn" onClick={() => handleDangerAction('delete_leads', 'DELETE LEADS')} style={{ background:'var(--red)', color:'white', width:'100%', justifyContent:'center' }}>
              🗑️ Delete All Leads
            </button>
          </div>

          <div style={{ flex:1, minWidth:280, background:'var(--bg-primary)', padding:16, borderRadius:'var(--radius-sm)', border:'1px solid var(--red-border)' }}>
            <h4 style={{ margin:'0 0 4px 0', fontSize:14 }}>Factory Reset System</h4>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 12px 0' }}>Wipes everything: Leads, Messages, Notes, Support Staff, Telecallers, and WATI sources. (Only your Admin login survives).</p>
            <button className="btn" onClick={() => handleDangerAction('full_reset', 'FACTORY RESET')} style={{ background:'var(--red)', color:'white', width:'100%', justifyContent:'center' }}>
              🧨 Factory Reset
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </>
  );
}

function UserRow({ user, onToggle, onDelete, onRefresh, showToast }) {
  const roleColor = { admin: '#d97706', support: '#0891b2', telecaller: '#6366f1' }[user.role] || '#6366f1';
  const roleBg    = { admin: '#fffbeb', support: '#ecfeff', telecaller: 'var(--purple-bg)' }[user.role] || 'var(--purple-bg)';
  const roleLabel = { admin: 'ADMIN', support: 'SUPPORT', telecaller: 'CALLER' }[user.role] || user.role.toUpperCase();

  const [showPass, setShowPass]       = useState(false);
  const [resetting, setResetting]     = useState(false);
  const [newPass, setNewPass]         = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const handleResetPassword = async () => {
    if (!newPass.trim()) return;
    try {
      const res = await fetch('/api/telecallers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, password: newPass }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Password updated');
      setNewPass('');
      setResetting(false);
      onRefresh();
    } catch {
      showToast('Failed to update password', 'error');
    }
  };

  return (
    <div className={`telecaller-item ${!user.active ? 'inactive' : ''}`} style={{ flexDirection:'column', alignItems:'stretch', gap:10 }}>
      {/* Top row: avatar + name + toggle button */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background: user.role === 'admin'    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                      : user.role === 'support'  ? 'linear-gradient(135deg,#0891b2,#06b6d4)'
                      : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'white',
          }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span className="tc-name">{user.name}</span>
              <span style={{ fontSize:10, color: roleColor, background: roleBg, border:`1px solid ${roleColor}33`, padding:'1px 7px', borderRadius:8, fontWeight:700 }}>
                {roleLabel}
              </span>
              {!user.active && (
                <span style={{ fontSize:10, color:'var(--red)', background:'var(--red-bg)', border:'1px solid var(--red-border)', padding:'1px 7px', borderRadius:8, fontWeight:700 }}>
                  INACTIVE
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {user.phone ? `${user.phone}` : ''}
            </div>
          </div>
        </div>
        {user.role !== 'admin' && (
          <div style={{ display:'flex', gap:6 }}>
            <button
              className={`btn btn-sm ${user.active ? 'btn-secondary' : 'btn-success'}`}
              onClick={() => onToggle(user.id)}
            >
              {user.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => { if(window.confirm(`Delete ${user.name}?`)) onDelete(user.id); }}
              style={{ color:'var(--red)', border:'1px solid var(--red-border)', background:'var(--red-bg)' }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Credentials row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingLeft:46 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
          <span style={{ color:'var(--text-muted)', fontWeight:600 }}>User:</span>
          <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--text-primary)' }}>{user.username || '—'}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:12 }}>
          <span style={{ color:'var(--text-muted)', fontWeight:600 }}>Pass:</span>
          <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--text-primary)', minWidth:60, letterSpacing: showPass ? 0 : 2 }}>
            {user.plain_password ? (showPass ? user.plain_password : '••••••••') : '—'}
          </span>
          {user.plain_password && (
            <button
              onClick={() => setShowPass(v => !v)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, color:'var(--text-muted)', lineHeight:1 }}
              title={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          )}
        </div>
        {user.role !== 'admin' && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => { setResetting(v => !v); setNewPass(''); }}
            style={{ fontSize:11 }}
          >
            {resetting ? 'Cancel' : '🔑 Reset Password'}
          </button>
        )}
      </div>

      {/* Reset password inline form */}
      {resetting && (
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:46, flexWrap:'wrap' }}>
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <input
              type={showNewPass ? 'text' : 'password'}
              placeholder="New password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(); }}
              style={{ fontSize:13, padding:'6px 32px 6px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-primary)', color:'var(--text-primary)', outline:'none' }}
            />
            <button
              onClick={() => setShowNewPass(v => !v)}
              style={{ position:'absolute', right:8, background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--text-muted)', padding:0, lineHeight:1 }}
            >
              {showNewPass ? '🙈' : '👁️'}
            </button>
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleResetPassword}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';

export default function ExportModal({ onClose, show }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [assignedTo, setAssignedTo] = useState('all');
  
  const [sources, setSources] = useState([]);
  const [telecallers, setTelecallers] = useState([]);

  useEffect(() => {
    if (show) {
      fetch('/api/sources').then(r => r.json()).then(setSources).catch(console.error);
      fetch('/api/telecallers').then(r => r.json()).then(data => {
        setTelecallers((data || []).filter(t => t.role === 'telecaller'));
      }).catch(console.error);
    }
  }, [show]);

  if (!show) return null;

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (source && source !== 'all') params.append('source', source);
    if (status && status !== 'all') params.append('status', status);
    if (assignedTo && assignedTo !== 'all') params.append('assigned_to', assignedTo);

    window.location.href = `/api/export?${params.toString()}`;
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>📥 Export Leads to Excel</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Source</label>
            <select value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <option value="all">Any Source</option>
              {sources.map(s => (
                <option key={s.id} value={s.phone}>{s.label} ({s.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <option value="all">Any Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="call_later">Call Later</option>
              <option value="follow_up_1">Follow Up 1</option>
              <option value="follow_up_2">Follow Up 2</option>
              <option value="interested_no_convert">Interested (Did not Convert)</option>
              <option value="closed">Converted / Closed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Assigned Telecaller</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <option value="all">Anyone</option>
              <option value="unassigned">Unassigned Only</option>
              {telecallers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport}>Download Excel</button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import ExportModal from '@/components/ExportModal';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler
);

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_COLORS = {
  new: '#3b82f6', contacted: '#f59e0b', interested: '#10b981',
  not_interested: '#ef4444', follow_up_1: '#f97316', follow_up_2: '#ea580c',
  interested_no_convert: '#8b5cf6', converted: '#059669', closed: '#6366f1',
};

const TIP = {
  backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
  borderColor: '#334155', borderWidth: 1, cornerRadius: 10, padding: 12,
};

const SCALES = {
  x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(226,232,240,0.6)' } },
  y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(226,232,240,0.6)' }, beginAtZero: true },
};

/* ─── Sparkline ─── */
function Sparkline({ values = [], color = '#6366f1', height = 36, width = 100 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display:'block' }}>
      <polygon points={area} fill={`${color}18`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Ring Gauge ─── */
function RingGauge({ pct = 0, color = '#6366f1', label, size = 110 }) {
  const r = 40, c = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * c;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled.toFixed(2)} ${c.toFixed(2)}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition:'stroke-dasharray 1.2s ease' }} />
        <text x="50" y="48" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="800" fill="#0f172a">{pct}%</text>
        <text x="50" y="64" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">{label}</text>
      </svg>
    </div>
  );
}

/* ─── Funnel ─── */
function FunnelChart({ stages }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {stages.map((s, i) => {
        const pct = Math.max(14, (s.count / max) * 100);
        const convPct = i > 0 && stages[i-1].count > 0
          ? Math.round((s.count / stages[i-1].count) * 100) : null;
        return (
          <div key={s.label}>
            {convPct !== null && (
              <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', marginBottom:2, fontWeight:600 }}>
                ↓ {convPct}% step conversion
              </div>
            )}
            <div style={{ width:'100%', display:'flex', justifyContent:'center' }}>
              <div style={{ width:`${pct}%`, background:s.color, borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', minWidth:120, transition:'width 0.8s ease' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'white', whiteSpace:'nowrap' }}>{s.label}</span>
                <span style={{ fontSize:14, fontWeight:800, color:'white' }}>{s.count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon, value, label, sub, change, color, sparkValues, sparkColor, accent }) {
  const isUp = change > 0, isDown = change < 0;
  const accentColor = accent || '#6366f1';
  return (
    <div style={{
      background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
      padding:'20px', display:'flex', flexDirection:'column', gap:6, position:'relative', overflow:'hidden',
      boxShadow:'var(--shadow-sm)', transition:'var(--transition)',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accentColor}, ${accentColor}80)`, borderRadius:'var(--radius) var(--radius) 0 0' }} />
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)', lineHeight:1, letterSpacing:'-1px' }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>}
      {change !== null && change !== undefined && (
        <div style={{ fontSize:11, fontWeight:700, color: isUp ? '#10b981' : isDown ? '#ef4444' : '#94a3b8', display:'flex', alignItems:'center', gap:3 }}>
          <span>{isUp ? '▲' : isDown ? '▼' : '—'}</span>
          <span>{Math.abs(change)}% vs prior</span>
        </div>
      )}
      {sparkValues && sparkValues.length > 1 && (
        <div style={{ marginTop:4 }}>
          <Sparkline values={sparkValues} color={sparkColor || accentColor} height={32} width={110} />
        </div>
      )}
    </div>
  );
}

/* ─── Avatar ─── */
function Avatar({ name, size = 28 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const palette = [['#6366f1','#8b5cf6'],['#0891b2','#06b6d4'],['#059669','#10b981'],['#d97706','#f59e0b'],['#dc2626','#ef4444'],['#7c3aed','#a78bfa']];
  const [c1,c2] = palette[(name?.charCodeAt(0)||0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:8, background:`linear-gradient(135deg,${c1},${c2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size > 24 ? 11 : 9, fontWeight:700, color:'white', flexShrink:0, letterSpacing:'0.5px' }}>
      {initials}
    </div>
  );
}

/* ─── Rate Badge ─── */
function RateBadge({ pct, good = 40, mid = 20 }) {
  const color = pct >= good ? '#059669' : pct >= mid ? '#d97706' : '#dc2626';
  const bg    = pct >= good ? '#ecfdf5' : pct >= mid ? '#fffbeb' : '#fef2f2';
  return (
    <span style={{ background:bg, color, padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {pct}%
    </span>
  );
}

/* ─── Source Badge ─── */
function SourceBadge({ label, number }) {
  if (!label && !number) return <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      {label && <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{label}</span>}
      {number && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{number}</span>}
    </div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ icon, title, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
      <div>
        <h3 style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', margin:0, display:'flex', alignItems:'center', gap:6 }}>
          <span>{icon}</span> {title}
        </h3>
        {sub && <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0', fontWeight:500 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function pctChange(now, prev) {
  if (!prev) return null;
  return Number((((now - prev) / prev) * 100).toFixed(0));
}

/* ─── Analytics CSV Export ─── */
function exportAnalyticsCSV(data) {
  const rows = [];
  const row = (...cols) => rows.push(cols.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','));
  const blank = () => rows.push('');
  const heading = (t) => rows.push(t);

  const d = new Date().toLocaleDateString('en-IN');
  heading(`Analytics Export — Generated ${d}`);
  blank();

  heading('SUMMARY KPIs');
  row('Metric','Value');
  row('Total Leads', data.total);
  row('Today', data.today);
  row('This Week', data.thisWeek);
  row('This Month', data.thisMonth);
  row('Yesterday', data.yesterday);
  row('Last Week', data.lastWeek);
  row('Last Month', data.lastMonth);
  row('Conversion Rate', data.conversionRate + '%');
  row('Interest Rate', data.interestedRate + '%');
  row('Response Rate', data.responseRate + '%');
  row('Total Inbound Messages', data.totalMessages);
  row('Unassigned Leads', data.unassigned);
  blank();

  heading('STATUS BREAKDOWN');
  row('Status','Count');
  const sc = data.statusCounts || {};
  row('New', sc.newLeads || 0);
  row('Called', sc.contacted || 0);
  row('Interested', sc.interested || 0);
  row('Not Interested', sc.notInterested || 0);
  row('Follow Up 1', sc.followUp1 || 0);
  row('Follow Up 2', sc.followUp2 || 0);
  row('Interested No Convert', sc.interestedNoConvert || 0);
  row('Converted', sc.converted || 0);
  row('Closed', sc.closed || 0);
  blank();

  if (data.perSourceDetailed?.length > 0) {
    heading('SOURCE BREAKDOWN');
    row('Label','Number','Total','New','Called','Interested','Not Interested','Call Later','Converted','Closed','Interest %','Conv. %','Today','This Week','This Month');
    data.perSourceDetailed.forEach(s => {
      const intR = s.total > 0 ? Math.round(((s.interested + s.converted) / s.total) * 100) : 0;
      const conR = s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0;
      row(s.source_label||'No Label', s.source_number, s.total, s.new_leads, s.contacted, s.interested, s.not_interested, s.call_later, s.converted, s.closed, intR+'%', conR+'%', s.today, s.this_week, s.this_month);
    });
    blank();
  }

  if (data.telecallerPerformance?.length > 0) {
    heading('TELECALLER PERFORMANCE');
    row('Name','Total','New','Called','Interested','Not Interested','Call Later','Converted','Closed','Interest %','Conv. %','This Week','Today');
    data.telecallerPerformance.forEach(tc => {
      const intR = tc.total > 0 ? Math.round(((tc.interested + tc.closed) / tc.total) * 100) : 0;
      const conR = tc.total > 0 ? Math.round((tc.closed / tc.total) * 100) : 0;
      row(tc.name, tc.total, tc.new_leads||0, tc.called||0, tc.interested||0, tc.not_interested||0, tc.call_later||0, tc.converted||0, tc.closed||0, intR+'%', conR+'%', tc.this_week||0, tc.today||0);
    });
    blank();
  }

  if (data.supportPerformance?.length > 0) {
    heading('SUPPORT TEAM PERFORMANCE');
    row('Name','Total Handled','Pending','Converted','No Convert','Conv. %','This Week','Today');
    data.supportPerformance.forEach(sp => {
      const conR = sp.total > 0 ? Math.round((sp.converted / sp.total) * 100) : 0;
      row(sp.name, sp.total, sp.pending||0, sp.converted||0, sp.no_convert||0, conR+'%', sp.this_week||0, sp.today||0);
    });
    blank();
  }

  if (data.dailyTrend?.length > 0) {
    heading('DAILY TREND (30 DAYS)');
    row('Date','Leads');
    data.dailyTrend.forEach(d => row(d.date, d.count));
    blank();
  }

  const csv = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CARD_STYLE = {
  background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
  padding:'24px', boxShadow:'var(--shadow-sm)',
};

export default function AnalyticsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('all'); // today | week | month | all
  const [srcFilter, setSrcFilter] = useState(''); // filter source table
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <div className="page-header"><h2>📊 Analytics</h2></div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    </>
  );

  if (!data || data.error) return (
    <>
      <div className="page-header"><h2>📊 Analytics</h2></div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:12 }}>
        <div style={{ fontSize:48 }}>📊</div>
        <p style={{ color:'var(--text-muted)', fontWeight:600 }}>No analytics data yet</p>
      </div>
    </>
  );

  const sc = data.statusCounts || {};
  const sparkData = (data.dailyTrend || []).slice(-7).map(d => d.count);

  const weekChange  = pctChange(data.thisWeek,  data.lastWeek);
  const monthChange = pctChange(data.thisMonth, data.lastMonth);
  const todayChange = pctChange(data.today,     data.yesterday);

  // KPI primary value by period
  const periodValue = period === 'today' ? data.today : period === 'week' ? data.thisWeek : period === 'month' ? data.thisMonth : data.total;
  const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time';
  const periodChange = period === 'today' ? todayChange : period === 'week' ? weekChange : period === 'month' ? monthChange : null;

  /* Charts */
  const trendData = {
    labels: (data.dailyTrend || []).map(d => { const dt = new Date(d.date); return `${dt.getDate()}/${dt.getMonth()+1}`; }),
    datasets: [{
      label:'New Leads', data:(data.dailyTrend||[]).map(d=>d.count),
      fill:true, backgroundColor:'rgba(99,102,241,0.06)', borderColor:'#6366f1', borderWidth:2.5,
      pointBackgroundColor:'#6366f1', pointRadius:3, tension:0.4,
    }],
  };

  const statusChartData = {
    labels:(data.statusDistribution||[]).map(s=>({new:'New',contacted:'Called',interested:'Interested',not_interested:'Not Int.',follow_up_1:'FU1',follow_up_2:'FU2',interested_no_convert:'No Conv.',converted:'Converted',closed:'Closed'}[s.status]||s.status)),
    datasets:[{ data:(data.statusDistribution||[]).map(s=>s.count), backgroundColor:(data.statusDistribution||[]).map(s=>STATUS_COLORS[s.status]||'#64748b'), borderWidth:0, hoverOffset:6 }],
  };

  const hourlyData = {
    labels:(data.hourlyDist||[]).map(h=>{ const hr=h.hour; return hr===0?'12am':hr<12?`${hr}am`:hr===12?'12pm':`${hr-12}pm`; }),
    datasets:[{ label:'Leads', data:(data.hourlyDist||[]).map(h=>h.count), backgroundColor:(data.hourlyDist||[]).map(h=>h.hour>=9&&h.hour<=18?'rgba(99,102,241,0.8)':'rgba(99,102,241,0.2)'), borderRadius:5 }],
  };

  const dowData = {
    labels:(data.dowDist||[]).map(d=>DOW[d.dow]),
    datasets:[{ label:'Leads', data:(data.dowDist||[]).map(d=>d.count), backgroundColor:'rgba(16,185,129,0.75)', borderColor:'#10b981', borderWidth:1, borderRadius:5 }],
  };

  const sourceChartData = {
    labels:(data.perSource||[]).map(s=>s.source_label||s.source_number),
    datasets:[{ label:'Leads', data:(data.perSource||[]).map(s=>s.count), backgroundColor:'rgba(139,92,246,0.75)', borderColor:'#8b5cf6', borderWidth:1, borderRadius:5 }],
  };

  const tcPerf = (data.telecallerPerformance||[]).slice(0,6);
  const radarColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2'];
  const radarData = {
    labels:['Total','Interested','Call Later','Closed','Today','This Week'],
    datasets:tcPerf.map((tc,i)=>{
      const maxVals=[
        Math.max(...tcPerf.map(t=>t.total||0),1),Math.max(...tcPerf.map(t=>t.interested||0),1),
        Math.max(...tcPerf.map(t=>t.call_later||0),1),Math.max(...tcPerf.map(t=>t.closed||0),1),
        Math.max(...tcPerf.map(t=>t.today||0),1),Math.max(...tcPerf.map(t=>t.this_week||0),1),
      ];
      return {
        label:tc.name,
        data:[((tc.total||0)/maxVals[0])*100,((tc.interested||0)/maxVals[1])*100,((tc.call_later||0)/maxVals[2])*100,((tc.closed||0)/maxVals[3])*100,((tc.today||0)/maxVals[4])*100,((tc.this_week||0)/maxVals[5])*100],
        borderColor:radarColors[i], backgroundColor:`${radarColors[i]}18`, borderWidth:2, pointBackgroundColor:radarColors[i], pointRadius:3,
      };
    }),
  };

  const funnelStages = [
    { label:'New',         count:sc.newLeads||0,   color:'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    { label:'Called',      count:sc.contacted||0,  color:'linear-gradient(90deg,#f59e0b,#fbbf24)' },
    { label:'Interested',  count:sc.interested||0, color:'linear-gradient(90deg,#10b981,#34d399)' },
    { label:'Converted',   count:sc.converted||0,  color:'linear-gradient(90deg,#059669,#10b981)' },
  ];

  const leaderboard = [...(data.telecallerPerformance||[])].sort((a,b)=>((b.interested||0)+(b.closed||0))-((a.interested||0)+(a.closed||0))).slice(0,5);
  const maxScore = leaderboard[0] ? (leaderboard[0].interested||0)+(leaderboard[0].closed||0) : 1;
  const barColors = ['#f59e0b','#94a3b8','#cd7f32','#6366f1','#6366f1'];

  // Filtered source table
  const srcTableData = (data.perSourceDetailed||[]).filter(s => !srcFilter || s.source_number === srcFilter);

  const TABLE_TH = { padding:'10px 14px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', textAlign:'left', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', background:'var(--bg-primary)' };
  const TABLE_TD = { padding:'12px 14px', fontSize:13, color:'var(--text-primary)', borderBottom:'1px solid var(--border-light)', verticalAlign:'middle' };
  const NUM_TD   = { ...TABLE_TD, textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 };

  return (
    <>
      <div className="page-header">
        <div>
          <h2 style={{ margin:0 }}>📊 Analytics</h2>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:'2px 0 0', fontWeight:500 }}>Full performance overview — all time</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={() => setShowExportModal(true)} className="btn btn-secondary" style={{ fontSize:12 }}>📥 Export Leads</button>
          <button onClick={() => exportAnalyticsCSV(data)} className="btn btn-primary" style={{ fontSize:12 }}>📊 Export Analytics CSV</button>
        </div>
      </div>

      <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} />

      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Period Filter Bar ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Period:</span>
          {[['today','Today'],['week','This Week'],['month','This Month'],['all','All Time']].map(([val,lab]) => (
            <button key={val} onClick={() => setPeriod(val)} style={{
              padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', transition:'var(--transition)',
              background: period===val ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
              color: period===val ? '#fff' : 'var(--text-secondary)',
              boxShadow: period===val ? '0 2px 8px rgba(99,102,241,0.35)' : 'var(--shadow-xs)',
              border: period===val ? 'none' : '1px solid var(--border)',
            }}>
              {lab}
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Source filter:</span>
            <select
              value={srcFilter}
              onChange={e => setSrcFilter(e.target.value)}
              className="filter-select"
              style={{ fontSize:12, padding:'6px 28px 6px 10px' }}
            >
              <option value="">All Sources</option>
              {(data.perSourceDetailed||[]).map(s => (
                <option key={s.source_number} value={s.source_number}>{s.source_label || s.source_number}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:14 }}>
          <StatCard icon="📋" value={periodValue.toLocaleString()} label={`Leads — ${periodLabel}`} accent="#6366f1" sparkValues={sparkData} sparkColor="#6366f1" change={periodChange} sub={period !== 'all' ? `All time: ${data.total.toLocaleString()}` : null} />
          <StatCard icon="🎯" value={`${data.conversionRate}%`}  label="Conversion Rate" sub="Closed / Total"    accent="#6366f1" />
          <StatCard icon="💚" value={`${data.interestedRate}%`}  label="Interest Rate"   sub="Int. + Closed"     accent="#10b981" />
          <StatCard icon="⚡" value={`${data.responseRate}%`}    label="Response Rate"   sub="Leads actioned"    accent="#f59e0b" />
          <StatCard icon="💬" value={(data.totalMessages||0).toLocaleString()} label="Inbound Messages" accent="#8b5cf6" />
          <StatCard icon="⚠️" value={data.unassigned||0}         label="Unassigned"      sub="Need assignment"   accent="#ef4444" />
          <StatCard icon="✅" value={sc.converted||0}            label="Converted"       sub="Won deals"         accent="#059669" />
          <StatCard icon="🔁" value={sc.callLater||0}            label="Call Later"      sub="FU1 + FU2 + INC"   accent="#f97316" />
        </div>

        {/* ── Status Pills + Ring Gauges ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'center' }}>
          <div style={{ ...CARD_STYLE, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {[
              { label:'New',         count:sc.newLeads||0,         color:'#3b82f6', bg:'#eff6ff' },
              { label:'Called',      count:sc.contacted||0,        color:'#f59e0b', bg:'#fffbeb' },
              { label:'Interested',  count:sc.interested||0,       color:'#10b981', bg:'#ecfdf5' },
              { label:'Not Int.',    count:sc.notInterested||0,    color:'#ef4444', bg:'#fef2f2' },
              { label:'FU1',         count:sc.followUp1||0,        color:'#f97316', bg:'#fff7ed' },
              { label:'FU2',         count:sc.followUp2||0,        color:'#ea580c', bg:'#fff7ed' },
              { label:'No Conv.',    count:sc.interestedNoConvert||0,color:'#8b5cf6',bg:'#f5f3ff' },
              { label:'Converted',   count:sc.converted||0,        color:'#059669', bg:'#ecfdf5' },
              { label:'Closed',      count:sc.closed||0,           color:'#6366f1', bg:'#f0f0ff' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6, background:bg, border:`1px solid ${color}30`, borderRadius:20, padding:'5px 12px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                <span style={{ fontSize:12, fontWeight:600, color }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ ...CARD_STYLE, display:'flex', gap:16, alignItems:'center' }}>
            <RingGauge pct={Number(data.conversionRate)} color="#6366f1" label="Conv." size={100} />
            <RingGauge pct={Number(data.interestedRate)} color="#10b981" label="Interest" size={100} />
            <RingGauge pct={Number(data.responseRate)}   color="#f59e0b" label="Response" size={100} />
          </div>
        </div>

        {/* ── Funnel + Leaderboard ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={CARD_STYLE}>
            <SectionHeader icon="🔽" title="Conversion Funnel" sub="Lead lifecycle stages" />
            <FunnelChart stages={funnelStages} />
          </div>

          <div style={CARD_STYLE}>
            <SectionHeader icon="🏆" title="Agent Leaderboard" sub="Ranked by interest + closed" />
            {leaderboard.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {leaderboard.map((tc, i) => {
                  const score = (tc.interested||0) + (tc.closed||0);
                  const barPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  return (
                    <div key={tc.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : <span style={{ fontSize:12, fontWeight:800, color:'var(--text-muted)' }}>{i+1}</span>}
                      </div>
                      <Avatar name={tc.name} size={28} />
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', flex:'0 0 100px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tc.name}</div>
                      <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${barPct}%`, background: barColors[i]||'#6366f1', borderRadius:3, transition:'width 1s ease' }} />
                      </div>
                      <div style={{ display:'flex', gap:10, flex:'0 0 auto', fontSize:11, fontWeight:700 }}>
                        <span style={{ color:'#10b981' }}>{tc.interested||0} int.</span>
                        <span style={{ color:'#6366f1' }}>{tc.closed||0} cls.</span>
                        <span style={{ color:'var(--text-muted)' }}>{tc.total||0} tot.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0', fontSize:13 }}>No agent data yet</div>
            )}
          </div>
        </div>

        {/* ── Charts Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          <div style={CARD_STYLE}>
            <SectionHeader icon="📈" title="Daily Lead Trend" sub={`${data.thisMonth} leads in the last 30 days`} />
            {data.dailyTrend?.length > 0
              ? <Line data={trendData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0' }}>Not enough data</div>}
          </div>
          <div style={CARD_STYLE}>
            <SectionHeader icon="🏷" title="Status Distribution" />
            {data.statusDistribution?.length > 0
              ? <div style={{ maxWidth:240, margin:'0 auto' }}>
                  <Doughnut data={statusChartData} options={{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{ color:'#64748b', padding:10, font:{size:10} } }, tooltip:TIP } }} />
                </div>
              : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0' }}>No data</div>}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          <div style={CARD_STYLE}>
            <SectionHeader icon="⏰" title="Peak Hours" sub="Shaded = business hours" />
            {data.hourlyDist?.some(h=>h.count>0)
              ? <Bar data={hourlyData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0' }}>No data</div>}
          </div>
          <div style={CARD_STYLE}>
            <SectionHeader icon="📅" title="Busiest Days" />
            {data.dowDist?.some(d=>d.count>0)
              ? <Bar data={dowData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0' }}>No data</div>}
          </div>
          <div style={CARD_STYLE}>
            <SectionHeader icon="📱" title="Leads by Source" />
            {data.perSource?.length > 0
              ? <Bar data={sourceChartData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px 0' }}>No source data</div>}
          </div>
        </div>

        {tcPerf.length > 0 && (
          <div style={CARD_STYLE}>
            <SectionHeader icon="🕸" title="Agent Radar Comparison" sub="Normalised 0–100 per metric" />
            <div style={{ maxWidth:480, margin:'0 auto' }}>
              <Radar data={radarData} options={{
                responsive:true,
                plugins:{ legend:{ position:'bottom', labels:{ color:'#64748b', font:{size:10}, boxWidth:10, padding:12 } }, tooltip:TIP },
                scales:{ r:{ ticks:{display:false}, grid:{color:'#f1f5f9'}, pointLabels:{color:'#64748b',font:{size:10}}, min:0, max:100 } },
              }} />
            </div>
          </div>
        )}

        {/* ── Source Breakdown Table ── */}
        {srcTableData.length > 0 && (
          <div style={CARD_STYLE}>
            <SectionHeader
              icon="📱"
              title="Source Breakdown"
              sub="Per WhatsApp number — leads, status counts, and rates"
              right={
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>Filter:</span>
                  <select value={srcFilter} onChange={e=>setSrcFilter(e.target.value)} className="filter-select" style={{ fontSize:11, padding:'4px 24px 4px 8px' }}>
                    <option value="">All ({(data.perSourceDetailed||[]).length})</option>
                    {(data.perSourceDetailed||[]).map(s=>(
                      <option key={s.source_number} value={s.source_number}>{s.source_label||s.source_number}</option>
                    ))}
                  </select>
                </div>
              }
            />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Source','Number','Total','New','Called','Interested','Not Int.','Call Later','Converted','Closed','Int. %','Conv. %','Today','This Week','This Month'].map(h=>(
                      <th key={h} style={TABLE_TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {srcTableData.map((s,i) => {
                    const intR  = s.total > 0 ? Math.round(((s.interested+s.converted)/s.total)*100) : 0;
                    const conR  = s.total > 0 ? Math.round((s.converted/s.total)*100) : 0;
                    return (
                      <tr key={s.source_number} style={{ background: i%2===0?'transparent':'var(--bg-primary)' }}>
                        <td style={TABLE_TD}><SourceBadge label={s.source_label} /></td>
                        <td style={{ ...TABLE_TD, fontFamily:'monospace', fontSize:11, color:'var(--text-muted)' }}>{s.source_number}</td>
                        <td style={{ ...NUM_TD, fontWeight:800, fontSize:15 }}>{s.total.toLocaleString()}</td>
                        <td style={{ ...NUM_TD, color:'#3b82f6' }}>{s.new_leads}</td>
                        <td style={{ ...NUM_TD, color:'#f59e0b' }}>{s.contacted}</td>
                        <td style={{ ...NUM_TD, color:'#10b981' }}>{s.interested}</td>
                        <td style={{ ...NUM_TD, color:'#ef4444' }}>{s.not_interested}</td>
                        <td style={{ ...NUM_TD, color:'#f97316' }}>{s.call_later}</td>
                        <td style={{ ...NUM_TD, color:'#059669', fontWeight:800 }}>{s.converted}</td>
                        <td style={{ ...NUM_TD, color:'#6366f1' }}>{s.closed}</td>
                        <td style={{ ...TABLE_TD, textAlign:'right' }}><RateBadge pct={intR} good={40} mid={20} /></td>
                        <td style={{ ...TABLE_TD, textAlign:'right' }}><RateBadge pct={conR} good={15} mid={7} /></td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{s.today}</td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{s.this_week}</td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{s.this_month}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background:'var(--bg-primary)', fontWeight:800 }}>
                    <td style={{ ...TABLE_TD, fontWeight:800, color:'var(--text-muted)', fontSize:11 }} colSpan={2}>TOTAL</td>
                    <td style={{ ...NUM_TD, fontWeight:900, fontSize:15 }}>{srcTableData.reduce((a,s)=>a+s.total,0).toLocaleString()}</td>
                    <td style={{ ...NUM_TD, color:'#3b82f6' }}>{srcTableData.reduce((a,s)=>a+(s.new_leads||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#f59e0b' }}>{srcTableData.reduce((a,s)=>a+(s.contacted||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#10b981' }}>{srcTableData.reduce((a,s)=>a+(s.interested||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#ef4444' }}>{srcTableData.reduce((a,s)=>a+(s.not_interested||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#f97316' }}>{srcTableData.reduce((a,s)=>a+(s.call_later||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#059669' }}>{srcTableData.reduce((a,s)=>a+(s.converted||0),0)}</td>
                    <td style={{ ...NUM_TD, color:'#6366f1' }}>{srcTableData.reduce((a,s)=>a+(s.closed||0),0)}</td>
                    <td colSpan={5} style={TABLE_TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Telecaller Performance Table ── */}
        {data.telecallerPerformance?.length > 0 && (
          <div style={CARD_STYLE}>
            <SectionHeader icon="📞" title="Telecaller Performance" sub="Full breakdown per agent" />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Agent','Total','New','Called','Interested','Not Int.','Call Later','Converted','Closed','Int. %','Conv. %','This Week','Today'].map(h=>(
                      <th key={h} style={TABLE_TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.telecallerPerformance.map((tc, i) => {
                    const intR  = tc.total > 0 ? Math.round(((tc.interested+tc.closed)/tc.total)*100) : 0;
                    const conR  = tc.total > 0 ? Math.round((tc.closed/tc.total)*100) : 0;
                    return (
                      <tr key={tc.id} style={{ background: i%2===0?'transparent':'var(--bg-primary)' }}>
                        <td style={TABLE_TD}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={tc.name} size={28} />
                            <span style={{ fontWeight:600, fontSize:13 }}>{tc.name}</span>
                          </div>
                        </td>
                        <td style={{ ...NUM_TD, fontWeight:800, fontSize:15 }}>{tc.total}</td>
                        <td style={{ ...NUM_TD, color:'#3b82f6' }}>{tc.new_leads||0}</td>
                        <td style={{ ...NUM_TD, color:'#f59e0b' }}>{tc.called||0}</td>
                        <td style={{ ...NUM_TD, color:'#10b981' }}>{tc.interested||0}</td>
                        <td style={{ ...NUM_TD, color:'#ef4444' }}>{tc.not_interested||0}</td>
                        <td style={{ ...NUM_TD, color:'#f97316' }}>{tc.call_later||0}</td>
                        <td style={{ ...NUM_TD, color:'#059669', fontWeight:800 }}>{tc.converted||0}</td>
                        <td style={{ ...NUM_TD, color:'#6366f1' }}>{tc.closed||0}</td>
                        <td style={{ ...TABLE_TD, textAlign:'right' }}><RateBadge pct={intR} good={40} mid={20} /></td>
                        <td style={{ ...TABLE_TD, textAlign:'right' }}><RateBadge pct={conR} good={20} mid={10} /></td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{tc.this_week||0}</td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{tc.today||0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Support Team Performance Table ── */}
        {data.supportPerformance?.length > 0 && (
          <div style={CARD_STYLE}>
            <SectionHeader icon="🎯" title="Support Team Performance" sub="Conversion outcomes per support agent" />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Agent','Total Handled','Pending','Converted','No Convert','Conv. %','This Week','Today'].map(h=>(
                      <th key={h} style={TABLE_TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.supportPerformance.map((sp, i) => {
                    const conR = sp.total > 0 ? Math.round((sp.converted/sp.total)*100) : 0;
                    return (
                      <tr key={sp.id} style={{ background: i%2===0?'transparent':'var(--bg-primary)' }}>
                        <td style={TABLE_TD}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={sp.name} size={28} />
                            <span style={{ fontWeight:600, fontSize:13 }}>{sp.name}</span>
                          </div>
                        </td>
                        <td style={{ ...NUM_TD, fontWeight:800, fontSize:15 }}>{sp.total}</td>
                        <td style={{ ...NUM_TD, color:'#f59e0b' }}>{sp.pending||0}</td>
                        <td style={{ ...NUM_TD, color:'#059669', fontWeight:800 }}>{sp.converted||0}</td>
                        <td style={{ ...NUM_TD, color:'#ef4444' }}>{sp.no_convert||0}</td>
                        <td style={{ ...TABLE_TD, textAlign:'right' }}><RateBadge pct={conR} good={60} mid={30} /></td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{sp.this_week||0}</td>
                        <td style={{ ...NUM_TD, color:'var(--text-secondary)' }}>{sp.today||0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

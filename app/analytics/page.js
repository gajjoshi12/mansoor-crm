'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler
);

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_COLORS = {
  new: '#3b82f6', contacted: '#f59e0b', interested: '#10b981',
  not_interested: '#ef4444', 'follow-up': '#f97316', closed: '#6366f1',
};

const TIP = {
  backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8',
  borderColor: '#334155', borderWidth: 1, cornerRadius: 8, padding: 10,
};

const SCALES = {
  x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: '#f1f5f9' } },
  y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: '#f1f5f9' }, beginAtZero: true },
};

/* ─── Inline Sparkline (SVG) ─── */
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polygon points={area} fill={`${color}18`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── SVG Ring Gauge ─── */
function RingGauge({ pct = 0, color = '#6366f1', label, size = 110 }) {
  const r  = 40;
  const c  = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * c;
  return (
    <div className="ring-gauge-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${filled.toFixed(2)} ${c.toFixed(2)}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
        <text x="50" y="48" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="800" fill="#0f172a">
          {pct}%
        </text>
        <text x="50" y="64" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">
          {label}
        </text>
      </svg>
    </div>
  );
}

/* ─── Funnel ─── */
function FunnelChart({ stages }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="funnel-chart">
      {stages.map((s, i) => {
        const pct = Math.max(12, (s.count / max) * 100);
        const convPct = i > 0 && stages[i-1].count > 0
          ? Math.round((s.count / stages[i-1].count) * 100) : null;
        return (
          <div key={s.label} className="funnel-stage">
            {convPct !== null && (
              <div className="funnel-pct">↓ {convPct}% conversion</div>
            )}
            <div className="funnel-bar-wrap">
              <div className="funnel-bar" style={{ width: `${pct}%`, background: s.color }}>
                <span className="funnel-stage-label">{s.label}</span>
                <span className="funnel-stage-count">{s.count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat Card with sparkline ─── */
function StatCard({ icon, value, label, sub, change, color, sparkValues, sparkColor }) {
  const isUp   = change > 0;
  const isDown = change < 0;
  return (
    <div className={`analytics-stat-card ${color || ''}`}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value animate-in">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {change !== null && change !== undefined && (
        <div className={`stat-change ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
          {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(change)}% vs prior
        </div>
      )}
      {sparkValues && sparkValues.length > 1 && (
        <div className="stat-sparkline">
          <Sparkline values={sparkValues} color={sparkColor || '#6366f1'} height={32} width={110} />
        </div>
      )}
    </div>
  );
}

function pctChange(now, prev) {
  if (!prev) return null;
  return Number((((now - prev) / prev) * 100).toFixed(0));
}

/* ─── Avatar helper ─── */
function Avatar({ name, size = 28 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const palette = [['#6366f1','#8b5cf6'],['#0891b2','#06b6d4'],['#059669','#10b981'],['#d97706','#f59e0b'],['#dc2626','#ef4444'],['#7c3aed','#a78bfa']];
  const [c1,c2] = palette[(name?.charCodeAt(0)||0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:8, background:`linear-gradient(135deg,${c1},${c2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0, letterSpacing:'0.5px' }}>
      {initials}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <div className="page-header"><h2>Analytics</h2></div>
      <div className="loader"><div className="loader-spinner" /></div>
    </>
  );

  if (!data || data.error) return (
    <>
      <div className="page-header"><h2>Analytics</h2></div>
      <div className="empty-state"><span className="empty-icon">📊</span><p>No data yet</p></div>
    </>
  );

  const sc = data.statusCounts || {};
  const sparkData = (data.dailyTrend || []).slice(-7).map(d => d.count);

  const weekChange  = pctChange(data.thisWeek,  data.lastWeek);
  const monthChange = pctChange(data.thisMonth, data.lastMonth);
  const todayChange = pctChange(data.today,     data.yesterday);

  /* ── Chart datasets ── */
  const trendData = {
    labels: (data.dailyTrend || []).map(d => {
      const dt = new Date(d.date); return `${dt.getDate()}/${dt.getMonth()+1}`;
    }),
    datasets: [{
      label: 'New Leads',
      data: (data.dailyTrend || []).map(d => d.count),
      fill: true,
      backgroundColor: 'rgba(99,102,241,0.07)',
      borderColor: '#6366f1', borderWidth: 2.5,
      pointBackgroundColor: '#6366f1', pointRadius: 3, tension: 0.4,
    }],
  };

  const statusChartData = {
    labels: (data.statusDistribution || []).map(s =>
      ({new:'New',contacted:'Called',interested:'Interested',not_interested:'Not Interested','follow-up':'Call Later',closed:'Closed'}[s.status] || s.status)
    ),
    datasets: [{
      data: (data.statusDistribution || []).map(s => s.count),
      backgroundColor: (data.statusDistribution || []).map(s => STATUS_COLORS[s.status] || '#64748b'),
      borderWidth: 0, hoverOffset: 6,
    }],
  };

  const hourlyData = {
    labels: (data.hourlyDist || []).map(h => {
      const hr = h.hour;
      return hr === 0 ? '12am' : hr < 12 ? `${hr}am` : hr === 12 ? '12pm' : `${hr-12}pm`;
    }),
    datasets: [{
      label: 'Leads',
      data: (data.hourlyDist || []).map(h => h.count),
      backgroundColor: (data.hourlyDist || []).map(h =>
        h.hour >= 9 && h.hour <= 18 ? 'rgba(99,102,241,0.75)' : 'rgba(99,102,241,0.22)'
      ),
      borderRadius: 5,
    }],
  };

  const dowData = {
    labels: (data.dowDist || []).map(d => DOW[d.dow]),
    datasets: [{
      label: 'Leads',
      data: (data.dowDist || []).map(d => d.count),
      backgroundColor: 'rgba(16,185,129,0.7)',
      borderColor: '#10b981', borderWidth: 1, borderRadius: 5,
    }],
  };

  const sourceData = {
    labels: (data.perSource || []).map(s => s.source_label || s.source_number),
    datasets: [{
      label: 'Leads',
      data: (data.perSource || []).map(s => s.count),
      backgroundColor: 'rgba(139,92,246,0.7)',
      borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 5,
    }],
  };

  /* Radar: telecaller comparison */
  const tcPerf = (data.telecallerPerformance || []).slice(0, 6);
  const radarColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2'];
  const radarData = {
    labels: ['Total','Interested','Call Later','Closed','Today','This Week'],
    datasets: tcPerf.map((tc, i) => {
      const max_vals = [
        Math.max(...tcPerf.map(t=>t.total||0),1),
        Math.max(...tcPerf.map(t=>t.interested||0),1),
        Math.max(...tcPerf.map(t=>t.call_later||0),1),
        Math.max(...tcPerf.map(t=>t.closed||0),1),
        Math.max(...tcPerf.map(t=>t.today||0),1),
        Math.max(...tcPerf.map(t=>t.this_week||0),1),
      ];
      return {
        label: tc.name,
        data: [
          ((tc.total||0)/max_vals[0])*100,
          ((tc.interested||0)/max_vals[1])*100,
          ((tc.call_later||0)/max_vals[2])*100,
          ((tc.closed||0)/max_vals[3])*100,
          ((tc.today||0)/max_vals[4])*100,
          ((tc.this_week||0)/max_vals[5])*100,
        ],
        borderColor: radarColors[i],
        backgroundColor: `${radarColors[i]}18`,
        borderWidth: 2, pointBackgroundColor: radarColors[i], pointRadius: 3,
      };
    }),
  };

  /* Funnel stages */
  const funnelStages = [
    { label: 'New',          count: sc.newLeads    || 0, color: 'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    { label: 'Called',       count: sc.contacted   || 0, color: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
    { label: 'Interested',   count: sc.interested  || 0, color: 'linear-gradient(90deg,#10b981,#34d399)' },
    { label: 'Closed / Won', count: sc.closed      || 0, color: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
  ];

  /* Leaderboard */
  const leaderboard = [...(data.telecallerPerformance || [])]
    .sort((a,b) => ((b.interested||0)+(b.closed||0)) - ((a.interested||0)+(a.closed||0)))
    .slice(0, 5);
  const maxScore = leaderboard[0]
    ? (leaderboard[0].interested||0) + (leaderboard[0].closed||0)
    : 1;

  const leadColors = ['rank-1','rank-2','rank-3','rank-other','rank-other'];
  const barColors  = ['#f59e0b','#94a3b8','#cd7f32','#6366f1','#6366f1'];

  return (
    <>
      <div className="page-header">
        <h2>Analytics</h2>
        <div className="page-header-actions">
          <a href="/api/export" className="btn btn-primary" id="export-analytics-btn">📥 Export Excel</a>
        </div>
      </div>

      <div className="analytics-container">

        {/* ── Row 1: KPI Cards ── */}
        <div className="analytics-stats">
          <StatCard icon="📋" value={data.total}              label="Total Leads"    color="accent"  sparkValues={sparkData} sparkColor="#6366f1" />
          <StatCard icon="✨" value={data.today}              label="Today"          color="purple"  sub={`Yesterday: ${data.yesterday||0}`} change={todayChange} />
          <StatCard icon="📆" value={data.thisWeek}           label="This Week"      color="yellow"  sub={`Last: ${data.lastWeek||0}`} change={weekChange} />
          <StatCard icon="🗓" value={data.thisMonth}          label="This Month"     color="green"   sub={`Last: ${data.lastMonth||0}`} change={monthChange} />
          <StatCard icon="🎯" value={`${data.conversionRate}%`}  label="Conversion" color="accent"  sub="Closed / Total" />
          <StatCard icon="💚" value={`${data.interestedRate}%`}  label="Interest Rate" color="green" sub="Int. + Closed" />
          <StatCard icon="⚡" value={`${data.responseRate}%`}    label="Response Rate" color="teal"  sub="Leads actioned" />
          <StatCard icon="💬" value={data.totalMessages||0}   label="Messages"       color="purple"  sub="Total inbound" />
        </div>

        {/* ── Row 2: Status Quick View + Ring Gauges ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* Status pills */}
          <div className="status-summary-row" style={{ alignContent: 'center' }}>
            {[
              { label:'New',           count: sc.newLeads||0,    cls:'status-new' },
              { label:'Called',        count: sc.contacted||0,   cls:'status-contacted' },
              { label:'Interested',    count: sc.interested||0,  cls:'status-interested' },
              { label:'Not Interested',count: sc.notInterested||0,cls:'status-not-interested' },
              { label:'Call Later',    count: sc.callLater||0,   cls:'status-follow-up' },
              { label:'Closed',        count: sc.closed||0,      cls:'status-closed' },
              { label:'Unassigned',    count: data.unassigned||0,cls:'status-new' },
            ].map(({ label, count, cls }) => (
              <div key={label} className="status-pill">
                <span className={`status-badge ${cls}`}>{label}</span>
                <span className="status-pill-count">{count}</span>
              </div>
            ))}
          </div>

          {/* Ring gauges */}
          <div className="chart-card" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="rings-row">
              <RingGauge pct={Number(data.conversionRate)}  color="#6366f1" label="Conv."   size={105} />
              <RingGauge pct={Number(data.interestedRate)}  color="#10b981" label="Interest" size={105} />
              <RingGauge pct={Number(data.responseRate)}    color="#f59e0b" label="Response" size={105} />
            </div>
          </div>
        </div>

        {/* ── Row 3: Funnel + Leaderboard ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>🔽 Conversion Funnel</h3>
              <span className="chart-card-sub">Lead lifecycle stages</span>
            </div>
            <FunnelChart stages={funnelStages} />
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>🏆 Agent Leaderboard</h3>
              <span className="chart-card-sub">By interest + closed</span>
            </div>
            {leaderboard.length > 0 ? (
              <div className="leaderboard">
                {leaderboard.map((tc, i) => {
                  const score = (tc.interested||0) + (tc.closed||0);
                  const barPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  return (
                    <div key={tc.id} className="leaderboard-row">
                      <div className={`leaderboard-rank ${leadColors[i]}`}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : i+1}
                      </div>
                      <Avatar name={tc.name} size={28} />
                      <div className="leaderboard-name">{tc.name}</div>
                      <div className="leaderboard-bar-wrap">
                        <div className="leaderboard-bar" style={{ width:`${barPct}%`, background: barColors[i] || '#6366f1' }} />
                      </div>
                      <div className="leaderboard-stats">
                        <div className="leaderboard-stat">
                          <div className="ls-val" style={{ color: '#10b981' }}>{tc.interested||0}</div>
                          <div className="ls-key">Int.</div>
                        </div>
                        <div className="leaderboard-stat">
                          <div className="ls-val" style={{ color: '#6366f1' }}>{tc.closed||0}</div>
                          <div className="ls-key">Closed</div>
                        </div>
                        <div className="leaderboard-stat">
                          <div className="ls-val">{tc.total||0}</div>
                          <div className="ls-key">Total</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="chart-empty">No agent data yet</div>
            )}
          </div>
        </div>

        {/* ── Row 4: Main Charts ── */}
        <div className="charts-grid">
          <div className="chart-card chart-wide">
            <div className="chart-card-header">
              <h3>📈 Daily Lead Trend (30 days)</h3>
              <span className="chart-card-sub">{data.thisMonth} leads this month</span>
            </div>
            {data.dailyTrend?.length > 0
              ? <Line data={trendData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div className="chart-empty">Not enough data</div>}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>🏷 Status Distribution</h3>
            </div>
            {data.statusDistribution?.length > 0
              ? <div style={{ maxWidth:260, margin:'0 auto' }}>
                  <Doughnut data={statusChartData} options={{
                    responsive:true, plugins:{
                      legend:{ position:'bottom', labels:{ color:'#64748b', padding:12, font:{size:11} } },
                      tooltip:TIP,
                    },
                  }} />
                </div>
              : <div className="chart-empty">No data</div>}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>⏰ Peak Hours</h3>
              <span className="chart-card-sub">Darker = business hours</span>
            </div>
            {data.hourlyDist?.some(h => h.count > 0)
              ? <Bar data={hourlyData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div className="chart-empty">No data</div>}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>📅 Busiest Days</h3>
            </div>
            {data.dowDist?.some(d => d.count > 0)
              ? <Bar data={dowData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div className="chart-empty">No data</div>}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>📱 Leads per Source</h3>
            </div>
            {data.perSource?.length > 0
              ? <Bar data={sourceData} options={{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{display:false}, tooltip:TIP }, scales:SCALES }} />
              : <div className="chart-empty">No source data</div>}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>🕸 Agent Comparison (Radar)</h3>
              <span className="chart-card-sub">Normalised 0–100</span>
            </div>
            {tcPerf.length > 0
              ? <Radar data={radarData} options={{
                  responsive:true,
                  plugins:{ legend:{ position:'bottom', labels:{ color:'#64748b', font:{size:10}, boxWidth:10 } }, tooltip:TIP },
                  scales:{
                    r:{
                      ticks:{ display:false },
                      grid:{ color:'#f1f5f9' },
                      pointLabels:{ color:'#64748b', font:{size:10} },
                      min:0, max:100,
                    },
                  },
                }} />
              : <div className="chart-empty">Need 2+ agents</div>}
          </div>
        </div>

        {/* ── Row 5: Telecaller Performance Table ── */}
        {data.telecallerPerformance?.length > 0 && (
          <div className="perf-table-card">
            <h3>📊 Full Agent Performance Breakdown</h3>
            <div style={{ overflowX:'auto' }}>
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Total</th>
                    <th>New</th>
                    <th>Called</th>
                    <th className="col-good">Interested</th>
                    <th className="col-bad">Not Int.</th>
                    <th className="col-warn">Call Later</th>
                    <th className="col-accent">Closed</th>
                    <th className="col-good">Interest %</th>
                    <th className="col-accent">Conv. %</th>
                    <th>This Week</th>
                    <th>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {data.telecallerPerformance.map(tc => {
                    const intRate  = tc.total > 0 ? Math.round(((tc.interested+tc.closed)/tc.total)*100) : 0;
                    const convRate = tc.total > 0 ? Math.round((tc.closed/tc.total)*100) : 0;
                    return (
                      <tr key={tc.id}>
                        <td>
                          <div className="agent-cell">
                            <Avatar name={tc.name} size={26} />
                            <span className="agent-name">{tc.name}</span>
                          </div>
                        </td>
                        <td className="num-cell">{tc.total}</td>
                        <td className="num-cell">{tc.new_leads||0}</td>
                        <td className="num-cell">{tc.called||0}</td>
                        <td className="num-cell col-good">{tc.interested||0}</td>
                        <td className="num-cell col-bad">{tc.not_interested||0}</td>
                        <td className="num-cell col-warn">{tc.call_later||0}</td>
                        <td className="num-cell col-accent">{tc.closed||0}</td>
                        <td className="num-cell">
                          <span className={`rate-badge ${intRate>=40?'rate-good':intRate>=20?'rate-mid':'rate-low'}`}>{intRate}%</span>
                        </td>
                        <td className="num-cell">
                          <span className={`rate-badge ${convRate>=20?'rate-good':convRate>=10?'rate-mid':'rate-low'}`}>{convRate}%</span>
                        </td>
                        <td className="num-cell">{tc.this_week||0}</td>
                        <td className="num-cell">{tc.today||0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

'use client';

export default function StatsCard({ icon, label, value, color = 'wine', trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {trend && <div className="stat-trend">↑ {trend}</div>}
    </div>
  );
}

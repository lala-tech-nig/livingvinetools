'use client';
import Link from 'next/link';

const STATUS_CONFIG = {
  complete:  { label: 'Complete',  cls: 'badge-success' },
  sending:   { label: 'Sending…',  cls: 'badge-info' },
  partial:   { label: 'Partial',   cls: 'badge-warning' },
  failed:    { label: 'Failed',    cls: 'badge-error' },
  pending:   { label: 'Pending',   cls: 'badge-default' },
};

export default function CampaignTable({ campaigns, onDelete }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="table-container">
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>No campaigns found</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click "Create New Bulk Email" to send your first campaign</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Campaign Name</th>
            <th>Status</th>
            <th>Recipients Sent</th>
            <th>Progress</th>
            <th>Opens / Clicks / Replies</th>
            <th>Created Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
            const total = c.total_count || c.total || 1;
            const sent = c.sent_count || c.sent || 0;
            const pct = Math.round((sent / total) * 100);

            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ color: 'var(--brand-wine)', fontWeight: 700, fontSize: '15px' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Subject: {c.subject}
                    </div>
                  </Link>
                </td>
                <td>
                  <span className={`badge ${cfg.cls}`}>
                    <span className="badge-dot" />
                    {cfg.label}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sent}</span>
                  <span style={{ color: 'var(--text-muted)' }}> / {total}</span>
                  {c.failed_count > 0 && (
                    <span style={{ color: 'var(--color-error)', fontSize: '12px', display: 'block' }}>
                      {c.failed_count} failed
                    </span>
                  )}
                </td>
                <td style={{ minWidth: '130px' }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    {pct}%
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
                    <span title="Opened emails" style={{ color: 'var(--color-success)' }}>👁️ {c.opened_count || c.opened || 0}</span>
                    <span title="Clicked links" style={{ color: 'var(--color-info)' }}>🔗 {c.clicked_count || c.clicked || 0}</span>
                    <span title="Replies" style={{ color: 'var(--brand-wine)' }}>↩️ {c.replied_count || c.replied || 0}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(c.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/campaigns/${c.id}`} className="btn btn-secondary btn-sm">
                      📊 Check Stats
                    </Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete && onDelete(c.id, c.name)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

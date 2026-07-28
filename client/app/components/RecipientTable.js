'use client';

const STATUS_CONFIG = {
  sent:    { label: 'Sent',    cls: 'badge-success' },
  failed:  { label: 'Failed',  cls: 'badge-error' },
  pending: { label: 'Pending', cls: 'badge-default' },
};

export default function RecipientTable({ recipients, onMarkReplied }) {
  if (!recipients || recipients.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">
          <span className="table-empty-icon">👤</span>
          <div className="table-empty-text">No recipients</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Email</th>
            <th>Status</th>
            <th>Opened</th>
            <th>Clicked</th>
            <th>Replied</th>
            <th>Sent At</th>
            <th>Error</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            return (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="recipient-avatar">
                      {(r.name || r.email).charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{r.email}</td>
                <td>
                  <span className={`badge ${cfg.cls}`}>
                    <span className="badge-dot" />
                    {cfg.label}
                  </span>
                </td>
                <td>
                  {r.opened_at ? (
                    <div>
                      <span style={{ color: 'var(--color-success)', fontSize: '16px' }}>✓</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(r.opened_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {r.clicked_at ? (
                    <div>
                      <span style={{ color: 'var(--color-info)', fontSize: '16px' }}>✓</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(r.clicked_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {r.replied_at ? (
                    <div>
                      <span style={{ color: 'var(--brand-accent)', fontSize: '16px' }}>✓</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(r.replied_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {r.sent_at ? new Date(r.sent_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td style={{ maxWidth: '180px' }}>
                  {r.error ? (
                    <span style={{ color: 'var(--color-error)', fontSize: '12px' }} title={r.error}>
                      {r.error.length > 40 ? r.error.substring(0, 40) + '…' : r.error}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {r.status === 'sent' && !r.replied_at && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onMarkReplied && onMarkReplied(r.id)}
                      title="Mark this recipient as having replied"
                    >
                      ↩️ Mark Replied
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

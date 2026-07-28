'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import RecipientTable from '../../components/RecipientTable';
import Toast from '../../components/Toast';

let toastId = 0;

export default function CampaignDetailPage({ params }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message) => {
    const tid = ++toastId;
    setToasts(prev => [...prev, { id: tid, type, title, message }]);
  }, []);

  const removeToast = useCallback((tid) => {
    setToasts(prev => prev.filter(t => t.id !== tid));
  }, []);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) setCampaign(data.data);
    } catch {
      addToast('error', 'Error', 'Failed to load campaign statistics');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaign]);

  const handleMarkReplied = async (recipientId) => {
    try {
      const res = await fetch(`/api/campaigns/recipients/${recipientId}/reply`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        addToast('success', '↩️ Reply Recorded', 'Recipient marked as replied');
        fetchCampaign();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast('error', 'Error', err.message);
    }
  };

  const downloadExport = (type) => {
    window.open(`/api/export/${type}/${id}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Loading campaign stats…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="page-body">
        <Link href="/" className="btn btn-secondary">← Back to Dashboard</Link>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Campaign not found in database.
        </div>
      </div>
    );
  }

  const recipients = campaign.recipients || [];
  const sent = recipients.filter(r => r.status === 'sent').length;
  const failed = recipients.filter(r => r.status === 'failed').length;
  const opened = recipients.filter(r => r.opened_at).length;
  const clicked = recipients.filter(r => r.clicked_at).length;
  const replied = recipients.filter(r => r.replied_at).length;
  const total = recipients.length;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Link href="/" className="btn btn-secondary btn-sm">
              ← Dashboard
            </Link>
            <span className="badge badge-wine">
              Individual Campaign Analytics
            </span>
          </div>
          <h1 className="page-title" style={{ color: 'var(--brand-wine)' }}>{campaign.name}</h1>
          <div className="page-subtitle">
            Subject: <strong>{campaign.subject}</strong> · Created {new Date(campaign.created_at).toLocaleString('en-GB')}
          </div>
        </div>

        {/* Excel Downloads for Failed & Successful */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-success" onClick={() => downloadExport('success')} disabled={sent === 0}>
            📥 Download Successful Excel ({sent})
          </button>
          <button className="btn btn-danger" onClick={() => downloadExport('failed')} disabled={failed === 0}>
            📥 Download Failed Excel ({failed})
          </button>
          <button className="btn btn-secondary" onClick={() => downloadExport('all')}>
            📥 Download All Recipients ({total})
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">📤</div>
            <div className="stat-value">{sent}</div>
            <div className="stat-label">Successfully Sent</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">❌</div>
            <div className="stat-value">{failed}</div>
            <div className="stat-label">Failed Deliveries</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">👁️</div>
            <div className="stat-value">{opened}</div>
            <div className="stat-label">Opened Email</div>
            {openRate > 0 && <div className="stat-trend">{openRate}% open rate</div>}
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🔗</div>
            <div className="stat-value">{clicked}</div>
            <div className="stat-label">Clicked Links</div>
            {clickRate > 0 && <div className="stat-trend">{clickRate}% click rate</div>}
          </div>
          <div className="stat-card">
            <div className="stat-icon wine">↩️</div>
            <div className="stat-value">{replied}</div>
            <div className="stat-label">User Replies</div>
          </div>
        </div>

        {/* Recipient Tracking Table */}
        <div style={{ marginTop: '24px' }}>
          <RecipientFilterTable recipients={recipients} onMarkReplied={handleMarkReplied} />
        </div>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}

function RecipientFilterTable({ recipients, onMarkReplied }) {
  const [filter, setFilter] = useState('all');

  const filters = [
    { key: 'all', label: 'All Recipients', count: recipients.length },
    { key: 'sent', label: 'Sent', count: recipients.filter(r => r.status === 'sent').length },
    { key: 'failed', label: 'Failed', count: recipients.filter(r => r.status === 'failed').length },
    { key: 'opened', label: 'Opened', count: recipients.filter(r => r.opened_at).length },
    { key: 'clicked', label: 'Clicked', count: recipients.filter(r => r.clicked_at).length },
    { key: 'replied', label: 'Replied', count: recipients.filter(r => r.replied_at).length },
  ];

  const filtered = recipients.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'sent') return r.status === 'sent';
    if (filter === 'failed') return r.status === 'failed';
    if (filter === 'opened') return !!r.opened_at;
    if (filter === 'clicked') return !!r.clicked_at;
    if (filter === 'replied') return !!r.replied_at;
    return true;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Detailed Recipient Tracking</h2>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>
      <RecipientTable recipients={filtered} onMarkReplied={onMarkReplied} />
    </>
  );
}

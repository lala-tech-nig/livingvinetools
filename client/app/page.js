'use client';
import { useState, useEffect, useCallback } from 'react';
import StatsCard from './components/StatsCard';
import CampaignTable from './components/CampaignTable';
import NewCampaignModal from './components/NewCampaignModal';
import Toast from './components/Toast';

let toastId = 0;

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message, duration) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [campaignsRes, statsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/campaigns/stats'),
      ]);
      const campaignsData = await campaignsRes.json();
      const statsData = await statsRes.json();

      if (campaignsData.success) setCampaigns(campaignsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch {
      addToast('error', 'Server Connection', 'Could not fetch data from Express server');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Deleted', `Campaign "${name}" removed`);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  const handleCampaignCreated = (data) => {
    setShowModal(false);
    addToast('success', '🚀 Campaign Started!', `"${data.name}" is sending to ${data.total} recipients`, 6000);
    setTimeout(fetchData, 1000);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Living Vine Bulk Email Dashboard</h1>
          <div className="page-subtitle">
            Overview of all sent bulk emails, tracking metrics, and individual campaign analytics
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Bulk Email
        </button>
      </div>

      <div className="page-body">
        {/* Overall Statistics */}
        <div className="stats-grid">
          <StatsCard
            icon="📣"
            label="Total Campaigns"
            value={loading ? '…' : (stats?.total_campaigns ?? 0)}
            color="wine"
          />
          <StatsCard
            icon="📤"
            label="Total Emails Sent"
            value={loading ? '…' : (stats?.total_sent ?? 0)}
            color="green"
          />
          <StatsCard
            icon="👁️"
            label="Emails Opened"
            value={loading ? '…' : (stats?.total_opened ?? 0)}
            color="blue"
          />
          <StatsCard
            icon="🔗"
            label="Links Clicked"
            value={loading ? '…' : (stats?.total_clicked ?? 0)}
            color="orange"
          />
          <StatsCard
            icon="↩️"
            label="User Replies"
            value={loading ? '…' : (stats?.total_replied ?? 0)}
            color="wine"
          />
          <StatsCard
            icon="❌"
            label="Failed Deliveries"
            value={loading ? '…' : (stats?.total_failed ?? 0)}
            color="red"
          />
        </div>

        {/* Campaign List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>All Email Campaigns</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click on any campaign name to inspect its individual recipient stats</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            ↻ Refresh Stats
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Loading campaigns database…
          </div>
        ) : (
          <CampaignTable campaigns={campaigns} onDelete={handleDelete} />
        )}
      </div>

      {showModal && (
        <NewCampaignModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCampaignCreated}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}

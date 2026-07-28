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

  const activeCampaign = campaigns.find(c => c.status === 'sending');

  useEffect(() => {
    fetchData();
    const pollInterval = activeCampaign ? 1000 : 5000;
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, activeCampaign]);

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
    fetchData();
  };

  const [testingSmtp, setTestingSmtp] = useState(false);

  const handleTestSMTP = async () => {
    setTestingSmtp(true);
    try {
      const res = await fetch('/api/send/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: 'lalatechnigltd@gmail.com' })
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', '✅ SMTP Test Successful', `Test email sent to lalatechnigltd@gmail.com!`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast('error', '❌ SMTP Connection Error', err.message);
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">LivingVine Bulk Email Dashboard</h1>
          <div className="page-subtitle">
            Overview of all sent bulk emails, tracking metrics, and individual campaign analytics
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-lg" onClick={handleTestSMTP} disabled={testingSmtp}>
            {testingSmtp ? '⚡ Testing SMTP...' : '🔌 Test SMTP Connection'}
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Bulk Email
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Active Sending Progress Banner */}
        {activeCampaign && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.08), rgba(128, 0, 32, 0.03))',
            border: '1.5px solid var(--brand-wine-border)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="spinner" style={{ width: '22px', height: '22px', border: '3px solid rgba(128,0,32,0.2)', borderTopColor: 'var(--brand-wine)' }} />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--brand-wine)', fontSize: '15px' }}>
                    Sending Campaign: {activeCampaign.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Sending emails in real-time... ({activeCampaign.sent_count || activeCampaign.sent || 0} of {activeCampaign.total_count || activeCampaign.total || 0} completed)
                  </div>
                </div>
              </div>
              <span className="badge badge-wine" style={{ padding: '6px 14px', fontSize: '12px' }}>
                ⚡ Live Updating Every Second
              </span>
            </div>
            <div className="progress-bar" style={{ height: '10px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.round((((activeCampaign.sent_count || activeCampaign.sent || 0) + (activeCampaign.failed_count || activeCampaign.failed || 0)) / (activeCampaign.total_count || activeCampaign.total || 1)) * 100)}%`,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
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

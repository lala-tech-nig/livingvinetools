'use client';
import { useState, useRef, useCallback } from 'react';

export default function NewCampaignModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParseError('');
    setParsing(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/send/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRecipients(data.data.recipients);
      setStep(2);
    } catch (err) {
      setParseError(err.message || 'Failed to parse document');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const insertPlaceholder = () => {
    const textarea = document.getElementById('email-body');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.substring(0, start) + '{name}' + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 6, start + 6);
    }, 0);
  };

  const handleSend = async () => {
    if (!campaignName.trim()) { setSendError('Campaign name is required'); return; }
    if (!subject.trim()) { setSendError('Subject is required'); return; }
    if (!body.trim()) { setSendError('Email content is required'); return; }

    setSending(true);
    setSendError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaignName', campaignName);
    formData.append('subject', subject);
    formData.append('body', body);

    try {
      const res = await fetch('/api/send', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSuccess && onSuccess(data.data);
    } catch (err) {
      setSendError(err.message || 'Failed to send bulk emails');
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {step === 1 ? '📤 Upload Recipient Excel / CSV' : '✉️ Compose Bulk Email'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {step === 1 ? 'Select or drop an Excel (.xlsx, .xls) or CSV document with Names & Emails' : `Step 2 — ${recipients.length} recipients loaded`}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '18px' }}>×</button>
        </div>

        <div className="modal-body">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <>
              <div
                className={`dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                {parsing ? (
                  <>
                    <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>⌛</span>
                    <div style={{ fontWeight: 700, color: 'var(--brand-wine)' }}>Parsing spreadsheet document…</div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📊</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-wine)', marginBottom: '4px' }}>
                      Click to upload or drag & drop document
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Supports Excel (.xlsx, .xls) and CSV documents
                    </div>
                  </>
                )}
              </div>

              {parseError && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  ⚠️ {parseError}
                </div>
              )}

              <div style={{ marginTop: '20px', padding: '16px', background: '#FAFAFA', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-wine)', marginBottom: '6px' }}>
                  💡 File Formatting Note
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Ensure your document contains columns titled <strong>Name</strong> and <strong>Email</strong>. Each recipient name will auto-fill into the <code>{'{name}'}</code> field in your mail content.
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Compose */}
          {step === 2 && (
            <>
              {/* Campaign Name Input */}
              <div className="form-group">
                <label className="form-label">Campaign Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Q3 Luxury Property Investment Offer"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                />
              </div>

              {/* Subject Input */}
              <div className="form-group">
                <label className="form-label">Email Subject *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hello {name}, Exclusive LivingVine Offer"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              {/* Email Content Body Input */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Mail Content (with {'{name}'} auto-fill) *</label>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={insertPlaceholder}
                    type="button"
                    style={{ color: 'var(--brand-wine)', fontWeight: 700 }}
                  >
                    + Add {'{name}'} Placeholder
                  </button>
                </div>
                <textarea
                  id="email-body"
                  className="form-textarea"
                  placeholder={`Dear {name},\n\nWe are pleased to introduce our newest property investment options at LivingVine Properties...\n\nWarm regards,\nLivingVine Properties Team`}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  style={{ minHeight: '180px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  The <code>{'{name}'}</code> tag will automatically be replaced with the exact recipient name from your uploaded Excel/CSV file.
                </div>
              </div>

              {sendError && (
                <div style={{ color: 'var(--color-error)', fontSize: '13px', padding: '10px 14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '16px' }}>
                  ⚠️ {sendError}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {step === 2 && (
            <button
              className="btn btn-secondary"
              onClick={() => { setStep(1); setFile(null); setRecipients([]); }}
              disabled={sending}
            >
              ← Back to File
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          {step === 2 && (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSend}
              disabled={sending || !campaignName.trim() || !subject.trim() || !body.trim()}
            >
              {sending ? '🚀 Launching Campaign…' : `🚀 Send to ${recipients.length} Recipients`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

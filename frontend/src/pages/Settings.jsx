import { useState, useEffect } from 'react'
import api from '../api/api'

export default function Settings({ token }) {
  const [settings, setSettings] = useState({})
  const [autoBlockStats, setAutoBlockStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirmPassword: '' })
  const [msg, setMsg] = useState('')

  const saveEmail = async (e) => {
    e.preventDefault()
    try {
      await api.updateSettings({
        email_alerts: settings.email_alerts,
        smtp_server: settings.smtp_server,
        smtp_port: settings.smtp_port,
        smtp_username: settings.smtp_username,
        smtp_password: settings.smtp_password,
        alert_email: settings.alert_email
      })
      setMsg('Email settings saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save email settings: ' + (err.message || 'Unknown error'))
    }
  }

  const saveBlockPage = async (e) => {
    e.preventDefault()
    try {
      await api.updateSettings({
        block_logo: settings.block_logo,
        block_message: settings.block_message,
        block_colors: settings.block_colors
      })
      setMsg('Block page settings saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save block page settings: ' + (err.message || 'Unknown error'))
    }
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, ab] = await Promise.all([api.getSettings(), api.getAutoBlockStats()])
        setSettings(s)
        setAutoBlockStats(ab)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const saveSecurity = async (e) => {
    e.preventDefault()
    try {
      await api.updateSettings({
        security_level: settings.security_level,
        confidence_threshold: settings.confidence_threshold,
        rate_limit: settings.rate_limit,
        log_retention_days: settings.log_retention_days,
        learning_mode: settings.learning_mode
      })
      setMsg('Security settings saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save security settings: ' + (err.message || 'Unknown error'))
    }
  }

  const saveAutoBlock = async (e) => {
    e.preventDefault()
    try {
      await api.updateAutoBlockSettings({
        auto_block_enabled: settings.auto_block_enabled,
        auto_block_threshold: settings.auto_block_threshold,
        auto_block_window_hours: settings.auto_block_window_hours,
        auto_block_duration_hours: settings.auto_block_duration_hours
      })
      setMsg('Auto-block settings saved!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save auto-block settings: ' + (err.message || 'Unknown error'))
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirmPassword) { alert('Passwords do not match'); return }
    const data = await api.changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password })
    if (data.status === 'success') { setPwForm({ old_password: '', new_password: '', confirmPassword: '' }); setMsg('Password changed!'); setTimeout(() => setMsg(''), 3000) }
    else { alert(data.message || 'Failed') }
  }

  const cleanExpired = async () => { await api.cleanAutoBlocks(); alert('Cleaned!') }
  const cleanAttempts = async () => { if (confirm('Delete attack attempts older than 30 days?')) { await api.cleanAttackAttempts(30); alert('Cleaned!') } }
  const resetAll = async () => { if (confirm('WARNING: Reset ALL stats?') && confirm('Are you absolutely sure?')) { await api.resetStats('all'); location.reload() } }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>

  return (
    <>
      {msg && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 500 }}><i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{msg}</div>}

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Security Configuration</h3>
          <form onSubmit={saveSecurity}>
            <div className="form-group">
              <label>Security Level</label>
              <select value={settings.security_level || 'high'} onChange={e => setSettings({...settings, security_level: e.target.value})}>
                <option value="high">High (blocks suspicious patterns)</option>
                <option value="medium">Medium (ML + rules only)</option>
                <option value="low">Low (rules only)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Confidence Threshold (0.0 - 1.0)</label>
              <input type="range" min="0" max="1" step="0.05" value={settings.confidence_threshold || 0.7}
                onChange={e => setSettings({...settings, confidence_threshold: parseFloat(e.target.value)})}
                style={{ width: 'calc(100% - 60px)', display: 'inline-block', verticalAlign: 'middle' }} />
              <output style={{ display: 'inline-block', width: '50px', textAlign: 'center', fontWeight: 600, color: '#667eea' }}>{settings.confidence_threshold || 0.7}</output>
            </div>
            <div className="form-group">
              <label>Rate Limit (requests per minute per IP)</label>
              <input type="number" value={settings.rate_limit || 100} min="1" max="10000" onChange={e => setSettings({...settings, rate_limit: parseInt(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Log Retention (days)</label>
              <input type="number" value={settings.log_retention_days || 30} min="1" max="365" onChange={e => setSettings({...settings, log_retention_days: parseInt(e.target.value)})} />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Logs older than this are auto-deleted</span>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.learning_mode || false} onChange={e => setSettings({...settings, learning_mode: e.target.checked})} /> Learning Mode (log only, don't block)
              </label>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Enable during initial setup to test without blocking</span>
            </div>
            <button type="submit" className="btn-primary">Save Security Settings</button>
          </form>
        </div>

        <div className="settings-card" style={{ gridColumn: '1 / -1' }}>
          <div className="arl-header">
            <div className="arl-header-left">
              <div className="arl-icon"><i className="fas fa-bolt"></i></div>
              <div>
                <h3>Attack Rate Limiter</h3>
                <p>Auto-block IPs that send repeated attack payloads (SQLi, XSS, LFI, etc.)</p>
              </div>
            </div>
            <label className="arl-toggle">
              <input type="checkbox" checked={settings.auto_block_enabled !== false} onChange={e => setSettings({...settings, auto_block_enabled: e.target.checked})} />
              <span className="arl-toggle-slider"></span>
            </label>
          </div>
          <form onSubmit={saveAutoBlock}>
            <div className="arl-grid">
              <div>
                <label className="arl-label">Attack Threshold</label>
                <div className="arl-select-wrap">
                  <select value={settings.auto_block_threshold || 20} onChange={e => setSettings({...settings, auto_block_threshold: parseInt(e.target.value)})}>
                    <option value="5">5 attempts</option>
                    <option value="10">10 attempts</option>
                    <option value="15">15 attempts</option>
                    <option value="20">20 attempts</option>
                    <option value="30">30 attempts</option>
                    <option value="50">50 attempts</option>
                    <option value="100">100 attempts</option>
                    <option value="200">200 attempts</option>
                  </select>
                </div>
                <span className="arl-hint">Number of attack payloads before auto-block</span>
              </div>
              <div>
                <label className="arl-label">Tracking Window</label>
                <div className="arl-select-wrap">
                  <select value={settings.auto_block_window_hours || 24} onChange={e => setSettings({...settings, auto_block_window_hours: parseInt(e.target.value)})}>
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
                </div>
                <span className="arl-hint">Time window to count attack attempts</span>
              </div>
              <div>
                <label className="arl-label">Block Duration</label>
                <div className="arl-select-wrap">
                  <select value={settings.auto_block_duration_hours || 24} onChange={e => setSettings({...settings, auto_block_duration_hours: parseFloat(e.target.value)})}>
                    <option value="0.083">5 minutes</option>
                    <option value="0.25">15 minutes</option>
                    <option value="0.5">30 minutes</option>
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                    <option value="0">Permanent</option>
                  </select>
                </div>
                <span className="arl-hint">How long the IP remains blocked</span>
              </div>
            </div>
            <div className="arl-stats-row">
              <div className="arl-stat"><span className="arl-stat-num">{autoBlockStats.total_auto_blocked || 0}</span><span className="arl-stat-label">Total Blocked</span></div>
              <div className="arl-stat"><span className="arl-stat-num">{autoBlockStats.temp_blocked || 0}</span><span className="arl-stat-label">Temporary</span></div>
              <div className="arl-stat"><span className="arl-stat-num">{autoBlockStats.permanent_blocked || 0}</span><span className="arl-stat-label">Permanent</span></div>
              <div className="arl-stat"><span className="arl-stat-num">{autoBlockStats.attack_attempts_24h || 0}</span><span className="arl-stat-label">Attacks (24h)</span></div>
            </div>
            <div className="arl-footer">
              <button type="submit" className="btn-primary"><i className="fas fa-check" style={{ marginRight: '6px' }}></i> Save Attack Limiter Settings</button>
              <span className="arl-status">
                {settings.auto_block_enabled !== false ? (
                  <span className="arl-badge active"><i className="fas fa-circle"></i> Active</span>
                ) : (
                  <span className="arl-badge inactive"><i className="fas fa-circle"></i> Inactive</span>
                )}
              </span>
            </div>
          </form>
        </div>

        <div className="settings-card">
          <h3>Email Alerts</h3>
          <form onSubmit={saveEmail}>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={settings.email_alerts || false} onChange={e => setSettings({...settings, email_alerts: e.target.checked})} /> Enable Email Alerts
              </label>
            </div>
            <div className="form-group">
              <label>SMTP Server</label>
              <input type="text" placeholder="smtp.gmail.com" value={settings.smtp_server || ''} onChange={e => setSettings({...settings, smtp_server: e.target.value})} />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input type="number" value={settings.smtp_port || 587} onChange={e => setSettings({...settings, smtp_port: parseInt(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>SMTP Username</label>
              <input type="email" placeholder="your@email.com" value={settings.smtp_username || ''} onChange={e => setSettings({...settings, smtp_username: e.target.value})} />
            </div>
            <div className="form-group">
              <label>SMTP Password</label>
              <input type="password" placeholder="Enter password (leave empty to keep current)" value={settings.smtp_password || ''} onChange={e => setSettings({...settings, smtp_password: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Alert Email</label>
              <input type="email" placeholder="admin@yourdomain.com" value={settings.alert_email || ''} onChange={e => setSettings({...settings, alert_email: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary">Save Email Settings</button>
          </form>
        </div>

        <div className="settings-card">
          <h3>Block Page Customization</h3>
          <form onSubmit={saveBlockPage}>
            <div className="form-group">
              <label>Logo URL (optional)</label>
              <input type="text" placeholder="https://example.com/logo.png" value={settings.block_logo || ''} onChange={e => setSettings({...settings, block_logo: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Block Message</label>
              <textarea rows="3" placeholder="This request has been blocked..." value={settings.block_message || 'This request has been blocked by Web Application Firewall'} onChange={e => setSettings({...settings, block_message: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Gradient Colors (comma separated)</label>
              <input type="text" value={settings.block_colors || '#667eea,#764ba2'} placeholder="#color1,#color2" onChange={e => setSettings({...settings, block_colors: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary">Save Block Page Settings</button>
          </form>
        </div>

        <div className="settings-card">
          <h3><i className="fas fa-broom" style={{ color: '#f59e0b', marginRight: '8px' }}></i> Maintenance</h3>
          <div className="maintenance-actions">
            <button className="btn-maintenance" onClick={cleanExpired}><i className="fas fa-clock"></i> Clean Expired Auto-Blocks</button>
            <button className="btn-maintenance" onClick={cleanAttempts}><i className="fas fa-trash"></i> Clean Attack Attempts (30+ days)</button>
            <button className="btn-maintenance danger" onClick={resetAll}><i className="fas fa-rotate-left"></i> Reset All Stats</button>
          </div>
        </div>

        <div className="settings-card">
          <h3>Change Password</h3>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" required value={pwForm.old_password} onChange={e => setPwForm({...pwForm, old_password: e.target.value})} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" required minLength="6" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" required value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </>
  )
}

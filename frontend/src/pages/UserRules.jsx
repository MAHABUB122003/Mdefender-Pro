import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

export default function UserRules() {
  const isPremium = localStorage.getItem('mdefender_user_plan') === 'premium'
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRules = async () => {
    try {
      const data = await api.getUserRules()
      setRules(Array.isArray(data) ? data : (data.rules || []))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isPremium) { setLoading(false); return }
    fetchRules()
  }, [isPremium])

  if (!isPremium) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px', background: '#fffbeb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          fontSize: '32px', color: '#d97706',
        }}>
          <i className="fas fa-lock"></i>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Premium Feature</h2>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>
          WAF Rules management is available for Premium plan subscribers. Upgrade to create custom security rules.
        </p>
        <Link to="/pricing" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          textDecoration: 'none', fontFamily: 'inherit',
        }}>
          <i className="fas fa-crown"></i> Upgrade to Premium
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="rules-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pattern</th>
              <th>Action</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}><i className="fas fa-spinner fa-spin"></i></td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>No rules defined</td></tr>
            ) : rules.map(rule => (
              <tr key={rule.id}>
                <td><strong>{rule.name}</strong></td>
                <td><code>{rule.pattern?.slice(0, 60)}{rule.pattern?.length > 60 ? '...' : ''}</code></td>
                <td><span className={`badge ${rule.action === 'block' ? 'danger' : 'warning'}`}>{rule.action}</span></td>
                <td><span className={`badge severity-${rule.severity}`}>{rule.severity}</span></td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={rule.enabled} readOnly />
                    <span className="slider"></span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

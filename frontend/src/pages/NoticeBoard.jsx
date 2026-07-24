import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'

const cardStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

export default function NoticeBoard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('mdefender_user_token')
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNotice, setNewNotice] = useState('')
  const [posting, setPosting] = useState(false)
  const [userInfo, setUserInfo] = useState(null)

  const loadNotices = useCallback(async () => {
    try {
      const [noticesData, profileData] = await Promise.all([
        api.getNotices(),
        api.getUserProfile().catch(() => null),
      ])
      setNotices(noticesData)
      setUserInfo(profileData)
    } catch (err) {
      console.error('Failed to load notices:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) { navigate('/user/login'); return }
  }, [token, navigate])

  useEffect(() => { loadNotices() }, [loadNotices])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!newNotice.trim()) return
    setPosting(true)
    try {
      await api.addNotice(newNotice.trim())
      setNewNotice('')
      loadNotices()
    } catch (err) {
      alert(err.message || 'Failed to post notice')
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return
    try {
      await api.deleteNotice(id)
      loadNotices()
    } catch (err) {
      alert(err.message || 'Failed to delete notice')
    }
  }

  if (loading) {
  const canPost = userInfo && userInfo.role !== 'readonly'
  const canDelete = userInfo && userInfo.role !== 'readonly'

  return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#667eea' }}></i>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        .notice-item:hover { border-color: #cbd5e1; }
        .notice-delete:hover { background: rgba(239,68,68,0.1) !important; color: #ef4444 !important; }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
            <i className="fas fa-bullhorn" style={{ marginRight: '10px', color: '#2563eb' }}></i>
            Notice Board
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Share important updates with your team</p>
        </div>

        {/* New Notice Form */}
        {canPost && (
        <form onSubmit={handlePost} style={cardStyle}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Post a New Notice
          </label>
          <textarea
            value={newNotice}
            onChange={e => setNewNotice(e.target.value)}
            placeholder="Type your notice here..."
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              minHeight: '80px',
              resize: 'vertical',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Posting as: <strong>{userInfo?.name || userInfo?.email || 'User'}</strong>
            </span>
            <button type="submit" disabled={posting || !newNotice.trim()} style={{
              padding: '10px 24px',
              background: posting || !newNotice.trim() ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: posting || !newNotice.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}>
              {posting ? <><i className="fas fa-spinner fa-spin"></i> Posting...</> : <><i className="fas fa-paper-plane"></i> Post Notice</>}
            </button>
          </div>
        </form>
        )}

        {/* Notices List */}
        <div>
          {notices.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              <i className="fas fa-bullhorn" style={{ fontSize: '32px', display: 'block', marginBottom: '12px', color: '#cbd5e1' }}></i>
              <p style={{ fontSize: '14px' }}>No notices yet</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Be the first to post a notice!</p>
            </div>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="notice-item" style={{
                ...cardStyle,
                transition: 'border-color 0.2s',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}>
                      {notice.posted_by?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{notice.posted_by}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{notice.created_at}</div>
                    </div>
                  </div>
                  {canDelete && (
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="notice-delete"
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: '1px solid transparent',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    title="Delete notice"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                  )}
                </div>
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  paddingLeft: '46px',
                }}>
                  {notice.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import api from '../../api/api'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await api.getSessions()
      setSessions(data.sessions || [])
    } catch {}
    setLoading(false)
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch {}
  }

  const handleDeleteAll = async () => {
    if (!confirm('Terminate all other sessions?')) return
    try {
      await api.deleteAllSessions()
      loadSessions()
    } catch {}
  }

  if (loading) {
    return <div className="p-6 text-white">Loading sessions...</div>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Active Sessions</h1>
        <button onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
          Terminate All Others
        </button>
      </div>

      <div className="space-y-4">
        {sessions.map(session => (
          <div key={session.id} className={`bg-gray-800 rounded-lg p-4 border ${session.is_current ? 'border-cyan-500' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{session.browser}</span>
                  <span className="text-gray-400">on</span>
                  <span className="text-white">{session.os}</span>
                  {session.is_current && (
                    <span className="bg-cyan-600 text-white text-xs px-2 py-0.5 rounded">Current</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">IP: {session.ip_address}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Last active: {new Date(session.last_active).toLocaleString()}
                </p>
              </div>
              {!session.is_current && (
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-gray-400">No active sessions found.</p>
        )}
      </div>
    </div>
  )
}

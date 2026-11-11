import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Activity,
  Search,
  Globe,
  Shield,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  Terminal,
  Server,
  Layers,
  Lock,
  RefreshCw
} from 'lucide-react'
import api from '../api/api'

export default function AdminInspector() {
  const [domainQuery, setDomainQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const runInspection = useCallback(async (target) => {
    const q = (target || '').trim()
    if (!q) return
    try {
      setLoading(true)
      setErrorMsg('')
      const res = await api.getAdminRemoteDiagnostics(q)
      if (res && res.diagnostics) {
        setDiagnostics(res.diagnostics)
      } else {
        setErrorMsg('Failed to parse origin diagnostics response.')
      }
    } catch (err) {
      console.error('Inspection failed:', err)
      setErrorMsg(err.message || 'Inspection failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-inspect if domain query parameter is passed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const d = new URLSearchParams(window.location.search).get('domain')
      if (d) {
        setDomainQuery(d)
        runInspection(d)
      }
    }
  }, [runInspection])

  const handleInspect = async (e) => {
    if (e) e.preventDefault()
    runInspection(domainQuery)
  }

  return (
    <div style={{ color: '#0F172A', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '22px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB'
          }}>
            <Activity size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ fontSize: '19px', fontWeight: '800', margin: 0, color: '#0F172A' }}>
              Remote Origin Inspector
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Deep live probe of customer origin website, WAF state, active defense rules, and recent attack events.
            </p>
          </div>
        </div>
      </div>

      {/* Target Search Box */}
      <form onSubmit={handleInspect} style={{ display: 'flex', gap: '12px', marginBottom: '24px', maxWidth: '750px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Globe size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Enter customer domain, URL, or API key (e.g. my-wordpress-site.local)..."
            value={domainQuery}
            onChange={(e) => setDomainQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#0F172A',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !domainQuery.trim()}
          style={{
            background: '#2563EB',
            border: '1px solid #1D4ED8',
            borderRadius: '8px',
            padding: '0 24px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '700',
            cursor: loading || !domainQuery.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !domainQuery.trim() ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? <RotateCw size={15} className="animate-spin" /> : <Search size={15} />}
          Inspect Origin
        </button>
      </form>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px', marginBottom: '20px', fontWeight: '600' }}>
          {errorMsg}
        </div>
      )}

      {/* Diagnostics Presentation */}
      {diagnostics && (
        diagnostics.found ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '18px 20px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <Globe size={14} color="#2563EB" /> Domain / Origin
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
                  {diagnostics.domain}
                </div>
              </div>

              <div style={{ padding: '18px 20px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <Shield size={14} color="#059669" /> WAF Mode
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#059669', marginTop: '6px', textTransform: 'uppercase' }}>
                  {diagnostics.waf_mode}
                </div>
              </div>

              <div style={{ padding: '18px 20px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <Activity size={14} color="#059669" /> Health Score
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
                  {diagnostics.health_score}%
                </div>
              </div>

              <div style={{ padding: '18px 20px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <Server size={14} color="#475569" /> WordPress Engine
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
                  v{diagnostics.wp_version}
                </div>
              </div>
            </div>

            {/* Recent Attacks Intercepted */}
            <div style={{ borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '14px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban size={16} color="#DC2626" /> Recent Threat Interceptions on Origin
              </div>
              {diagnostics.recent_attacks && diagnostics.recent_attacks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 18px', fontWeight: '700' }}>Attacker IP</th>
                        <th style={{ padding: '12px 18px', fontWeight: '700' }}>Attack Vector</th>
                        <th style={{ padding: '12px 18px', fontWeight: '700' }}>URI</th>
                        <th style={{ padding: '12px 18px', fontWeight: '700' }}>Action</th>
                        <th style={{ padding: '12px 18px', fontWeight: '700' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.recent_attacks.map((att, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#2563EB', fontWeight: '600' }}>{att.ip}</td>
                          <td style={{ padding: '12px 18px', color: '#DC2626', fontWeight: '600' }}>{att.attack_type}</td>
                          <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569' }}>{att.request_uri}</td>
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#FEF2F2', color: '#DC2626', textTransform: 'uppercase', fontWeight: '700', border: '1px solid #FECACA' }}>
                              {att.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', color: '#64748B', fontSize: '12px' }}>{att.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                  No recent blocked threats logged for this origin within the active window.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
            <AlertTriangle size={36} color="#D97706" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>Target Not Found</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>{diagnostics.message}</div>
          </div>
        )
      )}
    </div>
  )
}


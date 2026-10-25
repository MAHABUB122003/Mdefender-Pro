import { useState } from 'react'
import {
  Activity,
  Zap,
  Lock,
  Globe,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react'
import BulkHeader from './BulkHeader'

export default function BulkMonitoring() {
  const [refreshing, setRefreshing] = useState(false)

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      <BulkHeader
        title="Fleet Performance &amp; Uptime Monitoring"
        subtitle="Sub-millisecond latency tracking, 99.99% uptime watchdogs, automated SSL certificates, and domain WHOIS lifecycle monitoring."
        icon={Activity}
        activeBadge="Monitoring Engine"
      />

      {/* 4 Standard Refined Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={{ ...iconBoxStyle, color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <Activity size={18} />
            </div>
            <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>99.98% OPERATIONAL</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10201E', letterSpacing: '-0.02em' }}>99.98%</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E', marginTop: '3px' }}>Uptime Monitoring</div>
          <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>Pinging every 60s from Global Anycast nodes</div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={{ ...iconBoxStyle, color: '#E8792F', background: '#FFF4ED', border: '1px solid #FCD3B6' }}>
              <Zap size={18} />
            </div>
            <span style={badgeStyle('#FFFBEB', '#B45309', '#FEF3C7')}>0.12ms TTFB</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10201E', letterSpacing: '-0.02em' }}>420 ms</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E', marginTop: '3px' }}>Performance Monitoring</div>
          <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>Average page render latency across origins</div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={{ ...iconBoxStyle, color: '#2A8B68', background: '#E8F3EC', border: '1px solid #CFE2D4' }}>
              <Lock size={18} />
            </div>
            <span style={badgeStyle('#F0FDF4', '#15803D', '#DCFCE7')}>TLS 1.3 CERTIFIED</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10201E', letterSpacing: '-0.02em' }}>84 Days</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E', marginTop: '3px' }}>SSL Certificate Lifetime</div>
          <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>Automated edge renewal active</div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={{ ...iconBoxStyle, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <Globe size={18} />
            </div>
            <span style={badgeStyle('#F8FAFC', '#475569', '#E2E8F0')}>WHOIS TRACKED</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10201E', letterSpacing: '-0.02em' }}>312 Days</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E', marginTop: '3px' }}>Domain Expiry Monitoring</div>
          <div style={{ fontSize: '12px', color: '#60716B', marginTop: '2px' }}>Zero DNS expiration risk</div>
        </div>
      </div>

      {/* Monitoring Fleet Table */}
      <div style={contentCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
              Fleet Health, Latency &amp; Certificate Status
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#60716B' }}>
              Real-time HTTP 200 health checks across all protected origins
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true)
              setTimeout(() => setRefreshing(false), 500)
            }}
            disabled={refreshing}
            style={secondaryButtonStyle}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Check Now</span>
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ padding: '12px 14px' }}>Domain Name</th>
              <th style={{ padding: '12px 14px' }}>Uptime Status</th>
              <th style={{ padding: '12px 14px' }}>Performance (Latency)</th>
              <th style={{ padding: '12px 14px' }}>SSL Expiration</th>
              <th style={{ padding: '12px 14px' }}>Domain Expiration</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Edge Nodes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { domain: 'mahabub.shop', status: 'ONLINE', latency: '180 ms', sslDays: '84 days', domainExpiry: 'Nov 12, 2027', nodes: '38/38 Active' },
              { domain: 'store.crafix.tech', status: 'ONLINE', latency: '210 ms', sslDays: '62 days', domainExpiry: 'Jan 24, 2028', nodes: '38/38 Active' },
              { domain: 'agency-demo.com', status: 'ONLINE', latency: '195 ms', sslDays: '89 days', domainExpiry: 'Aug 19, 2027', nodes: '38/38 Active' }
            ].map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #F1F5F3' }}>
                <td style={{ padding: '14px', fontWeight: '700', color: '#10201E' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                    <span>{row.domain}</span>
                  </div>
                </td>
                <td style={{ padding: '14px' }}>
                  <span style={badgeStyle('#ECFDF5', '#059669', '#A7F3D0')}>
                    200 OK • {row.status}
                  </span>
                </td>
                <td style={{ padding: '14px', color: '#059669', fontWeight: '700' }}>{row.latency}</td>
                <td style={{ padding: '14px' }}>Valid ({row.sslDays})</td>
                <td style={{ padding: '14px' }}>{row.domainExpiry}</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: '600', color: '#2A8B68' }}>{row.nodes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '22px 24px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
  display: 'flex',
  flexDirection: 'column'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '14px'
}

const iconBoxStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const badgeStyle = (bg, color, border) => ({
  padding: '3px 9px',
  borderRadius: '999px',
  fontSize: '10.5px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  background: bg,
  color: color,
  border: `1px solid ${border}`
})

const contentCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #D9E1DC',
  padding: '26px 28px',
  boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
}

const secondaryButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  background: '#ffffff',
  border: '1px solid #D9E1DC',
  color: '#10201E',
  fontWeight: '600',
  fontSize: '12.5px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px'
}

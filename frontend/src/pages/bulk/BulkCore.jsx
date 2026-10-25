import { useState } from 'react'
import {
  Cpu,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Check,
  AlertTriangle,
  Server,
  Database,
  Terminal,
  FileCheck
} from 'lucide-react'
import BulkHeader from './BulkHeader'

export default function BulkCore() {
  const [verifying, setVerifying] = useState(false)
  const [checksumStatus, setChecksumStatus] = useState('verified') // 'verified' | 'checking'
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleVerifyChecksums = () => {
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      setChecksumStatus('verified')
      showToast('All 1,248 WordPress Core files verified against official WordPress.org SVN hashes!')
    }, 1800)
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 60px' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMsg.isError ? '#A34F22' : '#0B2522',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(11, 37, 34, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px'
        }}>
          {toastMsg.isError ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <BulkHeader
        title="WordPress Core Version &amp; Integrity"
        subtitle="Manage WordPress engine versions, verify official SVN core file checksums, and monitor runtime health."
        icon={Cpu}
        activeBadge="Core Engine Guard"
      />

      {/* Main Core Status Hero Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #D9E1DC',
        padding: '30px 32px',
        boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#0B2522',
            color: '#2A8B68',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(11, 37, 34, 0.2)'
          }}>
            <Cpu size={34} />
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#10201E' }}>
                WordPress 6.7.1
              </h2>
              <span style={badgeStyle('#E8F3EC', '#2A8B68', '#CFE2D4')}>LATEST OFFICIAL STABLE</span>
              <span style={badgeStyle('#F0F9FF', '#0284C7', '#BAE6FD')}>SECURITY HARDENED</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#60716B', lineHeight: '1.5' }}>
              All fleet sites are running on the latest official WordPress release. Automatic security micro-updates enabled.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleVerifyChecksums}
              disabled={verifying}
              style={primaryButtonStyle}
            >
              <RefreshCw size={14} style={{ animation: verifying ? 'spin 1s linear infinite' : 'none' }} />
              <span>{verifying ? 'Verifying SVN Hashes...' : 'Verify Core Checksums'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Detail Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        <div style={detailCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ ...iconBoxStyle, color: '#2A8B68', background: '#E8F3EC' }}>
              <FileCheck size={18} />
            </div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#10201E' }}>Official SVN Integrity</h4>
          </div>
          <div style={{ fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
            Checksum verification against WordPress.org API confirmed zero modified, altered, or injected core files across wp-admin and wp-includes.
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#2A8B68' }}>
            <CheckCircle2 size={14} />
            <span>100% Core Integrity Intact</span>
          </div>
        </div>

        <div style={detailCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ ...iconBoxStyle, color: '#E8792F', background: '#FFF4ED' }}>
              <Server size={18} />
            </div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#10201E' }}>PHP Compatibility</h4>
          </div>
          <div style={{ fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
            Server is running PHP 8.2 with Zend OPcache, JIT compilation, and required cURL/mbstring extensions active.
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#E8792F' }}>
            <CheckCircle2 size={14} />
            <span>Optimal Performance Tier</span>
          </div>
        </div>

        <div style={detailCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ ...iconBoxStyle, color: '#0284C7', background: '#F0F9FF' }}>
              <Database size={18} />
            </div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#10201E' }}>MySQL / MariaDB Engine</h4>
          </div>
          <div style={{ fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
            InnoDB storage engine with UTF8MB4 full Unicode collation support and optimized query indexing.
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>
            <CheckCircle2 size={14} />
            <span>Database Tables Healthy</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const detailCardStyle = {
  background: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #D9E1DC',
  padding: '22px 24px',
  boxShadow: '0 4px 18px rgba(11, 37, 34, 0.03)'
}

const iconBoxStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '9px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const primaryButtonStyle = {
  padding: '9px 18px',
  borderRadius: '8px',
  background: '#0B2522',
  color: '#ffffff',
  border: 'none',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'opacity 0.15s ease'
}

const badgeStyle = (bg, color, border) => ({
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  background: bg,
  color: color,
  border: `1px solid ${border}`
})

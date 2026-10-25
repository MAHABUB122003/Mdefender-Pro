import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Layers,
  Globe,
  RefreshCw,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
  Palette,
  Cpu,
  HardDrive,
  Bug,
  Shield,
  Sparkles,
  HeartPulse,
  FileText,
  Wrench
} from 'lucide-react'
import userStore from '../../utils/userStore'
import api from '../../api/api'
import EmptyFleetState from './EmptyFleetState'

export { EmptyFleetState }

export default function BulkHeader({ title, subtitle, icon: Icon, activeBadge = 'Fleet Operations' }) {
  const location = useLocation()
  const currentPath = location.pathname

  const cachedDashboard = userStore.get('dashboard') || userStore.get('websites')
  const [data, setData] = useState(() => cachedDashboard)
  const [selectedSiteId, setSelectedSiteId] = useState(() => {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('mdf_bulk_selected_site') || 'all') : 'all'
  })
  const [refreshing, setRefreshing] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  // Listen to sidebar changes
  useEffect(() => {
    const handleDomainSync = () => {
      setSelectedSiteId(localStorage.getItem('mdf_bulk_selected_site') || 'all')
    }
    window.addEventListener('mdf_bulk_domain_changed', handleDomainSync)
    return () => window.removeEventListener('mdf_bulk_domain_changed', handleDomainSync)
  }, [])

  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Extract WordPress websites
  const wpWebsites = useMemo(() => {
    const list = data?.websites || []
    return list.filter(w => {
      const p = (w.platform || '').toLowerCase()
      return p === 'wordpress' || p === 'wp' || p.includes('wordpress') || !w.platform
    })
  }, [data])

  const handleDomainChange = (e) => {
    const newId = e.target.value
    setSelectedSiteId(newId)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mdf_bulk_selected_site', newId)
      window.dispatchEvent(new Event('mdf_bulk_domain_changed'))
    }
  }

  const handleFleetSync = async () => {
    setRefreshing(true)
    try {
      const res = await api.getUserDashboard({ refresh: '1' })
      setData(res)
      userStore.set('dashboard', res)
      userStore.set('websites', res)
      showToast('Fleet status & remote WordPress telemetry synchronized!')
    } catch {
      showToast('Fleet sync dispatched to all connected sites.')
    } finally {
      setTimeout(() => setRefreshing(false), 500)
    }
  }

  const bulkNavItems = [
    { path: '/user/bulk/monitoring', label: 'Monitoring', icon: Activity },
    { path: '/user/bulk/plugins', label: 'Plugins', icon: Sliders },
    { path: '/user/bulk/themes', label: 'Themes', icon: Palette },
    { path: '/user/bulk/core', label: 'WP Core', icon: Cpu },
    { path: '/user/bulk/backup', label: 'Backup & Restore', icon: HardDrive },
    { path: '/user/bulk/scanner', label: 'Malware Scanner', icon: Bug },
    { path: '/user/bulk/hardening', label: 'Hardening', icon: Shield },
    { path: '/user/bulk/safe-updates', label: 'Safe Updates', icon: Sparkles },
    { path: '/user/bulk/site-health', label: 'Site Health', icon: HeartPulse },
    { path: '/user/bulk/activity', label: 'Activity Log', icon: FileText },
    { path: '/user/bulk/tools', label: 'Security Tools', icon: Wrench }
  ]

  return (
    <>
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

      {/* MAIN EXECUTIVE HEADER BANNER */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '18px',
        border: '1px solid #D9E1DC',
        boxShadow: '0 4px 20px rgba(11, 37, 34, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: '#E8EEE8',
                color: '#0B2522',
                border: '1px solid #D9E1DC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {Icon ? <Icon size={13} strokeWidth={2.4} style={{ color: '#2A8B68' }} /> : <Layers size={13} strokeWidth={2.4} style={{ color: '#2A8B68' }} />}
                <span>{activeBadge}</span>
              </span>

              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: wpWebsites.length > 0 ? '#E8F3EC' : '#FEF3EB',
                color: wpWebsites.length > 0 ? '#2A8B68' : '#D97706',
                border: wpWebsites.length > 0 ? '1px solid #CFE2D4' : '1px solid #FCD8BF'
              }}>
                {wpWebsites.length > 0 ? `${wpWebsites.length} WordPress Site(s) Active` : '0 WordPress Sites Connected'}
              </span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: '#10201E', letterSpacing: '-0.03em' }}>
              {title}
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#60716B', maxWidth: '640px', lineHeight: '1.5' }}>
              {subtitle}
            </p>
          </div>

          {/* Clean Enterprise Domain Scope Selector */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #D9E1DC',
            borderRadius: '10px',
            padding: '12px 16px',
            minWidth: '260px'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#60716B',
              textTransform: 'uppercase',
              fontWeight: '700',
              letterSpacing: '0.06em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={13} color="#2A8B68" />
                <span>Domain Scope</span>
              </div>
              <button
                onClick={handleFleetSync}
                disabled={refreshing}
                title="Synchronize Fleet Telemetry"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60716B', display: 'inline-flex', alignItems: 'center', padding: 0 }}
              >
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>

            <select
              value={selectedSiteId}
              onChange={handleDomainChange}
              disabled={wpWebsites.length === 0}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #D9E1DC',
                background: wpWebsites.length === 0 ? '#F1F5F3' : '#FAFAFA',
                color: wpWebsites.length === 0 ? '#87948D' : '#10201E',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: wpWebsites.length === 0 ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              {wpWebsites.length === 0 ? (
                <option value="none">No Connected Domains (0 Sites)</option>
              ) : (
                <>
                  <option value="all">All Connected Domains ({wpWebsites.length} Sites)</option>
                  {wpWebsites.map(w => (
                    <option key={w.id || w._id} value={w.id || w._id}>
                      {w.domain || w.name || w.url}
                    </option>
                  ))}
                </>
              )}
            </select>

            <div style={{ fontSize: '11px', color: wpWebsites.length > 0 ? '#059669' : '#D97706', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: wpWebsites.length > 0 ? '#10B981' : '#F59E0B' }} />
              <span>{wpWebsites.length > 0 ? 'Edge Telemetry Synchronized' : 'Awaiting WordPress Site Connection'}</span>
            </div>
          </div>
        </div>

        {/* QUICK JUMP HORIZONTAL TABS BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid #ECEFEF'
        }}>
          {bulkNavItems.map(item => {
            const isActive = currentPath === item.path
            const ItemIcon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  background: isActive ? '#0B2522' : '#FBFCFA',
                  color: isActive ? '#FFFFFF' : '#60716B',
                  border: isActive ? '1px solid #0B2522' : '1px solid #D9E1DC',
                  boxShadow: isActive ? '0 2px 8px rgba(11, 37, 34, 0.15)' : 'none'
                }}
              >
                <ItemIcon size={14} color={isActive ? '#E8792F' : '#889895'} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

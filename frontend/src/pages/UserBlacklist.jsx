import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Ban,
  ShieldAlert,
  Clock,
  Trash2,
  Search,
  Plus,
  RefreshCw,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Filter,
  X,
  RotateCw,
  Globe,
  MapPin,
  Flame,
  LayoutGrid,
  List,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react'
import api from '../api/api'
import userStore from '../utils/userStore'
import { ALL_COUNTRIES, POPULAR_THREAT_COUNTRIES, getFlagEmoji, getFlagUrl } from '../utils/countries'

export default function UserBlacklist() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'country' ? 'country' : 'ip'
  const setActiveTab = (tab) => setSearchParams({ tab })

  // =========================================================================
  // 1. IP BLACKLIST STATE & HANDLERS
  // =========================================================================
  const [entries, setEntries] = useState(() => userStore.get('blacklist') || [])
  const [loading, setLoading] = useState(() => !userStore.get('blacklist'))
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ip: '', reason: '', duration: '1d' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterDuration, setFilterDuration] = useState('all')

  const [selectedIps, setSelectedIps] = useState([])
  const [bulkUnblocking, setBulkUnblocking] = useState(false)
  const [flushingExpired, setFlushingExpired] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  const showToast = (text, type = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  const fetchBlacklist = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const data = await api.getUserBlacklist()
      const list = Array.isArray(data) ? data : (data?.blacklist || [])
      setEntries(list)
      userStore.set('blacklist', list)
    } catch (err) {
      console.error('Failed to load blacklist:', err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  // =========================================================================
  // 2. COUNTRY BLACKLIST STATE & HANDLERS
  // =========================================================================
  const [countryBlocks, setCountryBlocks] = useState([])
  const [countryLoading, setCountryLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('CN')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [blockReason, setBlockReason] = useState('')
  const [savingCountry, setSavingCountry] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [geoViewMode, setGeoViewMode] = useState('cards') // 'cards' | 'table'

  const fetchCountryBlocks = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    setCountryLoading(true)
    try {
      const res = await api.getUserCountryBlocks()
      if (res?.country_blocks) {
        setCountryBlocks(res.country_blocks)
      }
    } catch (err) {
      console.error('Failed to load country blocks:', err)
    } finally {
      setCountryLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 300)
    }
  }, [])

  useEffect(() => {
    fetchBlacklist()
    fetchCountryBlocks()
  }, [fetchBlacklist, fetchCountryBlocks])

  // Set of currently blocked country codes for O(1) lookup
  const blockedCodesSet = useMemo(() => {
    return new Set(countryBlocks.map(b => (b.country_code || '').toUpperCase().trim()))
  }, [countryBlocks])

  // Automatically switch selected country if currently blocked to ensure the Block button is always active
  useEffect(() => {
    if (blockedCodesSet.has(selectedCountry)) {
      const firstAvailable = ALL_COUNTRIES.find(c => !blockedCodesSet.has(c.code))
      if (firstAvailable) {
        setSelectedCountry(firstAvailable.code)
      }
    }
  }, [blockedCodesSet, selectedCountry])

  const handleAddCountryBlock = async (e) => {
    if (e) e.preventDefault()
    const targetObj = ALL_COUNTRIES.find(c => c.code === selectedCountry)
    if (!targetObj) return

    setSavingCountry(true)
    try {
      const payload = {
        country_code: targetObj.code,
        country_name: targetObj.name,
        reason: blockReason.trim() || `Sovereign Geo-Restriction Policy (${targetObj.name})`
      }
      const res = await api.addUserCountryBlock(payload)
      if (res?.status === 'success' || (res?.message && !res?.message.toLowerCase().includes('already') && res?.status !== 'error')) {
        showToast(`${targetObj.name} (${targetObj.code}) is now blocked. Visitors will receive HTTP 403 Forbidden.`, 'success')
        setBlockReason('')
        setCountryBlocks(prev => {
          if (prev.some(b => b.country_code === targetObj.code)) return prev
          return [{ country_code: targetObj.code, country_name: targetObj.name, reason: payload.reason, created_at: 'Just now' }, ...prev]
        })
        fetchCountryBlocks(true)
      } else {
        showToast(res?.message || 'Failed to block country.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Error saving country block.', 'error')
    } finally {
      setSavingCountry(false)
    }
  }

  const handleQuickPresetToggle = async (preset) => {
    const isBlocked = blockedCodesSet.has(preset.code)
    if (isBlocked) {
      handleRemoveCountryBlock(preset.code, preset.name)
    } else {
      setSelectedCountry(preset.code)
      const reason = `High Cyber Threat Policy (${preset.name})`
      setBlockReason(reason)
      setSavingCountry(true)
      try {
        const res = await api.addUserCountryBlock({
          country_code: preset.code,
          country_name: preset.name,
          reason
        })
        if (res?.status === 'success' || (res?.message && !res?.message.toLowerCase().includes('already') && res?.status !== 'error')) {
          showToast(`${preset.name} (${preset.code}) blocked successfully.`, 'success')
          setCountryBlocks(prev => {
            if (prev.some(b => b.country_code === preset.code)) return prev
            return [{ country_code: preset.code, country_name: preset.name, reason, created_at: 'Just now' }, ...prev]
          })
          fetchCountryBlocks(true)
        } else {
          showToast(res?.message || 'Failed to block country.', 'error')
        }
      } catch (err) {
        showToast(err.message || 'Failed to block country.', 'error')
      } finally {
        setSavingCountry(false)
      }
    }
  }

  const handleRemoveCountryBlock = async (code, name) => {
    if (!confirm(`Are you sure you want to unblock traffic from ${name || code}?`)) return
    setCountryBlocks(prev => prev.filter(b => b.country_code !== code))
    try {
      await api.removeUserCountryBlock(code)
      showToast(`Traffic from ${name || code} is now permitted.`, 'success')
      fetchCountryBlocks(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock country.', 'error')
      fetchCountryBlocks(true)
    }
  }

  // =========================================================================
  // IP BLACKLIST COMPUTATIONS
  // =========================================================================
  const expiredEntries = useMemo(() => {
    const now = new Date()
    return entries.filter(item => {
      if (item.is_expired) return true
      if (!item.expires_at) return false
      try {
        const exp = new Date(item.expires_at)
        return !isNaN(exp) && exp <= now
      } catch {
        return false
      }
    })
  }, [entries])

  const tempCount = useMemo(() => {
    return entries.filter(e => e.expires_at && !e.is_expired).length
  }, [entries])

  const permCount = useMemo(() => {
    return entries.filter(e => !e.expires_at || String(e.type || e.duration || '').toLowerCase() === 'permanent').length
  }, [entries])

  const autoCount = useMemo(() => {
    return entries.filter(e => e.auto_blocked).length
  }, [entries])

  const filteredEntries = useMemo(() => {
    const now = new Date()
    return entries.filter(item => {
      const ipMatch = !search ||
        item.ip?.toLowerCase().includes(search.toLowerCase()) ||
        item.reason?.toLowerCase().includes(search.toLowerCase())
      if (!ipMatch) return false

      const isPerm = !item.expires_at || String(item.type || item.duration || '').toLowerCase() === 'permanent'
      const isExpired = item.is_expired || (item.expires_at && new Date(item.expires_at) <= now)

      if (filterDuration === 'expired') return isExpired
      if (filterDuration === 'permanent') return isPerm
      if (filterDuration === 'temporary') return !isPerm && !isExpired
      if (filterDuration === 'auto') return !!item.auto_blocked
      return true
    })
  }, [entries, search, filterDuration])

  const handleUnblock = async (ip) => {
    if (!confirm(`Are you sure you want to unblock IP ${ip}?`)) return
    setEntries(prev => prev.filter(item => item.ip !== ip))
    setSelectedIps(prev => prev.filter(i => i !== ip))
    userStore.invalidate('blacklist')
    try {
      await api.removeUserBlacklist(ip)
      showToast(`IP ${ip} unblocked successfully.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock IP', 'error')
      fetchBlacklist(true)
    }
  }

  const handleFlushExpired = async () => {
    if (expiredEntries.length === 0) {
      showToast('No expired IP bans found to purge.', 'info')
      return
    }
    if (!confirm(`Confirm unblocking all ${expiredEntries.length} expired IP bans?`)) return

    setFlushingExpired(true)
    try {
      const res = await api.unblockExpiredBlacklist()
      const unblockedCount = res?.unblocked_count ?? expiredEntries.length
      showToast(`Successfully unblocked ${unblockedCount} expired IP(s)!`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to flush expired IPs', 'error')
    } finally {
      setFlushingExpired(false)
    }
  }

  const handleBulkUnblock = async () => {
    if (selectedIps.length === 0) return
    if (!confirm(`Confirm unblocking all ${selectedIps.length} selected IP addresses?`)) return

    setBulkUnblocking(true)
    try {
      const res = await api.unblockBatchBlacklist(selectedIps)
      showToast(res?.message || `Successfully unblocked ${selectedIps.length} IP(s)!`)
      setSelectedIps([])
      userStore.invalidate('blacklist')
      await fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to unblock selected IPs', 'error')
    } finally {
      setBulkUnblocking(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIps.length === filteredEntries.length) {
      setSelectedIps([])
    } else {
      setSelectedIps(filteredEntries.map(e => e.ip))
    }
  }

  const toggleSelectIp = (ip) => {
    if (selectedIps.includes(ip)) {
      setSelectedIps(prev => prev.filter(i => i !== ip))
    } else {
      setSelectedIps(prev => [...prev, ip])
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.ip.trim()) return
    setSubmitting(true)
    try {
      const res = await api.addUserBlacklist(form)
      setShowModal(false)
      setForm({ ip: '', reason: '', duration: '1d' })
      showToast(res?.message || `IP ${form.ip} has been blacklisted.`)
      fetchBlacklist(true)
    } catch (err) {
      showToast(err.message || 'Failed to block IP', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Country Block filter for blocked countries list
  const filteredCountryBlocks = useMemo(() => {
    if (!countrySearch) return countryBlocks
    const q = countrySearch.toLowerCase().trim()
    return countryBlocks.filter(b => {
      const code = (b.country_code || '').toLowerCase()
      const name = (b.country_name || '').toLowerCase()
      const reason = (b.reason || '').toLowerCase()
      return code.includes(q) || name.includes(q) || reason.includes(q)
    })
  }, [countryBlocks, countrySearch])

  // Helper to determine flag info for an IP address
  const getIpOriginInfo = (entry) => {
    const ip = String(entry.ip || '').trim()
    const code = (entry.country_code || entry.country || '').toLowerCase()
    if (code && code.length === 2) {
      return {
        flagUrl: `https://flagcdn.com/20x15/${code}.png`,
        name: entry.country_name || code.toUpperCase(),
        code: code.toUpperCase()
      }
    }
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      return {
        flagUrl: 'https://flagcdn.com/20x15/bd.png',
        name: 'Local Network / Proxy Ingress',
        code: 'BD'
      }
    }
    return {
      flagUrl: 'https://flagcdn.com/20x15/bd.png',
      name: 'Ingress Node',
      code: 'BD'
    }
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '16px 20px 48px', color: '#10201E' }}>
      
      {/* Toast Feedback Messages */}
      {feedbackMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          background: feedbackMsg.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${feedbackMsg.type === 'error' ? '#FECACA' : '#DCFCE7'}`,
          borderRadius: '12px',
          marginBottom: '20px',
          color: feedbackMsg.type === 'error' ? '#991B1B' : '#15803D',
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {feedbackMsg.type === 'error' ? (
            <AlertTriangle size={18} color="#DC2626" />
          ) : (
            <CheckCircle2 size={18} color="#15803D" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HEADER BANNER & UNIFIED DUAL NAVIGATION TABS                  */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9E1DC',
        borderRadius: '18px',
        padding: '24px 28px',
        marginBottom: '22px',
        boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-flex',
                padding: '3px 10px',
                background: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '800',
                border: '1px solid #FECACA',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.4px'
              }}>
                <Ban size={12} />
                <span>ANYCAST PERIMETER ENFORCEMENT</span>
              </span>
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#10201E', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              Access Control &amp; Threat Blacklist
            </h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13px', maxWidth: '780px', lineHeight: 1.5 }}>
              Enforce granular IP quarantine and sovereign country geo-fencing policies. Quarantined requests are dropped at edge nodes with sub-millisecond HTTP 403 enforcement.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Sync / Refresh Button */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'country') fetchCountryBlocks(true)
                else fetchBlacklist(true)
              }}
              disabled={refreshing}
              style={{
                padding: '9px 15px',
                borderRadius: '9px',
                background: '#FAFBF9',
                color: '#334155',
                border: '1px solid #D9E1DC',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {activeTab === 'ip' ? (
              <button
                type="button"
                onClick={() => {
                  setForm({ ip: '', reason: '', duration: '1d' })
                  setShowModal(true)
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                }}
              >
                <Plus size={14} />
                <span>Block IP Address</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById('country-block-form')
                  if (target) target.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9px',
                  background: '#10201E',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 32, 30, 0.25)'
                }}
              >
                <Plus size={14} />
                <span>Add Country Block</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Tab Switcher: 1. IP Blacklist | 2. Country Blacklist & Geo-Fencing */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: '#F1F5F3',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid #D9E1DC',
          width: 'fit-content',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('ip')}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'ip' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'ip' ? '#10201E' : '#64748B',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'ip' ? '0 1px 4px rgba(16, 32, 30, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Ban size={15} color={activeTab === 'ip' ? '#DC2626' : '#64748B'} />
            <span>IP Blacklist</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '999px',
              background: activeTab === 'ip' ? '#FEF2F2' : '#E2E8F0',
              color: activeTab === 'ip' ? '#DC2626' : '#64748B',
              fontWeight: '800'
            }}>
              {entries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('country')}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'country' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'country' ? '#10201E' : '#64748B',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'country' ? '0 1px 4px rgba(16, 32, 30, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={15} color={activeTab === 'country' ? '#E8792F' : '#64748B'} />
            <span>Country Blacklist &amp; Geo-Fencing</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '999px',
              background: activeTab === 'country' ? '#FEF3EB' : '#E2E8F0',
              color: activeTab === 'country' ? '#D97735' : '#64748B',
              fontWeight: '800'
            }}>
              {countryBlocks.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: IP BLACKLIST VIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'ip' && (
        <>
          {/* Quick Stats Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Blacklisted</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#10201E', marginTop: '2px' }}>{entries.length}</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Permanent Bans</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#DC2626', marginTop: '2px' }}>{permCount}</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Temporary Active</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#E8792F', marginTop: '2px' }}>{tempCount}</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D9E1DC', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#87948D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Auto-Shield Dropped</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#475569', marginTop: '2px' }}>{autoCount}</div>
            </div>
          </div>

          {/* Search, Filter Tabs & Bulk Actions */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#87948D' }} />
                <input
                  type="text"
                  placeholder="Search by IP or reason..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '12.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Filter duration pills */}
              <div style={{ display: 'flex', gap: '4px', background: '#F1F5F3', padding: '3px', borderRadius: '8px' }}>
                {[
                  { id: 'all', label: `All (${entries.length})` },
                  { id: 'permanent', label: `Permanent (${permCount})` },
                  { id: 'temporary', label: `Temporary (${tempCount})` },
                  { id: 'auto', label: `Auto-Shield (${autoCount})` },
                  { id: 'expired', label: `Expired (${expiredEntries.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterDuration(tab.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: filterDuration === tab.id ? '#FFFFFF' : 'transparent',
                      color: filterDuration === tab.id ? '#10201E' : '#64748B',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: filterDuration === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Selection Actions */}
            {selectedIps.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#10201E' }}>
                  {selectedIps.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handleBulkUnblock}
                  disabled={bulkUnblocking}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: bulkUnblocking ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Trash2 size={13} />
                  <span>{bulkUnblocking ? 'Unblocking...' : 'Unblock Selected'}</span>
                </button>
              </div>
            )}

            {expiredEntries.length > 0 && selectedIps.length === 0 && (
              <button
                type="button"
                onClick={handleFlushExpired}
                disabled={flushingExpired}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: flushingExpired ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Trash2 size={13} />
                <span>Flush {expiredEntries.length} Expired</span>
              </button>
            )}
          </div>

          {/* IP Blacklist Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    background: '#FAFBF9',
                    borderBottom: '1px solid #D9E1DC',
                    fontSize: '11px',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: '700'
                  }}>
                    <th style={{ padding: '14px 16px', width: '36px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                        title={selectedIps.length === filteredEntries.length ? 'Deselect all' : 'Select all'}
                      >
                        {filteredEntries.length > 0 && selectedIps.length === filteredEntries.length ? (
                          <CheckSquare size={16} color="#DC2626" />
                        ) : (
                          <Square size={16} color="#94A3B8" />
                        )}
                      </button>
                    </th>
                    <th style={{ padding: '14px 16px' }}>ORIGIN &amp; IP ADDRESS</th>
                    <th style={{ padding: '14px 16px' }}>REASON / TRIGGER</th>
                    <th style={{ padding: '14px 16px' }}>DURATION</th>
                    <th style={{ padding: '14px 16px' }}>EXPIRES AT</th>
                    <th style={{ padding: '14px 16px' }}>SOURCE</th>
                    <th style={{ padding: '14px 16px' }}>BLOCKED AT</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#64748B', padding: '60px 20px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: '600' }}>
                          <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', color: '#DC2626' }} />
                          <span>Loading Active Blacklist Entries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#F0FDF4',
                          border: '1px solid #DCFCE7',
                          color: '#15803D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px'
                        }}>
                          <ShieldCheck size={22} />
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                          No Blacklisted IPs Found
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#87948D', margin: '4px 0 0' }}>
                          {search || filterDuration !== 'all' ? 'Try adjusting your search query or duration filter.' : 'Your websites are secure. No IP addresses are currently blocked.'}
                        </p>
                      </td>
                    </tr>
                  ) : filteredEntries.map((entry, i) => {
                    const now = new Date()
                    const isSelected = selectedIps.includes(entry.ip)
                    const isExpired = entry.is_expired || (entry.expires_at && new Date(entry.expires_at) <= now)
                    const isPerm = !entry.expires_at || String(entry.type || entry.duration || '').toLowerCase() === 'permanent'
                    const origin = getIpOriginInfo(entry)

                    return (
                      <tr
                        key={entry.id || entry.ip || i}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#FEF3EB' : (isExpired ? '#FFFBFB' : '#FFFFFF'),
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleSelectIp(entry.ip)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                          >
                            {isSelected ? <CheckSquare size={16} color="#DC2626" /> : <Square size={16} color="#CBD5E1" />}
                          </button>
                        </td>

                        {/* Origin Flag & IP */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={origin.flagUrl}
                              alt={origin.code}
                              onError={(e) => { e.target.style.display = 'none' }}
                              style={{
                                width: '18px',
                                height: '13px',
                                borderRadius: '2px',
                                objectFit: 'cover',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                              title={origin.name}
                            />
                            <code style={{
                              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
                              fontSize: '13px',
                              fontWeight: '800',
                              color: '#10201E',
                              background: '#F1F5F9',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {entry.ip}
                            </code>
                            {isExpired && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FECACA'
                              }}>
                                EXPIRED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#87948D', marginTop: '3px', marginLeft: '26px' }}>
                            {origin.name}
                          </div>
                        </td>

                        {/* Reason */}
                        <td style={{ padding: '14px 16px', color: '#475569', fontSize: '12.5px', maxWidth: '280px' }}>
                          {entry.reason || 'Blocked by security policy'}
                        </td>

                        {/* Duration */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            background: isPerm ? '#FEF2F2' : '#F1F5F9',
                            color: isPerm ? '#DC2626' : '#475569',
                            border: `1px solid ${isPerm ? '#FECACA' : '#CBD5E1'}`
                          }}>
                            <Clock size={11} />
                            <span>{entry.duration || entry.type || (isPerm ? 'Permanent' : 'Temporary')}</span>
                          </span>
                        </td>

                        {/* Expires At */}
                        <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                          {isPerm ? (
                            <span style={{ color: '#87948D', fontWeight: '500' }}>Never (Permanent)</span>
                          ) : isExpired ? (
                            <span style={{ color: '#DC2626', fontWeight: '700' }}>Expired</span>
                          ) : (
                            <span style={{ color: '#15803D', fontWeight: '600' }}>{entry.expires_at}</span>
                          )}
                        </td>

                        {/* Source */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: entry.auto_blocked ? '#FEF3EB' : '#F0FDF4',
                            color: entry.auto_blocked ? '#D97735' : '#15803D',
                            border: `1px solid ${entry.auto_blocked ? '#FCD8BF' : '#DCFCE7'}`
                          }}>
                            {entry.auto_blocked ? 'Auto Shield' : 'Manual'}
                          </span>
                        </td>

                        {/* Blocked At */}
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                          {entry.blocked_at || entry.added_at || 'Recently'}
                        </td>

                        {/* Action */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleUnblock(entry.ip)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: '#FFFFFF',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#DC2626'
                              e.currentTarget.style.color = '#FFFFFF'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#FFFFFF'
                              e.currentTarget.style.color = '#DC2626'
                            }}
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: COUNTRY BLACKLIST & GEO-FENCING VIEW                           */}
      {/* ========================================================================= */}
      {activeTab === 'country' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Telemetry Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBF9 60%, #F5F9F6 100%)',
            border: '1px solid #D9E1DC',
            borderRadius: '16px',
            padding: '22px 26px',
            boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '18px'
          }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F0FDF4',
                  color: '#15803D',
                  border: '1px solid #DCFCE7',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  <span>EDGE GEO-FIREWALL ENFORCING</span>
                </span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                Sovereign Country-Level Perimeter Defense
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                Drop all HTTP/HTTPS ingress traffic originating from blocked nation states in <strong>&lt;0.10ms</strong> with an immediate <strong>403 Cyber Block Page</strong> at the Anycast edge, shielding your server bandwidth and application layers.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ background: '#FAFBF9', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: countryBlocks.length > 0 ? '#DC2626' : '#15803D' }}>
                  {countryBlocks.length}
                </div>
                <div style={{ fontSize: '10.5px', color: '#87948D', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>
                  Blocked Countries
                </div>
              </div>

              <div style={{ background: '#FAFBF9', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#10201E' }}>
                  &lt;0.10ms
                </div>
                <div style={{ fontSize: '10.5px', color: '#87948D', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>
                  Trie Lookup
                </div>
              </div>

              <div style={{ background: '#FAFBF9', border: '1px solid #D9E1DC', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#E8792F' }}>
                  250+
                </div>
                <div style={{ fontSize: '10.5px', color: '#87948D', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>
                  ISO Regions
                </div>
              </div>
            </div>
          </div>

          {/* Quick Threat Presets Ribbon */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={15} color="#DC2626" />
              <span style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.4px' }}>
                Popular Threat Origin Presets (1-Click Enforce):
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {POPULAR_THREAT_COUNTRIES.map(preset => {
                const isBlocked = blockedCodesSet.has(preset.code)
                return (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleQuickPresetToggle(preset)}
                    style={{
                      background: isBlocked ? '#FEF2F2' : '#FAFBF9',
                      border: isBlocked ? '1px solid #FECACA' : '1px solid #D9E1DC',
                      color: isBlocked ? '#DC2626' : '#10201E',
                      fontSize: '12px',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <img
                      src={getFlagUrl(preset.code, '20x15')}
                      alt={preset.code}
                      onError={(e) => { e.target.style.display = 'none' }}
                      style={{ width: '16px', height: '11px', borderRadius: '2px', objectFit: 'cover' }}
                    />
                    <span>{preset.name}</span>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: isBlocked ? '#DC2626' : '#E2E8F0',
                      color: isBlocked ? '#FFFFFF' : '#475569'
                    }}>
                      {isBlocked ? 'BLOCKED' : preset.code}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add Country Block Configuration Card */}
          <div
            id="country-block-form"
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '16px',
              padding: '24px 26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={17} color="#DC2626" />
                  <span>Enforce Country-Level Geo-Restriction Policy</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Select sovereign regions to drop immediately upon edge connection.
                </p>
              </div>

              {/* Region Filter Chips */}
              <div style={{ display: 'flex', gap: '4px', background: '#F1F5F3', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
                {['All', 'Asia', 'Europe', 'Americas', 'Middle East', 'Africa'].map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegion(reg)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: selectedRegion === reg ? '#FFFFFF' : 'transparent',
                      color: selectedRegion === reg ? '#10201E' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: selectedRegion === reg ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Inputs Grid */}
            <form onSubmit={handleAddCountryBlock} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr)) 180px', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Sovereign Country
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '9px',
                      border: '1px solid #D9E1DC',
                      background: '#FAFBF9',
                      color: '#10201E',
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '0 12px',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {ALL_COUNTRIES
                      .filter(c => selectedRegion === 'All' || c.region === selectedRegion)
                      .map((c) => {
                        const isBlocked = blockedCodesSet.has(c.code)
                        return (
                          <option key={c.code} value={c.code} disabled={isBlocked}>
                            {getFlagEmoji(c.code)} {c.name} ({c.code}) {isBlocked ? '— [ALREADY BLOCKED]' : ''}
                          </option>
                        )
                      })}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Firewall Policy Reason
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Hostile Port Probing, Malicious Bot Traffic"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '9px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    color: '#10201E',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '0 12px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={savingCountry || blockedCodesSet.has(selectedCountry)}
                style={{
                  height: '42px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: (savingCountry || blockedCodesSet.has(selectedCountry)) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                  opacity: blockedCodesSet.has(selectedCountry) ? 0.6 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {savingCountry ? (
                  <>
                    <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Enforcing...</span>
                  </>
                ) : (
                  <>
                    <Ban size={14} />
                    <span>Block Country</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Blocked Countries Console */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #D9E1DC',
            borderRadius: '16px',
            padding: '24px 26px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '800', color: '#10201E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} color="#10201E" />
                  <span>Active Sovereign Geo-Block Policies ({countryBlocks.length})</span>
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  All traffic from these regions is immediately dropped with HTTP 403 Forbidden.
                </p>
              </div>

              {/* View Mode & Search */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {countryBlocks.length > 0 && (
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#87948D' }} />
                    <input
                      type="text"
                      placeholder="Filter blocked..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        borderRadius: '8px',
                        border: '1px solid #D9E1DC',
                        background: '#FAFBF9',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', background: '#F1F5F3', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setGeoViewMode('cards')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: geoViewMode === 'cards' ? '#FFFFFF' : 'transparent',
                      color: geoViewMode === 'cards' ? '#10201E' : '#64748B',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: geoViewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoViewMode('table')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: geoViewMode === 'table' ? '#FFFFFF' : 'transparent',
                      color: geoViewMode === 'table' ? '#10201E' : '#64748B',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: geoViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    <List size={13} />
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {countryLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                <RotateCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#DC2626', marginBottom: '10px' }} />
                <div style={{ fontSize: '13.5px', fontWeight: '600' }}>Loading sovereign country blocks...</div>
              </div>
            ) : countryBlocks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: '#FAFBF9',
                borderRadius: '14px',
                border: '1px dashed #D9E1DC',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Globe size={24} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#10201E' }}>
                  Global Ingress Permitted
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5 }}>
                  Your websites currently accept clean traffic from all sovereign regions. Use the form above or click a threat preset to drop specific nations.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedCountry('CN'); setBlockReason('High Threat Defense (China)'); }}
                    style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    🇨🇳 Block China
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedCountry('RU'); setBlockReason('High Threat Defense (Russia)'); }}
                    style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #D9E1DC', background: '#FFFFFF', color: '#10201E', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    🇷🇺 Block Russia
                  </button>
                </div>
              </div>
            ) : (
              <>
                {geoViewMode === 'cards' ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '14px'
                  }}>
                    {filteredCountryBlocks.map((block) => {
                      const code = (block.country_code || '').toUpperCase().trim()
                      const cObj = ALL_COUNTRIES.find(c => c.code === code)
                      const displayName = cObj ? cObj.name : (block.country_name || code)
                      const flagUrl = getFlagUrl(code, '24x18')

                      return (
                        <div
                          key={block._id || code}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FECACA',
                            borderRadius: '14px',
                            padding: '16px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.04)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={flagUrl}
                                alt={code}
                                onError={(e) => { e.target.style.display = 'none' }}
                                style={{
                                  width: '28px',
                                  height: '20px',
                                  borderRadius: '3px',
                                  objectFit: 'cover',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                }}
                              />
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                                  {displayName}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
                                  <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '800', border: '1px solid #FECACA' }}>
                                    {code}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#87948D' }}>
                                    {cObj?.region || 'Global'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span style={{
                              background: '#DC2626',
                              color: '#FFFFFF',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              letterSpacing: '0.4px'
                            }}>
                              403 BLOCKED
                            </span>
                          </div>

                          <div style={{ background: '#FAFBF9', padding: '8px 10px', borderRadius: '8px', fontSize: '11.5px', color: '#475569', border: '1px solid #EAEFEA' }}>
                            <span style={{ fontWeight: '700', color: '#10201E' }}>Reason:</span> {block.reason || 'Sovereign Geo-Restriction Policy'}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#87948D' }}>
                              Enforced at edge
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveCountryBlock(code, displayName)}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#DC2626'
                                e.currentTarget.style.color = '#FFFFFF'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = '#FFFFFF'
                                e.currentTarget.style.color = '#DC2626'
                              }}
                            >
                              Unblock Country
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #D9E1DC', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#FAFBF9', borderBottom: '1px solid #D9E1DC', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
                          <th style={{ padding: '12px 16px' }}>SOVEREIGN REGION</th>
                          <th style={{ padding: '12px 16px' }}>ISO CODE</th>
                          <th style={{ padding: '12px 16px' }}>POLICY REASON</th>
                          <th style={{ padding: '12px 16px' }}>ENFORCEMENT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCountryBlocks.map((block) => {
                          const code = (block.country_code || '').toUpperCase().trim()
                          const cObj = ALL_COUNTRIES.find(c => c.code === code)
                          const displayName = cObj ? cObj.name : (block.country_name || code)
                          const flagUrl = getFlagUrl(code, '20x15')

                          return (
                            <tr key={block._id || code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <img
                                    src={flagUrl}
                                    alt={code}
                                    onError={(e) => { e.target.style.display = 'none' }}
                                    style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
                                  />
                                  <span style={{ fontWeight: '700', color: '#10201E' }}>{displayName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                                  {code}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12.5px' }}>
                                {block.reason || 'Sovereign Geo-Restriction Policy'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '800' }}>
                                  403 BLOCKED
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCountryBlock(code, displayName)}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Unblock
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD IP BLOCK MODAL                                                     */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 32, 30, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #D9E1DC',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ban size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#10201E' }}>
                  Block IP Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  IP Address (IPv4 / IPv6)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100"
                  value={form.ip}
                  onChange={e => setForm({ ...form, ip: e.target.value.trim() })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ban Duration
                </label>
                <select
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="1d">1 Day (Auto-Expires in 24 Hours)</option>
                  <option value="2d">2 Days (Auto-Expires in 48 Hours)</option>
                  <option value="7d">7 Days (1 Week Quarantine)</option>
                  <option value="30d">30 Days (1 Month Quarantine)</option>
                  <option value="permanent">Permanent Block (Manual Lift Only)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Reason / Threat Annotation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Repeated SQL injection & probe attempts"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D9E1DC',
                    background: '#FAFBF9',
                    fontSize: '13.5px',
                    color: '#10201E',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: '#FAFBF9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Applying Ban...' : 'Confirm Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

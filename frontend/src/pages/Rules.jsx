import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Zap,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Lock,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  XCircle,
  Flame,
  Database,
  Code,
  FolderGit2,
  Cloud,
  Bot,
  Layers,
  Globe2,
  Bug,
  RotateCw,
  SlidersHorizontal,
  X,
  Radio,
  FileCode,
  Eye,
  CheckSquare,
  AlertTriangle,
  Send,
  ArrowRight
} from 'lucide-react'
import api from '../api/api'
import { copyToClipboard } from '../utils/clipboard'

const CATEGORIES = [
  'All Categories',
  'SQL Injection',
  'XSS',
  'RCE & WebShells',
  'LFI / Path Traversal',
  'CMS Vulnerabilities',
  'Bots & Scanners',
  'SSRF & XXE'
]

const ITEMS_PER_PAGE = 25

export default function Rules({ token }) {
  // Main Navigation Tabs: 'patches', 'whitelists', 'evasion', 'core'
  const [activeTab, setActiveTab] = useState('patches')

  // Core Rules State
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedId, setCopiedId] = useState(null)

  // Virtual Patches State
  const [patches, setPatches] = useState([])
  const [loadingPatches, setLoadingPatches] = useState(false)
  const [showPatchModal, setShowPatchModal] = useState(false)
  const [patchForm, setPatchForm] = useState({
    cve_id: '',
    name: '',
    component: 'woocommerce',
    target_scope: 'all',
    pattern: '',
    action: 'block',
    severity: 'critical',
    is_active: true
  })
  const [publishingPatch, setPublishingPatch] = useState(false)

  // Whitelist Exceptions State
  const [whitelists, setWhitelists] = useState([])
  const [loadingWhitelists, setLoadingWhitelists] = useState(false)
  const [showWhitelistModal, setShowWhitelistModal] = useState(false)
  const [whitelistForm, setWhitelistForm] = useState({
    url_pattern: '',
    target_type: 'url',
    target_key: '',
    scope: 'global',
    reason: '',
    is_active: true
  })
  const [savingWhitelist, setSavingWhitelist] = useState(false)

  // Attack Evasion Lab State
  const [evasionPayload, setEvasionPayload] = useState("UNION SELECT 1,2,gcol,4,password FROM wp_users-- -")
  const [evasionUrl, setEvasionUrl] = useState("/wp-json/wp/v2/posts")
  const [evasionMethod, setEvasionMethod] = useState("POST")
  const [evasionLoading, setEvasionLoading] = useState(false)
  const [evasionResult, setEvasionResult] = useState(null)

  // Global Toast
  const [toastMessage, setToastMessage] = useState(null)
  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Load Data
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rulesRes, patchesRes, whitelistsRes] = await Promise.allSettled([
        api.getRules(),
        api.adminGetVirtualPatches(),
        api.adminGetWhitelists()
      ])

      if (rulesRes.status === 'fulfilled') {
        const raw = rulesRes.value
        setRules(Array.isArray(raw) ? raw : (raw?.rules || []))
      }

      if (patchesRes.status === 'fulfilled' && patchesRes.value?.data?.patches) {
        setPatches(patchesRes.value.data.patches)
      }

      if (whitelistsRes.status === 'fulfilled' && whitelistsRes.value?.data?.whitelists) {
        setWhitelists(whitelistsRes.value.data.whitelists)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingPatches(false)
      setLoadingWhitelists(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Virtual Patch Actions
  const handlePublishPatch = async (e) => {
    if (e) e.preventDefault()
    if (!patchForm.cve_id || !patchForm.pattern) {
      showToast('CVE ID and Regex Pattern are required', true)
      return
    }
    setPublishingPatch(true)
    try {
      await api.adminCreateVirtualPatch(patchForm)
      showToast(`Hot Patch ${patchForm.cve_id} published! Propagating to 500k sites via heartbeat.`)
      setShowPatchModal(false)
      setPatchForm({
        cve_id: '',
        name: '',
        component: 'core',
        target_scope: 'all',
        pattern: '',
        action: 'block',
        severity: 'critical',
        is_active: true
      })
      const res = await api.adminGetVirtualPatches()
      if (res?.data?.patches) setPatches(res.data.patches)
    } catch (err) {
      showToast(err.message || 'Failed to publish virtual patch', true)
    } finally {
      setPublishingPatch(false)
    }
  }

  const handleTogglePatch = async (patchId) => {
    try {
      await api.adminToggleVirtualPatch(patchId)
      setPatches(prev => prev.map(p => p._id === patchId ? { ...p, is_active: !p.is_active } : p))
      showToast('Virtual patch status updated across cluster')
    } catch (err) {
      showToast(err.message || 'Failed to toggle patch', true)
    }
  }

  const handleDeletePatch = async (patchId) => {
    if (!window.confirm('Delete this virtual patch from the global defense network?')) return
    try {
      await api.adminDeleteVirtualPatch(patchId)
      setPatches(prev => prev.filter(p => p._id !== patchId))
      showToast('Virtual patch removed from fleet')
    } catch (err) {
      showToast(err.message || 'Failed to delete patch', true)
    }
  }

  // Whitelist Actions
  const handleCreateWhitelist = async (e) => {
    if (e) e.preventDefault()
    if (!whitelistForm.url_pattern) {
      showToast('URL Pattern is required', true)
      return
    }
    setSavingWhitelist(true)
    try {
      await api.adminCreateWhitelist(whitelistForm)
      showToast('False Positive Whitelist rule created and synchronized globally.')
      setShowWhitelistModal(false)
      setWhitelistForm({
        url_pattern: '',
        target_type: 'url',
        target_key: '',
        scope: 'global',
        reason: '',
        is_active: true
      })
      const res = await api.adminGetWhitelists()
      if (res?.data?.whitelists) setWhitelists(res.data.whitelists)
    } catch (err) {
      showToast(err.message || 'Failed to create whitelist rule', true)
    } finally {
      setSavingWhitelist(false)
    }
  }

  const handleDeleteWhitelist = async (ruleId) => {
    if (!window.confirm('Remove this whitelist exception? Traffic matching this path will resume normal inspection.')) return
    try {
      await api.adminDeleteWhitelist(ruleId)
      setWhitelists(prev => prev.filter(w => w._id !== ruleId))
      showToast('Whitelist rule deleted.')
    } catch (err) {
      showToast(err.message || 'Failed to delete whitelist rule', true)
    }
  }

  // Evasion Test Action
  const handleRunEvasionTest = async () => {
    if (!evasionPayload) return
    setEvasionLoading(true)
    try {
      const res = await api.adminTestEvasion({
        payload: evasionPayload,
        url: evasionUrl,
        method: evasionMethod
      })
      setEvasionResult(res?.data || null)
    } catch (err) {
      showToast(err.message || 'Evasion simulation failed', true)
    } finally {
      setEvasionLoading(false)
    }
  }

  // 1-Click Convert Evasion to Hot Patch
  const handleDeployEvasionHotPatch = (suggested) => {
    if (!suggested) return
    setPatchForm({
      cve_id: suggested.cve_id,
      name: suggested.name,
      component: suggested.component,
      target_scope: 'all',
      pattern: suggested.pattern,
      action: 'block',
      severity: 'critical',
      is_active: true
    })
    setActiveTab('patches')
    setShowPatchModal(true)
  }

  // Copy helper
  const handleCopy = (id, text) => {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Filter Core Rules
  const getRuleCategory = (rule) => {
    if (rule.category) return rule.category
    const name = (rule.name || '').toLowerCase()
    const pattern = (rule.pattern || '').toLowerCase()
    if (name.includes('sql') || pattern.includes('select') || pattern.includes('union')) return 'SQL Injection'
    if (name.includes('xss') || pattern.includes('script') || pattern.includes('onload')) return 'XSS'
    if (name.includes('rce') || name.includes('exec') || pattern.includes('eval')) return 'RCE & WebShells'
    if (name.includes('lfi') || name.includes('traversal') || pattern.includes('..')) return 'LFI / Path Traversal'
    if (name.includes('cms') || name.includes('wp-') || pattern.includes('plugin')) return 'CMS Vulnerabilities'
    if (name.includes('bot') || name.includes('crawler') || name.includes('scanner')) return 'Bots & Scanners'
    if (name.includes('ssrf') || name.includes('xxe') || pattern.includes('169.254')) return 'SSRF & XXE'
    return 'Core Signature'
  }

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const cat = getRuleCategory(rule)
      const matchesSearch = searchQuery === '' ||
        (rule.name && rule.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rule.pattern && rule.pattern.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = categoryFilter === 'All Categories' || cat === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [rules, searchQuery, categoryFilter])

  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE) || 1
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRules.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRules, currentPage])

  return (
    <div style={{ padding: '4px 0 40px', maxWidth: '100%' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: toastMessage.isError ? '#DC2626' : '#0F172A',
          color: '#FFFFFF',
          padding: '13px 22px',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {toastMessage.isError ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} style={{ color: '#10B981' }} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Studio Header */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '22px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '19px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                Threat Defense, Virtual Patching & False Positive Studio
              </h1>
              <span style={{
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.4px'
              }}>
                500K FLEET ACTIVE
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '13.5px', margin: '4px 0 0' }}>
              Publish zero-day hot patches to 500k sites in &lt;60s without ML retraining. Manage False Positive URL whitelisting and test payload evasions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchAll}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWhitelistModal(true)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <CheckSquare size={14} style={{ color: '#059669' }} />
            <span>+ Whitelist Exception</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPatchModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#2563EB',
              border: '1px solid #1D4ED8',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Flame size={15} />
            <span>Publish Hot Patch</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '20px',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('patches')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'patches' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'patches' ? '#2563EB' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderBottom: activeTab === 'patches' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Flame size={15} />
          <span>Hot CVE Virtual Patches ({patches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whitelists')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'whitelists' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'whitelists' ? '#2563EB' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderBottom: activeTab === 'whitelists' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckSquare size={15} />
          <span>False Positive Whitelists ({whitelists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evasion')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'evasion' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'evasion' ? '#2563EB' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderBottom: activeTab === 'evasion' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Terminal size={15} />
          <span>Attack Evasion Lab & Rapid Blocker</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('core')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'core' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'core' ? '#2563EB' : '#64748B',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            borderBottom: activeTab === 'core' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Database size={15} />
          <span>2,000+ Core WAF Signatures</span>
        </button>
      </div>

      {/* TAB 1: HOT CVE VIRTUAL PATCHES */}
      {activeTab === 'patches' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Active Zero-Day Virtual Patches
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
                These signatures are pushed immediately to all 500,000 WordPress sites via heartbeat without retraining the 7.5M ML classifier.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPatchModal(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                color: '#2563EB',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>New CVE Patch</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>CVE / ID</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Vulnerability Description</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Component</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Scope</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Regex Pattern</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Fleet Blocks</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patches.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      No virtual patches published yet. Click "Publish Hot Patch" to deploy one.
                    </td>
                  </tr>
                ) : (
                  patches.map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#2563EB', fontSize: '13px' }}>
                        {p.cve_id}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '13.5px' }}>{p.name}</div>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Severity: {p.severity} | Action: {p.action}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>
                          {p.component || 'core'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                        {p.target_scope || 'all'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', maxWidth: '280px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.pattern}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p._id, p.pattern)}
                            title="Copy regex"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}
                          >
                            {copiedId === p._id ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '800', color: '#DC2626', fontSize: '13.5px' }}>
                        {p.hits_count || 0}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePatch(p._id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            border: 'none',
                            cursor: 'pointer',
                            background: p.is_active ? '#ECFDF5' : '#F1F5F9',
                            color: p.is_active ? '#059669' : '#64748B',
                            border: p.is_active ? '1px solid #A7F3D0' : '1px solid #CBD5E1'
                          }}
                        >
                          {p.is_active ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeletePatch(p._id)}
                          title="Delete patch"
                          style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} onMouseEnter={(e) => e.target.style.color = '#EF4444'} onMouseLeave={(e) => e.target.style.color = '#94A3B8'} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FALSE POSITIVE URL WHITELISTS */}
      {activeTab === 'whitelists' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                False Positive Whitelist Exceptions
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
                Bypass legitimate REST API callbacks, webhook notifications, and builder endpoints across the entire fleet or per domain.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWhitelistModal(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#059669',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Add Whitelist Rule</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>URL / Pattern</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Scope</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Target Type</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Reason / Description</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Requests Bypassed</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {whitelists.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      No whitelist exceptions defined yet.
                    </td>
                  </tr>
                ) : (
                  whitelists.map(w => (
                    <tr key={w._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>
                        {w.url_pattern}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: w.scope === 'global' ? '#EFF6FF' : '#F1F5F9',
                          color: w.scope === 'global' ? '#2563EB' : '#475569',
                          border: w.scope === 'global' ? '1px solid #DBEAFE' : '1px solid #E2E8F0',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {w.scope === 'global' ? 'GLOBAL FLEET' : 'TENANT ONLY'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#64748B', fontWeight: '600' }}>
                        {w.target_type || 'url'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#334155' }}>
                        {w.reason || 'Safe Exception'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '800', color: '#059669', fontSize: '13.5px' }}>
                        {w.hits_bypassed || 0}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteWhitelist(w._id)}
                          title="Delete whitelist rule"
                          style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTACK EVASION LAB & RAPID BLOCKER */}
      {activeTab === 'evasion' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px'
        }}>
          {/* Left Panel: Request Input */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
              <Terminal size={18} style={{ color: '#2563EB' }} />
              <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Evasion Payload Tester
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
              Test zero-day evasion strings or unblocked payloads against the hybrid pipeline (Heuristics + Regex + ML Classifier).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Method
                </label>
                <select
                  value={evasionMethod}
                  onChange={(e) => setEvasionMethod(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700' }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Target Path
                </label>
                <input
                  type="text"
                  value={evasionUrl}
                  onChange={(e) => setEvasionUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Raw HTTP Payload / Obfuscated Exploit String
              </label>
              <textarea
                rows={5}
                value={evasionPayload}
                onChange={(e) => setEvasionPayload(e.target.value)}
                placeholder="Enter suspicious query, SQL injection, script tag, or webshell payload..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleRunEvasionTest}
              disabled={evasionLoading || !evasionPayload}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                background: '#2563EB',
                border: '1px solid #1D4ED8',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: evasionLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Play size={15} className={evasionLoading ? 'animate-spin' : ''} />
              <span>{evasionLoading ? 'Simulating Inspection...' : 'Run Evasion Inspection'}</span>
            </button>
          </div>

          {/* Right Panel: Diagnostics & 1-Click Hot Patch Proposal */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Inspection Diagnostics & Pipeline Breakdown
                </h2>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Deterministic &amp; ML</span>
              </div>

              {!evasionResult ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                  <Bug size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Click "Run Evasion Inspection" to evaluate the payload against the live cluster engine.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Verdict Banner */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: evasionResult.decision === 'BLOCK' ? '#FEF2F2' : '#ECFDF5',
                    border: evasionResult.decision === 'BLOCK' ? '1px solid #FECACA' : '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {evasionResult.decision === 'BLOCK' ? (
                        <ShieldAlert size={20} style={{ color: '#DC2626' }} />
                      ) : (
                        <CheckCircle2 size={20} style={{ color: '#059669' }} />
                      )}
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: evasionResult.decision === 'BLOCK' ? '#991B1B' : '#065F46' }}>
                          DECISION: {evasionResult.decision}
                        </span>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          Trigger: {evasionResult.rule_matched || 'Allowed (No Violation)'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#64748B' }}>
                      {evasionResult.latency_ms} ms
                    </span>
                  </div>

                  {/* ML Probability Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                      <span style={{ color: '#475569' }}>Cloud ML Threat Probability:</span>
                      <span style={{ color: evasionResult.ml_threat_probability >= 0.6 ? '#DC2626' : '#059669', fontWeight: '800' }}>
                        {(evasionResult.ml_threat_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, evasionResult.ml_threat_probability * 100)}%`,
                        height: '100%',
                        background: evasionResult.ml_threat_probability >= 0.6 ? '#DC2626' : '#059669',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* 1-Click Hot Patch Proposal */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    marginTop: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A' }}>
                        Proposed Fleet Hot Patch Signature:
                      </span>
                      <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: '700' }}>
                        {evasionResult.suggested_hot_patch?.cve_id}
                      </span>
                    </div>
                    <code style={{ display: 'block', fontSize: '11.5px', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '6px 8px', borderRadius: '4px', marginBottom: '10px', wordBreak: 'break-all' }}>
                      {evasionResult.suggested_hot_patch?.pattern}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleDeployEvasionHotPatch(evasionResult.suggested_hot_patch)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        background: '#DC2626',
                        border: '1px solid #B91C1C',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Flame size={13} />
                      <span>1-Click Deploy Fleet Hot Patch</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
              <Shield size={14} />
              <span>Simulated against active 2,000 DFA batches and SGD ML weights without altering live traffic.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 2,000+ CORE WAF SIGNATURE ENGINE */}
      {activeTab === 'core' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          {/* Filter Bar */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search across 2,000+ batched signatures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: '600',
                background: '#FFFFFF'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Rule ID</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Signature Title</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Regular Expression</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Severity</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRules.map((rule, idx) => (
                  <tr key={rule.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '12px', color: '#64748B' }}>
                      #{rule.id || idx + 1}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>
                      {rule.name}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                        {getRuleCategory(rule)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E2E8F0', maxWidth: '320px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rule.pattern}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(rule.id, rule.pattern)}
                          title="Copy regex"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                        >
                          {copiedId === rule.id ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: rule.severity === 'critical' ? '#FEF2F2' : '#F1F5F9',
                        color: rule.severity === 'critical' ? '#DC2626' : '#475569'
                      }}>
                        {(rule.severity || 'high').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: '12.5px', fontWeight: '700', color: '#DC2626' }}>
                      {(rule.action || 'block').toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Showing {paginatedRules.length} of {filteredRules.length} signatures
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PUBLISH HOT VIRTUAL PATCH */}
      {showPatchModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Flame size={18} style={{ color: '#DC2626' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                  Publish Hot CVE Virtual Patch
                </h3>
              </div>
              <button type="button" onClick={() => setShowPatchModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublishPatch} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    CVE ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CVE-2026-4421"
                    value={patchForm.cve_id}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, cve_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Affected Component
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. woocommerce / elementor"
                    value={patchForm.component}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, component: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Vulnerability / Patch Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unauthenticated Arbitrary File Upload in Plugin"
                  value={patchForm.name}
                  onChange={(e) => setPatchForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Target Scope
                  </label>
                  <select
                    value={patchForm.target_scope}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, target_scope: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="all">Entire Request (URL + Body + Query)</option>
                    <option value="url">URL Path Only</option>
                    <option value="query">Query String Only</option>
                    <option value="post_body">POST Body Only</option>
                    <option value="headers">HTTP Headers Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    value={patchForm.severity}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, severity: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="critical">Critical (Immediate Block)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Regular Expression Pattern *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="(?i)(vulnerable_action.*malicious_param)"
                  value={patchForm.pattern}
                  onChange={(e) => setPatchForm(prev => ({ ...prev, pattern: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPatchModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishingPatch}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {publishingPatch ? 'Publishing...' : 'Publish to 500k Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD FALSE POSITIVE WHITELIST */}
      {showWhitelistModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <CheckSquare size={18} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                  Create False Positive Whitelist Rule
                </h3>
              </div>
              <button type="button" onClick={() => setShowWhitelistModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWhitelist} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  URL Pattern or Endpoint *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /wp-json/wc/v3/* or *stripe_webhook*"
                  value={whitelistForm.url_pattern}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, url_pattern: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                  Supports wildcards (*) for sub-paths or query strings.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Scope
                </label>
                <select
                  value={whitelistForm.scope}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, scope: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="global">Global (Applies to all 500,000 WordPress sites)</option>
                  <option value="tenant">Tenant Specific (Scoped to complaining user)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Reason / Support Ticket Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Legitimate payment IPN callback from WooCommerce Stripe"
                  value={whitelistForm.reason}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowWhitelistModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWhitelist}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#059669', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {savingWhitelist ? 'Saving...' : 'Add Whitelist Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

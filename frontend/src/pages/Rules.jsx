import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  ArrowRight,
  FlaskConical
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

  // Virtual Patches / Custom Attack Rules State
  const [patches, setPatches] = useState([])
  const [selectedPatches, setSelectedPatches] = useState([])
  const [loadingPatches, setLoadingPatches] = useState(false)
  const [showPatchModal, setShowPatchModal] = useState(false)
  const [patchForm, setPatchForm] = useState({
    rule_type: 'custom_rule', // 'custom_rule' | 'cve_patch'
    cve_id: '',
    name: '',
    category: 'SQL Injection',
    component: 'fleet-waf',
    target_scope: 'all',
    pattern: '',
    action: 'block',
    severity: 'critical',
    is_active: true
  })
  const [publishingPatch, setPublishingPatch] = useState(false)

  // Whitelist Exceptions State
  const [whitelists, setWhitelists] = useState([])
  const [selectedWhitelists, setSelectedWhitelists] = useState([])
  const [loadingWhitelists, setLoadingWhitelists] = useState(false)
  const [showWhitelistModal, setShowWhitelistModal] = useState(false)
  const [whitelistForm, setWhitelistForm] = useState({
    url_pattern: '',
    target_type: 'url',
    target_key: '',
    scope: 'global',
    user_email: '',
    domain: '',
    reason: '',
    is_active: true
  })
  const [savingWhitelist, setSavingWhitelist] = useState(false)

  // Global Toast
  const [toastMessage, setToastMessage] = useState(null)
  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // ID normalization helpers for robust selection
  const getPatchId = (p) => String(p?._id || p?.id || '')
  const getWhitelistId = (w) => String(w?._id || w?.id || '')

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

  // Virtual Patch / Custom Rule Actions
  const handlePublishPatch = async (e) => {
    if (e) e.preventDefault()
    if (!patchForm.cve_id || !patchForm.pattern) {
      showToast('Rule Identifier and Regex Pattern are required', true)
      return
    }
    setPublishingPatch(true)
    try {
      await api.adminCreateVirtualPatch(patchForm)
      showToast(patchForm.rule_type === 'custom_rule'
        ? `Fleet Attack Rule ${patchForm.cve_id} deployed across all connected sites!`
        : `Hot CVE Virtual Patch ${patchForm.cve_id} published across global fleet!`)
      setShowPatchModal(false)
      setPatchForm({
        rule_type: 'custom_rule',
        cve_id: '',
        name: '',
        category: 'SQL Injection',
        component: 'fleet-waf',
        target_scope: 'all',
        pattern: '',
        action: 'block',
        severity: 'critical',
        is_active: true
      })
      const res = await api.adminGetVirtualPatches()
      if (res?.data?.patches) setPatches(res.data.patches)
    } catch (err) {
      showToast(err.message || 'Failed to publish rule/patch', true)
    } finally {
      setPublishingPatch(false)
    }
  }

  const handleTogglePatch = async (patchId) => {
    try {
      await api.adminToggleVirtualPatch(patchId)
      setPatches(prev => prev.map(p => getPatchId(p) === String(patchId) ? { ...p, is_active: !p.is_active } : p))
      showToast('Rule enforcement status updated across cluster')
    } catch (err) {
      showToast(err.message || 'Failed to toggle patch', true)
    }
  }

  const handleDeletePatch = async (patchId) => {
    if (!window.confirm('Delete this defense rule/patch from the global network?')) return
    try {
      await api.adminDeleteVirtualPatch(patchId)
      setPatches(prev => prev.filter(p => getPatchId(p) !== String(patchId)))
      setSelectedPatches(prev => prev.filter(x => x !== String(patchId)))
      showToast('Rule removed from fleet')
    } catch (err) {
      showToast(err.message || 'Failed to delete patch', true)
    }
  }

  // Bulk Patch Handlers (Rock-Solid String-based Toggle)
  const isAllPatchesSelected = patches.length > 0 && selectedPatches.length === patches.length

  const handleToggleSelectAllPatches = () => {
    if (isAllPatchesSelected) {
      setSelectedPatches([])
    } else {
      setSelectedPatches(patches.map(p => getPatchId(p)).filter(Boolean))
    }
  }

  const handleTogglePatchSelect = (id, e) => {
    if (e) e.stopPropagation()
    const strId = String(id || '')
    if (!strId) return
    setSelectedPatches(prev =>
      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
    )
  }

  const handleBulkTogglePatches = async (makeActive) => {
    if (selectedPatches.length === 0) return
    try {
      await Promise.all(selectedPatches.map(id => api.adminToggleVirtualPatch(id)))
      setPatches(prev => prev.map(p => selectedPatches.includes(getPatchId(p)) ? { ...p, is_active: makeActive } : p))
      showToast(`Updated ${selectedPatches.length} rules across fleet`)
      setSelectedPatches([])
    } catch (err) {
      showToast(err.message || 'Failed bulk update', true)
    }
  }

  const handleBulkDeletePatches = async () => {
    if (selectedPatches.length === 0) return
    if (!window.confirm(`Permanently delete ${selectedPatches.length} selected rules from fleet?`)) return
    try {
      await Promise.all(selectedPatches.map(id => api.adminDeleteVirtualPatch(id)))
      setPatches(prev => prev.filter(p => !selectedPatches.includes(getPatchId(p))))
      showToast(`Deleted ${selectedPatches.length} rules`)
      setSelectedPatches([])
    } catch (err) {
      showToast(err.message || 'Failed bulk delete', true)
    }
  }

  // Bulk Whitelist Handlers (Rock-Solid String-based Toggle)
  const isAllWhitelistsSelected = whitelists.length > 0 && selectedWhitelists.length === whitelists.length

  const handleToggleSelectAllWhitelists = () => {
    if (isAllWhitelistsSelected) {
      setSelectedWhitelists([])
    } else {
      setSelectedWhitelists(whitelists.map(w => getWhitelistId(w)).filter(Boolean))
    }
  }

  const handleToggleWhitelistSelect = (id, e) => {
    if (e) e.stopPropagation()
    const strId = String(id || '')
    if (!strId) return
    setSelectedWhitelists(prev =>
      prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]
    )
  }

  const handleBulkDeleteWhitelists = async () => {
    if (selectedWhitelists.length === 0) return
    if (!window.confirm(`Permanently remove ${selectedWhitelists.length} selected whitelist rules?`)) return
    try {
      await Promise.all(selectedWhitelists.map(id => api.adminDeleteWhitelist(id)))
      setWhitelists(prev => prev.filter(w => !selectedWhitelists.includes(getWhitelistId(w))))
      showToast(`Deleted ${selectedWhitelists.length} whitelist exceptions`)
      setSelectedWhitelists([])
    } catch (err) {
      showToast(err.message || 'Failed bulk delete', true)
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
        user_email: '',
        domain: '',
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
      setWhitelists(prev => prev.filter(w => getWhitelistId(w) !== String(ruleId)))
      setSelectedWhitelists(prev => prev.filter(x => x !== String(ruleId)))
      showToast('Whitelist rule deleted.')
    } catch (err) {
      showToast(err.message || 'Failed to delete whitelist rule', true)
    }
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
                GLOBAL FLEET ACTIVE
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '13.5px', margin: '4px 0 0' }}>
              Publish zero-day hot patches across all connected sites in &lt;60s without ML retraining. Manage False Positive URL whitelisting and test payload evasions.
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

          <Link
            to="/admin/learning"
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#FAF5FF',
              border: '1px solid #E9D5FF',
              color: '#7C3AED',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              textDecoration: 'none'
            }}
          >
            <FlaskConical size={15} />
            <span>Test Payloads in Evasion Lab ↗</span>
          </Link>

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
            <Plus size={15} />
            <span>+ Add Blocking Rule</span>
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
          <ShieldAlert size={15} />
          <span>Firewall Rules &amp; Virtual Patches ({patches.length})</span>
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
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9E1DC', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={17} style={{ color: '#2563EB' }} />
                <span>Active Fleet Blocking Rules &amp; Virtual Patches</span>
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
                Fleet-wide attack signatures and virtual patches protecting all connected sites against zero-days and bypasses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPatchForm({
                  rule_type: 'custom_rule',
                  cve_id: `RULE-ATTACK-${Math.floor(1000 + Math.random() * 9000)}`,
                  name: '',
                  category: 'SQL Injection',
                  component: 'fleet-waf',
                  target_scope: 'all',
                  pattern: '',
                  action: 'block',
                  severity: 'critical',
                  is_active: true
                })
                setShowPatchModal(true)
              }}
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
              <span>+ Add Blocking Rule</span>
            </button>
          </div>

          {/* BULK ACTION BAR */}
          {selectedPatches.length > 0 && (
            <div style={{
              background: '#EFF6FF',
              borderBottom: '1px solid #DBEAFE',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: '700' }}>
                <CheckSquare size={16} />
                <span>{selectedPatches.length} Rules Selected</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleBulkTogglePatches(true)}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Activate Selected
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkTogglePatches(false)}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Pause Selected
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeletePatches}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                  <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllPatchesSelected}
                      onChange={handleToggleSelectAllPatches}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                  <th style={{ padding: '14px 16px' }}>RULE / CVE ID</th>
                  <th style={{ padding: '14px 16px' }}>DESCRIPTION</th>
                  <th style={{ padding: '14px 16px' }}>COMPONENT</th>
                  <th style={{ padding: '14px 16px' }}>SCOPE</th>
                  <th style={{ padding: '14px 16px' }}>REGEX PATTERN</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>BLOCKS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {patches.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
                      <ShieldAlert size={28} style={{ margin: '0 auto 8px', color: '#94A3B8', display: 'block' }} />
                      <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '14px' }}>No custom rules or virtual patches deployed</div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>Click "+ Add Blocking Rule" to deploy an attack blocking signature across all sites.</p>
                    </td>
                  </tr>
                ) : (
                  patches.map(p => {
                    const patchId = getPatchId(p)
                    const isSelected = selectedPatches.includes(patchId)
                    const isCve = String(p.cve_id || '').toUpperCase().startsWith('CVE-')
                    return (
                      <tr
                        key={patchId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#FAFBF9' : '#FFFFFF',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? '#FAFBF9' : '#FFFFFF' }}
                      >
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleTogglePatchSelect(patchId, e)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isCve ? '#FEF3C7' : '#EFF6FF',
                            border: isCve ? '1px solid #FDE68A' : '1px solid #DBEAFE',
                            color: isCve ? '#92400E' : '#1D4ED8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '11.5px',
                            fontWeight: '700'
                          }}>
                            {isCve ? <Bug size={12} /> : <ShieldAlert size={12} />}
                            <span>{p.cve_id}</span>
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '12.5px' }}>{p.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#60716B' }}>
                            <span>Category: <strong>{p.category || (isCve ? 'Virtual Patch' : 'Attack Rule')}</strong></span>
                            <span>&bull;</span>
                            <span>Severity: <strong style={{ color: p.severity === 'critical' ? '#DC2626' : '#D97706', textTransform: 'capitalize' }}>{p.severity || 'critical'}</strong></span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                            {p.component || 'fleet-waf'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '11.5px', color: '#60716B', fontWeight: '600' }}>
                          {p.target_scope === 'all' ? 'Entire Request' : p.target_scope}
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', maxWidth: '260px' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.pattern}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(patchId, p.pattern)}
                              title="Copy regex"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}
                            >
                              {copiedId === patchId ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '800'
                          }}>
                            {p.hits_count || 0}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleTogglePatch(patchId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: '700',
                              border: p.is_active ? '1px solid #D9E1DC' : '1px solid #E2E8F0',
                              cursor: 'pointer',
                              background: p.is_active ? '#E8EEE8' : '#FAFBF9',
                              color: p.is_active ? '#0B2522' : '#64748B'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.is_active ? '#0B2522' : '#94A3B8' }} />
                            <span>{p.is_active ? 'ACTIVE' : 'PAUSED'}</span>
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleDeletePatch(patchId)}
                            title="Delete rule"
                            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
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

          {/* BULK WHITELIST ACTION BAR */}
          {selectedWhitelists.length > 0 && (
            <div style={{
              background: '#EFF6FF',
              borderBottom: '1px solid #DBEAFE',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: '700' }}>
                <CheckSquare size={16} />
                <span>{selectedWhitelists.length} Whitelist Rules Selected</span>
              </div>
              <button
                type="button"
                onClick={handleBulkDeleteWhitelists}
                style={{ padding: '5px 12px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Delete Selected
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FBFCFA', borderBottom: '1px solid #D9E1DC', color: '#60716B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                  <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllWhitelistsSelected}
                      onChange={handleToggleSelectAllWhitelists}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                  <th style={{ padding: '14px 16px' }}>URL / PATTERN</th>
                  <th style={{ padding: '14px 16px' }}>SCOPE</th>
                  <th style={{ padding: '14px 16px' }}>TARGET TYPE</th>
                  <th style={{ padding: '14px 16px' }}>REASON / DESCRIPTION</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>REQUESTS BYPASSED</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {whitelists.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
                      <CheckSquare size={28} style={{ margin: '0 auto 8px', color: '#94A3B8', display: 'block' }} />
                      <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '14px' }}>No whitelist exceptions defined yet</div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>Add safe paths, webhook endpoints, or user-specific URLs to bypass 403 blocks.</p>
                    </td>
                  </tr>
                ) : (
                  whitelists.map(w => {
                    const whitelistId = getWhitelistId(w)
                    const isSelected = selectedWhitelists.includes(whitelistId)
                    return (
                      <tr
                        key={whitelistId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#FAFBF9' : '#FFFFFF',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? '#FAFBF9' : '#FFFFFF' }}
                      >
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleWhitelistSelect(whitelistId, e)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: '700',
                            color: '#0F172A',
                            fontSize: '12px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>
                            {w.url_pattern}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span style={{
                            background: w.scope === 'global' ? '#EFF6FF' : '#FEF3C7',
                            color: w.scope === 'global' ? '#2563EB' : '#B45309',
                            border: w.scope === 'global' ? '1px solid #DBEAFE' : '1px solid #FDE68A',
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'inline-block'
                          }}>
                            {w.scope === 'global' ? 'GLOBAL FLEET' : `TENANT: ${w.user_email || w.domain || 'Scoped'}`}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>
                          {w.target_type || 'url'}
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '12.5px', color: '#334155' }}>
                          {w.reason || 'Safe Exception'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#059669',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '800'
                          }}>
                            {w.hits_bypassed || 0}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteWhitelist(whitelistId)}
                            title="Delete whitelist rule"
                            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 2,000+ CORE WAF SIGNATURE ENGINE */}
      {activeTab === 'core' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #D9E1DC',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          {/* Filter Bar */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #D9E1DC',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search across 2,000+ batched signatures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  borderRadius: '6px',
                  border: '1px solid #D9E1DC',
                  fontSize: '12.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #D9E1DC',
                fontSize: '12.5px',
                fontWeight: '600',
                background: '#FFFFFF',
                color: '#10201E'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  background: '#FBFCFA',
                  borderBottom: '1px solid #D9E1DC',
                  color: '#60716B',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: '700'
                }}>
                  <th style={{ padding: '14px 16px' }}>Rule ID</th>
                  <th style={{ padding: '14px 16px' }}>Signature Title</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Regular Expression</th>
                  <th style={{ padding: '14px 16px' }}>Severity</th>
                  <th style={{ padding: '14px 16px' }}>Action</th>
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

      {/* MODAL 1: ADD BLOCKING RULE / VIRTUAL PATCH */}
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
            maxWidth: '580px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                {patchForm.rule_type === 'custom_rule' ? (
                  <ShieldAlert size={19} style={{ color: '#2563EB' }} />
                ) : (
                  <Bug size={19} style={{ color: '#D97706' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#0F172A' }}>
                    {patchForm.rule_type === 'custom_rule' ? 'Deploy Custom Attack Rule' : 'Deploy CVE Virtual Patch'}
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {patchForm.rule_type === 'custom_rule'
                      ? 'Block unhandled SQLi, XSS, Webshells, or zero-day bypass payloads across the fleet'
                      : 'Virtual patch protecting specific WordPress plugins or CMS vulnerabilities'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowPatchModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            {/* Rule Type Mode Selector */}
            <div style={{ display: 'flex', background: '#F8FAFC', padding: '6px 24px', borderBottom: '1px solid #E2E8F0', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPatchForm(prev => ({
                  ...prev,
                  rule_type: 'custom_rule',
                  cve_id: prev.cve_id.startsWith('CVE-') ? `RULE-ATTACK-${Math.floor(1000 + Math.random() * 9000)}` : prev.cve_id || `RULE-ATTACK-${Math.floor(1000 + Math.random() * 9000)}`,
                  component: 'fleet-waf'
                }))}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: patchForm.rule_type === 'custom_rule' ? '#93C5FD' : '#E2E8F0',
                  background: patchForm.rule_type === 'custom_rule' ? '#EFF6FF' : '#FFFFFF',
                  color: patchForm.rule_type === 'custom_rule' ? '#1D4ED8' : '#475569',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ShieldAlert size={14} />
                <span>Custom Attack Rule (SQLi, XSS, Shells)</span>
              </button>

              <button
                type="button"
                onClick={() => setPatchForm(prev => ({
                  ...prev,
                  rule_type: 'cve_patch',
                  cve_id: prev.cve_id.startsWith('RULE-') ? 'CVE-2024-' : prev.cve_id || 'CVE-2024-',
                  component: 'woocommerce'
                }))}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: patchForm.rule_type === 'cve_patch' ? '#FDE68A' : '#E2E8F0',
                  background: patchForm.rule_type === 'cve_patch' ? '#FEF3C7' : '#FFFFFF',
                  color: patchForm.rule_type === 'cve_patch' ? '#92400E' : '#475569',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Bug size={14} />
                <span>CVE Virtual Patch (Plugin Bug)</span>
              </button>
            </div>

            <form onSubmit={handlePublishPatch} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {patchForm.rule_type === 'custom_rule' ? 'Attack Rule Identifier *' : 'CVE Identifier (NVD / MITRE) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={patchForm.rule_type === 'custom_rule' ? "e.g. RULE-SQLI-01 or RULE-WEBSHELL" : "e.g. CVE-2024-25600"}
                    value={patchForm.cve_id}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, cve_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {patchForm.rule_type === 'custom_rule' ? 'Attack Category' : 'Affected Plugin / Component'}
                  </label>
                  {patchForm.rule_type === 'custom_rule' ? (
                    <select
                      value={patchForm.category}
                      onChange={(e) => setPatchForm(prev => ({ ...prev, category: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}
                    >
                      <option value="SQL Injection">SQL Injection</option>
                      <option value="XSS">XSS (Cross-Site Scripting)</option>
                      <option value="RCE & WebShells">RCE &amp; WebShells</option>
                      <option value="LFI / Path Traversal">LFI / Path Traversal</option>
                      <option value="CMS Vulnerabilities">CMS Vulnerabilities</option>
                      <option value="Bots & Scanners">Bots &amp; Scanners</option>
                      <option value="SSRF & XXE">SSRF &amp; XXE</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. woocommerce / elementor"
                      value={patchForm.component}
                      onChange={(e) => setPatchForm(prev => ({ ...prev, component: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  {patchForm.rule_type === 'custom_rule' ? 'Attack Description / Rule Title *' : 'Vulnerability / Patch Description *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={patchForm.rule_type === 'custom_rule' ? "e.g. Block Novel Union-Based SQL Injection Bypass" : "e.g. Unauthenticated Remote Code Execution in Bricks Builder"}
                  value={patchForm.name}
                  onChange={(e) => setPatchForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Target Request Scope
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
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Action &amp; Severity
                  </label>
                  <select
                    value={patchForm.severity}
                    onChange={(e) => setPatchForm(prev => ({ ...prev, severity: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="critical">Critical (Immediate 403 Block)</option>
                    <option value="high">High (403 Block)</option>
                    <option value="medium">Medium (Block &amp; Log)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  {patchForm.rule_type === 'custom_rule' ? 'Malicious Attack Regex Pattern *' : 'Vulnerability Exploit Signature Regex *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="(?i)(union.*select.*from|eval\(base64_decode)"
                  value={patchForm.pattern}
                  onChange={(e) => setPatchForm(prev => ({ ...prev, pattern: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPatchModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishingPatch}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: patchForm.rule_type === 'custom_rule' ? '#2563EB' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {publishingPatch ? 'Deploying...' : (patchForm.rule_type === 'custom_rule' ? 'Deploy Fleet Attack Rule' : 'Publish CVE Virtual Patch')}
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
                  <option value="global">Global (Applies to all connected websites)</option>
                  <option value="tenant">Tenant Specific (Target specific user email or website)</option>
                </select>
              </div>

              {whitelistForm.scope === 'tenant' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Target User Email or Website Domain *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. user@domain.com or mystore.com"
                    value={whitelistForm.tenant_target || ''}
                    onChange={(e) => setWhitelistForm(prev => ({
                      ...prev,
                      tenant_target: e.target.value,
                      user_email: e.target.value.includes('@') ? e.target.value.trim() : '',
                      domain: !e.target.value.includes('@') ? e.target.value.trim() : ''
                    }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    Enter customer email or site domain to isolate this whitelist only to their account.
                  </span>
                </div>
              )}

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

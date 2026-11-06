import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Users,
  Globe,
  ExternalLink,
  Sparkles,
  Info,
  Shield,
  Fingerprint,
  Database,
  ArrowRight
} from 'lucide-react'
import BulkHeader, { EmptyFleetState } from './BulkHeader'
import useBulkFleet from './useBulkFleet'
import api from '../../api/api'

export default function BulkBreachIntelligence() {
  const { wpWebsites, hasWebsites, selectedSiteId, activeWebsite } = useBulkFleet()

  const isAllTarget = !selectedSiteId || selectedSiteId === 'all'
  const activeTargetSite = useMemo(() => {
    if (isAllTarget) return activeWebsite || wpWebsites[0] || {}
    return wpWebsites.find(w => (w.id || w._id) === selectedSiteId) || activeWebsite || wpWebsites[0] || {}
  }, [selectedSiteId, isAllTarget, activeWebsite, wpWebsites])

  const targetSiteId = isAllTarget ? (wpWebsites[0]?.id || wpWebsites[0]?._id || '') : (activeTargetSite.id || activeTargetSite._id || '')

  // Tab State
  const [activeTab, setActiveTab] = useState('password') // 'password' | 'admins' | 'directory'

  // Password Checker State
  const [testPassword, setTestPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [passwordResult, setPasswordResult] = useState(null)

  // Fleet Admin Audit State
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [fleetAdmins, setFleetAdmins] = useState([])
  const [resettingUser, setResettingUser] = useState(null)

  // Global Breaches Directory State
  const [breachSearch, setBreachSearch] = useState('')
  const [breachesList, setBreachesList] = useState([])
  const [loadingBreaches, setLoadingBreaches] = useState(false)

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState(null)
  const showToast = (text, isError = false) => {
    setToastMsg({ text, isError })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Check Password against HIBP k-Anonymity
  const handleCheckPassword = async (pwdToCheck = null) => {
    const pwd = pwdToCheck !== null ? pwdToCheck : testPassword
    if (!pwd) {
      showToast('Please enter a password to test.', true)
      return
    }
    setCheckingPassword(true)
    setPasswordResult(null)
    try {
      const res = await api.checkPwnedPassword(pwd)
      const data = res?.data || res
      setPasswordResult(data)
    } catch (err) {
      console.error('Password breach check failed:', err)
      setPasswordResult({
        pwned: false,
        count: 0,
        risk: 'UNKNOWN',
        message: err?.message || 'Unable to contact HIBP server.'
      })
    } finally {
      setCheckingPassword(false)
    }
  }

  // Load Administrator Security Audit from Connected Sites
  const loadFleetAdmins = useCallback(async () => {
    if (!targetSiteId && !isAllTarget) return
    setLoadingAdmins(true)
    try {
      const siteParam = isAllTarget ? 'all' : targetSiteId
      const res = await api.getFleetAdminBreachStatus(siteParam)
      const results = res?.data?.results || []
      setFleetAdmins(results)
    } catch (err) {
      console.error('Failed to load fleet admin breach audit:', err)
      setFleetAdmins([])
    } finally {
      setLoadingAdmins(false)
    }
  }, [targetSiteId, isAllTarget])

  // Load Global Breaches Feed
  const loadBreaches = useCallback(async (query = '') => {
    setLoadingBreaches(true)
    try {
      const res = await api.getGlobalBreaches(query, 24)
      const list = res?.data?.breaches || []
      setBreachesList(list)
    } catch (err) {
      console.error('Failed to load global breaches:', err)
    } finally {
      setLoadingBreaches(false)
    }
  }, [])

  useEffect(() => {
    loadFleetAdmins()
  }, [loadFleetAdmins])

  useEffect(() => {
    loadBreaches()
  }, [loadBreaches])

  // Quick Preset Test
  const testPreset = (pwd) => {
    setTestPassword(pwd)
    handleCheckPassword(pwd)
  }

  // Force Password Reset for Admins
  const handleForceReset = async (siteId) => {
    setResettingUser(siteId)
    try {
      const res = await api.executePostHackAction(siteId, 'force_password_reset', { scope: 'admins' })
      const isSuccess = res?.status === 'success' || res?.success || res?.data?.results?.[0]?.success
      if (isSuccess) {
        showToast('Successfully enforced mandatory password reset for administrators.')
      } else {
        showToast('Failed to enforce password reset. Verify site connectivity.', true)
      }
      await loadFleetAdmins()
    } catch (err) {
      showToast(err?.message || 'Password reset request failed.', true)
    } finally {
      setResettingUser(null)
    }
  }

  // Password Strength Metrics
  const passwordMetrics = useMemo(() => {
    if (!testPassword) return { score: 0, label: 'Empty', color: '#94A3B8' }
    let score = 0
    if (testPassword.length >= 8) score += 1
    if (testPassword.length >= 14) score += 1
    if (/[A-Z]/.test(testPassword) && /[a-z]/.test(testPassword)) score += 1
    if (/[0-9]/.test(testPassword) && /[^A-Za-z0-9]/.test(testPassword)) score += 1

    if (score <= 1) return { score: 1, label: 'Weak Complexity', color: '#EF4444' }
    if (score === 2) return { score: 2, label: 'Moderate Complexity', color: '#F59E0B' }
    if (score === 3) return { score: 3, label: 'Good Complexity', color: '#0EA5E9' }
    return { score: 4, label: 'Hardened Entropy', color: '#10B981' }
  }, [testPassword])

  // Count total administrators discovered
  const totalDiscoveredAdmins = useMemo(() => {
    return fleetAdmins.reduce((acc, site) => acc + (site.admins?.length || 0), 0)
  }, [fleetAdmins])

  if (!hasWebsites && wpWebsites.length === 0) {
    return (
      <div style={{ background: '#F6F8F7', minHeight: '100vh', padding: '24px 32px' }}>
        <BulkHeader
          title="Breach Intelligence & HIBP"
          subtitle="Real-time cryptographic k-anonymity breach detection & dark web threat intelligence powered by Have I Been Pwned."
          icon={ShieldAlert}
          activeBadge="Security Center"
        />
        <EmptyFleetState />
      </div>
    )
  }

  return (
    <div style={{ background: '#F6F8F7', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '10px',
            background: toastMsg.isError ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13.5px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.25s ease'
          }}
        >
          {toastMsg.isError ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <BulkHeader
        title="Breach Intelligence & HIBP"
        subtitle="Real-time cryptographic k-anonymity breach detection & dark web threat intelligence powered by Have I Been Pwned."
        icon={ShieldAlert}
        activeBadge="Security Center"
      />

      {/* Telemetry Overview Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0D9488'
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
              Global Leaked Credentials
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              14.5 Billion+
            </div>
            <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 600, marginTop: '2px' }}>
              Indexed across 1,000+ breaches
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#EFF6FF',
              border: '1px solid #DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
              Monitored Administrators
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {loadingAdmins ? '...' : totalDiscoveredAdmins} {totalDiscoveredAdmins === 1 ? 'Admin' : 'Admins'}
            </div>
            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '2px' }}>
              {isAllTarget ? 'Across entire fleet' : (activeTargetSite.domain || 'Selected website')}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706'
            }}
          >
            <Fingerprint size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
              Zero-Exposure Privacy
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              k-Anonymity SHA-1
            </div>
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, marginTop: '2px' }}>
              Plaintext never sent to server
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '20px 22px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
              Breach Intelligence Feed
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              HIBP Cloud Synced
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              Live dark web threat radar
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '6px',
          marginBottom: '24px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: activeTab === 'password' ? '#0F172A' : 'transparent',
            color: activeTab === 'password' ? '#FFFFFF' : '#64748B'
          }}
        >
          <Key size={16} />
          <span>Password Breach Shield (Have I Been Pwned)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admins')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: activeTab === 'admins' ? '#0F172A' : 'transparent',
            color: activeTab === 'admins' ? '#FFFFFF' : '#64748B'
          }}
        >
          <Users size={16} />
          <span>Administrator Accounts Audit</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '999px',
              fontSize: '11px',
              background: activeTab === 'admins' ? '#334155' : '#F1F5F9',
              color: activeTab === 'admins' ? '#E2E8F0' : '#475569'
            }}
          >
            {totalDiscoveredAdmins}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: activeTab === 'directory' ? '#0F172A' : 'transparent',
            color: activeTab === 'directory' ? '#FFFFFF' : '#64748B'
          }}
        >
          <Globe size={16} />
          <span>Global Data Breaches Directory</span>
        </button>
      </div>

      {/* TAB 1: PASSWORD BREACH SHIELD */}
      {activeTab === 'password' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
          {/* Left Card: Input & Test */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px 28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  Cryptographic Password Breach Tester
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Direct k-Anonymity verification against Troy Hunt&apos;s Have I Been Pwned database.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, marginBottom: '18px' }}>
              Verify if an existing administrator password, master credential, or user secret has been leaked in global dark web dumps. <strong>Your plaintext password is never sent to the network</strong> (only the first 5 characters of its SHA-1 hash are queried).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCheckPassword()
              }}
              style={{ marginBottom: '16px' }}
            >
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Password to Test:
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Input Container with Embedded Eye Action Button */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="Enter password or credential to test..."
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '14px',
                      paddingRight: '44px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontFamily: showPassword ? 'inherit' : 'monospace',
                      color: '#0F172A',
                      outline: 'none',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#0D9488')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={checkingPassword}
                  style={{
                    height: '44px',
                    padding: '0 22px',
                    borderRadius: '8px',
                    background: checkingPassword ? '#94A3B8' : '#0D9488',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: checkingPassword ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                    transition: 'background 0.15s ease'
                  }}
                >
                  {checkingPassword ? (
                    <>
                      <RefreshCw size={15} className="waf-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      <span>Test Breach</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-Time Entropy & Complexity Bar */}
              {testPassword && (
                <div style={{ marginTop: '14px', padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                      Complexity Analysis:
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: passwordMetrics.color }}>
                      {passwordMetrics.label}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${passwordMetrics.score * 25}%`, height: '100%', background: passwordMetrics.color, transition: 'all 0.3s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: '#64748B' }}>
                    <span style={{ color: testPassword.length >= 12 ? '#059669' : '#94A3B8', fontWeight: 600 }}>
                      {testPassword.length >= 12 ? '✓' : '•'} 12+ chars ({testPassword.length})
                    </span>
                    <span style={{ color: /[A-Z]/.test(testPassword) && /[a-z]/.test(testPassword) ? '#059669' : '#94A3B8', fontWeight: 600 }}>
                      {/[A-Z]/.test(testPassword) && /[a-z]/.test(testPassword) ? '✓' : '•'} Mixed Case
                    </span>
                    <span style={{ color: /[0-9]/.test(testPassword) ? '#059669' : '#94A3B8', fontWeight: 600 }}>
                      {/[0-9]/.test(testPassword) ? '✓' : '•'} Numbers
                    </span>
                    <span style={{ color: /[^A-Za-z0-9]/.test(testPassword) ? '#059669' : '#94A3B8', fontWeight: 600 }}>
                      {/[^A-Za-z0-9]/.test(testPassword) ? '✓' : '•'} Symbols
                    </span>
                  </div>
                </div>
              )}
            </form>

            {/* Quick Test Benchmarks */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Security Testing Benchmarks:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => testPreset('password123')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                  <span>Known Dictionary Pattern</span>
                </button>
                <button
                  type="button"
                  onClick={() => testPreset('Admin@2024Corp!')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }}></span>
                  <span>Predictable Enterprise Schema</span>
                </button>
                <button
                  type="button"
                  onClick={() => testPreset('kX9#vM2$qZ7*wT8&pL5!')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span>High-Entropy Protected Secret</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Card: Result Box */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px 28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {passwordResult ? (
              passwordResult.pwned ? (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '12px',
                    padding: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#B91C1C', marginBottom: '10px' }}>
                    <AlertTriangle size={24} />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                      CRITICAL: COMPROMISED PASSWORD DETECTED
                    </h4>
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#991B1B', lineHeight: 1.6 }}>
                    This password was discovered in{' '}
                    <strong style={{ fontSize: '15px', color: '#7F1D1D' }}>
                      {Number(passwordResult.count).toLocaleString()}
                    </strong>{' '}
                    global dark web breaches and public data dumps!
                  </div>
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #FCA5A5',
                      fontSize: '12.5px',
                      color: '#450A0A'
                    }}
                  >
                    <strong>High Threat Risk:</strong> Automated credential stuffing bots continuously attempt this password on login gateways worldwide. Any administrator using this password should immediately reset credentials.
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#B91C1C', fontFamily: 'monospace' }}>
                    SHA-1 Prefix queried: {passwordResult.sha1_prefix}***** (Zero exposure k-Anonymity)
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '12px',
                    padding: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803D', marginBottom: '10px' }}>
                    <CheckCircle2 size={24} />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                      SAFE: NO COMPROMISED BREACHES DISCOVERED
                    </h4>
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#166534', lineHeight: 1.6 }}>
                    This password does <strong>not</strong> appear in any known global data breaches across the 14.5+ billion leaked credential database.
                  </div>
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      fontSize: '12.5px',
                      color: '#14532D'
                    }}
                  >
                    <strong>Security Status: Clean.</strong> It is safe to use this password for WordPress administrator or user accounts. Ensure you also enforce Two-Factor Authentication (2FA) for optimal defense.
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#15803D', fontFamily: 'monospace' }}>
                    SHA-1 Prefix queried: {passwordResult.sha1_prefix}***** (Zero exposure k-Anonymity)
                  </div>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: '#94A3B8'
                  }}
                >
                  <Fingerprint size={28} />
                </div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                  Awaiting Password Input
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', maxWidth: '340px', marginInline: 'auto' }}>
                  Type a password on the left or click one of the instant demonstration presets to inspect breach status.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADMINISTRATOR ACCOUNTS AUDIT */}
      {activeTab === 'admins' && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#0D9488' }} />
                <span>Connected WordPress Administrators Roster</span>
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Live privilege discovery across connected sites. Audit exposed emails on HIBP or enforce password resets.
              </p>
            </div>
            <button
              type="button"
              onClick={loadFleetAdmins}
              disabled={loadingAdmins}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: loadingAdmins ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingAdmins ? 'waf-spin' : ''} />
              <span>Refresh Roster</span>
            </button>
          </div>

          {loadingAdmins ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <RefreshCw size={24} className="waf-spin" style={{ margin: '0 auto 8px', color: '#0D9488' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Querying WordPress administrator accounts...</p>
            </div>
          ) : fleetAdmins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Users size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>No administrator data returned.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Verify your WordPress site is connected and online.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {fleetAdmins.map((site) => (
                <div
                  key={site.website_id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Site Header */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      padding: '12px 18px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={16} style={{ color: '#0D9488' }} />
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                        {site.domain}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: site.connected ? '#ECFDF5' : '#FEF2F2',
                          color: site.connected ? '#059669' : '#DC2626'
                        }}
                      >
                        {site.connected ? 'Online' : 'Unreachable'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleForceReset(site.website_id)}
                      disabled={resettingUser === site.website_id || !site.connected}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        color: '#B45309',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: resettingUser === site.website_id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Lock size={13} />
                      <span>{resettingUser === site.website_id ? 'Enforcing...' : 'Force Admin Password Reset'}</span>
                    </button>
                  </div>

                  {/* Admins Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
                          <th style={{ textAlign: 'left', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>Administrator</th>
                          <th style={{ textAlign: 'left', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>Email Address</th>
                          <th style={{ textAlign: 'center', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>2FA Status</th>
                          <th style={{ textAlign: 'center', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>Active Sessions</th>
                          <th style={{ textAlign: 'center', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>Risk Rating</th>
                          <th style={{ textAlign: 'right', padding: '12px 18px', color: '#64748B', fontWeight: 600 }}>External HIBP Audit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {site.admins && site.admins.length > 0 ? (
                          site.admins.map((adm, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0F172A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: '#0D9488',
                                      color: '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '12px'
                                    }}
                                  >
                                    {(adm.user_login || 'A')[0].toUpperCase()}
                                  </div>
                                  <span>{adm.user_login}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 18px', color: '#475569', fontFamily: 'monospace', fontSize: '12.5px' }}>
                                {adm.user_email || '—'}
                              </td>
                              <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: adm.has_2fa ? '#ECFDF5' : '#FEF3C7',
                                    color: adm.has_2fa ? '#059669' : '#D97706'
                                  }}
                                >
                                  {adm.has_2fa ? '✓ Protected' : '⚠ Missing 2FA'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                                {adm.active_sessions || 0}
                              </td>
                              <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: adm.risk_rating === 'HIGH' ? '#FEF2F2' : adm.risk_rating === 'MEDIUM' ? '#FEF3C7' : '#F1F5F9',
                                    color: adm.risk_rating === 'HIGH' ? '#DC2626' : adm.risk_rating === 'MEDIUM' ? '#D97706' : '#475569'
                                  }}
                                >
                                  {adm.risk_rating || 'LOW'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                {adm.user_email ? (
                                  <a
                                    href={`https://haveibeenpwned.com/account/${encodeURIComponent(adm.user_email)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      background: '#F0FDFA',
                                      border: '1px solid #CCFBF1',
                                      color: '#0D9488',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <span>Check on HIBP</span>
                                    <ExternalLink size={12} />
                                  </a>
                                ) : (
                                  <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                              No administrator accounts found on this WordPress site.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GLOBAL DATA BREACHES DIRECTORY */}
      {activeTab === 'directory' && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} style={{ color: '#0D9488' }} />
                <span>Global Dark Web Data Breaches Directory</span>
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Verified repository of 1,000+ public corporate data leaks indexed by Have I Been Pwned.
              </p>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
              <input
                type="text"
                value={breachSearch}
                onChange={(e) => {
                  setBreachSearch(e.target.value)
                  loadBreaches(e.target.value)
                }}
                placeholder="Search Adobe, Dropbox, LinkedIn..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px 0 34px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {loadingBreaches ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <RefreshCw size={24} className="waf-spin" style={{ margin: '0 auto 8px', color: '#0D9488' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Loading verified global breach directory...</p>
            </div>
          ) : breachesList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Search size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>No breaches matched your search.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Try searching for another service or clear the search query.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {breachesList.map((breach, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    background: '#FFFFFF',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                        {breach.Title || breach.Name}
                      </h4>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: '#FEF2F2',
                          color: '#B91C1C'
                        }}
                      >
                        {Number(breach.PwnCount || 0).toLocaleString()} leaked
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                      Domain: <strong style={{ color: '#334155' }}>{breach.Domain || 'Unknown'}</strong> &bull; Date:{' '}
                      <strong style={{ color: '#334155' }}>{breach.BreachDate || 'Unknown'}</strong>
                    </div>

                    {/* Data Classes Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                      {(breach.DataClasses || []).slice(0, 4).map((dc, dcIdx) => (
                        <span
                          key={dcIdx}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#475569'
                          }}
                        >
                          {dc}
                        </span>
                      ))}
                      {(breach.DataClasses || []).length > 4 && (
                        <span style={{ fontSize: '10.5px', color: '#94A3B8', alignSelf: 'center' }}>
                          +{breach.DataClasses.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: breach.IsVerified ? '#059669' : '#D97706', fontWeight: 700 }}>
                      {breach.IsVerified ? '✓ Verified Breach' : 'Unverified Report'}
                    </span>
                    {breach.Domain && (
                      <a
                        href={`https://${breach.Domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          color: '#0D9488',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        <span>Visit site</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


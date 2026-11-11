import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Building2,
  User,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Radio,
  Download,
  ExternalLink,
  CheckCircle2,
  Lock,
  LogOut,
  Sparkles,
  Server,
  Zap,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  KeyRound,
  Edit3
} from 'lucide-react';
import api from '../../api/api';
import userStore from '../../utils/userStore';
import copyToClipboard from '../../utils/clipboard';

const brandTokens = {
  deepForest: '#0B2522',
  deepForestHover: '#153B34',
  emeraldDark: '#081D1A',
  emeraldPrimary: '#28745D',
  emeraldHover: '#205E4B',
  emeraldLight: '#E8F3EC',
  emeraldBorder: '#CFE2D4',
  accentOrange: '#E8792F',
  accentOrangeHover: '#D26720',
  bodyBg: '#F7F6F1',
  cardBg: '#FFFFFF',
  cardBorder: '#D9E1DC',
  cardBorderHover: '#10201E',
  textHeading: '#10201E',
  textBody: '#4A5D5A',
  textMuted: '#7A8C89',
  pillBg: '#E8EEE8',
  shadowSm: '0 1px 3px rgba(11, 37, 34, 0.05)',
  shadowMd: '0 4px 14px rgba(11, 37, 34, 0.08)',
  shadowLg: '0 10px 25px rgba(11, 37, 34, 0.12)'
};

const personaOptions = [
  {
    id: 'agency',
    title: 'Digital Agency',
    description: 'I manage client WordPress websites and need consolidated fleet security with white-label client reports.',
    icon: Building2
  },
  {
    id: 'freelance',
    title: 'Freelance Webmaster',
    description: 'I build and safeguard client or personal WordPress projects with automated zero-touch security.',
    icon: User
  },
  {
    id: 'owner',
    title: 'Website & Business Owner',
    description: 'I own personal, business, or e-commerce websites and want enterprise-grade protection for my web assets.',
    icon: ShoppingBag
  },
  {
    id: 'enterprise',
    title: 'Enterprise IT & SecOps',
    description: 'In-house corporate security team managing mission-critical infrastructure, custom WAF rules, and compliance.',
    icon: ShieldCheck
  }
];

const fleetSizeOptions = [
  '1 - 3 Websites',
  '4 - 10 Websites',
  '11 - 50 Websites',
  '50+ Enterprise Fleet'
];

const referralOptions = [
  'Search Engine (Google, Bing)',
  'YouTube',
  'Social Media (Facebook, LinkedIn, X)',
  'AI Assistant (ChatGPT, Gemini, Copilot)',
  'Cybersecurity Community / Forum',
  'Friend / Colleague Referral',
  'Other'
];

export default function UserOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1); // 1 = Workspace, 2 = Origin Connect
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasVisitedStep2, setHasVisitedStep2] = useState(false);

  // Step 1 Form State
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('owner');
  const [fleetSize, setFleetSize] = useState('');
  const [referralSource, setReferralSource] = useState('');

  // Step 2 Polling & Connection Detection State
  const [pollingActive, setPollingActive] = useState(true);
  const [connectedSite, setConnectedSite] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const pollTimerRef = useRef(null);

  // Initialize and load user state
  useEffect(() => {
    let isMounted = true;
    api.getProfile()
      .then(profile => {
        if (!isMounted) return;
        setUserProfile(profile);
        setApiKey(profile.api_key || localStorage.getItem('mdefender_api_key') || '');
        
        const existingName = profile.name || profile.full_name || '';
        setFullName(existingName);
        
        const firstName = existingName ? existingName.split(' ')[0] : 'Security';
        setWorkspaceName(profile.workspace_name || `${firstName}'s Workspace`);
        
        if (profile.organization_type) setSelectedPersona(profile.organization_type);
        if (profile.fleet_size) setFleetSize(profile.fleet_size);
        if (profile.referral_source) setReferralSource(profile.referral_source);

        // If user already completed step 1 earlier, advance to step 2
        if (profile.onboarding_step === 'connect' || profile.websites?.length > 0) {
          setCurrentStep(2);
          setHasVisitedStep2(true);
        }
      })
      .catch(err => {
        console.error('Failed to load user profile for onboarding:', err);
      });

    return () => { isMounted = false; };
  }, []);

  // Step 2 Live Origin Handshake Polling
  useEffect(() => {
    if (currentStep !== 2 || !pollingActive) return;

    const checkOriginConnection = async () => {
      try {
        const res = await api.getOnboardingStatus();
        if (res && res.status === 'success') {
          if (res.api_key && !apiKey) setApiKey(res.api_key);
          if (res.websites_count > 0 && res.first_site) {
            setPollingActive(false);
            setConnectedSite(res.first_site);
            
            // Mark onboarded and cache website count in user store and localStorage
            localStorage.setItem('mdefender_onboard_passed', 'true');
            const cached = userStore.get('profile') || {};
            const updated = {
              ...cached,
              onboarded: true,
              websites_count: res.websites_count || 1,
              websites: (cached.websites && cached.websites.length) ? cached.websites : [res.first_site]
            };
            userStore.set('profile', updated);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('mdefender_user_update'));
            }

            // Start smooth 2-second countdown before transitioning to dashboard
            setRedirectCountdown(2);
          }
        }
      } catch (err) {
        // Silent catch during periodic polling
      }
    };

    // Immediate check
    checkOriginConnection();

    // Poll every 3 seconds
    pollTimerRef.current = setInterval(checkOriginConnection, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [currentStep, pollingActive, apiKey]);

  // Handle countdown redirection
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      localStorage.setItem('mdefender_onboard_passed', 'true');
      const cached = userStore.get('profile') || {};
      userStore.set('profile', {
        ...cached,
        onboarded: true,
        websites_count: cached.websites_count || 1
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mdefender_user_update'));
      }
      navigate('/user/dashboard', { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate]);

  const handleCopyApiKey = async () => {
    if (!apiKey) return;
    const ok = await copyToClipboard(apiKey);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!workspaceName.trim()) {
      setErrorMsg('Please specify a valid name for your SecOps workspace.');
      return;
    }

    if (!selectedPersona) {
      setErrorMsg('Please select what describes your security operations best.');
      return;
    }

    if (!fleetSize || fleetSize.trim() === '') {
      setErrorMsg('Please select how many websites you manage.');
      return;
    }

    if (!referralSource || referralSource.trim() === '') {
      setErrorMsg('Please select how you discovered Mdefender Pro.');
      return;
    }

    setLoading(true);
    try {
      await api.saveOnboardingSetup({
        name: fullName.trim(),
        workspace_name: workspaceName.trim(),
        organization_type: selectedPersona,
        fleet_size: fleetSize,
        referral_source: referralSource
      });

      // Update userStore
      const cached = userStore.get('profile') || {};
      userStore.set('profile', {
        ...cached,
        name: fullName.trim(),
        workspace_name: workspaceName.trim(),
        organization_type: selectedPersona,
        fleet_size: fleetSize,
        referral_source: referralSource,
        onboarding_step: 'connect'
      });

      setHasVisitedStep2(true);
      setCurrentStep(2);
      setPollingActive(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save workspace configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToDashboard = () => {
    localStorage.setItem('mdefender_onboard_passed', 'true');
    const cached = userStore.get('profile') || {};
    userStore.set('profile', {
      ...cached,
      onboarded: true,
      onboarded_skip: true,
      websites_count: cached.websites_count || 1
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mdefender_user_update'));
    }
    navigate('/user/dashboard', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    userStore.clear();
    localStorage.clear();
    navigate('/user/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: brandTokens.bodyBg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: brandTokens.textHeading
    }}>
      {/* =========================================================================
          LEFT BRANDING & PROGRESS PANE
          ========================================================================= */}
      <div style={{
        width: '380px',
        background: brandTokens.deepForest,
        color: '#FFFFFF',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0
      }} className="onboarding-left-pane">
        
        {/* Top: Brand Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              background: '#FFFFFF',
              padding: '3px'
            }}>
              <img
                src="/assets/mdefender_logo.png"
                alt="MDefender Pro Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                MDefender <span style={{ color: brandTokens.accentOrange, fontWeight: 800 }}>Pro</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: '#8DA399', textTransform: 'uppercase' }}>
                Enterprise WAF Fleet
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#8DA399',
              marginBottom: '18px'
            }}>
              Onboarding Checklist
            </div>

            {/* Step 1 Item (Interactive & Clickable if user can navigate) */}
            <div
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
              }}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: currentStep === 1 ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: currentStep === 1 ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                marginBottom: '12px',
                cursor: currentStep === 2 ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
              }}
              className={currentStep === 2 ? 'stepper-step-clickable' : ''}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: (hasVisitedStep2 && currentStep !== 1) ? brandTokens.emeraldPrimary : (currentStep === 1 ? '#FFFFFF' : 'rgba(255,255,255,0.12)'),
                color: (hasVisitedStep2 && currentStep !== 1) ? '#FFFFFF' : (currentStep === 1 ? brandTokens.deepForest : '#8DA399'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '800',
                flexShrink: 0
              }}>
                {(hasVisitedStep2 && currentStep !== 1) ? <Check size={16} strokeWidth={3} /> : '1'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    fontSize: '13.5px',
                    fontWeight: currentStep === 1 ? '700' : '600',
                    color: currentStep === 1 ? '#FFFFFF' : '#94A3B8'
                  }}>
                    SecOps Workspace
                  </div>
                  {currentStep === 2 && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: brandTokens.emeraldPrimary,
                      background: 'rgba(40, 116, 93, 0.25)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      Edit
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6A8075', marginTop: '2px', lineHeight: '1.4' }}>
                  Define fleet operations and security persona
                </div>
              </div>
            </div>

            {/* Step 2 Item */}
            <div
              onClick={() => {
                if (hasVisitedStep2 && currentStep === 1) setCurrentStep(2);
              }}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: currentStep === 2 ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: currentStep === 2 ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                cursor: (hasVisitedStep2 && currentStep === 1) ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
              }}
              className={(hasVisitedStep2 && currentStep === 1) ? 'stepper-step-clickable' : ''}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: connectedSite ? brandTokens.emeraldPrimary : (currentStep === 2 ? '#FFFFFF' : 'rgba(255,255,255,0.12)'),
                color: connectedSite ? '#FFFFFF' : (currentStep === 2 ? brandTokens.deepForest : '#8DA399'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '800',
                flexShrink: 0
              }}>
                {connectedSite ? <Check size={16} strokeWidth={3} /> : '2'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13.5px',
                  fontWeight: currentStep === 2 ? '700' : '600',
                  color: currentStep === 2 ? '#FFFFFF' : '#94A3B8'
                }}>
                  Origin Gateway Pairing
                </div>
                <div style={{ fontSize: '12px', color: '#6A8075', marginTop: '2px', lineHeight: '1.4' }}>
                  Connect WordPress origin with API key
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Enterprise Security Badges */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: brandTokens.accentOrange,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={14} />
            <span>Zero-Conflict Cloud Security</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#C2D1C9' }}>
              <CheckCircle2 size={15} color="#28745D" />
              <span>Real-Time Edge Traffic Inspection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#C2D1C9' }}>
              <CheckCircle2 size={15} color="#28745D" />
              <span>5.32M+ Checksum &amp; Malware Intelligence</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#C2D1C9' }}>
              <CheckCircle2 size={15} color="#28745D" />
              <span>Automated Virtual Vulnerability Patching</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT INTERACTIVE WORKFLOW PANE
          ========================================================================= */}
      <div style={{
        flex: 1,
        padding: '36px 64px 60px 64px',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        
        {/* Top Header Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '700px',
          margin: '0 auto 28px auto'
        }}>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: brandTokens.emeraldLight,
              color: brandTokens.emeraldPrimary,
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <Lock size={12} strokeWidth={2.4} />
              SecOps Onboarding Portal
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '12px', color: brandTokens.textBody }}>
              Logged in as <strong style={{ color: brandTokens.textHeading }}>{userProfile?.email || 'Operator'}</strong>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${brandTokens.cardBorder}`,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: brandTokens.textBody,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: brandTokens.shadowSm,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = brandTokens.textHeading;
                e.currentTarget.style.color = brandTokens.textHeading;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = brandTokens.cardBorder;
                e.currentTarget.style.color = brandTokens.textBody;
              }}>
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            STEP 1: WORKSPACE & PERSONA CONFIGURATION
            ===================================================================== */}
        {currentStep === 1 && (
          <div style={{ maxWidth: '700px', width: '100%', margin: '0 auto' }}>
            {/* Title Section (Spacious & Clean) */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', color: brandTokens.textHeading, margin: 0 }}>
                  Set up your SecOps Workspace
                </h1>
                {hasVisitedStep2 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: brandTokens.emeraldPrimary,
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                    <span>Return to Pairing</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '14px', color: brandTokens.textBody, margin: 0, lineHeight: '1.5' }}>
                Let us know how your security operations are organized so we can optimize telemetry alerts, fleet policies, and threat visibility for your team.
              </p>
            </div>

            {errorMsg && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#DC2626'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStep1Submit}>
              {/* Form Row 1: Name & Workspace */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '6px' }}>
                    Operator Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Mahabub Vance"
                    required
                    className="saas-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '6px' }}>
                    Security Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Cyber Hub"
                    required
                    className="saas-input"
                  />
                </div>
              </div>

              {/* Form Row 2: What describes your operations best? */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '10px' }}>
                  What describes your security operations best?
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {personaOptions.map((opt) => {
                    const isSelected = selectedPersona === opt.id;
                    const Icon = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedPersona(opt.id)}
                        style={{
                          background: isSelected ? '#FFFFFF' : brandTokens.cardBg,
                          border: isSelected ? `2px solid ${brandTokens.emeraldPrimary}` : `1px solid ${brandTokens.cardBorder}`,
                          borderRadius: '10px',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 4px 16px rgba(40, 116, 93, 0.14)' : brandTokens.shadowSm,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = brandTokens.cardBorderHover;
                            e.currentTarget.style.boxShadow = brandTokens.shadowMd;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = brandTokens.cardBorder;
                            e.currentTarget.style.boxShadow = brandTokens.shadowSm;
                          }
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: isSelected ? brandTokens.emeraldLight : brandTokens.pillBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? brandTokens.emeraldPrimary : brandTokens.textHeading
                          }}>
                            <Icon size={18} strokeWidth={2.2} />
                          </div>
                          
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? `5px solid ${brandTokens.emeraldPrimary}` : `1.5px solid #CBD8CF`,
                            background: '#FFFFFF',
                            boxSizing: 'border-box'
                          }} />
                        </div>

                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '4px' }}>
                            {opt.title}
                          </div>
                          <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.45' }}>
                            {opt.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Row 3: Fleet Size & Referral Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '6px' }}>
                    How many websites do you manage? <span style={{ color: brandTokens.accentOrange }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      required
                      className="saas-select"
                      style={{ color: fleetSize ? brandTokens.textHeading : '#64748B' }}>
                      <option value="" disabled hidden>Select number of websites...</option>
                      {fleetSizeOptions.map(sz => (
                        <option key={sz} value={sz} style={{ color: brandTokens.textHeading }}>{sz}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} color="#475569" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: brandTokens.textHeading, marginBottom: '6px' }}>
                    How did you discover Mdefender Pro? <span style={{ color: brandTokens.accentOrange }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      required
                      className="saas-select"
                      style={{ color: referralSource ? brandTokens.textHeading : '#64748B' }}>
                      <option value="" disabled hidden>Select a source...</option>
                      {referralOptions.map(ref => (
                        <option key={ref} value={ref} style={{ color: brandTokens.textHeading }}>{ref}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} color="#475569" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', paddingTop: '6px' }}>
                {hasVisitedStep2 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{
                      height: '44px',
                      padding: '0 20px',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: brandTokens.textBody,
                      border: `1px solid ${brandTokens.cardBorder}`,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = brandTokens.textHeading;
                      e.currentTarget.style.color = brandTokens.textHeading;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = brandTokens.cardBorder;
                      e.currentTarget.style.color = brandTokens.textBody;
                    }}>
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: '44px',
                    padding: '0 28px',
                    borderRadius: '8px',
                    background: brandTokens.deepForest,
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: brandTokens.shadowMd,
                    transition: 'all 0.15s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = brandTokens.deepForestHover; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = brandTokens.deepForest; }}>
                  <span>{loading ? 'Saving workspace...' : (hasVisitedStep2 ? 'Save & Continue to Pairing' : 'Connect Your First Website')}</span>
                  {!loading && <ArrowRight size={16} strokeWidth={2.4} />}
                </button>
              </div>
            </form>

            {/* Bottom Footer Note (Natural Flow) */}
            <div style={{
              marginTop: '56px',
              paddingTop: '18px',
              borderTop: `1px solid ${brandTokens.cardBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: brandTokens.textMuted
            }}>
              <div>
                &copy; {new Date().getFullYear()} MDefender Pro Enterprise. All Rights Reserved.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>SOC2 Type II Certified</span>
                <span>Zero-Trust Architecture</span>
                <span>24/7 Global Telemetry</span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2: MANDATORY FIRST WEBSITE PAIRING & GATEWAY HANDSHAKE
            ===================================================================== */}
        {currentStep === 2 && (
          <div style={{ maxWidth: '700px', width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${brandTokens.cardBorder}`,
                  borderRadius: '6px',
                  padding: '6px 14px',
                  color: brandTokens.textBody,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '14px',
                  boxShadow: brandTokens.shadowSm,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = brandTokens.textHeading;
                  e.currentTarget.style.color = brandTokens.textHeading;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = brandTokens.cardBorder;
                  e.currentTarget.style.color = brandTokens.textBody;
                }}>
                <ArrowLeft size={14} />
                <span>Edit Workspace Information</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', color: brandTokens.textHeading, margin: '0 0 6px 0' }}>
                  Connect Your First Website
                </h1>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: brandTokens.emeraldPrimary,
                  background: brandTokens.emeraldLight,
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  Workspace: {workspaceName || 'My Fleet'}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: brandTokens.textBody, margin: 0, lineHeight: '1.5' }}>
                Mdefender Pro requires at least one active WordPress origin connection to activate edge inspection, verify telemetry handshakes, and synchronize cloud security rules.
              </p>
            </div>

            {/* Instruction Step 1: Copy API Key */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '14px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: brandTokens.emeraldLight,
                    color: brandTokens.emeraldPrimary,
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    1
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: brandTokens.textHeading }}>
                    Copy Your Workspace Connect Key
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: brandTokens.textMuted, fontWeight: '600' }}>
                  Zero-Conflict Pair Token
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F7F6F1',
                border: '1px solid #CBD8CF',
                borderRadius: '8px',
                padding: '6px 12px'
              }}>
                <KeyRound size={16} color="#60716B" />
                <code style={{
                  flex: 1,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '13px',
                  color: brandTokens.textHeading,
                  letterSpacing: '0.04em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {showKey ? apiKey : (apiKey ? `${apiKey.slice(0, 14)}${'•'.repeat(26)}` : 'Generating dynamic key...')}
                </code>

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: brandTokens.textBody,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showKey ? 'Hide key' : 'Show key'}>
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  style={{
                    background: copiedKey ? '#28745D' : brandTokens.deepForest,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(11,37,34,0.12)',
                    transition: 'all 0.15s ease'
                  }}>
                  {copiedKey ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied!' : 'Copy API Key'}</span>
                </button>
              </div>
            </div>

            {/* Instruction Step 2: Install Plugin */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '14px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: brandTokens.emeraldLight,
                    color: brandTokens.emeraldPrimary,
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    2
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: brandTokens.textHeading }}>
                    Install MDefender Pro Plugin in WordPress
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.5', marginBottom: '10px' }}>
                In your WordPress Admin dashboard, go to <strong>Plugins &rarr; Add New Plugin</strong>. Search for <strong>Mdefender Pro</strong>, or download and upload our official security package zip file directly.
              </div>

              <div>
                <a
                  href="/downloads/mdefender-pro.zip"
                  download="mdefender-security.zip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD8CF',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: brandTokens.textHeading,
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(11,37,34,0.06)',
                    transition: 'all 0.15s ease'
                  }}
                  className="download-plugin-btn">
                  <Download size={14} color="#E8792F" strokeWidth={2.4} />
                  <span>Download Plugin Package (.zip)</span>
                </a>
              </div>
            </div>

            {/* Instruction Step 3: Connect Plugin */}
            <div style={{
              background: brandTokens.cardBg,
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '18px',
              boxShadow: brandTokens.shadowSm
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: brandTokens.emeraldLight,
                  color: brandTokens.emeraldPrimary,
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  3
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: brandTokens.textHeading }}>
                  Connect & Synchronize Shield
                </span>
              </div>

              <div style={{ fontSize: '12px', color: brandTokens.textBody, lineHeight: '1.5' }}>
                In WordPress Admin, open <strong>Settings &rarr; Mdefender Pro</strong> (or side menu), paste your copied API Key, and click <strong>Save & Pair Connection</strong>.
              </div>
            </div>

            {/* Live Gateway Telemetry Handshake Radar Box */}
            <div style={{
              background: connectedSite ? '#E8F3EC' : '#0B2522',
              border: connectedSite ? '1px solid #CFE2D4' : '1px solid #1C3E37',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 4px 18px rgba(11, 37, 34, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              color: connectedSite ? '#10201E' : '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {connectedSite ? (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803D',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={24} strokeWidth={2.4} />
                  </div>
                ) : (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(40, 116, 93, 0.25)',
                    border: '1px solid rgba(40, 116, 93, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34D399',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <Radio size={22} className="animate-spin" />
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#E8792F',
                      border: '2px solid #0B2522',
                      boxShadow: '0 0 8px #E8792F'
                    }} />
                  </div>
                )}

                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: connectedSite ? '#15803D' : '#FFFFFF',
                    letterSpacing: '-0.01em'
                  }}>
                    {connectedSite ? 'Origin Secured & Verified!' : 'Listening for Origin Telemetry Handshake...'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: connectedSite ? '#28745D' : '#A3B8B0',
                    marginTop: '3px',
                    lineHeight: '1.4'
                  }}>
                    {connectedSite
                      ? `Successfully synchronized: ${connectedSite.domain || connectedSite.name}. Initializing edge telemetry.`
                      : 'MDefender Pro will automatically detect your WordPress origin the moment the plugin is saved with your API key.'}
                  </div>
                </div>
              </div>

              {connectedSite && redirectCountdown !== null && (
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap'
                }}>
                  Entering Dashboard in {redirectCountdown}s...
                </div>
              )}
            </div>

            {/* Zero-Trust Notice & Optional Escape Hatch */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 18px',
              background: '#FFFFFF',
              border: `1px solid ${brandTokens.cardBorder}`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: brandTokens.textMuted, fontSize: '11.5px' }}>
                <Lock size={13} style={{ color: '#28745D', flexShrink: 0 }} />
                <span>Zero-Trust Origin Isolation: Telemetry engine activates upon origin pairing.</span>
              </div>
              <button
                type="button"
                onClick={handleSkipToDashboard}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E8792F',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  padding: 0,
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#BD642B'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#E8792F'}
              >
                <span>Explore Dashboard</span>
                <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </div>

            {/* Bottom Footer Note (Natural Flow) */}
            <div style={{
              marginTop: '56px',
              paddingTop: '18px',
              borderTop: `1px solid ${brandTokens.cardBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: brandTokens.textMuted
            }}>
              <div>
                &copy; {new Date().getFullYear()} MDefender Pro Enterprise. All Rights Reserved.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>SOC2 Type II Certified</span>
                <span>Zero-Trust Architecture</span>
                <span>24/7 Global Telemetry</span>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .saas-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #CBD8CF;
          background: #FFFFFF;
          font-size: 13.5px;
          color: #10201E;
          outline: none;
          box-sizing: border-box;
          transition: all 0.15s ease;
        }
        .saas-input:hover {
          border-color: #10201E;
        }
        .saas-input:focus {
          border-color: #E8792F;
          box-shadow: 0 0 0 3px rgba(232, 121, 47, 0.14);
        }
        .saas-input::placeholder {
          color: #87948D;
        }

        .saas-select {
          width: 100%;
          height: 44px;
          padding: 0 38px 0 14px;
          border-radius: 8px;
          border: 1px solid #CBD8CF;
          background: #FFFFFF;
          font-size: 13.5px;
          font-weight: 500;
          color: #10201E;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          transition: all 0.15s ease;
        }
        .saas-select:hover {
          border-color: #10201E;
        }
        .saas-select:focus {
          border-color: #E8792F;
          box-shadow: 0 0 0 3px rgba(232, 121, 47, 0.14);
        }

        .download-plugin-btn:hover {
          border-color: #10201E !important;
          background: #F7FAF7 !important;
        }

        .stepper-step-clickable:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @media (max-width: 900px) {
          .onboarding-left-pane { display: none !important; }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Shield, Sparkles, AlertTriangle, ArrowRight, Check, Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TrialPaywallModal() {
  const [dismissed, setDismissed] = useState(false);
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const [siteCount, setSiteCount] = useState(1);

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const testTrialParam = urlParams ? urlParams.get('test_trial_days') : null;
  const testProParam = urlParams ? urlParams.get('test_pro') : null;

  const userPlan = (testProParam === 'true'
    ? 'pro'
    : (typeof localStorage !== 'undefined' ? (localStorage.getItem('mdefender_user_plan') || 'free') : 'free')
  ).toLowerCase();
  const isPro = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);
  const rawTrial = testTrialParam !== null
    ? Number(testTrialParam)
    : (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_trial_days') : null);
  const trialDays = rawTrial !== null ? Number(rawTrial) : 14;

  useEffect(() => {
    // If URL testing param is present, allow testing soft modal repeatedly without getting blocked by dismissed flag
    if (testTrialParam !== null) {
      sessionStorage.removeItem('mdf_soft_trial_dismissed');
      setDismissed(false);
      return;
    }
    const isDismissedThisSession = sessionStorage.getItem('mdf_soft_trial_dismissed') === 'true';
    if (isDismissedThisSession) {
      setDismissed(true);
    }
  }, [testTrialParam]);

  // 1. If PRO, never show any modal
  if (isPro) return null;

  // 2. Days 1 to 9: Silent (modal hidden, only header pill visible)
  if (trialDays > 4) return null;

  const isHardLockout = trialDays <= 0;
  const isSoftPrompt = trialDays > 0 && trialDays <= 4;

  // If soft prompt was dismissed for this browser session, don't show it again
  if (isSoftPrompt && dismissed) return null;

  const handleDismissSoft = () => {
    sessionStorage.setItem('mdf_soft_trial_dismissed', 'true');
    setDismissed(true);
  };

  const pricePerSite = billingCycle === 'yearly' ? 40 : 4;
  const totalAmount = siteCount * pricePerSite;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: isHardLockout ? 'rgba(7, 11, 20, 0.96)' : 'rgba(7, 11, 20, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0B2522',
        border: isHardLockout ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '20px',
        maxWidth: '540px',
        width: '100%',
        padding: '36px 32px',
        boxShadow: isHardLockout ? '0 25px 50px -12px rgba(239, 68, 68, 0.25)' : '0 25px 50px -12px rgba(99, 102, 241, 0.25)',
        color: '#FFFFFF',
        position: 'relative',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Top Floating Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          background: isHardLockout ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          border: isHardLockout ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
          color: isHardLockout ? '#F87171' : '#A5B4FC',
          fontSize: '11.5px',
          fontWeight: 800,
          marginBottom: '16px'
        }}>
          {isHardLockout ? (
            <>
              <Lock size={12} />
              <span>TRIAL CONCLUDED — SERVICE PAUSED</span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>{trialDays} DAYS REMAINING IN TRIAL</span>
            </>
          )}
        </div>

        {/* Modal Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#FFFFFF',
          margin: '0 0 10px',
          lineHeight: 1.25,
          letterSpacing: '-0.02em'
        }}>
          {isHardLockout
            ? 'Your 14-Day Free Trial Has Ended'
            : `Keep Your Websites Protected (${trialDays} Days Left)`}
        </h2>

        {/* Body Description */}
        <p style={{
          fontSize: '14px',
          color: '#94A3B8',
          lineHeight: 1.6,
          margin: '0 0 24px'
        }}>
          {isHardLockout
            ? 'Autonomous cloud WAF rules, AI threat heuristics, and malware defenses are temporarily paused on your sites. Choose a plan to instantly restore full protection.'
            : 'Add your payment method today to guarantee zero interruption when your trial ends. You will not be billed today ($0 hold) — your subscription begins only after Day 14.'}
        </p>

        {/* Plan / Pricing Selector Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '18px 20px',
          marginBottom: '24px'
        }}>
          {/* Billing Cycle Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '16px'
          }}>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: billingCycle === 'monthly' ? '#164E48' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Monthly ($4/site)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: billingCycle === 'yearly' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Yearly ($40/site)</span>
              <span style={{
                background: '#FCD34D',
                color: '#000000',
                fontSize: '9.5px',
                fontWeight: 900,
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                2 MO FREE
              </span>
            </button>
          </div>

          {/* Site Quantity Selector */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px'
          }}>
            <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>
              Protected Websites / Routers:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSiteCount(Math.max(1, siteCount - 1))}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                -
              </button>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', minWidth: '24px', textAlign: 'center' }}>
                {siteCount}
              </span>
              <button
                type="button"
                onClick={() => setSiteCount(siteCount + 1)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Pricing Total Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '12px'
          }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>
              Total ({billingCycle}):
            </span>
            <div>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF' }}>
                ${totalAmount}
              </span>
              <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '4px' }}>
                /{billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Checkmarks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px',
          marginBottom: '26px'
        }}>
          {[
            'Autonomous AI WAF Engine',
            'Full Malware & Backdoor Scanning',
            'Zero False-Positive Protection',
            'Priority Threat Intel Telemetry'
          ].map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#CBD5E1' }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Check size={9} color="#34D399" strokeWidth={3} />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            to="/user/pricing"
            style={{
              padding: '13px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6 60%, #EC4899)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Zap size={16} fill="#FCD34D" color="#FCD34D" />
            <span>
              {isHardLockout
                ? `Reactivate MDefender PRO ($${totalAmount})`
                : 'Save Payment Method & Auto-Renew'}
            </span>
            <ArrowRight size={15} />
          </Link>

          {/* SKIPPABLE BUTTON: Only available during Days 10 to 14 (Hidden on Day 15+ Hard Lockout) */}
          {isSoftPrompt && (
            <button
              type="button"
              onClick={handleDismissSoft}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px',
                textDecoration: 'underline'
              }}
            >
              Remind Me Later &bull; Continue to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

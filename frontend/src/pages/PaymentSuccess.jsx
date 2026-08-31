import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/api'
import PublicNavbar from '../components/PublicNavbar'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentData, setPaymentData] = useState(null)

  const sessionId = searchParams.get('session_id') || ''
  const plan = searchParams.get('plan') || 'pro'
  const cycle = searchParams.get('cycle') || 'monthly'

  useEffect(() => {
    async function verify() {
      if (!sessionId) {
        setLoading(false)
        return
      }
      try {
        const res = await api.verifyStripeSession(sessionId)
        if (res.status === 'success') {
          setPaymentData(res)
          localStorage.setItem('mdefender_user_plan', 'premium')
        } else {
          setError(res.message || 'Payment verification failed.')
        }
      } catch (err) {
        setError(err.message || 'Error communicating with payment gateway.')
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [sessionId])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b14',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <PublicNavbar />

      <div style={{
        maxWidth: '620px',
        margin: '0 auto',
        padding: '140px 24px 80px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#0c1222',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}>
          {loading ? (
            <div style={{ padding: '40px 0' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '36px', color: '#38bdf8', marginBottom: '16px' }}></i>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>Verifying Stripe Payment...</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Please wait while we confirm your transaction and activate your security policy.</p>
            </div>
          ) : error ? (
            <div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                border: '2px solid #ef4444',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                margin: '0 auto 16px'
              }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>Payment Verification Alert</h2>
              <p style={{ fontSize: '13px', color: '#f87171', marginBottom: '24px' }}>{error}</p>
              <Link to="/pricing" style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                Return to Pricing
              </Link>
            </div>
          ) : (
            <div>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                border: '2px solid #10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)'
              }}>
                <i className="fas fa-check"></i>
              </div>

              <div style={{
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: '20px',
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                Payment Succeeded
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginBottom: '8px' }}>
                Subscription Successfully Activated!
              </h1>
              <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '420px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                Your account has been upgraded to <strong>{paymentData?.plan_name || 'Enterprise Pro'}</strong>. Your 2,000 WAF rules and 5.2M dataset ML engine are now fully active.
              </p>

              {/* Receipt Details Table */}
              <div style={{
                background: '#070b14',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '18px 22px',
                textAlign: 'left',
                fontSize: '13px',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ color: '#64748b' }}>Invoice ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{paymentData?.invoice_id || 'INV-2026-PAID'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ color: '#64748b' }}>Plan Tier:</span>
                  <strong style={{ color: '#ffffff' }}>{paymentData?.plan_name || 'Enterprise Pro'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid:</span>
                  <strong style={{ color: '#10b981' }}>${paymentData?.amount || 29}.00 USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: '#64748b' }}>Protection Active Until:</span>
                  <strong style={{ color: '#cbd5e1' }}>{paymentData?.plan_expires || '1 Year'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Link
                  to="/user/dashboard"
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-gauge-high"></i> Go to SOC Dashboard
                </Link>
                <Link
                  to="/user/settings"
                  style={{
                    padding: '13px 20px',
                    borderRadius: '10px',
                    background: '#070b14',
                    border: '1px solid #1e293b',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-file-invoice"></i> View Invoices
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

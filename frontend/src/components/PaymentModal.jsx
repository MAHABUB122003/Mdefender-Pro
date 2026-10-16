import { useState, useEffect } from 'react'
import api from '../api/api'

export default function PaymentModal({ isOpen, onClose, plan = 'pro', billingCycle = 'monthly', onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [onboardingNotice, setOnboardingNotice] = useState(null)

  const isYearly = billingCycle.toLowerCase() === 'yearly'
  const planName = plan === 'go' ? 'Developer Go' : plan === 'enterprise' ? 'Dedicated Enterprise' : 'Enterprise Pro'
  const usdPrice = plan === 'go'
    ? (isYearly ? 90 : 9)
    : plan === 'enterprise'
      ? (isYearly ? 470 : 49)
      : (isYearly ? 190 : 20)

  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccessData(null)
      setOnboardingNotice(null)

      // Initialize Paddle SDK
      api.getBillingConfig()
        .then(res => {
          const cfg = res?.data || res
          if (cfg?.client_token && window.Paddle) {
            try {
              if (cfg.environment === 'sandbox') {
                window.Paddle.Environment.set('sandbox')
              }
              window.Paddle.Initialize({
                token: cfg.client_token
              })
            } catch (e) {
              console.warn('Paddle Init Warning:', e)
            }
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    setOnboardingNotice(null)

    try {
      // 1. Fetch live config and ensure Paddle SDK is ready
      const cfgRes = await api.getBillingConfig()
      const cfg = cfgRes?.data || cfgRes
      if (window.Paddle && cfg?.client_token) {
        try {
          if (cfg.environment === 'sandbox') {
            window.Paddle.Environment.set('sandbox')
          }
          window.Paddle.Initialize({ token: cfg.client_token })
        } catch (initErr) {
          console.warn('Paddle init error:', initErr)
        }
      }

      // 2. Request backend to create transaction
      const res = await api.createPaddleCheckout({
        plan,
        billing_cycle: billingCycle,
        return_url: window.location.href,
        success_url: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle
      })

      if (!res.success && res.error) {
        if (res.error.code === 'transaction_checkout_not_enabled') {
          setOnboardingNotice({
            title: 'Paddle Live Onboarding Pending',
            message: res.error.message || 'Checkouts are not enabled yet for your live Paddle account. Please complete your business verification and website domain approval in your Paddle Dashboard.',
            url: 'https://vendors.paddle.com'
          })
          return
        }
        throw new Error(res.error.message || 'Failed to initiate checkout.')
      }

      const checkoutData = res.data || res

      // 3. Open Paddle Checkout directly
      if (checkoutData.checkout_id && window.Paddle) {
        try {
          window.Paddle.Checkout.open({
            transactionId: checkoutData.checkout_id,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle
            }
          })
          onClose()
          return
        } catch (overlayErr) {
          console.warn('Overlay error, falling back to URL:', overlayErr)
        }
      }

      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url
        return
      }

      if (checkoutData.price_id && window.Paddle) {
        window.Paddle.Checkout.open({
          items: [{ priceId: checkoutData.price_id, quantity: 1 }],
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            successUrl: window.location.origin + '/payment/success?plan=' + plan + '&cycle=' + billingCycle
          }
        })
        onClose()
        return
      }

      throw new Error('Unable to launch checkout session. Please try again.')
    } catch (err) {
      setError(err.message || 'Payment initiation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
        color: '#0f172a',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                Secured Checkout
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              {planName} &middot; {isYearly ? `Annual Billing ($${usdPrice}/yr)` : `Monthly Billing ($${usdPrice}/mo)`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {onboardingNotice ? (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <i className="fas fa-triangle-exclamation" style={{ color: '#d97706', marginTop: '2px', fontSize: '16px' }}></i>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', color: '#92400e' }}>
                    {onboardingNotice.title}
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#b45309', lineHeight: '1.5' }}>
                    {onboardingNotice.message}
                  </p>
                  <a
                    href={onboardingNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      background: '#d97706',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Open Paddle Dashboard</span>
                    <i className="fas fa-arrow-up-right-from-square" style={{ fontSize: '10px' }}></i>
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {/* Order Summary Strip */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                Plan Selected
              </span>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {planName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {isYearly ? 'Billed annually (Save 20%)' : 'Billed monthly'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
                ${usdPrice}.00
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                USD
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Single Direct Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
              marginBottom: '14px',
              transition: 'all 0.15s'
            }}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Processing...</>
            ) : (
              <><i className="fas fa-lock"></i> Upgrade Plan (${usdPrice}.00 USD)</>
            )}
          </button>

          {/* Payment Methods Accepted Icons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: '#64748b',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            <span><i className="fab fa-cc-visa" style={{ color: '#2563eb', marginRight: '4px', fontSize: '14px' }}></i> Visa</span>
            <span><i className="fab fa-cc-mastercard" style={{ color: '#ea580c', marginRight: '4px', fontSize: '14px' }}></i> Mastercard</span>
            <span><i className="fab fa-cc-amex" style={{ color: '#0284c7', marginRight: '4px', fontSize: '14px' }}></i> Amex</span>
            <span><i className="fab fa-paypal" style={{ color: '#0079C1', marginRight: '4px', fontSize: '14px' }}></i> PayPal</span>
            <span><i className="fab fa-apple-pay" style={{ marginRight: '4px', fontSize: '14px' }}></i> Apple Pay</span>
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: '11.5px',
            color: '#94a3b8',
            lineHeight: '1.4'
          }}>
            <i className="fas fa-shield" style={{ marginRight: '4px', color: '#10b981' }}></i>
            Encrypted with 256-bit TLS security. Cancel or change plan anytime from your dashboard.
          </div>
        </div>
      </div>
    </div>
  )
}

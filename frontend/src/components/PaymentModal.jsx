import { useState, useEffect } from 'react'
import api from '../api/api'

export default function PaymentModal({ isOpen, onClose, plan = 'pro', billingCycle = 'monthly', onSuccess }) {
  const [activeTab, setActiveTab] = useState('card') // 'card' | 'bkash'
  const [loading, setLoading] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [bkashLoading, setBkashLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [bkashConfig, setBkashConfig] = useState({
    usd_to_bdt_rate: 120
  })

  // Card Form State
  const [cardForm, setCardForm] = useState({
    cardholder_name: '',
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: ''
  })

  const isYearly = billingCycle.toLowerCase() === 'yearly'
  const planName = plan === 'go' ? 'Developer Go' : 'Enterprise Pro'
  const usdPrice = plan === 'go' ? (isYearly ? 90 : 9) : (isYearly ? 290 : 29)
  const bdtPrice = Math.round(usdPrice * (bkashConfig.usd_to_bdt_rate || 120))

  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccessData(null)
      api.getBkashConfig()
        .then(res => {
          if (res) setBkashConfig(res)
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  // Format Card Number (#### #### #### ####)
  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 16) val = val.slice(0, 16)
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
    setCardForm({ ...cardForm, card_number: formatted })
  }

  // Detect Card Brand
  const getCardBrand = (num) => {
    const clean = num.replace(/\s/g, '')
    if (clean.startsWith('4')) return { brand: 'Visa', icon: 'fa-cc-visa', color: '#3b82f6' }
    if (clean.startsWith('51') || clean.startsWith('52') || clean.startsWith('53') || clean.startsWith('54') || clean.startsWith('55')) return { brand: 'Mastercard', icon: 'fa-cc-mastercard', color: '#f97316' }
    if (clean.startsWith('34') || clean.startsWith('37')) return { brand: 'Amex', icon: 'fa-cc-amex', color: '#06b6d4' }
    if (clean.startsWith('6011') || clean.startsWith('65')) return { brand: 'Discover', icon: 'fa-cc-discover', color: '#eab308' }
    return { brand: 'Card', icon: 'fa-credit-card', color: '#64748b' }
  }

  const brandInfo = getCardBrand(cardForm.card_number)

  // Stripe Hosted Checkout Session
  const handleStripeCheckout = async () => {
    setStripeLoading(true)
    setError('')
    try {
      const res = await api.createStripeCheckoutSession({
        plan,
        billing_cycle: billingCycle,
        frontend_url: window.location.origin
      })
      if (res.status === 'success' && res.checkout_url) {
        window.location.href = res.checkout_url
      } else {
        setError(res.message || 'Could not initiate Stripe Checkout.')
      }
    } catch (err) {
      setError(err.message || 'Stripe gateway connection failed.')
    } finally {
      setStripeLoading(false)
    }
  }

  // Direct Card Submit
  const handleCardSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.processCardPayment({
        plan,
        billing_cycle: billingCycle,
        card: {
          ...cardForm,
          card_number: cardForm.card_number.replace(/\s/g, '')
        }
      })
      if (res.status === 'success') {
        setSuccessData(res)
        localStorage.setItem('mdefender_user_plan', 'premium')
        if (onSuccess) onSuccess(res)
      } else {
        setError(res.message || 'Card authorization failed.')
      }
    } catch (err) {
      setError(err.message || 'Card transaction failed. Please check details.')
    } finally {
      setLoading(false)
    }
  }

  // 1-Click bKash Automated Checkout
  const handleBkashCheckout = async () => {
    setBkashLoading(true)
    setError('')
    try {
      const res = await api.createBkashPayment({
        plan,
        billing_cycle: billingCycle,
        frontend_url: window.location.origin
      })
      if (res.status === 'success') {
        if (res.bkash_url) {
          window.location.href = res.bkash_url
        } else {
          setSuccessData(res)
          localStorage.setItem('mdefender_user_plan', 'premium')
          if (onSuccess) onSuccess(res)
        }
      } else {
        setError(res.message || 'bKash payment initiation failed.')
      }
    } catch (err) {
      setError(err.message || 'Error communicating with bKash gateway.')
    } finally {
      setBkashLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0e1a',
        border: '1px solid #1e293b',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 65px rgba(0, 0, 0, 0.9), 0 0 40px rgba(37, 99, 235, 0.15)',
        color: '#f1f5f9',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 14, 26, 1) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Secured 256-Bit SSL Checkout
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {planName} &middot; {isYearly ? 'Annual Billing ($' + usdPrice + '/yr)' : 'Monthly Billing ($' + usdPrice + '/mo)'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px' }}>
          {successData ? (
            /* Success Receipt View */
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
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
                margin: '0 auto 16px',
                boxShadow: '0 0 25px rgba(16,185,129,0.35)'
              }}>
                <i className="fas fa-check"></i>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>
                Payment Succeeded!
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '380px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                {successData.message}
              </p>

              {/* Receipt Summary Card */}
              <div style={{
                background: '#070b14',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '13px',
                marginBottom: '22px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Invoice ID:</span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{successData.invoice_id}</strong>
                </div>
                {successData.trx_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Transaction Ref:</span>
                    <strong style={{ color: '#f43f5e', fontFamily: 'monospace' }}>{successData.trx_id}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Plan Tier:</span>
                  <strong style={{ color: '#ffffff' }}>{planName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid:</span>
                  <strong style={{ color: '#10b981' }}>
                    ${successData.amount || usdPrice} USD {successData.amount_bdt ? `(৳${Math.round(successData.amount_bdt).toLocaleString()} BDT)` : ''}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Active Until:</span>
                  <strong style={{ color: '#e2e8f0' }}>{successData.plan_expires}</strong>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
                }}
              >
                Go to SOC Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Order Summary Strip */}
              <div style={{
                background: '#070b14',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Order Summary</span>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>{planName} ({isYearly ? 'Annual' : 'Monthly'})</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8' }}>${usdPrice}.00 USD</div>
                  <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: '700' }}>≈ ৳{bdtPrice.toLocaleString()} BDT</div>
                </div>
              </div>

              {/* 2-Tab Payment Method Selector */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '20px'
              }}>
                {/* Tab: Card / Stripe */}
                <button
                  onClick={() => { setActiveTab('card'); setError('') }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: activeTab === 'card' ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                    background: activeTab === 'card' ? 'rgba(37,99,235,0.12)' : '#070b14',
                    color: activeTab === 'card' ? '#60a5fa' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                >
                  <i className="fas fa-credit-card" style={{ color: activeTab === 'card' ? '#38bdf8' : '#64748b' }}></i>
                  Credit / Stripe
                </button>

                {/* Tab: bKash */}
                <button
                  onClick={() => { setActiveTab('bkash'); setError('') }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: activeTab === 'bkash' ? '1.5px solid #e2136e' : '1px solid #1e293b',
                    background: activeTab === 'bkash' ? 'rgba(226,19,110,0.12)' : '#070b14',
                    color: activeTab === 'bkash' ? '#f43f5e' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#e2136e',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '900'
                  }}>b</span>
                  bKash Payment
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-circle-exclamation" style={{ color: '#ef4444' }}></i>
                  {error}
                </div>
              )}

              {/* ================= TAB 1: CREDIT / STRIPE ================= */}
              {activeTab === 'card' && (
                <div>
                  {/* Hosted Stripe Checkout Button */}
                  <button
                    onClick={handleStripeCheckout}
                    disabled={stripeLoading}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: stripeLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                      marginBottom: '16px'
                    }}
                  >
                    {stripeLoading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Connecting to Stripe...</>
                    ) : (
                      <><i className="fab fa-stripe" style={{ fontSize: '24px' }}></i> Pay with Stripe Checkout (${usdPrice}.00 USD)</>
                    )}
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '12px 0 16px',
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    <div style={{ flex: 1, height: '1px', background: '#1e293b' }}></div>
                    <span style={{ padding: '0 10px' }}>Or Direct Card Payment</span>
                    <div style={{ flex: 1, height: '1px', background: '#1e293b' }}></div>
                  </div>

                  <form onSubmit={handleCardSubmit}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={cardForm.cardholder_name}
                        onChange={e => setCardForm({ ...cardForm, cardholder_name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #1e293b',
                          background: '#070b14',
                          color: '#ffffff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                        Card Number
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          placeholder="4242 4242 4242 4242"
                          value={cardForm.card_number}
                          onChange={handleCardNumberChange}
                          style={{
                            width: '100%',
                            padding: '10px 42px 10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #1e293b',
                            background: '#070b14',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }}
                        />
                        <i
                          className={`fab ${brandInfo.icon}`}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '18px',
                            color: brandInfo.color
                          }}
                        ></i>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Exp Month
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          placeholder="MM (12)"
                          value={cardForm.exp_month}
                          onChange={e => setCardForm({ ...cardForm, exp_month: e.target.value.replace(/\D/g, '') })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #1e293b',
                            background: '#070b14',
                            color: '#ffffff',
                            fontSize: '13px',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                          Exp Year
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          placeholder="YYYY (2028)"
                          value={cardForm.exp_year}
                          onChange={e => setCardForm({ ...cardForm, exp_year: e.target.value.replace(/\D/g, '') })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #1e293b',
                            background: '#070b14',
                            color: '#ffffff',
                            fontSize: '13px',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardForm.cvc}
                          onChange={e => setCardForm({ ...cardForm, cvc: e.target.value.replace(/\D/g, '') })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #1e293b',
                            background: '#070b14',
                            color: '#ffffff',
                            fontSize: '13px',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: 'white',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                      }}
                    >
                      {loading ? (
                        <><i className="fas fa-spinner fa-spin"></i> Authorizing Card...</>
                      ) : (
                        <><i className="fas fa-lock"></i> Authorize &amp; Pay ${usdPrice}.00 USD</>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ================= TAB 2: BKASH 1-CLICK CHECKOUT ================= */}
              {activeTab === 'bkash' && (
                <div>
                  {/* bKash Payment Summary Card */}
                  <div style={{
                    background: '#070b14',
                    border: '1px solid #331826',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#e2136e',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: '900',
                      margin: '0 auto 12px',
                      boxShadow: '0 0 20px rgba(226,19,110,0.4)'
                    }}>
                      b
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
                      bKash Instant Gateway Checkout
                    </div>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }}>
                      Pay safely using your bKash digital wallet with instant subscription activation.
                    </p>

                    <div style={{
                      background: 'rgba(226,19,110,0.08)',
                      border: '1px solid rgba(226,19,110,0.2)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Plan</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{planName}</div>
                      </div>
                      <div style={{ width: '1px', height: '24px', background: '#1e293b' }}></div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Amount in USD</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>${usdPrice}.00 USD</div>
                      </div>
                      <div style={{ width: '1px', height: '24px', background: '#1e293b' }}></div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Total BDT</span>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#f43f5e' }}>৳{bdtPrice.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Pay Button */}
                  <button
                    onClick={handleBkashCheckout}
                    disabled={bkashLoading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #e2136e, #be123c)',
                      color: 'white',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '800',
                      cursor: bkashLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 18px rgba(226,19,110,0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {bkashLoading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Processing bKash Payment...</>
                    ) : (
                      <>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'white',
                          color: '#e2136e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '900'
                        }}>b</span>
                        Pay with bKash (৳{bdtPrice.toLocaleString()} BDT)
                      </>
                    )}
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '12px'
                  }}>
                    <i className="fas fa-shield-check" style={{ color: '#10b981' }}></i>
                    Zero manual verification &middot; Instant automatic activation
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Security Badges */}
        <div style={{
          padding: '14px 24px',
          background: '#04070e',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <span><i className="fas fa-shield-halved" style={{ color: '#10b981', marginRight: '4px' }}></i> PCI-DSS Level 1 Compliant</span>
          <span><i className="fas fa-lock" style={{ color: '#3b82f6', marginRight: '4px' }}></i> 256-Bit TLS Encryption</span>
        </div>
      </div>
    </div>
  )
}

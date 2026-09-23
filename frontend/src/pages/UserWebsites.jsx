import { useState, useEffect, useCallback } from 'react'
import api from '../api/api'
import userStore from '../utils/userStore'
import copyToClipboard from '../utils/clipboard'

export default function UserWebsites() {
  const cachedData = userStore.get('websites') || userStore.get('dashboard')
  const [data, setData] = useState(() => cachedData)
  const [loading, setLoading] = useState(() => !cachedData)
  const [newWebsite, setNewWebsite] = useState('')
  const [platform, setPlatform] = useState('wordpress')
  const [adding, setAdding] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  const userPlan = data?.user?.plan || data?.plan || localStorage.getItem('mdefender_user_plan') || 'free'
  const isPremium = userPlan === 'premium'

  // API Key & Integration Modal State
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [modalKey, setModalKey] = useState('')
  const [modalDomain, setModalDomain] = useState('')
  const [modalWebsiteId, setModalWebsiteId] = useState('')
  const [modalTab, setModalTab] = useState('wordpress')
  const [isMasked, setIsMasked] = useState(true)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Upgrade prompt modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const apiEndpoint = window.location.origin

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getUserDashboard()
      setData(result)
      userStore.set('websites', result)
      userStore.set('dashboard', result)
    } catch (err) {
      console.error('Error fetching websites dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddWebsite = async (e) => {
    e.preventDefault()
    setFeedbackMsg(null)
    if (!newWebsite.trim()) return

    // Clean up domain: strip http(s)://, trailing slash, path
    let cleanDomain = newWebsite.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    cleanDomain = cleanDomain.split('/')[0].trim().toLowerCase()

    if (!cleanDomain) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid website domain or hostname.' })
      return
    }

    setAdding(true)
    try {
      const res = await api.addUserWebsite({ domain: cleanDomain, platform })
      if (res?.status === 'error') {
        if (res.message && res.message.toLowerCase().includes('upgrade to premium')) {
          setShowUpgradeModal(true)
        } else {
          setFeedbackMsg({ type: 'error', text: res.message || 'Failed to connect website.' })
        }
        return
      }

      const siteKey = res?.api_key || data?.api_key || data?.user?.api_key || ''
      setModalKey(siteKey)
      setModalDomain(cleanDomain)
      setModalWebsiteId(res?.website?._id || res?.website?.id || '')
      setModalTab(platform === 'node' || platform === 'express' ? 'express' : (platform || 'wordpress'))
      setIsMasked(false)
      setShowKeyModal(true)

      setNewWebsite('')
      setFeedbackMsg({ type: 'success', text: `Website "${cleanDomain}" connected successfully!` })
      userStore.remove('websites')
      userStore.remove('dashboard')
      await fetchData()
    } catch (err) {
      const errMsg = err.message || 'Failed to connect website. Please try again.'
      if (errMsg.toLowerCase().includes('upgrade') || errMsg.toLowerCase().includes('limit')) {
        setShowUpgradeModal(true)
      } else {
        setFeedbackMsg({ type: 'error', text: errMsg })
      }
    } finally {
      setAdding(false)
    }
  }

  const handleOpenKeyModal = (w) => {
    const domain = w.domain || w.name || w.url || 'My Website'
    const id = w.id || w._id || ''
    setModalDomain(domain)
    setModalWebsiteId(id)
    const key = w.api_key || data?.api_key || ''
    setModalKey(key)
    setIsMasked(true)

    const p = (w.platform || '').toLowerCase()
    if (p.includes('express') || p.includes('node')) setModalTab('express')
    else if (p.includes('python') || p.includes('fastapi') || p.includes('django')) setModalTab('python')
    else if (p.includes('react')) setModalTab('react')
    else if (p.includes('php') || p.includes('laravel')) setModalTab('php')
    else setModalTab('wordpress')

    setShowKeyModal(true)
  }

  const handleRegenerateKey = async () => {
    if (!confirm(`Are you sure you want to regenerate the API key for ${modalDomain}? Any active connections using the old key will be disconnected.`)) return
    setRegenerating(true)
    try {
      const res = await api.regenerateApiKey({ website_id: modalWebsiteId })
      if (res && res.api_key) {
        setModalKey(res.api_key)
        setIsMasked(false)
        userStore.remove('websites')
        userStore.remove('dashboard')
        fetchData()
      } else {
        alert('Failed to regenerate key')
      }
    } catch (err) {
      alert(err.message || 'Error regenerating key')
    } finally {
      setRegenerating(false)
    }
  }

  const handleRemoveWebsite = async (w) => {
    const targetId = (typeof w === 'object') ? (w.id || w._id || w.domain || w.name) : w
    const domainName = (typeof w === 'object') ? (w.domain || w.name || w.url || 'this website') : w
    if (!confirm(`Are you sure you want to remove ${domainName}? This will disconnect all protection.`)) return
    try {
      await api.removeUserWebsite(targetId)
      setFeedbackMsg({ type: 'success', text: `Website "${domainName}" removed.` })
      userStore.remove('websites')
      userStore.remove('dashboard')
      fetchData()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to remove website' })
    }
  }

  const handleCopyKey = async () => {
    if (!modalKey) return
    const ok = await copyToClipboard(modalKey)
    if (ok) {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2200)
    }
  }

  const handleCopyEndpoint = async () => {
    const ok = await copyToClipboard(apiEndpoint)
    if (ok) {
      setCopiedEndpoint(true)
      setTimeout(() => setCopiedEndpoint(false), 2200)
    }
  }

  const handleCopySnippet = async (code) => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2200)
    }
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#2563eb', marginBottom: '12px' }}></i>
        <div>Loading your protected websites...</div>
      </div>
    )
  }

  // Code integration snippets
  const expressSnippet = `// 1. Install official NPM package
// npm install mdefender-pro express

const express = require('express');
const { mdefender } = require('mdefender-pro');

const app = express();

// 2. Attach MDefender Pro WAF Middleware
app.use(mdefender({
  apiKey: '${modalKey || 'YOUR_API_KEY_HERE'}',
  domain: '${modalDomain || 'yourdomain.com'}',
  apiEndpoint: '${apiEndpoint}',
  mode: 'block' // 'block' | 'monitor' | 'off'
}));

app.get('/', (req, res) => {
  res.send('Protected by MDefender Pro!');
});

app.listen(3000, () => console.log('Server running on port 3000'));`

  const pythonSnippet = `# 1. Install required dependencies
# pip install requests fastapi uvicorn

import requests
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

MDEFENDER_KEY = "${modalKey || 'YOUR_API_KEY_HERE'}"
MDEFENDER_ENDPOINT = "${apiEndpoint}/api/v1/waf/analyze"

@app.middleware("http")
async def mdefender_waf_middleware(request: Request, call_next):
    # Live WAF inspect
    client_ip = request.client.host
    try:
        res = requests.post(MDEFENDER_ENDPOINT, json={
            "api_key": MDEFENDER_KEY,
            "ip": client_ip,
            "path": request.url.path,
            "method": request.method
        }, timeout=0.8)
        if res.status_code == 200 and res.json().get("action") == "block":
            raise HTTPException(status_code=403, detail="Request blocked by MDefender Pro WAF")
    except HTTPException:
        raise
    except Exception:
        pass # Fail open on network glitch
    return await call_next(request)`

  const phpSnippet = `<?php
// 1. MDefender Pro PHP Integration
define('MDEFENDER_API_KEY', '${modalKey || 'YOUR_API_KEY_HERE'}');
define('MDEFENDER_API_ENDPOINT', '${apiEndpoint}');

function mdefender_waf_protect() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    
    $payload = json_encode([
        'api_key' => MDEFENDER_API_KEY,
        'ip' => $ip,
        'path' => $uri,
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET'
    ]);
    
    $ch = curl_init(MDEFENDER_API_ENDPOINT . '/api/v1/waf/analyze');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT_MS, 800);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if ($result && isset($result['action']) && $result['action'] === 'block') {
        http_response_code(403);
        die('<h1>403 Forbidden</h1><p>Access blocked by MDefender Pro WAF.</p>');
    }
}
mdefender_waf_protect();
?>`

  const reactSnippet = `// 1. Install official NPM package
// npm install mdefender-pro

import { initWaf } from 'mdefender-pro/client';

// 2. Initialize in your main.jsx or App.jsx
initWaf({
  apiKey: '${modalKey || 'YOUR_API_KEY_HERE'}',
  backendUrl: '${apiEndpoint}',
  mode: 'block'
});`

  const envSnippet = `# .env Configuration
MDEFENDER_API_KEY=${modalKey || 'YOUR_API_KEY_HERE'}
MDEFENDER_DOMAIN=${modalDomain || 'yourdomain.com'}
MDEFENDER_API_ENDPOINT=${apiEndpoint}
MDEFENDER_MODE=block`

  return (
    <div style={{ padding: '4px 0 40px' }}>
      {/* Premium Banner */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '12px', border: '1px solid #fde68a',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fas fa-crown" style={{ fontSize: '20px', color: '#d97706' }}></i>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#92400e' }}>Free Tier Active</div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>Upgrade to Premium for unlimited protected domains, real-time ML rules &amp; priority telemetry.</div>
            </div>
          </div>
          <a href="/user/settings" style={{
            padding: '8px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}>
            <i className="fas fa-arrow-up"></i> Upgrade to Premium
          </a>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div style={{
          padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: feedbackMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: feedbackMsg.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Add New Website Card */}
      <div className="card" style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '24px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #0f172a)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            <i className="fas fa-plus"></i>
          </span>
          Connect New Website
        </h3>

        <form onSubmit={handleAddWebsite} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Domain input */}
          <div style={{ flex: '2 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. mycompany.com or store.example.org"
              value={newWebsite}
              onChange={e => setNewWebsite(e.target.value)}
              style={{
                width: '100%', height: '46px', padding: '0 16px', border: '1.5px solid var(--border-color, #cbd5e1)', borderRadius: '10px',
                fontSize: '14px', fontFamily: 'inherit', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-main, #0f172a)', fontWeight: '600',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {/* Platform select */}
          <div style={{ flex: '1 1 180px' }}>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              style={{
                width: '100%', height: '46px', padding: '0 14px', border: '1.5px solid var(--border-color, #cbd5e1)', borderRadius: '10px',
                fontSize: '13.5px', fontFamily: 'inherit', background: 'var(--input-bg, #f8fafc)', color: 'var(--text-main, #0f172a)', fontWeight: '600',
                boxSizing: 'border-box', cursor: 'pointer'
              }}
            >
              <option value="wordpress">WordPress Plugin</option>
              <option value="express">Node.js / Express</option>
              <option value="python">Python / FastAPI / Django</option>
              <option value="php">PHP / Laravel</option>
              <option value="react">React / Frontend SPA</option>
              <option value="other">Custom API / Other</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={adding}
            className="btn-primary"
            style={{
              height: '46px', padding: '0 26px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
              display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: adding ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', flexShrink: 0
            }}
          >
            <i className={`fas ${adding ? 'fa-spinner fa-spin' : 'fa-shield-halved'}`}></i>
            <span>{adding ? 'Connecting...' : 'Add & Protect'}</span>
          </button>
        </form>
      </div>

      {/* Protected Websites List */}
      <div className="card" style={{
        background: 'var(--card-bg, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main, #0f172a)', margin: '0 0 2px' }}>
              My Protected Websites ({data?.websites?.length || 0})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Manage website API keys, protection status, and integration settings.
            </p>
          </div>
          <button onClick={fetchData} className="btn-small" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-rotate"></i>
            <span>Refresh</span>
          </button>
        </div>

        <div>
          {data?.websites?.length ? data.websites.map((w, i) => (
            <div key={w.id || w._id || i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: i < data.websites.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none',
              transition: 'background 0.15s', flexWrap: 'wrap', gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#10b981',
                  border: '1px solid #bbf7d0'
                }}>
                  <i className="fas fa-globe"></i>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{w.domain || w.url || w.name || w}</span>
                    <span className="badge success" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                      <i className="fas fa-circle" style={{ fontSize: '6px', marginRight: '4px' }}></i>
                      {w.status || 'Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                    {w.platform ? `Platform: ${w.platform} • ` : ''}Added: {w.added_at || 'Protected'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* View Key & Setup Button */}
                <button
                  onClick={() => handleOpenKeyModal(w)}
                  style={{
                    padding: '8px 16px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s'
                  }}
                >
                  <i className="fas fa-key"></i>
                  <span>API Key &amp; Setup</span>
                </button>

                {/* Remove Website Button */}
                <button
                  onClick={() => handleRemoveWebsite(w)}
                  style={{
                    padding: '8px 14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                    borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                  }}
                >
                  <i className="fas fa-trash-can"></i>
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '56px 20px', color: '#94a3b8' }}>
              <i className="fas fa-shield-halved" style={{ fontSize: '40px', display: 'block', marginBottom: '14px', color: '#cbd5e1' }}></i>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>No Websites Connected Yet</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>Add your first website above to generate your API key and activate real-time WAF protection.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENTERPRISE-GRADE PRO API KEY & INTEGRATION HUB MODAL (WHITE DASHBOARD THEME) */}
      {/* ========================================================================= */}
      {showKeyModal && (
        <div
          onClick={() => setShowKeyModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '24px 16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              width: '100%', maxWidth: '720px', maxHeight: '90vh',
              overflowY: 'auto', display: 'flex', flexDirection: 'column',
              color: '#0f172a',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '19px', color: '#ffffff'
                }}>
                  <i className="fas fa-key"></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.2px' }}>
                      API Key &amp; Integration Hub
                    </h3>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', color: '#059669',
                      background: '#ecfdf5', border: '1px solid #a7f3d0',
                      padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      Active WAF
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Target Host:</span>
                    <strong style={{
                      color: '#0284c7', background: '#f0f9ff', padding: '1px 8px',
                      borderRadius: '6px', border: '1px solid #bae6fd', fontFamily: 'Consolas, Monaco, monospace'
                    }}>
                      {modalDomain}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowKeyModal(false)}
                aria-label="Close modal"
                style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  color: '#64748b', width: '36px', height: '36px', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              
              {/* API Key Vault Card */}
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px', padding: '18px 20px', marginBottom: '24px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-lock" style={{ fontSize: '12px', color: '#0284c7' }}></i>
                    <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569' }}>
                      Secret API Key
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', color: '#475569',
                      background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px',
                      marginLeft: '4px'
                    }}>
                      PRODUCTION
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    style={{
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      color: '#0284c7', padding: '4px 10px', borderRadius: '6px',
                      fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <i className={`fas ${isMasked ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    <span>{isMasked ? 'Reveal Key' : 'Hide Key'}</span>
                  </button>
                </div>

                {/* Key Display & One-Click Copy */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#ffffff', border: '1.5px solid #cbd5e1',
                  borderRadius: '12px', padding: '6px 6px 6px 14px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    flex: 1, fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13.5px', color: isMasked ? '#94a3b8' : '#0f172a',
                    letterSpacing: isMasked ? '2px' : '0.4px', wordBreak: 'break-all',
                    fontWeight: '700', userSelect: isMasked ? 'none' : 'all'
                  }}>
                    {isMasked
                      ? (modalKey ? '•'.repeat(Math.min(modalKey.length || 32, 34)) : '••••••••••••••••••••••••••••••••')
                      : (modalKey || 'No API key generated')}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      padding: '10px 18px',
                      background: copiedKey ? '#10b981' : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '700', fontSize: '12.5px',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      boxShadow: copiedKey ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(2, 132, 199, 0.25)',
                      transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    <i className={`fas ${copiedKey ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                {/* Security footer under key */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-shield-halved" style={{ color: '#10b981' }}></i>
                    <span>Store this secret key securely in your environment variables.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    style={{
                      background: 'none', border: 'none', color: '#e11d48',
                      fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      opacity: regenerating ? 0.6 : 1
                    }}
                  >
                    <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                    <span>{regenerating ? 'Regenerating...' : 'Regenerate Key'}</span>
                  </button>
                </div>
              </div>

              {/* Integration Guides Hub */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-bolt" style={{ color: '#d97706' }}></i>
                      <span>Fast Integration (1-Minute Setup)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Choose your backend or CMS stack for plug-and-play setup instructions.
                    </div>
                  </div>
                </div>

                {/* Modern Pill Tabs */}
                <div style={{
                  display: 'flex', gap: '6px', marginBottom: '16px',
                  background: '#f1f5f9', padding: '5px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', flexWrap: 'wrap'
                }}>
                  {[
                    { id: 'wordpress', label: 'WordPress', icon: 'fa-wordpress', color: '#0284c7' },
                    { id: 'express', label: 'Node / Express', icon: 'fa-node-js', color: '#16a34a' },
                    { id: 'python', label: 'Python / FastAPI', icon: 'fa-python', color: '#ca8a04' },
                    { id: 'php', label: 'PHP / Laravel', icon: 'fa-php', color: '#6366f1' },
                    { id: 'react', label: 'React SPA', icon: 'fa-react', color: '#0891b2' },
                    { id: 'env', label: '.env Config', icon: 'fa-file-code', color: '#475569' },
                  ].map(tab => {
                    const isActive = modalTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setModalTab(tab.id)}
                        style={{
                          flex: '1 1 95px', padding: '8px 12px', border: 'none', borderRadius: '8px',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#0f172a' : '#64748b',
                          boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                          border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className={`fab ${tab.icon}`} style={{ color: isActive ? tab.color : '#94a3b8' }}></i>
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* ================= TAB 1: WordPress ================= */}
                {modalTab === 'wordpress' && (
                  <div style={{
                    background: '#ffffff', border: '1px solid #e2e8f0',
                    borderRadius: '14px', padding: '20px', color: '#334155',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    {/* WordPress Download Card */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      border: '1px solid #bae6fd', borderRadius: '12px',
                      padding: '16px 18px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '10px',
                          background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
                        }}>
                          <i className="fab fa-wordpress"></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0369a1' }}>
                            MDefender Pro WordPress Security Plugin
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '2px' }}>
                            Official release v2.0 • Real-time WAF &amp; Malware scanner
                          </div>
                        </div>
                      </div>

                      <a
                        href="/api/v1/wordpress/download"
                        download="mdefender-pro.zip"
                        style={{
                          padding: '9px 18px', background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700',
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <i className="fas fa-download"></i>
                        <span>Download .ZIP</span>
                      </a>
                    </div>

                    {/* Step-by-Step Setup */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe',
                          color: '#0284c7', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>1</span>
                        <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                          Upload the plugin in your WP Dashboard under <strong>Plugins &rarr; Add New Plugin &rarr; Upload Plugin</strong> and click <strong>Activate</strong>.
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe',
                          color: '#0284c7', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>2</span>
                        <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155', flex: 1 }}>
                          In WP Admin &rarr; <strong>MDefender Pro &rarr; Settings</strong>, paste your <strong>Site Secret API Key</strong>:
                          <div style={{
                            marginTop: '6px', background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: '8px'
                          }}>
                            <span style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#0284c7', wordBreak: 'break-all', fontWeight: '700' }}>
                              {modalKey || 'API_KEY_HERE'}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyKey}
                              style={{
                                background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                            >
                              <i className={`fas ${copiedKey ? 'fa-check text-green-600' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                              {copiedKey ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe',
                          color: '#0284c7', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>3</span>
                        <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155', flex: 1 }}>
                          Set <strong>API Endpoint URL</strong> to:
                          <div style={{
                            marginTop: '6px', background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: '8px'
                          }}>
                            <span style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#4f46e5', fontWeight: '700' }}>
                              {apiEndpoint}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyEndpoint}
                              style={{
                                background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                            >
                              <i className={`fas ${copiedEndpoint ? 'fa-check text-green-600' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>
                              {copiedEndpoint ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= CODE TABS (Express, Python, PHP, React, .env) ================= */}
                {modalTab !== 'wordpress' && (
                  <div style={{
                    background: '#0f172a', border: '1px solid #334155',
                    borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)'
                  }}>
                    {/* IDE Header Bar */}
                    <div style={{
                      background: '#1e293b', padding: '10px 16px',
                      borderBottom: '1px solid #334155',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        </div>
                        <span style={{ fontSize: '11.5px', fontFamily: 'Consolas, monospace', color: '#e2e8f0', marginLeft: '6px', fontWeight: '600' }}>
                          {modalTab === 'express' ? 'server.js' : modalTab === 'python' ? 'main.py' : modalTab === 'php' ? 'mdefender_waf.php' : modalTab === 'react' ? 'main.jsx' : '.env'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySnippet(
                          modalTab === 'express' ? expressSnippet :
                          modalTab === 'python' ? pythonSnippet :
                          modalTab === 'php' ? phpSnippet :
                          modalTab === 'react' ? reactSnippet : envSnippet
                        )}
                        style={{
                          background: '#334155', border: '1px solid #475569',
                          color: '#ffffff', padding: '4px 12px', borderRadius: '6px', fontSize: '11.5px',
                          fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#475569'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#334155'; }}
                      >
                        <i className={`fas ${copiedSnippet ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
                        <span>{copiedSnippet ? 'Copied Code!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    {/* Pre Code Box */}
                    <pre style={{
                      margin: 0, padding: '16px 20px', color: '#f1f5f9',
                      fontSize: '12.5px', fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      lineHeight: '1.6', overflowX: 'auto', maxHeight: '250px', background: '#0b1120'
                    }}>
                      <code>
                        {modalTab === 'express' && expressSnippet}
                        {modalTab === 'python' && pythonSnippet}
                        {modalTab === 'php' && phpSnippet}
                        {modalTab === 'react' && reactSnippet}
                        {modalTab === 'env' && envSnippet}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-book-open" style={{ color: '#0284c7' }}></i>
                <span>Need more setup help? Check the <a href="/docs" target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '700' }}>WAF Documentation &rarr;</a></span>
              </div>

              <button
                onClick={() => setShowKeyModal(false)}
                className="btn-primary"
                style={{
                  height: '38px', padding: '0 24px', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: '#ffffff',
                  border: 'none', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', cursor: 'pointer'
                }}
              >
                Done &amp; Activated
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Limit Prompt Modal (Clean White Theme) */}
      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)', width: '100%', maxWidth: '480px',
              padding: '32px', textAlign: 'center', color: '#0f172a'
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              marginBottom: '18px', boxShadow: '0 8px 20px rgba(217, 119, 6, 0.25)'
            }}>
              <i className="fas fa-crown"></i>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px' }}>
              Upgrade to Premium Plan
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }}>
              Your current plan website limit has been reached. Upgrade to Premium to connect unlimited websites, unlock real-time ML threat detection, and priority support.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Close
              </button>
              <a
                href="/user/settings"
                style={{
                  padding: '10px 24px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)'
                }}
              >
                <i className="fas fa-bolt"></i> Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

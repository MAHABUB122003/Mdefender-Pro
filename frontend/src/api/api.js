const API_BASE = (
  typeof window !== 'undefined' && (window.location.hostname === 'mdefender-pro.crafix.tech' || window.location.hostname !== 'localhost')
    ? ''
    : (import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE !== 'http://localhost:8000'
        ? import.meta.env.VITE_API_BASE
        : 'http://localhost:8000')
).replace(/\/+$/, "");

let csrfToken = null;

function getCsrfToken() {
  const match = document.cookie.match(/mdefender_csrf=([^;]+)/);
  return match ? match[1] : csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

function getAccessToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('mdefender_access') || localStorage.getItem('mdefender_user_token');
  }
  return null;
}

function getRefreshToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('mdefender_refresh');
  }
  return null;
}

function storeTokens(data) {
  if (typeof localStorage !== 'undefined') {
    if (data.access_token) localStorage.setItem('mdefender_access', data.access_token);
    if (data.refresh_token) localStorage.setItem('mdefender_refresh', data.refresh_token);
    if (data.user?.full_name || data.user?.name) {
      localStorage.setItem('mdefender_user_name', data.user.full_name || data.user.name);
    }
    if (data.user?.plan) {
      localStorage.setItem('mdefender_user_plan', data.user.plan);
    }
  }
  if (typeof sessionStorage !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('mdf_cache_')) sessionStorage.removeItem(k);
      });
    } catch {}
  }
}

export function clearTokens() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('mdefender_access');
    localStorage.removeItem('mdefender_refresh');
    localStorage.removeItem('mdefender_user_name');
    localStorage.removeItem('mdefender_user_plan');
  }
  if (typeof sessionStorage !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('mdf_cache_')) sessionStorage.removeItem(k);
      });
    } catch {}
  }
}

async function apiCall(endpoint, options = {}) {
  const accessToken = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const isAuthOrHeavy = endpoint.includes('/auth/') || endpoint.includes('/scan') || endpoint.includes('/blacklist') || endpoint.includes('/sync');
  const defaultTimeout = isAuthOrHeavy ? 35000 : 25000;
  const { skipAuthRedirect, timeout = defaultTimeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort(new Error('Server connection timed out: The backend service took too long to respond.'));
    } catch {
      controller.abort();
    }
  }, timeout);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: options.signal || controller.signal,
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError' || String(fetchErr.message || '').toLowerCase().includes('aborted')) {
      throw new Error('Server connection timed out: The backend service is currently unreachable or still starting up. Please check your server.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || (response.status === 403 && (endpoint === '/api/auth/me' || endpoint === '/api/auth/refresh'))) {
    const data = await response.json().catch(() => ({}));

    if (data.mfa_required) {
      return data;
    }

    const authFlowEndpoints = [
      '/api/auth/login', '/api/auth/admin/login',
      '/api/auth/register', '/api/auth/verify-email',
      '/api/auth/resend-verification', '/api/auth/forgot-password',
      '/api/auth/reset-password', '/api/auth/mfa/verify',
      '/api/auth/google/callback',
    ];
    if (authFlowEndpoints.includes(endpoint)) {
      if (!response.ok) {
        throw new Error(data.detail || data.message || data.error || `Request failed (${response.status})`);
      }
      return data;
    }

    const publicPaths = ['/', '/pricing', '/about', '/blog', '/docs', '/blocked', '/register', '/user/login', '/admin/login', '/payment/success'];
    const isPublicPage = typeof window !== 'undefined' && publicPaths.includes(window.location.pathname);

    if (skipAuthRedirect || endpoint === '/api/auth/me' || endpoint === '/api/auth/refresh' || endpoint.includes('/pricing/') || isPublicPage) {
      if (endpoint === '/api/auth/me' || endpoint === '/api/auth/refresh') {
        clearTokens();
      }
      throw new Error(data.detail || data.message || 'Unauthorized');
    }

    const isAdminEndpoint = endpoint.startsWith('/api/admin/') || endpoint.startsWith('/api/v1/admin/');
    clearTokens();
    if (isAdminEndpoint) {
      window.location.href = '/admin/login';
    } else {
      window.location.href = '/user/login';
    }
    throw new Error('Unauthorized');
  }

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }
  if (!response.ok) {
    throw new Error(data.message || data.detail || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  register: (data) => apiCall('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  verifyEmail: (token, email) => apiCall('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token, email }) }),

  resendVerification: (email) => apiCall('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  login: (emailOrUsername, password, rememberMe = false) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email_or_username: emailOrUsername, password, remember_me: rememberMe }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      storeTokens(data);
      return data;
    }),

  verifyMFA: (tempToken, code) =>
    apiCall('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken, code }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      storeTokens(data);
      return data;
    }),

  adminLogin: (username, password) =>
    apiCall('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      storeTokens(data);
      return data;
    }),

  logout: () => {
    clearTokens();
    return apiCall('/api/auth/logout', { method: 'POST' });
  },

  logoutAll: () => {
    clearTokens();
    return apiCall('/api/auth/logout-all', { method: 'POST' });
  },

  refreshToken: () => apiCall('/api/auth/refresh', {
    method: 'POST',
    headers: getRefreshToken() ? { 'X-Refresh-Token': getRefreshToken() } : {},
  }).then(data => {
    if (data.csrf_token) setCsrfToken(data.csrf_token);
    storeTokens(data);
    return data;
  }),

  getMe: () => apiCall('/api/auth/me'),

  getProfile: () => apiCall('/api/user/profile'),

  updateProfile: (data) => apiCall('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (data) => apiCall('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  changeEmail: (data) => apiCall('/api/auth/change-email', { method: 'POST', body: JSON.stringify(data) }),

  forgotPassword: (email) => apiCall('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  verifyResetOtp: (email, otp) => apiCall('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  }),

  resetPassword: (tokenOrObj, password, confirmPassword) => {
    if (typeof tokenOrObj === 'object' && tokenOrObj !== null) {
      return apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenOrObj.token || tokenOrObj.otp,
          otp: tokenOrObj.otp,
          email: tokenOrObj.email,
          password: tokenOrObj.password,
          confirm_password: tokenOrObj.confirmPassword || tokenOrObj.confirm_password,
        }),
      });
    }
    return apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: tokenOrObj, password, confirm_password: confirmPassword }),
    });
  },

  getGoogleAuthUrl: () => apiCall('/api/auth/google/url'),

  googleCallback: (code) =>
    apiCall('/api/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      storeTokens(data);
      return data;
    }),

  enableMFA: () => apiCall('/api/auth/mfa/enable', { method: 'POST' }),

  verifyMFASetup: (code) =>
    apiCall('/api/auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disableMFA: (password, code) =>
    apiCall('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),

  getMFAStatus: () => apiCall('/api/auth/mfa/status'),

  getSessions: () => apiCall('/api/auth/sessions'),

  deleteSession: (sessionId) => apiCall(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  deleteAllSessions: () => apiCall('/api/auth/sessions', { method: 'DELETE' }),

  getAuditLogs: (limit = 50, skip = 0) =>
    apiCall(`/api/auth/audit-logs?limit=${limit}&skip=${skip}`),

  adminGetUsers: () => apiCall('/api/auth/admin/users'),
  adminGetSessions: () => apiCall('/api/auth/admin/sessions'),
  adminForceLogout: (userId) => apiCall(`/api/auth/admin/force-logout/${userId}`, { method: 'POST' }),
  adminDisableUser: (userId) => apiCall(`/api/auth/admin/disable-user/${userId}`, { method: 'POST' }),
  adminEnableUser: (userId) => apiCall(`/api/auth/admin/enable-user/${userId}`, { method: 'POST' }),
  adminUnlockUser: (emailOrUsername) =>
    apiCall('/api/auth/admin/unlock-user', { method: 'POST', body: JSON.stringify({ email_or_username: emailOrUsername }) }),
  adminResetMFA: (userId) => apiCall(`/api/auth/admin/reset-mfa/${userId}`, { method: 'POST' }),
  adminGetLockedAccounts: () => apiCall('/api/auth/admin/locked-accounts'),
  adminGetAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/auth/admin/audit-logs${qs ? '?' + qs : ''}`)
  },
  adminGetSecurityEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/auth/admin/security-events${qs ? '?' + qs : ''}`)
  },

  getStats: () => apiCall('/api/admin/stats'),
  getMlStatus: () => apiCall('/api/ml/status'),
  scanFile: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const headers = {}
    const accessToken = getAccessToken()
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    const response = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    })
    return response.json()
  },
  scanContent: (data) => apiCall('/api/scan', { method: 'POST', body: JSON.stringify(data) }),
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/admin/logs${qs ? '?' + qs : ''}`)
  },
  getRules: () => apiCall('/api/admin/rules'),
  createRule: (data) => apiCall('/api/admin/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id, data) => apiCall(`/api/admin/rules?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id) => apiCall(`/api/admin/rules?id=${id}`, { method: 'DELETE' }),
  getClients: () => apiCall('/api/admin/clients'),
  addClient: (data) => apiCall('/api/admin/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => apiCall(`/api/admin/clients?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => apiCall(`/api/admin/clients?id=${id}`, { method: 'DELETE' }),
  getBlacklist: () => apiCall('/api/admin/blacklist'),
  addBlacklist: (data) => apiCall('/api/admin/blacklist', { method: 'POST', body: JSON.stringify(data) }),
  removeBlacklist: (ip) => apiCall(`/api/admin/blacklist?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' }),
  getSettings: () => apiCall('/api/admin/settings'),
  updateSettings: (data) => apiCall('/api/admin/settings', { method: 'POST', body: JSON.stringify(data) }),
  changeAdminPassword: (data) => apiCall('/api/admin/change_password', { method: 'POST', body: JSON.stringify(data) }),
  cleanLogs: (days) => apiCall('/api/admin/clean_logs', { method: 'POST', body: JSON.stringify({ days }) }),
  cleanAllLogs: () => apiCall('/api/admin/clean_all_logs', { method: 'POST' }),
  resetStats: (collection) => apiCall(`/api/admin/reset_stats/${collection}`, { method: 'POST' }),
  cleanAutoBlocks: () => apiCall('/api/admin/clean_auto_blocks', { method: 'POST' }),
  cleanAttackAttempts: (days) => apiCall('/api/admin/clean_attack_attempts', { method: 'POST', body: JSON.stringify({ days }) }),
  getAutoBlockSettings: () => apiCall('/api/admin/auto_block_settings'),
  updateAutoBlockSettings: (data) => apiCall('/api/admin/auto_block_settings', { method: 'POST', body: JSON.stringify(data) }),
  getAutoBlockStats: () => apiCall('/api/admin/auto_block_stats'),
  adminGetAllUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/admin/users${qs ? '?' + qs : ''}`)
  },
  adminGetUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/admin/users${qs ? '?' + qs : ''}`)
  },
  adminCreateUser: (data) => apiCall('/api/v1/admin/users/create', { method: 'POST', body: JSON.stringify(data) }),
  adminGiftPlan: (data) => apiCall('/api/v1/admin/users/gift-plan', { method: 'POST', body: JSON.stringify(data) }),
  adminChangeUserPassword: (userId, newPassword) => apiCall('/api/v1/admin/users/change-password', { method: 'POST', body: JSON.stringify({ user_id: userId, new_password: newPassword }) }),
  adminUnlockUser: (userId) => apiCall('/api/v1/admin/users/unlock', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminVerifyUserEmail: (userId) => apiCall('/api/v1/admin/users/verify-email', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminResetUserApiKey: (userId) => apiCall('/api/v1/admin/users/reset-key', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminResetUserMFA: (userId) => apiCall('/api/v1/admin/users/reset-mfa', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminForceLogoutUser: (userId) => apiCall('/api/v1/admin/users/force-logout', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminUpdateUserPlan: (userId, plan, durationDays = 30) => apiCall('/api/v1/admin/users/plan', { method: 'POST', body: JSON.stringify({ user_id: userId, plan, duration_days: durationDays }) }),
  adminSuspendUser: (userId) => apiCall('/api/v1/admin/users/suspend', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminRestoreUser: (userId) => apiCall('/api/v1/admin/users/restore', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminUpdateUserRole: (userId, role) => apiCall('/api/v1/admin/users/role', { method: 'POST', body: JSON.stringify({ user_id: userId, role }) }),
  adminDeleteUser: (userId) => apiCall(`/api/v1/admin/users/${userId}`, { method: 'DELETE' }),

  adminGetPricing: () => apiCall('/api/v1/admin/pricing'),
  adminUpdatePricing: (plans) => apiCall('/api/v1/admin/pricing', { method: 'POST', body: JSON.stringify({ plans }) }),

  adminGetTenantWebsites: () => apiCall('/api/v1/admin/websites'),
  adminDeleteTenantWebsite: (id) => apiCall(`/api/v1/admin/websites/${id}`, { method: 'DELETE' }),

  adminGetOverview: () => apiCall('/api/v1/admin/overview'),
  adminGetSystemHealth: () => apiCall('/api/v1/admin/system-health'),

  getUserProfile: () => apiCall('/api/user/profile'),
  updateUserProfile: (data) => apiCall('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changeUserPassword: (data) => apiCall('/api/user/change_password', { method: 'POST', body: JSON.stringify(data) }),
  regenerateApiKey: (data) => apiCall('/api/user/regenerate_key', { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  getUserWebsites: (platform) => apiCall(`/api/v1/websites${platform ? `?platform=${encodeURIComponent(platform)}` : ''}`),
  addUserWebsite: (data) => apiCall('/api/user/websites', { method: 'POST', body: JSON.stringify(data) }),
  removeUserWebsite: async (id, domain) => {
    const params = new URLSearchParams()
    if (id) params.set('id', id)
    if (domain) params.set('domain', domain)
    try {
      return await apiCall(`/api/user/websites?${params.toString()}`, { method: 'DELETE' });
    } catch (err) {
      return await apiCall(`/api/v1/websites/${encodeURIComponent(id || domain)}`, { method: 'DELETE' });
    }
  },
  verifyWebsiteDns: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/verify-dns`, { method: 'POST' }),
  getWebsiteInstallation: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/installation`),
  toggleWebsiteUnderAttack: (websiteId, enabled) => apiCall(`/api/v1/websites/${websiteId}/under-attack`, { method: 'POST', body: JSON.stringify({ enabled }) }),
  getWebsiteSecuritySettings: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/security-settings`),
  updateWebsiteSecuritySettings: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/security-settings`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  triggerWebsiteScan: (websiteId, scanType = 'full') =>
    apiCall(`/api/v1/websites/${websiteId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ scan_type: scanType })
    }),
  getWebsiteScans: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/scans`),
  remoteWebsiteAction: (websiteId, action, payload = {}) =>
    apiCall(`/api/v1/websites/${websiteId}/remote-action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    }),

  // Cloudflare-Style Domain & DNS Zone Management APIs
  getDomainsOverview: () => apiCall('/api/v1/domains/overview'),
  getDomains: () => apiCall('/api/v1/domains'),
  createDomain: (data) => apiCall('/api/v1/domains', { method: 'POST', body: JSON.stringify(data) }),
  getDomainDetails: (id) => apiCall(`/api/v1/domains/${id}`),
  deleteDomain: (id) => apiCall(`/api/v1/domains/${id}`, { method: 'DELETE' }),
  verifyDomainOwnership: (id) => apiCall(`/api/v1/domains/${id}/ownership/verify`, { method: 'POST' }),
  checkDomainDelegation: (id) => apiCall(`/api/v1/domains/${id}/delegation/check`, { method: 'POST' }),
  updateDomainOrigin: (id, data) => apiCall(`/api/v1/domains/${id}/origin`, { method: 'PUT', body: JSON.stringify(data) }),
  checkDomainOrigin: (id) => apiCall(`/api/v1/domains/${id}/origin/check`, { method: 'POST' }),
  activateDomainProtection: (id) => apiCall(`/api/v1/domains/${id}/activate`, { method: 'POST' }),
  pauseDomainProtection: (id) => apiCall(`/api/v1/domains/${id}/pause`, { method: 'POST' }),

  discoverDns: (domain, scanSubdomains = true) =>
    apiCall('/api/v1/websites/dns/discover', { method: 'POST', body: JSON.stringify({ domain, scan_subdomains: scanSubdomains }) }),
  getWebsiteZone: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/zone`),
  getDnsRecords: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/dns`),
  addDnsRecord: (websiteId, data) =>
    apiCall(`/api/v1/websites/${websiteId}/dns`, { method: 'POST', body: JSON.stringify(data) }),
  updateDnsRecord: (websiteId, recordId, data) =>
    apiCall(`/api/v1/websites/${websiteId}/dns/${recordId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDnsRecord: (websiteId, recordId) =>
    apiCall(`/api/v1/websites/${websiteId}/dns/${recordId}`, { method: 'DELETE' }),
  toggleDnsProxy: (websiteId, recordId) =>
    apiCall(`/api/v1/websites/${websiteId}/dns/${recordId}/toggle-proxy`, { method: 'POST' }),
  updateSslMode: (websiteId, sslMode) =>
    apiCall(`/api/v1/websites/${websiteId}/ssl`, { method: 'POST', body: JSON.stringify({ ssl_mode: sslMode }) }),
  getUniversalSsl: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/ssl`),
  updateSslSettings: (websiteId, settings) =>
    apiCall(`/api/v1/websites/${websiteId}/ssl/settings`, { method: 'POST', body: JSON.stringify(settings) }),
  reissueEdgeCert: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/ssl/reissue`, { method: 'POST' }),
  probeSslHealth: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/ssl/probe`),
  toggleBotChallenge: (websiteId, enabled, mode = 'interactive_turnstile') =>
    apiCall(`/api/v1/websites/${websiteId}/bot-challenge`, {
      method: 'POST',
      body: JSON.stringify({ enabled, challenge_mode: mode })
    }),
  getUserDashboard: (params = {}) => {
    let qs = ''
    if (typeof params === 'string') qs = `website_id=${encodeURIComponent(params)}`
    else if (params && typeof params === 'object') qs = new URLSearchParams(params).toString()
    return apiCall(`/api/user/dashboard${qs ? '?' + qs : ''}`)
  },
  upgradePlan: (days = 30) => apiCall('/api/user/upgrade-plan', { method: 'POST', body: JSON.stringify({ plan: 'premium', days }) }),
  downgradePlan: () => apiCall('/api/user/downgrade-plan', { method: 'POST' }),
  // Paddle & Public Pricing APIs
  getPublicPricing: () => apiCall('/api/v1/pricing/plans', { skipAuthRedirect: true }).catch(() => ({ data: { plans: [] } })),
  getBillingConfig: () => apiCall('/api/v1/billing/config', { skipAuthRedirect: true }),
  getBillingPlans: () => apiCall('/api/v1/billing/plans', { skipAuthRedirect: true }),
  createPaddleCheckout: (data) => apiCall('/api/v1/billing/checkout', { method: 'POST', body: JSON.stringify(data), skipAuthRedirect: true }),
  getBillingSubscription: () => apiCall('/api/v1/billing/subscription'),
  cancelSubscription: () => apiCall('/api/v1/billing/cancel', { method: 'POST' }),
  changeBillingPlan: (plan) => apiCall('/api/v1/billing/change-plan', { method: 'POST', body: JSON.stringify({ plan }) }),

  getPaymentConfig: () => apiCall('/api/payment/config'),
  createStripeCheckoutSession: (data) => apiCall('/api/payment/create-checkout-session', { method: 'POST', body: JSON.stringify(data) }),
  verifyStripeSession: (sessionId) => apiCall('/api/payment/verify-session', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  getBkashConfig: () => apiCall('/api/payment/bkash/config'),
  createBkashPayment: (data) => apiCall('/api/payment/bkash/create', { method: 'POST', body: JSON.stringify(data) }),
  verifyBkashPayment: (data) => apiCall('/api/payment/bkash/verify', { method: 'POST', body: JSON.stringify(data) }),
  processCardPayment: (data) => apiCall('/api/payment/checkout', { method: 'POST', body: JSON.stringify(data) }),
  processBankTransfer: (data) => apiCall('/api/payment/bank-transfer', { method: 'POST', body: JSON.stringify(data) }),
  processWalletPayment: (data) => apiCall('/api/payment/wallet', { method: 'POST', body: JSON.stringify(data) }),
  getPaymentHistory: () => apiCall('/api/payment/history'),
  getUserLogs: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiCall(`/api/user/logs${qs ? '?' + qs : ''}`) },
  userCleanLogs: (data) => apiCall('/api/user/clean-logs', { method: 'POST', body: JSON.stringify(data) }),
  getLogRecycleSettings: (websiteId) => apiCall(`/api/user/log-recycle-settings${websiteId ? '?website_id=' + encodeURIComponent(websiteId) : ''}`),
  updateLogRecycleSettings: (data) => apiCall('/api/user/log-recycle-settings', { method: 'POST', body: JSON.stringify(data) }),
  getUserRules: () => apiCall('/api/user/rules'),
  createUserRule: (data) => apiCall('/api/user/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateUserRule: (id, data) => apiCall(`/api/user/rules?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUserRule: (id) => apiCall(`/api/user/rules?id=${id}`, { method: 'DELETE' }),
  userBlockIP: (ip, reason) => apiCall('/api/user/block-ip', { method: 'POST', body: JSON.stringify({ ip, reason }) }),
  getUserBlacklist: (params = {}) => {
    const siteId = typeof params === 'string' ? params : (params?.website_id || '');
    const q = siteId && siteId !== 'all' ? `?website_id=${encodeURIComponent(siteId)}` : '';
    return apiCall(`/api/user/blacklist${q}`);
  },
  addUserBlacklist: (data) => apiCall('/api/user/blacklist', { method: 'POST', body: JSON.stringify(data) }),
  removeUserBlacklist: (ip, website_id = '') => {
    const q = website_id && website_id !== 'all' ? `&website_id=${encodeURIComponent(website_id)}` : '';
    return apiCall(`/api/user/blacklist?ip=${encodeURIComponent(ip)}${q}`, { method: 'DELETE' });
  },
  unblockExpiredBlacklist: (website_id = '') => {
    const q = website_id && website_id !== 'all' ? `?website_id=${encodeURIComponent(website_id)}` : '';
    return apiCall(`/api/user/blacklist/unblock-expired${q}`, { method: 'POST' });
  },
  unblockBatchBlacklist: (ips, website_id = '') => apiCall('/api/user/blacklist/unblock-batch', { method: 'POST', body: JSON.stringify({ ips, website_id }) }),
  getDdosStatus: () => apiCall('/api/user/ddos-status'),
  toggleDdos: (enabled) => apiCall('/api/user/ddos-toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  getNotices: () => apiCall('/api/notices'),
  addNotice: (content) => apiCall('/api/notices', { method: 'POST', body: JSON.stringify({ content }) }),
  whoisLookup: (ip) => apiCall(`/api/user/whois?ip=${encodeURIComponent(ip)}`),
  getUserCountryBlocks: (params = {}) => {
    const siteId = typeof params === 'string' ? params : (params?.website_id || '');
    const q = siteId && siteId !== 'all' ? `?website_id=${encodeURIComponent(siteId)}` : '';
    return apiCall(`/api/user/country-blocks${q}`);
  },
  addUserCountryBlock: (data) => apiCall('/api/user/country-blocks', { method: 'POST', body: JSON.stringify(data) }),
  removeUserCountryBlock: (code, website_id = '') => {
    const q = website_id && website_id !== 'all' ? `&website_id=${encodeURIComponent(website_id)}` : '';
    return apiCall(`/api/user/country-blocks?code=${encodeURIComponent(code)}${q}`, { method: 'DELETE' });
  },
  userCleanLogs: (data = {}) => apiCall('/api/user/clean-logs', { method: 'POST', body: JSON.stringify(data) }),
  userResetStats: (data = {}) => apiCall('/api/user/reset-stats', { method: 'POST', body: JSON.stringify(data) }),

  // User Security Configuration & Attack Auto-Block Policies
  getUserSecurityConfig: () => apiCall('/api/user/security-config'),
  updateUserSecurityConfig: (data) => apiCall('/api/user/security-config', { method: 'POST', body: JSON.stringify(data) }),
  getUserAutoBlocks: () => apiCall('/api/user/auto-blocks'),
  deleteUserAutoBlock: (ip) => apiCall(`/api/user/auto-blocks?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' }),
  promoteUserAutoBlock: (ip) => apiCall('/api/user/auto-blocks/promote', { method: 'POST', body: JSON.stringify({ ip }) }),

  // Website Security Audit & Port Diagnostics
  runSecurityAudit: (url) => apiCall('/api/user/security-audit', { method: 'POST', body: JSON.stringify({ url }) }),

  // Attack Learning Hub & Feedback Center
  reportFalsePositive: (data) => apiCall('/api/v1/waf/report-false-positive', { method: 'POST', body: JSON.stringify(data) }),
  adminGetLearningStats: () => apiCall('/api/v1/admin/learning/stats'),
  adminGetLearningReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/admin/learning/reports${qs ? '?' + qs : ''}`)
  },
  adminDeleteLearningReport: (id) => apiCall(`/api/v1/admin/learning/reports/${id}`, { method: 'DELETE' }),
  adminWhitelistPattern: (data) => apiCall('/api/v1/admin/learning/whitelist', { method: 'POST', body: JSON.stringify(data) }),
  adminBlacklistAttack: (data) => apiCall('/api/v1/admin/learning/blacklist', { method: 'POST', body: JSON.stringify(data) }),
  adminTestSandbox: (data) => apiCall('/api/v1/admin/learning/test', { method: 'POST', body: JSON.stringify(data) }),
  adminRetrainWafModel: () => apiCall('/api/v1/admin/learning/retrain', { method: 'POST' }),
  adminGetLearnedSamples: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/admin/learning/samples${qs ? '?' + qs : ''}`)
  },
  adminAddLearnedSample: (data) => apiCall('/api/v1/admin/learning/samples', { method: 'POST', body: JSON.stringify(data) }),
  adminGetWhitelists: () => apiCall('/api/v1/admin/learning/whitelists'),
  adminDeleteWhitelist: (id) => apiCall(`/api/v1/admin/learning/whitelists/${id}`, { method: 'DELETE' }),

  // DDoS Shield APIs
  adminGetDDoSStats: () => apiCall('/api/admin/ddos/dashboard'),
  adminGetDDoSConfig: () => apiCall('/api/admin/ddos/config'),
  adminUpdateDDoSConfig: (data) => apiCall('/api/admin/ddos/config', { method: 'POST', body: JSON.stringify(data) }),
  adminBlockDDoSIp: (ip, level = 4, duration = 3600) => apiCall('/api/admin/ddos/reputation/block', { method: 'POST', body: JSON.stringify({ ip, level, duration }) }),
  adminUnblockDDoSIp: (ip) => apiCall('/api/admin/ddos/reputation/unblock', { method: 'POST', body: JSON.stringify({ ip }) }),

  // Public Pricing APIs
  getPublicPricing: () => apiCall('/api/v1/pricing/plans', { skipAuthRedirect: true }).catch(() => ({ data: { plans: [] } })),

  // Notification & Alerts APIs
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/notifications${qs ? '?' + qs : ''}`)
  },
  getNotificationUnreadCount: () => apiCall('/api/v1/notifications/unread-count'),
  getNotificationPreferences: () => apiCall('/api/v1/notifications/preferences'),
  saveNotificationPreferences: (data) => apiCall('/api/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify(data) }),
  markNotificationRead: (id) => apiCall(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiCall('/api/v1/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id) => apiCall(`/api/v1/notifications/${id}`, { method: 'DELETE' }),
  sendTestNotification: () => apiCall('/api/v1/notifications/test', { method: 'POST' }),

  // Team RBAC APIs
  getTeamMembers: () => apiCall('/api/v1/team/members'),
  inviteTeamMember: (data) => apiCall('/api/v1/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  deleteTeamMember: (id) => apiCall(`/api/v1/team/members/${id}`, { method: 'DELETE' }),
  getTeamAuditLogs: () => apiCall('/api/v1/team/audit'),

  // Real-Time Fleet Performance, SSL & Uptime Monitoring
  getMonitoringOverview: () => apiCall('/api/v1/monitoring/overview'),
  probeWebsiteHealth: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/probe`),
  getWebsitePerformance: (websiteId, strategy = 'desktop') => apiCall(`/api/v1/monitoring/${websiteId}/performance?strategy=${strategy}`),
  runPerformanceAudit: (websiteId, strategy = 'all', force = true) => apiCall(`/api/v1/monitoring/${websiteId}/performance/audit`, { method: 'POST', body: JSON.stringify({ strategy, force }) }),
  getWebsiteSslMonitoring: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/ssl`),
  probeWebsiteSsl: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/ssl/probe`, { method: 'POST' }),
  getWebsiteIncidents: (websiteId, limit = 15) => apiCall(`/api/v1/monitoring/${websiteId}/incidents?limit=${limit}`),
}

export default api


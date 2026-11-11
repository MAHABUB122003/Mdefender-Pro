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
    } catch { }
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
    } catch { }
  }
}

// Singleton lock & queue for background silent token refresh
let isRefreshingToken = false;
let refreshPromise = null;

async function executeSilentRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Refresh-Token': refreshToken,
      'Authorization': `Bearer ${refreshToken}`
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('Refresh token session invalid or expired');
  }

  const data = await res.json();
  if (data && data.access_token) {
    storeTokens(data);
    if (data.csrf_token) setCsrfToken(data.csrf_token);
    return data.access_token;
  }
  throw new Error('No access token returned from refresh');
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

  const isBackupOp = endpoint.includes('/backups');
  const isAuthOrHeavy = isBackupOp || endpoint.includes('/auth/') || endpoint.includes('/scan') || endpoint.includes('/blacklist') || endpoint.includes('/sync');
  const defaultTimeout = isBackupOp ? 300000 : (isAuthOrHeavy ? 60000 : 25000);
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
      '/api/auth/google/callback', '/api/auth/refresh'
    ];
    if (authFlowEndpoints.includes(endpoint)) {
      if (!response.ok) {
        throw new Error(data.detail || data.message || data.error || `Request failed (${response.status})`);
      }
      return data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEAMLESS SILENT REFRESH (Enterprise SaaS Interceptor Pattern)
    // If the access token expired, transparently refresh it using refresh_token
    // and retry the original failed request without interrupting the user.
    // ─────────────────────────────────────────────────────────────────────────
    const refreshToken = getRefreshToken();
    if (!options._isRetry && refreshToken && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/logout') {
      try {
        if (!isRefreshingToken) {
          isRefreshingToken = true;
          refreshPromise = executeSilentRefresh().finally(() => {
            isRefreshingToken = false;
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;
        if (newAccessToken) {
          // Re-issue original request with updated token
          const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${newAccessToken}`
          };
          return await apiCall(endpoint, {
            ...options,
            headers: retryHeaders,
            _isRetry: true
          });
        }
      } catch (refreshErr) {
        // Refresh token itself is dead/expired -> fall through to clean logout
      }
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

  getOnboardingStatus: () => apiCall('/api/user/onboarding-status'),

  saveOnboardingSetup: (data) => apiCall('/api/user/onboarding-setup', { method: 'POST', body: JSON.stringify(data) }),

  completeOnboarding: () => apiCall('/api/user/onboarding-complete', { method: 'POST' }),

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

  regenerateBackupCodes: (password) =>
    apiCall('/api/auth/mfa/regenerate-backup-codes', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

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

  // Virtual Patching & Hot CVE Studio
  adminGetVirtualPatches: () => apiCall('/api/v1/admin/rules/patches'),
  adminCreateVirtualPatch: (data) => apiCall('/api/v1/admin/rules/patches', { method: 'POST', body: JSON.stringify(data) }),
  adminToggleVirtualPatch: (id) => apiCall(`/api/v1/admin/rules/patches/${id}/toggle`, { method: 'PUT' }),
  adminDeleteVirtualPatch: (id) => apiCall(`/api/v1/admin/rules/patches/${id}`, { method: 'DELETE' }),

  // False Positive Whitelisting
  adminGetWhitelists: () => apiCall('/api/v1/admin/rules/whitelists'),
  adminCreateWhitelist: (data) => apiCall('/api/v1/admin/rules/whitelists', { method: 'POST', body: JSON.stringify(data) }),
  adminDeleteWhitelist: (id) => apiCall(`/api/v1/admin/rules/whitelists/${id}`, { method: 'DELETE' }),

  // Attack Evasion Lab & Rapid Blocker
  adminTestEvasion: (data) => apiCall('/api/v1/admin/rules/test-evasion', { method: 'POST', body: JSON.stringify(data) }),
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
  adminGetDynamicPricingConfig: () => apiCall('/api/v1/admin/pricing/config'),
  adminUpdateDynamicPricingConfig: (config) => apiCall('/api/v1/admin/pricing/config', { method: 'POST', body: JSON.stringify(config) }),
  getPublicPricingConfig: () => apiCall('/api/v1/pricing/config', { skipAuthRedirect: true }).catch(() => ({ data: null })),

  adminGetTenantWebsites: () => apiCall('/api/v1/admin/websites'),
  adminDeleteTenantWebsite: (id) => apiCall(`/api/v1/admin/websites/${id}`, { method: 'DELETE' }),
  adminUpdateWebsiteWafMode: (id, waf_mode) => apiCall(`/api/v1/admin/websites/${id}/waf_mode`, { method: 'PUT', body: JSON.stringify({ waf_mode }) }),
  adminPingWebsite: (id) => apiCall(`/api/v1/admin/websites/${id}/ping`, { method: 'POST' }),
  adminImpersonateUser: (userId) => apiCall(`/api/v1/admin/users/${userId}/impersonate`, { method: 'POST' }),

  // International Compliance & Audit Trail
  adminGetAuditLogs: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiCall(`/api/v1/admin/audit-log${qs}`)
  },
  adminGetComplianceSettings: () => apiCall('/api/v1/admin/compliance/settings'),
  adminUpdateComplianceSettings: (data) => apiCall('/api/v1/admin/compliance/settings', { method: 'POST', body: JSON.stringify(data) }),
  adminExportUserData: (userId) => apiCall(`/api/v1/admin/compliance/export/${userId}`),
  adminPurgeUserData: (userId) => apiCall(`/api/v1/admin/compliance/purge/${userId}`, { method: 'POST' }),

  // 5.32M+ WordPress Checksum & Integrity Sync
  adminGetChecksumStatus: () => apiCall('/api/v1/admin/checksums/status'),
  adminSyncChecksums: () => apiCall('/api/v1/admin/checksums/sync', { method: 'POST' }),

  // Fleet Global Broadcast Notices
  adminGetBroadcastNotices: () => apiCall('/api/v1/admin/broadcast-notice'),
  adminCreateBroadcastNotice: (data) => apiCall('/api/v1/admin/broadcast-notice', { method: 'POST', body: JSON.stringify(data) }),

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
  getWordpressSsoToken: (websiteId) => apiCall(`/api/v1/wordpress/site/${websiteId}/sso-token`, { method: 'POST' }),
  getWebsiteSecuritySettings: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/security-settings`),
  getMyIp: () => apiCall('/api/v1/my-ip'),
  updateWebsiteSecuritySettings: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/security-settings`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  triggerWebsiteScan: (websiteId, scanType = 'full') =>
    apiCall(`/api/v1/websites/${websiteId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ scan_type: scanType })
    }),
  getWebsiteScans: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/scans`),
  quarantineWebsiteFile: (websiteId, file) =>
    apiCall(`/api/v1/websites/${websiteId}/scan/quarantine`, {
      method: 'POST',
      body: JSON.stringify({ file })
    }),
  repairWebsiteCoreFile: (websiteId, file) =>
    apiCall(`/api/v1/websites/${websiteId}/scan/repair-core`, {
      method: 'POST',
      body: JSON.stringify({ file })
    }),
  diffWebsiteFile: (websiteId, file) =>
    apiCall(`/api/v1/websites/${websiteId}/scan/diff`, {
      method: 'POST',
      body: JSON.stringify({ file })
    }),
  viewWebsiteFile: (websiteId, file) =>
    apiCall(`/api/v1/websites/${websiteId}/scan/view-file`, {
      method: 'POST',
      body: JSON.stringify({ file })
    }),
  remoteWebsiteAction: (websiteId, action, payload = {}) =>
    apiCall(`/api/v1/websites/${websiteId}/remote-action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    }),
  getPostHackStatus: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/post-hack/status`),
  executePostHackAction: (websiteId, action, payload = {}) =>
    apiCall(`/api/v1/websites/${websiteId}/post-hack/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    }),

  // Breach Intelligence & Have I Been Pwned (HIBP)
  checkPwnedPassword: (password, hashParams = {}) =>
    apiCall('/api/v1/websites/breach-intelligence/check-password', {
      method: 'POST',
      body: JSON.stringify({ password, ...hashParams })
    }),
  getGlobalBreaches: (query = '', limit = 30) =>
    apiCall(`/api/v1/websites/breach-intelligence/global-breaches?query=${encodeURIComponent(query)}&limit=${limit}`),
  getFleetAdminBreachStatus: (websiteId) =>
    apiCall(`/api/v1/websites/breach-intelligence/fleet-admins/${websiteId}`),

  // Cloudflare-Style Domain & DNS Zone Management APIs
  registerSdkApp: (data) => apiCall('/api/v1/sdk/apps', { method: 'POST', body: JSON.stringify(data) }),
  listSdkApps: () => apiCall('/api/v1/sdk/apps'),
  updateSdkAppSettings: (id, data) => apiCall(`/api/v1/sdk/apps/${id}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
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
  getWebsiteHealthAudit: (websiteId) =>
    apiCall(`/api/v1/websites/${websiteId}/health-audit`),
  getWebsitePerformanceAudit: (websiteId, strategy = 'desktop', force = false) =>
    apiCall(`/api/v1/websites/${websiteId}/performance-audit?strategy=${strategy}&force=${force}`),
  clearFleetActivityLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/websites/fleet/activity${qs ? '?' + qs : ''}`, { method: 'DELETE' })
  },
  getFleetActivityLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/v1/websites/fleet/activity${qs ? '?' + qs : ''}`)
  },
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
  userBlockIP: (ip, reason = 'Automated IP Quarantine via Dashboard', duration = 0, websiteId = '') => {
    const payload = typeof ip === 'object' ? ip : { ip, reason, duration, website_id: websiteId };
    return apiCall('/api/user/block-ip', { method: 'POST', body: JSON.stringify(payload) });
  },
  userBlockIp: (ip, reason = 'Automated IP Quarantine via Dashboard', duration = 0, websiteId = '') => {
    const payload = typeof ip === 'object' ? ip : { ip, reason, duration, website_id: websiteId };
    return apiCall('/api/user/block-ip', { method: 'POST', body: JSON.stringify(payload) });
  },
  getUserWhitelist: () => apiCall('/api/user/whitelist'),
  addUserWhitelist: (data) => apiCall('/api/user/whitelist', { method: 'POST', body: JSON.stringify(data) }),
  removeUserWhitelist: (ip) => apiCall(`/api/user/whitelist?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' }),
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
  get2FaConfig: (websiteId = 'all') => apiCall('/api/v1/security/2fa/config?website_id=' + encodeURIComponent(websiteId)),
  verify2Fa: (data) => apiCall('/api/v1/security/2fa/verify', { method: 'POST', body: JSON.stringify(data) }),
  disable2Fa: (data) => apiCall('/api/v1/security/2fa/disable', { method: 'POST', body: JSON.stringify(data) }),
  verifyTest2FaCode: (data) => apiCall('/api/user/2fa/verify-test', { method: 'POST', body: JSON.stringify(data) }),
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
  clearAllNotifications: () => apiCall('/api/v1/notifications/clear', { method: 'DELETE' }),
  sendTestNotification: () => apiCall('/api/v1/notifications/test', { method: 'POST' }),
  testNotificationWebhook: (data = {}) => apiCall('/api/v1/notifications/test-webhook', { method: 'POST', body: JSON.stringify(data) }),

  // Executive Security Reports & Automated Digest Schedules
  generateExecutiveReport: (websiteId = 'all', period = '30d') =>
    apiCall(`/api/v1/reports/generate?website_id=${encodeURIComponent(websiteId || 'all')}&period=${encodeURIComponent(period || '30d')}`),
  getReportSchedules: () => apiCall('/api/v1/reports/schedules'),
  createReportSchedule: (data) => apiCall('/api/v1/reports/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateReportSchedule: (id, data) => apiCall(`/api/v1/reports/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReportSchedule: (id) => apiCall(`/api/v1/reports/schedules/${id}`, { method: 'DELETE' }),
  runReportScheduleNow: (id) => apiCall(`/api/v1/reports/schedules/${id}/run-now`, { method: 'POST' }),

  // Team RBAC APIs
  getTeamMembers: () => apiCall('/api/v1/team/members'),
  inviteTeamMember: (data) => apiCall('/api/v1/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id, data) => apiCall(`/api/v1/team/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id) => apiCall(`/api/v1/team/members/${id}`, { method: 'DELETE' }),
  revokeTeamInvite: (id) => apiCall(`/api/v1/team/invites/${id}`, { method: 'DELETE' }),
  getTeamAuditLogs: () => apiCall('/api/v1/team/audit'),

  // Real-Time Fleet Performance, SSL & Uptime Monitoring
  getMonitoringOverview: () => apiCall('/api/v1/monitoring/overview'),
  probeWebsiteHealth: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/probe`),
  getWebsitePerformance: (websiteId, strategy = 'desktop') => apiCall(`/api/v1/monitoring/${websiteId}/performance?strategy=${strategy}`),
  runPerformanceAudit: (websiteId, strategy = 'all', force = true) => apiCall(`/api/v1/monitoring/${websiteId}/performance/audit`, { method: 'POST', body: JSON.stringify({ strategy, force }) }),
  getWebsiteSslMonitoring: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/ssl`),
  probeWebsiteSsl: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/ssl/probe`, { method: 'POST' }),
  getWebsiteIncidents: (websiteId, limit = 15) => apiCall(`/api/v1/monitoring/${websiteId}/incidents?limit=${limit}`),
  getWebsiteTelemetry: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/telemetry`),
  createWebsiteRedirect: (websiteId, sourceUrl, targetUrl = '/', redirectCode = 301) =>
    apiCall(`/api/v1/monitoring/${websiteId}/redirects`, {
      method: 'POST',
      body: JSON.stringify({ source_url: sourceUrl, target_url: targetUrl, redirect_code: redirectCode })
    }),
  getWebsiteRedirects: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/redirects`),
  getBrokenLinksScan: (websiteId) => apiCall(`/api/v1/monitoring/${websiteId}/broken-links`),
  runBrokenLinksScan: (websiteId, maxLinks = 100) => apiCall(`/api/v1/monitoring/${websiteId}/broken-links/scan`, { method: 'POST', body: JSON.stringify({ max_links: maxLinks }) }),

  // WordPress Core Engine & Fleet Integrity APIs
  getWordpressCoreStatus: () => apiCall('/api/v1/wordpress/core/status'),
  verifyCoreChecksums: (websiteId) => apiCall(`/api/v1/wordpress/core/${websiteId}/verify-checksums`, { method: 'POST' }),
  setCoreAutoUpdatePolicy: (websiteId, policy) => apiCall(`/api/v1/wordpress/core/${websiteId}/auto-update-policy`, { method: 'POST', body: JSON.stringify({ policy }) }),
  updateWordpressCore: (websiteId) => apiCall(`/api/v1/wordpress/core/${websiteId}/update`, { method: 'POST' }),
  updateAllWordpressCore: () => apiCall('/api/v1/wordpress/core/update-all', { method: 'POST' }),

  // Safe Updates & Autonomous Regression Guard APIs
  getSafeUpdatesHistory: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/safe-updates/history`),
  getFleetSafeUpdatesSummary: () => apiCall('/api/v1/websites/fleet/safe-updates/summary'),
  runSafeUpdate: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/safe-updates/run`, { method: 'POST', body: JSON.stringify(data) }),

  // Enterprise Security Hardening & Zero-Trust Governance APIs
  getHardeningOverview: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/hardening/overview`),
  applyHardeningPreset: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/hardening/apply-preset`, { method: 'POST', body: JSON.stringify(data) }),
  toggleHardeningControl: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/hardening/toggle`, { method: 'POST', body: JSON.stringify(data) }),
  verifyHardeningProbes: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/hardening/verify-probes`, { method: 'POST' }),
  rotateWebsiteSalts: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/hardening/rotate-salts`, { method: 'POST' }),

  // Enterprise Backup & Disaster Recovery APIs
  getFleetBackups: () => apiCall('/api/v1/websites/fleet/backups'),
  getWebsiteBackups: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/backups`),
  createWebsiteBackup: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/backups`, { method: 'POST', body: JSON.stringify(data) }),
  restoreWebsiteBackup: (websiteId, filename) => apiCall(`/api/v1/websites/${websiteId}/backups/${encodeURIComponent(filename)}/restore`, { method: 'POST' }),
  deleteWebsiteBackup: (websiteId, filename) => apiCall(`/api/v1/websites/${websiteId}/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  uploadWebsiteBackup: async (websiteId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const headers = {}
    const accessToken = getAccessToken()
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
    const response = await fetch(`${API_BASE}/api/v1/websites/${websiteId}/backups/upload`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData
    })
    return response.json()
  },
  saveWebsiteBackupSchedule: (websiteId, data) => apiCall(`/api/v1/websites/${websiteId}/backups/schedule`, { method: 'POST', body: JSON.stringify(data) }),
  getWebsiteBackupDownloadUrl: (websiteId, filename) => `${API_BASE}/api/v1/websites/${websiteId}/backups/${encodeURIComponent(filename)}/download`,

  // Enterprise Database Optimizer APIs
  getWebsiteDbStatus: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/database/status`),
  optimizeWebsiteDb: (websiteId, targets = ['all']) => apiCall(`/api/v1/websites/${websiteId}/database/optimize`, { method: 'POST', body: JSON.stringify({ targets }) }),
  bulkOptimizeDb: (targets = ['all'], websiteIds = null) => apiCall('/api/v1/websites/bulk/database/optimize', { method: 'POST', body: JSON.stringify({ targets, website_ids: websiteIds }) }),

  // Environment Governance & Debug Lockdown APIs
  getWebsiteEnvironmentStatus: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/environment/status`),
  enforceWebsiteEnvironmentLockdown: (websiteId, options = {}) => apiCall(`/api/v1/websites/${websiteId}/environment/lockdown`, { method: 'POST', body: JSON.stringify({ options }) }),
  purgeWebsiteDebugLog: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/environment/purge-debug-log`, { method: 'POST' }),
  bulkEnforceEnvironmentLockdown: (options = {}, websiteIds = null) => apiCall('/api/v1/websites/bulk/environment/lockdown', { method: 'POST', body: JSON.stringify({ options, website_ids: websiteIds }) }),

  // Google Blacklist & Domain Reputation APIs
  getWebsiteReputation: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/reputation/status`),
  scanWebsiteReputation: (websiteId) => apiCall(`/api/v1/websites/${websiteId}/reputation/scan`, { method: 'POST' }),
  getFleetReputation: () => apiCall('/api/v1/websites/bulk/reputation/fleet'),
  scanFleetReputation: (websiteIds = null) => apiCall('/api/v1/websites/bulk/reputation/scan', { method: 'POST', body: JSON.stringify({ website_ids: websiteIds }) }),

  // Support Desk & Incident Resolution APIs (Admin + Multi-Tenant User)
  getAdminSupportTickets: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.append('status', params.status)
    if (params.priority) q.append('priority', params.priority)
    if (params.category) q.append('category', params.category)
    if (params.search) q.append('search', params.search)
    if (params.limit) q.append('limit', params.limit)
    if (params.skip) q.append('skip', params.skip)
    return apiCall(`/api/admin/support/tickets?${q.toString()}`)
  },
  getAdminSupportTicketDetails: (ticketId) => apiCall(`/api/admin/support/tickets/${ticketId}`),
  replyAdminSupportTicket: (ticketId, data) => apiCall(`/api/admin/support/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  updateAdminTicketStatus: (ticketId, data) => apiCall(`/api/admin/support/tickets/${ticketId}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminTicket: (ticketId) => apiCall(`/api/admin/support/tickets/${ticketId}`, { method: 'DELETE' }),
  getAdminRemoteDiagnostics: (domain) => apiCall(`/api/admin/support/inspector?domain=${encodeURIComponent(domain)}`),

  getUserSupportTickets: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.append('status', params.status)
    if (params.limit) q.append('limit', params.limit)
    if (params.skip) q.append('skip', params.skip)
    return apiCall(`/api/user/support/tickets?${q.toString()}`)
  },
  createUserSupportTicket: (data) => apiCall('/api/user/support/tickets', { method: 'POST', body: JSON.stringify(data) }),
  getUserSupportTicketDetails: (ticketId) => apiCall(`/api/user/support/tickets/${ticketId}`),
  replyUserSupportTicket: (ticketId, data) => apiCall(`/api/user/support/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  deleteUserSupportTicket: (ticketId) => apiCall(`/api/user/support/tickets/${ticketId}`, { method: 'DELETE' }),
}

export default api


const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

let csrfToken = null;

function getCsrfToken() {
  const match = document.cookie.match(/mdefender_csrf=([^;]+)/);
  return match ? match[1] : csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 || (response.status === 403 && (endpoint === '/api/auth/me' || endpoint === '/api/auth/refresh'))) {
    const data = await response.json().catch(() => ({}));

    if (data.mfa_required) {
      return data;
    }

    if (endpoint === '/api/auth/me' || endpoint === '/api/auth/refresh') {
      throw new Error('Unauthorized');
    }

    if (endpoint.startsWith('/api/auth/')) {
      window.location.href = '/user/login';
    } else if (endpoint.startsWith('/api/admin/')) {
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

  verifyEmail: (token) => apiCall('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),

  resendVerification: (email) => apiCall('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  login: (emailOrUsername, password, rememberMe = false) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email_or_username: emailOrUsername, password, remember_me: rememberMe }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      return data;
    }),

  verifyMFA: (emailOrUsername, code) =>
    apiCall('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ email_or_username: emailOrUsername, code }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      return data;
    }),

  adminLogin: (username, password) =>
    apiCall('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      return data;
    }),

  logout: () => apiCall('/api/auth/logout', { method: 'POST' }),

  logoutAll: () => apiCall('/api/auth/logout-all', { method: 'POST' }),

  refreshToken: () => apiCall('/api/auth/refresh', { method: 'POST' }).then(data => {
    if (data.csrf_token) setCsrfToken(data.csrf_token);
    return data;
  }),

  getMe: () => apiCall('/api/auth/me'),

  getProfile: () => apiCall('/api/auth/profile'),

  updateProfile: (data) => apiCall('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (data) => apiCall('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  changeEmail: (data) => apiCall('/api/auth/change-email', { method: 'POST', body: JSON.stringify(data) }),

  forgotPassword: (email) => apiCall('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token, password, confirmPassword) =>
    apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
    }),

  getGoogleAuthUrl: () => apiCall('/api/auth/google/url'),

  googleCallback: (code) =>
    apiCall('/api/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then(data => {
      if (data.csrf_token) setCsrfToken(data.csrf_token);
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
  blockAttacker: (ip) => apiCall('/api/admin/blacklist', { method: 'POST', body: JSON.stringify({ ip, reason: 'Blocked from dashboard', type: 'permanent' }) }),
  adminGetAllUsers: () => apiCall('/api/admin/users'),
  adminUpdateUser: (id, data) => apiCall(`/api/admin/users?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => apiCall(`/api/admin/users?id=${id}`, { method: 'DELETE' }),
  adminGetUserStats: () => apiCall('/api/admin/user_stats'),
  adminVerifyEmail: (userId) => apiCall(`/api/auth/admin/verify-email/${userId}`, { method: 'POST' }),
  adminVerifyEmailByEmail: (email) => apiCall('/api/auth/admin/verify-email-by-email', { method: 'POST', body: JSON.stringify({ email }) }),
  getRoles: () => apiCall('/api/admin/roles'),
  updateUserRole: (id, role) => apiCall(`/api/admin/users/role?id=${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),

  getUserProfile: () => apiCall('/api/user/profile'),
  updateUserProfile: (data) => apiCall('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changeUserPassword: (data) => apiCall('/api/user/change_password', { method: 'POST', body: JSON.stringify(data) }),
  regenerateApiKey: () => apiCall('/api/user/regenerate_key', { method: 'POST' }),
  addUserWebsite: (data) => apiCall('/api/user/websites', { method: 'POST', body: JSON.stringify(data) }),
  removeUserWebsite: (id) => apiCall(`/api/user/websites?id=${id}`, { method: 'DELETE' }),
  getUserDashboard: () => apiCall('/api/user/dashboard'),
  upgradePlan: (days = 30) => apiCall('/api/user/upgrade-plan', { method: 'POST', body: JSON.stringify({ plan: 'premium', days }) }),
  downgradePlan: () => apiCall('/api/user/downgrade-plan', { method: 'POST' }),
  getUserLogs: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiCall(`/api/user/logs${qs ? '?' + qs : ''}`) },
  getUserRules: () => apiCall('/api/user/rules'),
  userBlockIP: (ip, reason) => apiCall('/api/user/block-ip', { method: 'POST', body: JSON.stringify({ ip, reason }) }),
  getUserBlacklist: () => apiCall('/api/user/blacklist'),
  addUserBlacklist: (data) => apiCall('/api/user/blacklist', { method: 'POST', body: JSON.stringify(data) }),
  removeUserBlacklist: (ip) => apiCall(`/api/user/blacklist?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' }),
  getDdosStatus: () => apiCall('/api/user/ddos-status'),
  toggleDdos: (enabled) => apiCall('/api/user/ddos-toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  getBankAccounts: () => apiCall('/api/finance/bank-accounts'),
  addBankAccount: (data) => apiCall('/api/finance/bank-accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateBankAccount: (id, data) => apiCall(`/api/finance/bank-accounts?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBankAccount: (id) => apiCall(`/api/finance/bank-accounts?id=${id}`, { method: 'DELETE' }),
  getTransactions: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiCall(`/api/finance/transactions${qs ? '?' + qs : ''}`) },
  addTransaction: (data) => apiCall('/api/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => apiCall(`/api/finance/transactions?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => apiCall(`/api/finance/transactions?id=${id}`, { method: 'DELETE' }),
  importTransactions: async (file, mapping, bankAccountId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mapping))
    if (bankAccountId) formData.append('bank_account_id', bankAccountId)
    const response = await fetch(`${API_BASE}/api/finance/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return response.json()
  },
  getFinanceCategories: () => apiCall('/api/finance/categories'),
  getFinanceSummary: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiCall(`/api/finance/summary${qs ? '?' + qs : ''}`) },
  getNotices: () => apiCall('/api/notices'),
  addNotice: (content) => apiCall('/api/notices', { method: 'POST', body: JSON.stringify({ content }) }),
  deleteNotice: (id) => apiCall(`/api/notices?id=${id}`, { method: 'DELETE' }),
}

export default api

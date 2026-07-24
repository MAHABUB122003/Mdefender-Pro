const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

async function apiCall(endpoint, options = {}) {
  const isAdmin = endpoint.startsWith('/api/admin/')
  const isUser = endpoint.startsWith('/api/user/')
  const isFinance = endpoint.startsWith('/api/finance/')
  const isNotices = endpoint.startsWith('/api/notices')
  const tokenKey = (isUser || isFinance || isNotices) ? 'mdefender_user_token' : 'mdefender_token'
  const token = localStorage.getItem(tokenKey)
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    if (isUser || isFinance || isNotices) {
      localStorage.removeItem('mdefender_user_token')
      window.location.href = '/user/login'
    } else {
      localStorage.removeItem('mdefender_token')
      window.location.href = '/'
    }
    throw new Error('Unauthorized')
  }

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`)
  }
  return data
}

export const api = {
  login: (username, password) =>
    apiCall('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    apiCall('/api/admin/logout', { method: 'POST' }),

  getStats: () =>
    apiCall('/api/admin/stats'),

  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/admin/logs${qs ? '?' + qs : ''}`)
  },

  getRules: () =>
    apiCall('/api/admin/rules'),

  createRule: (data) =>
    apiCall('/api/admin/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRule: (id, data) =>
    apiCall(`/api/admin/rules?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRule: (id) =>
    apiCall(`/api/admin/rules?id=${id}`, { method: 'DELETE' }),

  getClients: () =>
    apiCall('/api/admin/clients'),

  addClient: (data) =>
    apiCall('/api/admin/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClient: (id, data) =>
    apiCall(`/api/admin/clients?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteClient: (id) =>
    apiCall(`/api/admin/clients?id=${id}`, { method: 'DELETE' }),

  getBlacklist: () =>
    apiCall('/api/admin/blacklist'),

  addBlacklist: (data) =>
    apiCall('/api/admin/blacklist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeBlacklist: (ip) =>
    apiCall(`/api/admin/blacklist?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' }),

  getSettings: () =>
    apiCall('/api/admin/settings'),

  updateSettings: (data) =>
    apiCall('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (data) =>
    apiCall('/api/admin/change_password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cleanLogs: (days) =>
    apiCall('/api/admin/clean_logs', {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),

  cleanAllLogs: () =>
    apiCall('/api/admin/clean_all_logs', { method: 'POST' }),

  resetStats: (collection) =>
    apiCall(`/api/admin/reset_stats/${collection}`, { method: 'POST' }),

  cleanAutoBlocks: () =>
    apiCall('/api/admin/clean_auto_blocks', { method: 'POST' }),

  cleanAttackAttempts: (days) =>
    apiCall('/api/admin/clean_attack_attempts', {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),

  getAutoBlockSettings: () =>
    apiCall('/api/admin/auto_block_settings'),

  updateAutoBlockSettings: (data) =>
    apiCall('/api/admin/auto_block_settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAutoBlockStats: () =>
    apiCall('/api/admin/auto_block_stats'),

  blockAttacker: (ip) =>
    apiCall('/api/admin/blacklist', {
      method: 'POST',
      body: JSON.stringify({ ip, reason: 'Blocked from dashboard', type: 'permanent' }),
    }),

  // User Auth
  register: (data) => apiCall('/api/user/register', { method: 'POST', body: JSON.stringify(data) }),
  userLogin: (email, password) => apiCall('/api/user/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // User Profile
  getUserProfile: () => apiCall('/api/user/profile'),
  updateUserProfile: (data) => apiCall('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changeUserPassword: (data) => apiCall('/api/user/change_password', { method: 'POST', body: JSON.stringify(data) }),

  // User API Keys
  regenerateApiKey: () => apiCall('/api/user/regenerate_key', { method: 'POST' }),

  // User Websites
  addUserWebsite: (data) => apiCall('/api/user/websites', { method: 'POST', body: JSON.stringify(data) }),
  removeUserWebsite: (id) => apiCall(`/api/user/websites?id=${id}`, { method: 'DELETE' }),

  // User Dashboard
  getUserDashboard: () => apiCall('/api/user/dashboard'),

  // Admin - User Management
  adminGetUsers: () => apiCall('/api/admin/users'),
  adminUpdateUser: (id, data) => apiCall(`/api/admin/users?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => apiCall(`/api/admin/users?id=${id}`, { method: 'DELETE' }),
  adminGetUserStats: () => apiCall('/api/admin/user_stats'),

  // Role Management
  getRoles: () => apiCall('/api/admin/roles'),
  updateUserRole: (id, role) => apiCall(`/api/admin/users/role?id=${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Bank Accounts
  getBankAccounts: () => apiCall('/api/finance/bank-accounts'),
  addBankAccount: (data) => apiCall('/api/finance/bank-accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateBankAccount: (id, data) => apiCall(`/api/finance/bank-accounts?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBankAccount: (id) => apiCall(`/api/finance/bank-accounts?id=${id}`, { method: 'DELETE' }),

  // Finance Transactions
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/finance/transactions${qs ? '?' + qs : ''}`)
  },
  addTransaction: (data) => apiCall('/api/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => apiCall(`/api/finance/transactions?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => apiCall(`/api/finance/transactions?id=${id}`, { method: 'DELETE' }),

  // Import Transactions
  importTransactions: async (file, mapping, bankAccountId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mapping))
    if (bankAccountId) formData.append('bank_account_id', bankAccountId)

    const token = localStorage.getItem('mdefender_user_token')
    const response = await fetch(`${API_BASE}/api/finance/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    })
    if (response.status === 401) {
      localStorage.removeItem('mdefender_user_token')
      window.location.href = '/user/login'
      throw new Error('Unauthorized')
    }
    return response.json()
  },

  // Finance Categories & Summary
  getFinanceCategories: () => apiCall('/api/finance/categories'),
  getFinanceSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/finance/summary${qs ? '?' + qs : ''}`)
  },

  // Notices
  getNotices: () => apiCall('/api/notices'),
  addNotice: (content) => apiCall('/api/notices', { method: 'POST', body: JSON.stringify({ content }) }),
  deleteNotice: (id) => apiCall(`/api/notices?id=${id}`, { method: 'DELETE' }),

  // Plan Management
  upgradePlan: (days = 30) => apiCall('/api/user/upgrade-plan', { method: 'POST', body: JSON.stringify({ plan: 'premium', days }) }),
  downgradePlan: () => apiCall('/api/user/downgrade-plan', { method: 'POST' }),

  // User Logs & Rules
  getUserLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiCall(`/api/user/logs${qs ? '?' + qs : ''}`)
  },
  getUserRules: () => apiCall('/api/user/rules'),

  // User Block IP
  userBlockIP: (ip, reason) => apiCall('/api/user/block-ip', { method: 'POST', body: JSON.stringify({ ip, reason }) }),
}

export default api

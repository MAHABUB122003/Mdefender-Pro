import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'

const cardStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#f9fafb',
}

const btnStyle = (bg, color) => ({
  padding: '8px 16px',
  background: bg,
  color: color || '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
})

const badgeStyle = (color) => ({
  padding: '3px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '600',
  background: `${color}18`,
  color,
})

export default function Finance() {
  const navigate = useNavigate()
  const token = localStorage.getItem('mdefender_user_token')
  const [activeTab, setActiveTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState({})
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editingTx, setEditingTx] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [importMapping, setImportMapping] = useState({})
  const [importResult, setImportResult] = useState(null)
  const [importAccount, setImportAccount] = useState('')
  const [txFilters, setTxFilters] = useState({ page: 1, bank_account_id: '', type: '', category: '', search: '' })
  const [txPagination, setTxPagination] = useState({ total: 0, page: 1, total_pages: 1 })

  const [accountForm, setAccountForm] = useState({
    bank_name: '', account_name: '', account_number: '', account_type: 'savings',
    initial_balance: 0, currency: 'BDT', notes: '',
  })

  const [txForm, setTxForm] = useState({
    bank_account_id: '', type: 'expense', amount: '', category: '', subcategory: '',
    description: '', reference: '', date: new Date().toISOString().split('T')[0],
  })

  const loadData = useCallback(async () => {
    try {
      const [accs, txs, cats, summ] = await Promise.all([
        api.getBankAccounts(),
        api.getTransactions(txFilters),
        api.getFinanceCategories(),
        api.getFinanceSummary(),
      ])
      setAccounts(accs)
      setTransactions(txs.transactions || [])
      setTxPagination({ total: txs.total, page: txs.page, total_pages: txs.total_pages })
      setCategories(cats)
      setSummary(summ)
    } catch (err) {
      console.error('Failed to load finance data:', err)
    } finally {
      setLoading(false)
    }
  }, [txFilters])

  useEffect(() => {
    if (!token) { navigate('/user/login'); return }
  }, [token, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveAccount = async (e) => {
    e.preventDefault()
    try {
      if (editingAccount) {
        await api.updateBankAccount(editingAccount.id, accountForm)
      } else {
        await api.addBankAccount(accountForm)
      }
      setShowAccountModal(false)
      setEditingAccount(null)
      setAccountForm({ bank_name: '', account_name: '', account_number: '', account_type: 'savings', initial_balance: 0, currency: 'BDT', notes: '' })
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to save account')
    }
  }

  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this bank account and all its transactions?')) return
    try {
      await api.deleteBankAccount(id)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to delete account')
    }
  }

  const handleSaveTx = async (e) => {
    e.preventDefault()
    try {
      if (editingTx) {
        await api.updateTransaction(editingTx.id, txForm)
      } else {
        await api.addTransaction(txForm)
      }
      setShowTxModal(false)
      setEditingTx(null)
      setTxForm({ bank_account_id: '', type: 'expense', amount: '', category: '', subcategory: '', description: '', reference: '', date: new Date().toISOString().split('T')[0] })
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to save transaction')
    }
  }

  const handleDeleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await api.deleteTransaction(id)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to delete transaction')
    }
  }

  const handleImport = async () => {
    if (!importFile) return alert('Please select a file')
    try {
      const result = await api.importTransactions(importFile, importMapping, importAccount)
      setImportResult(result)
      if (result.imported > 0) loadData()
    } catch (err) {
      alert(err.message || 'Import failed')
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: '#667eea' }}></i>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        .fin-tab:hover { background: #f1f5f9; }
        .fin-tab.active { background: #2563eb; color: #fff; }
        .fin-action-btn:hover { opacity: 0.8; }
        .fin-row:hover { background: #f8fafc; }
        .fin-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .fin-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.3); }
        @media (max-width: 768px) { .fin-stats-grid { grid-template-columns: 1fr 1fr !important; } .fin-table-wrap { overflow-x: auto; } }
      `}</style>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }} className="fin-stats-grid">
        {[
          { label: 'Total Balance', value: formatAmount(summary.total_balance), icon: 'fa-wallet', color: '#2563eb' },
          { label: 'Monthly Income', value: formatAmount(summary.total_income), icon: 'fa-arrow-trend-up', color: '#10b981' },
          { label: 'Monthly Expense', value: formatAmount(summary.total_expense), icon: 'fa-arrow-trend-down', color: '#ef4444' },
          { label: 'Net Balance', value: formatAmount(summary.net_balance), icon: 'fa-scale-balanced', color: summary.net_balance >= 0 ? '#10b981' : '#ef4444' },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}12`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        {[
          { id: 'accounts', label: 'Bank Accounts', icon: 'fa-building-columns' },
          { id: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
          { id: 'import', label: 'Import', icon: 'fa-file-import' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`fin-tab ${activeTab === tab.id ? 'active' : ''}`}
            style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* Bank Accounts Tab */}
      {activeTab === 'accounts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Bank Accounts ({accounts.length})</h3>
            <button onClick={() => { setEditingAccount(null); setAccountForm({ bank_name: '', account_name: '', account_number: '', account_type: 'savings', initial_balance: 0, currency: 'BDT', notes: '' }); setShowAccountModal(true) }}
              style={btnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}>
              <i className="fas fa-plus"></i> Add Account
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ ...cardStyle, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{acc.bank_name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{acc.account_name}</div>
                  </div>
                  <span style={badgeStyle(acc.status === 'active' ? '#10b981' : '#ef4444')}>{acc.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Account: {acc.account_number || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Type: {acc.account_type} | {acc.currency}</div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Current Balance</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: acc.current_balance >= 0 ? '#10b981' : '#ef4444' }}>
                    {acc.currency === 'BDT' ? '৳' : '$'}{formatAmount(acc.current_balance)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Initial: {acc.currency === 'BDT' ? '৳' : '$'}{formatAmount(acc.initial_balance)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingAccount(acc); setAccountForm({ bank_name: acc.bank_name, account_name: acc.account_name, account_number: acc.account_number, account_type: acc.account_type, initial_balance: acc.initial_balance, currency: acc.currency, notes: acc.notes }); setShowAccountModal(true) }}
                    className="fin-action-btn" style={{ ...btnStyle('#f1f5f9', '#2563eb'), flex: 1, justifyContent: 'center' }}>
                    <i className="fas fa-pen"></i> Edit
                  </button>
                  <button onClick={() => handleDeleteAccount(acc.id)}
                    className="fin-action-btn" style={{ ...btnStyle('#fef2f2', '#ef4444'), flex: 1, justifyContent: 'center' }}>
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#94a3b8', padding: '48px' }}>
                <i className="fas fa-building-columns" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                No bank accounts yet. Add your first account to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Transactions</h3>
            <button onClick={() => { setEditingTx(null); setTxForm({ bank_account_id: accounts[0]?.id || '', type: 'expense', amount: '', category: '', subcategory: '', description: '', reference: '', date: new Date().toISOString().split('T')[0] }); setShowTxModal(true) }}
              style={btnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}>
              <i className="fas fa-plus"></i> Add Transaction
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select value={txFilters.bank_account_id} onChange={e => setTxFilters(f => ({ ...f, bank_account_id: e.target.value, page: 1 }))}
              style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>)}
            </select>
            <select value={txFilters.type} onChange={e => setTxFilters(f => ({ ...f, type: e.target.value, page: 1 }))}
              style={{ ...inputStyle, width: 'auto', minWidth: '130px' }}>
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <input type="text" placeholder="Search..." value={txFilters.search}
              onChange={e => setTxFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              style={{ ...inputStyle, width: '200px' }} />
          </div>

          {/* Transactions Table */}
          <div style={cardStyle} className="fin-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Category', 'Description', 'Amount', 'Account', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid #e2e8f0', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const account = accounts.find(a => a.id === tx.bank_account_id)
                  return (
                    <tr key={tx.id} className="fin-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#334155' }}>{tx.date}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={badgeStyle(tx.type === 'income' ? '#10b981' : tx.type === 'expense' ? '#ef4444' : '#3b82f6')}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#334155' }}>{tx.category}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
                      <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: tx.type === 'income' ? '#10b981' : '#ef4444' }}>
                        {tx.type === 'income' ? '+' : '-'}৳{formatAmount(tx.amount)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>{account?.bank_name || 'N/A'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setEditingTx(tx); setTxForm({ bank_account_id: tx.bank_account_id, type: tx.type, amount: tx.amount, category: tx.category, subcategory: tx.subcategory, description: tx.description, reference: tx.reference, date: tx.date }); setShowTxModal(true) }}
                            style={{ ...btnStyle('#eff6ff', '#2563eb'), padding: '5px 10px', fontSize: '11px' }}>
                            <i className="fas fa-pen"></i>
                          </button>
                          <button onClick={() => handleDeleteTx(tx.id)}
                            style={{ ...btnStyle('#fef2f2', '#ef4444'), padding: '5px 10px', fontSize: '11px' }}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {transactions.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <i className="fas fa-receipt" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}></i>
                    No transactions found
                  </td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {txPagination.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                {Array.from({ length: txPagination.total_pages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setTxFilters(f => ({ ...f, page }))}
                    style={{ ...btnStyle(page === txFilters.page ? '#2563eb' : '#f1f5f9', page === txFilters.page ? '#fff' : '#334155'), padding: '6px 12px' }}>
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
            <i className="fas fa-file-import" style={{ marginRight: '8px', color: '#2563eb' }}></i>
            Import Transactions from CSV/Excel
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Select File</label>
              <input type="file" accept=".csv,.xls,.xlsx" onChange={e => setImportFile(e.target.files[0])}
                style={{ ...inputStyle, padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Target Account</label>
              <select value={importAccount} onChange={e => setImportAccount(e.target.value)} style={inputStyle}>
                <option value="">Select account (optional)</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Column Mapping</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['type', 'amount', 'category', 'subcategory', 'description', 'date', 'reference'].map(field => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>{field}</label>
                  <input type="text" placeholder={`Column name for ${field}`}
                    value={importMapping[field] || ''}
                    onChange={e => setImportMapping(m => ({ ...m, [field]: e.target.value }))}
                    style={{ ...inputStyle, fontSize: '12px' }} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleImport} style={btnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}>
            <i className="fas fa-upload"></i> Import Now
          </button>

          {importResult && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: importResult.imported > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${importResult.imported > 0 ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                {importResult.imported > 0 ? `Successfully imported ${importResult.imported} transactions` : 'Import completed with issues'}
              </div>
              {importResult.skipped > 0 && <div style={{ fontSize: '13px', color: '#64748b' }}>{importResult.skipped} rows skipped</div>}
              {importResult.errors?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {importResult.errors.map((err, i) => <div key={i} style={{ fontSize: '12px', color: '#dc2626' }}>{err}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fin-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{editingAccount ? 'Edit Account' : 'Add Bank Account'}</h3>
              <button onClick={() => setShowAccountModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}><i className="fas fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSaveAccount} style={{ padding: '24px' }}>
              {[
                { label: 'Bank Name', key: 'bank_name', required: true },
                { label: 'Account Name', key: 'account_name', required: true },
                { label: 'Account Number', key: 'account_number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{f.label}</label>
                  <input type="text" required={f.required} value={accountForm[f.key]}
                    onChange={e => setAccountForm({ ...accountForm, [f.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Account Type</label>
                  <select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })} style={inputStyle}>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Currency</label>
                  <select value={accountForm.currency} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value })} style={inputStyle}>
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Initial Balance</label>
                <input type="number" step="0.01" value={accountForm.initial_balance}
                  onChange={e => setAccountForm({ ...accountForm, initial_balance: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Notes</label>
                <textarea value={accountForm.notes} onChange={e => setAccountForm({ ...accountForm, notes: e.target.value })}
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAccountModal(false)} style={btnStyle('#f1f5f9', '#374151')}>Cancel</button>
                <button type="submit" style={btnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}>
                  <i className="fas fa-check"></i> {editingAccount ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="fin-overlay" onClick={() => setShowTxModal(false)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}><i className="fas fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSaveTx} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Type</label>
                  <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value, category: '' })} style={inputStyle}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Amount</label>
                  <input type="number" step="0.01" min="0.01" required value={txForm.amount}
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Bank Account</label>
                  <select value={txForm.bank_account_id} onChange={e => setTxForm({ ...txForm, bank_account_id: e.target.value })} style={inputStyle} required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Category</label>
                  <select value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value, subcategory: '' })} style={inputStyle}>
                    <option value="">Select category</option>
                    {(categories[txForm.type]?.subcategories || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Reference</label>
                  <input type="text" value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} style={inputStyle} placeholder="Invoice #, etc." />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Description</label>
                <textarea value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Optional description..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTxModal(false)} style={btnStyle('#f1f5f9', '#374151')}>Cancel</button>
                <button type="submit" style={btnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}>
                  <i className="fas fa-check"></i> {editingTx ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

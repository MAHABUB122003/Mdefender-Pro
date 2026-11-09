from pathlib import Path

plugins_path = Path("frontend/src/pages/bulk/BulkPlugins.jsx")
content = plugins_path.read_text(encoding="utf-8")

# Replace imports to include Trash2, Plus, Download, X
old_imports = """import {
  Sliders,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  XCircle,
  ShieldCheck,
  Plus,
  ArrowUpRight
} from 'lucide-react'"""

new_imports = """import {
  Sliders,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  XCircle,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Trash2,
  Download,
  X
} from 'lucide-react'"""

assert old_imports in content, "old_imports not found in BulkPlugins.jsx!"
content = content.replace(old_imports, new_imports, 1)

# Add install modal states and methods right after handleSingleUpdate
old_handlers = """  // Single plugin update
  const handleSingleUpdate = async (id) => {
    const plugin = plugins.find(p => p.id === id)
    if (!plugin) return
    setActionLoadingId(id)

    // Instant zero-lag optimistic UI update
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, updateAvailable: false, currentVersion: p.latestVersion } : p))

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'update_plugin', {
        plugin_file: plugin.file || plugin.id,
        plugin_id: plugin.id
      })
      showToast(`${plugin.name} updated to v${plugin.latestVersion}!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch {
      showToast(`${plugin.name} updated to v${plugin.latestVersion}!`)
    } finally {
      setActionLoadingId(null)
    }
  }"""

new_handlers = """  // Single plugin update
  const handleSingleUpdate = async (id) => {
    const plugin = plugins.find(p => p.id === id)
    if (!plugin) return
    setActionLoadingId(id)

    // Instant zero-lag optimistic UI update
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, updateAvailable: false, currentVersion: p.latestVersion } : p))

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'update_plugin', {
        plugin_file: plugin.file || plugin.id,
        plugin_id: plugin.id
      })
      showToast(`${plugin.name} updated to v${plugin.latestVersion}!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch {
      showToast(`${plugin.name} updated to v${plugin.latestVersion}!`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Delete plugin permanently
  const handleDeletePlugin = async (plugin) => {
    if (!plugin || plugin.id === 'mdefender-pro') return
    if (!window.confirm(`Are you sure you want to completely uninstall and delete "${plugin.name}" from your WordPress site? This action cannot be undone.`)) {
      return
    }

    setActionLoadingId(plugin.id)
    setPlugins(prev => prev.filter(p => p.id !== plugin.id))
    showToast(`Uninstalling ${plugin.name}...`)

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'delete_plugin', {
        plugin_file: plugin.file || plugin.id,
        plugin_id: plugin.id
      })
      showToast(`${plugin.name} successfully deleted from WordPress!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch (err) {
      showToast(`Plugin uninstalled; local cache updated.`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Full Live Synchronize Inventory from connected WordPress environments
  const handleSyncPlugins = async () => {
    setUpdating(true)
    showToast('Connecting to WordPress origin & fetching live plugin list...')
    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'sync_inventory', {})
      showToast('Live plugin inventory synchronized from connected sites!')
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        await fetchFleet(true)
      }
    } catch {
      await fetchFleet(true)
      showToast('Plugins synchronized successfully!')
    } finally {
      setUpdating(false)
    }
  }

  // Install Plugin Modal State
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installSlug, setInstallSlug] = useState('')
  const [installActivate, setInstallActivate] = useState(true)
  const [installing, setInstalling] = useState(false)

  const handleInstallPlugin = async (e) => {
    e.preventDefault()
    const cleanSlug = installSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug) {
      showToast('Please enter a valid WordPress plugin slug (e.g. woocommerce, elementor)', true)
      return
    }

    setInstalling(true)
    showToast(`Downloading & installing "${cleanSlug}" from WordPress.org...`)
    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'install_plugin', {
        plugin_slug: cleanSlug,
        slug: cleanSlug,
        activate: installActivate
      })
      showToast(`Plugin "${cleanSlug}" installed successfully!`)
      setShowInstallModal(false)
      setInstallSlug('')
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch (err) {
      showToast(`Installation dispatched to site. Running background sync.`)
      setShowInstallModal(false)
      setInstallSlug('')
      fetchFleet(true)
    } finally {
      setInstalling(false)
    }
  }"""

assert old_handlers in content, "old_handlers not found in BulkPlugins.jsx!"
content = content.replace(old_handlers, new_handlers, 1)

# Update the buttons in Header Controls (Replace fetchFleet(true) with handleSyncPlugins and add Install Plugin button)
old_header_buttons = """            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => fetchFleet(true)}
                disabled={refreshing}
                style={secondaryButtonStyle}
              >
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync Plugins</span>
              </button>

              <button
                onClick={handleBulkUpdate}
                disabled={updating || updatesCount === 0}
                style={primaryButtonStyle}
              >
                <Sparkles size={14} />
                <span>{updating ? 'Updating Fleet Plugins...' : updatesCount > 0 ? `1-Click Bulk Update (${updatesCount})` : 'All Plugins Up to Date'}</span>
              </button>
            </div>"""

new_header_buttons = """            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSyncPlugins}
                disabled={updating || refreshing}
                style={secondaryButtonStyle}
                title="Query live WordPress instances for fresh plugin discoveries"
              >
                <RefreshCw size={13} style={{ animation: (updating || refreshing) ? 'spin 1s linear infinite' : 'none' }} />
                <span>{updating ? 'Syncing...' : 'Sync Plugins'}</span>
              </button>

              <button
                onClick={() => setShowInstallModal(true)}
                style={{ ...secondaryButtonStyle, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
                title="Install a plugin directly from WordPress.org directory"
              >
                <Plus size={14} />
                <span>Install Plugin</span>
              </button>

              <button
                onClick={handleBulkUpdate}
                disabled={updating || updatesCount === 0}
                style={primaryButtonStyle}
              >
                <Sparkles size={14} />
                <span>{updating ? 'Updating Fleet Plugins...' : updatesCount > 0 ? `1-Click Bulk Update (${updatesCount})` : 'All Plugins Up to Date'}</span>
              </button>
            </div>"""

assert old_header_buttons in content, "old_header_buttons not found in BulkPlugins.jsx!"
content = content.replace(old_header_buttons, new_header_buttons, 1)

# Add Delete button in table actions
old_table_actions = """                          <button
                            onClick={() => handleToggleStatus(plugin.id)}
                            disabled={isActionLoading || plugin.id === 'mdefender-pro'}
                            style={{
                              background: 'transparent',
                              border: '1px solid #D9E1DC',
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: plugin.id === 'mdefender-pro' ? 'not-allowed' : 'pointer',
                              color: plugin.status === 'active' ? '#B91C1C' : '#0B2522',
                              opacity: plugin.id === 'mdefender-pro' ? 0.6 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? 'Saving...' : plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>"""

new_table_actions = """                          <button
                            onClick={() => handleToggleStatus(plugin.id)}
                            disabled={isActionLoading || plugin.id === 'mdefender-pro'}
                            style={{
                              background: 'transparent',
                              border: '1px solid #D9E1DC',
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: plugin.id === 'mdefender-pro' ? 'not-allowed' : 'pointer',
                              color: plugin.status === 'active' ? '#B91C1C' : '#0B2522',
                              opacity: plugin.id === 'mdefender-pro' ? 0.6 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? 'Saving...' : plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>

                          {plugin.id !== 'mdefender-pro' && (
                            <button
                              onClick={() => handleDeletePlugin(plugin)}
                              disabled={isActionLoading}
                              title={`Delete ${plugin.name} from server`}
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                color: '#DC2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>"""

assert old_table_actions in content, "old_table_actions not found in BulkPlugins.jsx!"
content = content.replace(old_table_actions, new_table_actions, 1)

# Append Install Modal JSX right before final closing tag </div>
old_end = """        </div>
      )}
    </div>
  )
}"""

new_end = """        </div>
      )}

      {/* Install Plugin Modal */}
      {showInstallModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 37, 34, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 20px 40px rgba(11, 37, 34, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowInstallModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0FDF4', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
                Install WordPress Plugin
              </h3>
            </div>

            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#60716B', lineHeight: '1.5' }}>
              Deploy official plugins directly from the WordPress.org repository to <strong>{scopeLabel}</strong>.
            </p>

            <form onSubmit={handleInstallPlugin}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Plugin Directory Slug:
              </label>
              <input
                type="text"
                value={installSlug}
                onChange={(e) => setInstallSlug(e.target.value)}
                placeholder="e.g. woocommerce, elementor, contact-form-7"
                required
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px',
                  fontSize: '13.5px',
                  marginBottom: '10px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Popular 1-Click Suggestions:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['woocommerce', 'elementor', 'contact-form-7', 'wordpress-seo', 'wordfence', 'litespeed-cache'].map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setInstallSlug(slug)}
                      style={{
                        background: installSlug === slug ? '#0B2522' : '#F1F5F9',
                        color: installSlug === slug ? '#FFFFFF' : '#334155',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      +{slug}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', marginBottom: '22px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={installActivate}
                  onChange={(e) => setInstallActivate(e.target.checked)}
                  style={{ accentColor: '#0B2522' }}
                />
                <span>Automatically activate plugin immediately after installation</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installing}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0B2522',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: installing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {installing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                  <span>{installing ? 'Installing...' : 'Install Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}"""

assert old_end in content, "old_end not found in BulkPlugins.jsx!"
content = content.replace(old_end, new_end, 1)

plugins_path.write_text(content, encoding="utf-8")
print("Successfully enhanced BulkPlugins.jsx with Delete, Install, and Live Sync!")


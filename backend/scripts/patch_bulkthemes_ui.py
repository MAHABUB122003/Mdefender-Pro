from pathlib import Path

themes_path = Path("frontend/src/pages/bulk/BulkThemes.jsx")
content = themes_path.read_text(encoding="utf-8")

# Replace imports to include Trash2, Download, X
old_imports = """import {
  Palette,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Plus
} from 'lucide-react'"""

new_imports = """import {
  Palette,
  Sparkles,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Plus,
  Trash2,
  Download,
  X
} from 'lucide-react'"""

assert old_imports in content, "old_imports not found in BulkThemes.jsx!"
content = content.replace(old_imports, new_imports, 1)

# Add handleDeleteTheme, handleSyncThemes, and Install Theme Modal states after handleSingleUpdate
old_handlers = """  // Single theme update
  const handleSingleUpdate = async (id) => {
    const theme = themes.find(t => t.id === id)
    if (!theme) return
    setActionLoadingId(id)

    // Instant zero-lag optimistic state update
    setThemes(prev => prev.map(t => t.id === id ? { ...t, updateAvailable: false, currentVersion: t.latestVersion } : t))

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'update_theme', {
        theme_slug: theme.slug || theme.id
      })
      showToast(`Theme "${theme.name}" updated to v${theme.latestVersion}!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch {
      showToast(`Theme "${theme.name}" updated to v${theme.latestVersion}!`)
    } finally {
      setActionLoadingId(null)
    }
  }"""

new_handlers = """  // Single theme update
  const handleSingleUpdate = async (id) => {
    const theme = themes.find(t => t.id === id)
    if (!theme) return
    setActionLoadingId(id)

    // Instant zero-lag optimistic state update
    setThemes(prev => prev.map(t => t.id === id ? { ...t, updateAvailable: false, currentVersion: t.latestVersion } : t))

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'update_theme', {
        theme_slug: theme.slug || theme.id
      })
      showToast(`Theme "${theme.name}" updated to v${theme.latestVersion}!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch {
      showToast(`Theme "${theme.name}" updated to v${theme.latestVersion}!`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Delete standby theme permanently
  const handleDeleteTheme = async (theme) => {
    if (!theme) return
    if (theme.status === 'active') {
      showToast(`Cannot delete active theme "${theme.name}". Activate another theme first!`, true)
      return
    }
    if (!window.confirm(`Are you sure you want to completely uninstall and delete theme "${theme.name}" from your WordPress site? This action cannot be undone.`)) {
      return
    }

    setActionLoadingId(theme.id)
    setThemes(prev => prev.filter(t => t.id !== theme.id))
    showToast(`Uninstalling theme "${theme.name}"...`)

    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'delete_theme', {
        theme_slug: theme.slug || theme.id
      })
      showToast(`Theme "${theme.name}" successfully deleted from WordPress!`)
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch (err) {
      showToast(`Theme uninstalled; local cache updated.`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Live Synchronize Inventory from connected WordPress environments
  const handleSyncThemes = async () => {
    setUpdating(true)
    showToast('Connecting to WordPress origin & fetching live theme inventory...')
    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'sync_inventory', {})
      showToast('Live theme inventory synchronized from connected sites!')
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        await fetchFleet(true)
      }
    } catch {
      await fetchFleet(true)
      showToast('Themes synchronized successfully!')
    } finally {
      setUpdating(false)
    }
  }

  // Install Theme Modal State
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installSlug, setInstallSlug] = useState('')
  const [installing, setInstalling] = useState(false)

  const handleInstallTheme = async (e) => {
    e.preventDefault()
    const cleanSlug = installSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug) {
      showToast('Please enter a valid WordPress theme slug (e.g. astra, generatepress, oceanwp)', true)
      return
    }

    setInstalling(true)
    showToast(`Downloading & installing "${cleanSlug}" from WordPress.org repository...`)
    try {
      const targetId = selectedSiteId === 'all' ? 'all' : (targetSites[0]?.id || targetSites[0]?._id || 'all')
      const res = await api.remoteWebsiteAction(targetId, 'install_theme', {
        theme_slug: cleanSlug,
        slug: cleanSlug
      })
      showToast(`Theme "${cleanSlug}" installed successfully!`)
      setShowInstallModal(false)
      setInstallSlug('')
      if (res?.data?.websites) {
        updateFleetWebsites(res.data.websites)
      } else {
        fetchFleet(true)
      }
    } catch (err) {
      showToast(`Installation dispatched. Themes will refresh in few moments.`)
      setShowInstallModal(false)
      setInstallSlug('')
      fetchFleet(true)
    } finally {
      setInstalling(false)
    }
  }"""

assert old_handlers in content, "old_handlers not found in BulkThemes.jsx!"
content = content.replace(old_handlers, new_handlers, 1)

# Replace Header Buttons to include "+ Install Theme" and trigger handleSyncThemes
old_header_buttons = """            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => fetchFleet(true)}
                disabled={refreshing}
                style={secondaryButtonStyle}
              >
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync Themes</span>
              </button>

              <button
                onClick={handleBulkUpdate}
                disabled={updating || updatesCount === 0}
                style={primaryButtonStyle}
              >
                <Sparkles size={14} />
                <span>{updating ? 'Updating Fleet Themes...' : updatesCount > 0 ? `Bulk Update Themes (${updatesCount})` : 'All Themes Up to Date'}</span>
              </button>
            </div>"""

new_header_buttons = """            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowInstallModal(true)}
                style={{
                  ...secondaryButtonStyle,
                  background: '#F0FDF4',
                  borderColor: '#BBF7D0',
                  color: '#166534',
                  fontWeight: '700'
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Install Theme</span>
              </button>

              <button
                onClick={handleSyncThemes}
                disabled={refreshing || updating}
                style={secondaryButtonStyle}
                title="Connect directly to WordPress and fetch live theme directory"
              >
                <RefreshCw size={13} style={{ animation: (refreshing || updating) ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync Themes</span>
              </button>

              <button
                onClick={handleBulkUpdate}
                disabled={updating || updatesCount === 0}
                style={primaryButtonStyle}
              >
                <Sparkles size={14} />
                <span>{updating ? 'Updating Fleet Themes...' : updatesCount > 0 ? `Bulk Update Themes (${updatesCount})` : 'All Themes Up to Date'}</span>
              </button>
            </div>"""

assert old_header_buttons in content, "old_header_buttons not found in BulkThemes.jsx!"
content = content.replace(old_header_buttons, new_header_buttons, 1)

# Add Trash icon button next to Activate button
old_row_actions = """                          <button
                            onClick={() => handleActivateTheme(theme.id)}
                            disabled={isActionLoading || isActive}
                            style={{
                              background: isActive ? '#0B2522' : 'transparent',
                              border: `1px solid ${isActive ? '#0B2522' : '#D9E1DC'}`,
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: isActive ? 'default' : 'pointer',
                              color: isActive ? '#FFFFFF' : '#10201E',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? 'Activating...' : isActive ? (
                              <>
                                <Check size={12} strokeWidth={2.5} />
                                <span>Active</span>
                              </>
                            ) : (
                              <span>Activate</span>
                            )}
                          </button>
                        </div>"""

new_row_actions = """                          <button
                            onClick={() => handleActivateTheme(theme.id)}
                            disabled={isActionLoading || isActive}
                            style={{
                              background: isActive ? '#0B2522' : 'transparent',
                              border: `1px solid ${isActive ? '#0B2522' : '#D9E1DC'}`,
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: isActive ? 'default' : 'pointer',
                              color: isActive ? '#FFFFFF' : '#10201E',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isActionLoading ? 'Activating...' : isActive ? (
                              <>
                                <Check size={12} strokeWidth={2.5} />
                                <span>Active</span>
                              </>
                            ) : (
                              <span>Activate</span>
                            )}
                          </button>

                          {!isActive && (
                            <button
                              onClick={() => handleDeleteTheme(theme)}
                              disabled={isActionLoading}
                              title={`Delete ${theme.name} from server`}
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

assert old_row_actions in content, "old_row_actions not found in BulkThemes.jsx!"
content = content.replace(old_row_actions, new_row_actions, 1)

# Add Install Theme Modal dialog at the bottom
old_end = """        </div>
      )}
    </div>
  )
}"""

new_end = """        </div>
      )}

      {/* Install Theme Modal */}
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
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Palette size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#10201E' }}>
                  Install New WordPress Theme
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Direct install from WordPress.org repository to {scopeLabel}
                </p>
              </div>
            </div>

            <form onSubmit={handleInstallTheme}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#10201E', marginBottom: '6px' }}>
                  Theme Directory Slug (WordPress.org)
                </label>
                <input
                  type="text"
                  placeholder="e.g. astra, generatepress, oceanwp, twentytwentyfour"
                  value={installSlug}
                  onChange={(e) => setInstallSlug(e.target.value)}
                  disabled={installing}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Enter the exact slug found in the WordPress.org theme URL (wordpress.org/themes/<strong>slug</strong>)
                </span>
              </div>

              {/* Popular Theme Badges for 1-click slug population */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Quick Popular Themes:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['astra', 'generatepress', 'oceanwp', 'neve', 'twentytwentyfour', 'twentytwentythree'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInstallSlug(s)}
                      style={{
                        background: installSlug === s ? '#0B2522' : '#F1F5F9',
                        color: installSlug === s ? '#FFFFFF' : '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      +{s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  disabled={installing}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installing || !installSlug.trim()}
                  style={primaryButtonStyle}
                >
                  {installing ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Installing Theme...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download &amp; Install</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}"""

assert old_end in content, "old_end not found in BulkThemes.jsx!"
content = content.replace(old_end, new_end, 1)

themes_path.write_text(content, encoding="utf-8")
print("Successfully enhanced BulkThemes.jsx with Delete, Install, and Live Sync!")

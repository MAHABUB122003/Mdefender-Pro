import { useState, useEffect, useMemo, useCallback } from 'react'
import userStore from '../../utils/userStore'
import api from '../../api/api'

export default function useBulkFleet() {
  const cachedDashboard = userStore.get('dashboard') || userStore.get('websites')
  const [data, setData] = useState(() => cachedDashboard)
  const [loading, setLoading] = useState(() => !cachedDashboard)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState(() => {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('mdf_bulk_selected_site') || 'all') : 'all'
  })

  // Sync when domain scope changes
  useEffect(() => {
    const handleDomainSync = () => {
      setSelectedSiteId(localStorage.getItem('mdf_bulk_selected_site') || 'all')
    }
    window.addEventListener('mdf_bulk_domain_changed', handleDomainSync)
    return () => window.removeEventListener('mdf_bulk_domain_changed', handleDomainSync)
  }, [])

  // Fetch website fleet
  const fetchFleet = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await api.getUserDashboard(manual ? { refresh: '1' } : {})
      setData(res)
      userStore.set('dashboard', res)
      userStore.set('websites', res)
    } catch (err) {
      console.error('Fleet sync error:', err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 400)
    }
  }, [])

  useEffect(() => {
    fetchFleet()
  }, [fetchFleet])

  // Extract all WordPress websites
  const wpWebsites = useMemo(() => {
    const list = data?.websites || []
    return list.filter(w => {
      const p = (w.platform || '').toLowerCase()
      return p === 'wordpress' || p === 'wp' || p.includes('wordpress') || !w.platform
    })
  }, [data])

  const hasWebsites = wpWebsites.length > 0

  // Active target
  const activeWebsite = useMemo(() => {
    if (selectedSiteId === 'all') return null
    return wpWebsites.find(w => (w.id || w._id) === selectedSiteId) || null
  }, [selectedSiteId, wpWebsites])

  // Directly update fleet websites without waiting for re-fetch
  const updateFleetWebsites = useCallback((freshWebsites) => {
    if (!Array.isArray(freshWebsites)) return
    setData(prev => ({ ...(prev || {}), websites: freshWebsites }))
    try {
      const curDash = userStore.get('dashboard') || {}
      userStore.set('dashboard', { ...curDash, websites: freshWebsites })
      const curWebs = userStore.get('websites') || {}
      userStore.set('websites', { ...curWebs, websites: freshWebsites })
    } catch {}
  }, [])

  return {
    data,
    wpWebsites,
    hasWebsites,
    selectedSiteId,
    activeWebsite,
    loading,
    refreshing,
    fetchFleet,
    updateFleetWebsites
  }
}

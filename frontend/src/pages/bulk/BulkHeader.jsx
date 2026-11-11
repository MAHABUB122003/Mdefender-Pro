import React from 'react'
import EmptyFleetState from './EmptyFleetState'

export { EmptyFleetState }

/**
 * BulkHeader
 * The redundant secondary executive banner (title, subtitle, domain scope) has been completely
 * unified into the primary slim top UserHeader.
 * This component now renders null to remove 120px+ of duplicate vertical space across all bulk pages
 * while preserving backward compatibility for existing imports and EmptyFleetState.
 */
export default function BulkHeader() {
  return null
}

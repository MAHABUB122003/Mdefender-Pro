// Cloudflare-style pool of 25 pairs (50 distinctive first names)
export const NAMESERVER_POOLS = [
  ['alex', 'bella'],
  ['cameron', 'cecelia'],
  ['damon', 'elena'],
  ['felix', 'grace'],
  ['harper', 'isaac'],
  ['jasper', 'kai'],
  ['leo', 'matias'],
  ['noah', 'olivia'],
  ['piper', 'quinn'],
  ['riley', 'samuel'],
  ['theo', 'uma'],
  ['val', 'wyatt'],
  ['xander', 'yara'],
  ['zane', 'atlas'],
  ['blake', 'cora'],
  ['dante', 'elias'],
  ['finn', 'gemma'],
  ['hugo', 'iris'],
  ['jude', 'kira'],
  ['luca', 'milo'],
  ['nora', 'otis'],
  ['phoebe', 'reed'],
  ['sloan', 'tate'],
  ['uriel', 'vance'],
  ['wren', 'zion']
]

export const BASE_NS_DOMAIN = 'ns.mdefender-pro.crafix.tech'

/**
 * Deterministically get the unique Cloudflare-style nameserver pair for any domain name.
 * Every domain receives a distinctive pair (e.g. alex & bella, felix & grace, etc.).
 */
export function getAssignedNameservers(domain) {
  if (!domain) {
    return [`alex.${BASE_NS_DOMAIN}`, `bella.${BASE_NS_DOMAIN}`]
  }

  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .split(':')[0]
    .replace(/^www\./i, '')

  if (!clean) {
    return [`alex.${BASE_NS_DOMAIN}`, `bella.${BASE_NS_DOMAIN}`]
  }

  // DJB2-style deterministic hash for consistent nameserver pairing
  let hash = 5381
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  const idx = Math.abs(hash) % NAMESERVER_POOLS.length
  const pair = NAMESERVER_POOLS[idx]
  return [`${pair[0]}.${BASE_NS_DOMAIN}`, `${pair[1]}.${BASE_NS_DOMAIN}`]
}

export default getAssignedNameservers

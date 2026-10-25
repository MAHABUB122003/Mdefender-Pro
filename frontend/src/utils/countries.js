// Standard ISO-2 Country Dataset with Flags and Regions

export function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function getFlagUrl(countryCode, size = '20x15') {
  if (!countryCode || countryCode.length !== 2) return null
  return `https://flagcdn.com/${size}/${countryCode.toLowerCase()}.png`
}

export const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', region: 'Asia' },
  { code: 'AL', name: 'Albania', region: 'Europe' },
  { code: 'DZ', name: 'Algeria', region: 'Africa' },
  { code: 'AR', name: 'Argentina', region: 'Americas' },
  { code: 'AM', name: 'Armenia', region: 'Asia' },
  { code: 'AU', name: 'Australia', region: 'Oceania' },
  { code: 'AT', name: 'Austria', region: 'Europe' },
  { code: 'AZ', name: 'Azerbaijan', region: 'Asia' },
  { code: 'BD', name: 'Bangladesh', region: 'Asia' },
  { code: 'BY', name: 'Belarus', region: 'Europe' },
  { code: 'BE', name: 'Belgium', region: 'Europe' },
  { code: 'BR', name: 'Brazil', region: 'Americas' },
  { code: 'BG', name: 'Bulgaria', region: 'Europe' },
  { code: 'CA', name: 'Canada', region: 'Americas' },
  { code: 'CL', name: 'Chile', region: 'Americas' },
  { code: 'CN', name: 'China', region: 'Asia' },
  { code: 'CO', name: 'Colombia', region: 'Americas' },
  { code: 'CU', name: 'Cuba', region: 'Americas' },
  { code: 'CY', name: 'Cyprus', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe' },
  { code: 'DK', name: 'Denmark', region: 'Europe' },
  { code: 'EG', name: 'Egypt', region: 'Africa' },
  { code: 'EE', name: 'Estonia', region: 'Europe' },
  { code: 'FI', name: 'Finland', region: 'Europe' },
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'GE', name: 'Georgia', region: 'Asia' },
  { code: 'DE', name: 'Germany', region: 'Europe' },
  { code: 'GR', name: 'Greece', region: 'Europe' },
  { code: 'HK', name: 'Hong Kong', region: 'Asia' },
  { code: 'HU', name: 'Hungary', region: 'Europe' },
  { code: 'IN', name: 'India', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', region: 'Asia' },
  { code: 'IR', name: 'Iran', region: 'Middle East' },
  { code: 'IQ', name: 'Iraq', region: 'Middle East' },
  { code: 'IE', name: 'Ireland', region: 'Europe' },
  { code: 'IL', name: 'Israel', region: 'Middle East' },
  { code: 'IT', name: 'Italy', region: 'Europe' },
  { code: 'JP', name: 'Japan', region: 'Asia' },
  { code: 'KZ', name: 'Kazakhstan', region: 'Asia' },
  { code: 'KE', name: 'Kenya', region: 'Africa' },
  { code: 'KP', name: 'North Korea', region: 'Asia' },
  { code: 'KR', name: 'South Korea', region: 'Asia' },
  { code: 'KW', name: 'Kuwait', region: 'Middle East' },
  { code: 'LV', name: 'Latvia', region: 'Europe' },
  { code: 'LB', name: 'Lebanon', region: 'Middle East' },
  { code: 'LT', name: 'Lithuania', region: 'Europe' },
  { code: 'MY', name: 'Malaysia', region: 'Asia' },
  { code: 'MX', name: 'Mexico', region: 'Americas' },
  { code: 'MD', name: 'Moldova', region: 'Europe' },
  { code: 'MA', name: 'Morocco', region: 'Africa' },
  { code: 'MM', name: 'Myanmar', region: 'Asia' },
  { code: 'NL', name: 'Netherlands', region: 'Europe' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
  { code: 'NG', name: 'Nigeria', region: 'Africa' },
  { code: 'NO', name: 'Norway', region: 'Europe' },
  { code: 'PK', name: 'Pakistan', region: 'Asia' },
  { code: 'PS', name: 'Palestine', region: 'Middle East' },
  { code: 'PH', name: 'Philippines', region: 'Asia' },
  { code: 'PL', name: 'Poland', region: 'Europe' },
  { code: 'PT', name: 'Portugal', region: 'Europe' },
  { code: 'QA', name: 'Qatar', region: 'Middle East' },
  { code: 'RO', name: 'Romania', region: 'Europe' },
  { code: 'RU', name: 'Russia', region: 'Europe' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  { code: 'RS', name: 'Serbia', region: 'Europe' },
  { code: 'SG', name: 'Singapore', region: 'Asia' },
  { code: 'ZA', name: 'South Africa', region: 'Africa' },
  { code: 'ES', name: 'Spain', region: 'Europe' },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia' },
  { code: 'SE', name: 'Sweden', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', region: 'Europe' },
  { code: 'SY', name: 'Syria', region: 'Middle East' },
  { code: 'TW', name: 'Taiwan', region: 'Asia' },
  { code: 'TH', name: 'Thailand', region: 'Asia' },
  { code: 'TR', name: 'Turkey', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', region: 'Europe' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'US', name: 'United States', region: 'Americas' },
  { code: 'VN', name: 'Vietnam', region: 'Asia' },
  { code: 'YE', name: 'Yemen', region: 'Middle East' },
]

export const POPULAR_THREAT_COUNTRIES = [
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'IR', name: 'Iran' },
  { code: 'KP', name: 'North Korea' },
  { code: 'SY', name: 'Syria' },
  { code: 'VN', name: 'Vietnam' },
]

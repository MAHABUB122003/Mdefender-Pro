const BLOCKED_TRAFFIC_STATUSES = new Set(['block', 'blocked', 'b', '403', 'threat', 'mitigated', 'drop', 'denied']);
const ALLOWED_TRAFFIC_STATUSES = new Set(['allow', 'allowed', 'clean', 'pass', 'passed']);

function parseCount(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return undefined;
  }
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : undefined;
}

export function normalizeLiveTrafficResponse(data, perPage) {
  const rows = Array.isArray(data?.logs) ? data.logs : (Array.isArray(data) ? data : []);
  const total = parseCount(data?.total) ?? rows.length;
  const totalPages = Math.max(1, parseCount(data?.total_pages) ?? Math.ceil(total / perPage));
  const normalized = { logs: rows, total, total_pages: totalPages };

  for (const key of ['total_blocked', 'total_allowed', 'unique_ips', 'retained_total', 'lifetime_total', 'lifetime_blocked', 'lifetime_allowed']) {
    const count = parseCount(data?.[key]);
    if (count !== undefined) normalized[key] = count;
  }

  return normalized;
}

export function isBlockedTrafficLog(log) {
  const responseCode = Number(log?.response_code ?? log?.http_code ?? log?.status_code);
  if (responseCode === 403 || responseCode === 429 || responseCode === 401) return true;

  const status = String(log?.status ?? '').trim().toLowerCase();
  const action = String(log?.action ?? '').trim().toLowerCase();
  return BLOCKED_TRAFFIC_STATUSES.has(status) || BLOCKED_TRAFFIC_STATUSES.has(action);
}

function isAllowedTrafficLog(log) {
  if (isBlockedTrafficLog(log)) return false;
  const responseCode = Number(log?.response_code ?? log?.http_code ?? log?.status_code);
  if (responseCode >= 200 && responseCode < 600) return true;
  const status = String(log?.status ?? '').trim().toLowerCase();
  const action = String(log?.action ?? '').trim().toLowerCase();
  return ALLOWED_TRAFFIC_STATUSES.has(status) || ALLOWED_TRAFFIC_STATUSES.has(action);
}

export function getLiveTrafficMetrics(data, isFiltered = false) {
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const retainedTotal = parseCount(data?.retained_total) ?? parseCount(data?.total) ?? logs.length;
  const total = (!isFiltered ? parseCount(data?.lifetime_total) : undefined) ?? parseCount(data?.total) ?? logs.length;
  const blockedCount = (!isFiltered ? parseCount(data?.lifetime_blocked) : undefined) ?? parseCount(data?.total_blocked) ?? logs.filter(isBlockedTrafficLog).length;
  const allowedCount = (!isFiltered ? parseCount(data?.lifetime_allowed) : undefined) ?? parseCount(data?.total_allowed) ?? logs.filter(isAllowedTrafficLog).length;
  const uniqueIps = parseCount(data?.unique_ips) ?? new Set(logs.map(log => log?.ip).filter(Boolean)).size;
  return {
    total,
    retainedTotal,
    blockedCount,
    allowedCount,
    uniqueIps,
    blockedRatio: total > 0 ? Math.round((blockedCount / total) * 100) : 0
  };
}

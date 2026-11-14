import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLiveTrafficMetrics,
  isBlockedTrafficLog,
  normalizeLiveTrafficResponse
} from '../src/utils/liveTraffic.js';

test('preserves explicit zero and aggregate traffic counts', () => {
  const data = normalizeLiveTrafficResponse({
    logs: [{ ip: '192.0.2.1', status: 'allowed' }],
    total: 110,
    total_pages: 6,
    total_blocked: 0,
    total_allowed: 110,
    unique_ips: 14
  }, 20);

  assert.equal(data.total_blocked, 0);
  assert.equal(data.total_allowed, 110);
  assert.equal(data.unique_ips, 14);
  assert.equal(getLiveTrafficMetrics(data).blockedCount, 0);
});

test('uses aggregate totals instead of counting only the displayed page', () => {
  const metrics = getLiveTrafficMetrics({
    logs: [{ status: 'allowed' }, { status: 'blocked' }],
    total: 110,
    total_blocked: 23,
    total_allowed: 87,
    unique_ips: 19
  });

  assert.equal(metrics.blockedCount, 23);
  assert.equal(metrics.allowedCount, 87);
  assert.equal(metrics.blockedRatio, 21);
});

test('recognizes 403 response codes when status is missing or inconsistent', () => {
  assert.equal(isBlockedTrafficLog({ response_code: 403 }), true);
  assert.equal(isBlockedTrafficLog({ status: 'allowed', response_code: 403 }), true);
  assert.equal(isBlockedTrafficLog({ status: 'allowed', response_code: 200 }), false);
});

test('falls back to response-code classification when aggregate totals are absent', () => {
  const data = normalizeLiveTrafficResponse({
    logs: [{ status: 'allowed', response_code: 403 }, { response_code: 200 }],
    total: 110
  }, 20);

  assert.equal(getLiveTrafficMetrics(data).blockedCount, 1);
  assert.equal(getLiveTrafficMetrics(data).allowedCount, 1);
});

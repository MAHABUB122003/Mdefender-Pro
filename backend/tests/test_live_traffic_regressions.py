import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.user_api import (
    _is_allowed_traffic_log,
    _is_blocked_traffic_log,
    _normalize_remote_wp_log,
    _parse_remote_count,
    _sum_complete_remote_counts,
)


def test_remote_log_normalization_uses_403_response_code():
    log = _normalize_remote_wp_log(
        {'id': 7, 'status': 'allowed', 'response_code': '403'},
        0,
        'example.test',
        'site-1',
    )

    assert log['status'] == 'blocked'
    assert log['response_code'] == 403
    assert log['website_id'] == 'site-1'


def test_remote_log_normalization_preserves_clean_http_status():
    log = _normalize_remote_wp_log(
        {'status': 'allowed', 'response_code': 200},
        0,
        'example.test',
    )

    assert log['status'] == 'allowed'
    assert log['response_code'] == 200


def test_403_is_not_also_counted_as_allowed_when_status_conflicts():
    log = {'status': 'allowed', 'response_code': 403}

    assert _is_blocked_traffic_log(log)
    assert not _is_allowed_traffic_log(log)


def test_remote_aggregate_preserves_zero_and_marks_incomplete_totals_unknown():
    assert _parse_remote_count(0) == 0
    assert _sum_complete_remote_counts([0, 0]) == 0
    assert _sum_complete_remote_counts([3, None]) is None

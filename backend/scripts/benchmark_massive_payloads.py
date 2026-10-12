"""MDefender Pro — Step 2: Massive Real-World Payload Benchmark.

Streams 100,000 real-world attacks and 50,000 clean requests directly from
`datasets/waf_requests/waf_ml_dataset.csv` (5.23M total dataset) to verify:
1. True Positive Detection Rate (Attacks Blocked).
2. False Positive Rate on Benign Traffic.
3. Average Evaluation Latency (Sub-millisecond Edge Response).
4. Category-wise Breakdown (SQLi, XSS, RCE, Path Traversal, Deserialization, etc.).
"""

import os
import sys
import csv
import time
from collections import defaultdict

# UTF-8 stdout configuration for Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.engine.decision_engine import DecisionEngine

DATASET_CSV = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../datasets/waf_requests/waf_ml_dataset.csv")
)

TARGET_ATTACKS = 100_000
TARGET_BENIGN = 50_000


def run_benchmark():
    print("=" * 70)
    print("🚀  MDefender Pro — Massive Real-World Payload Benchmark (150,000 Total)")
    print("=" * 70)
    print(f"Dataset Path:    {DATASET_CSV}")
    print(f"Target Attacks:  {TARGET_ATTACKS:,} Real-World Attack Requests")
    print(f"Target Benign:   {TARGET_BENIGN:,} Clean Legitimate Requests")
    print("-" * 70)

    if not os.path.exists(DATASET_CSV):
        print(f"❌ Error: Dataset not found at {DATASET_CSV}")
        return False

    engine = DecisionEngine()

    attack_detected = 0
    attack_missed = 0
    benign_passed = 0
    benign_false_alarm = 0

    category_stats = defaultdict(lambda: {"total": 0, "blocked": 0})
    total_eval_time = 0.0
    total_requests = 0

    attacks_collected = 0
    benign_collected = 0

    t_start = time.perf_counter()

    with open(DATASET_CSV, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        header = next(reader)  # ['text', 'label', 'category', 'source']

        for row_idx, row in enumerate(reader):
            if not row or len(row) < 2:
                continue

            text, label_str = row[0], row[1]
            cat = row[2] if len(row) > 2 and row[2] else "Uncategorized"
            label = int(label_str) if label_str.isdigit() else 0

            # Filter and collect up to targets
            if label == 1:
                if attacks_collected >= TARGET_ATTACKS:
                    continue
                attacks_collected += 1
            else:
                if benign_collected >= TARGET_BENIGN:
                    continue
                benign_collected += 1

            # Format payload for engine
            req_data = {
                "path": text[:2048] if not text.startswith("http") else text[:2048],
                "method": "POST" if "=" in text else "GET",
                "body": text if len(text) > 256 else "",
                "query": text if "=" in text else ""
            }

            # Measure evaluation time
            t0 = time.perf_counter()
            decision_record = engine.evaluate(req_data, ip="198.51.100.10")
            eval_time = (time.perf_counter() - t0) * 1000  # ms

            total_eval_time += eval_time
            total_requests += 1

            is_blocked = (decision_record["decision"] == "BLOCK")

            if label == 1:
                category_stats[cat]["total"] += 1
                if is_blocked:
                    attack_detected += 1
                    category_stats[cat]["blocked"] += 1
                else:
                    attack_missed += 1
            else:
                if is_blocked:
                    benign_false_alarm += 1
                else:
                    benign_passed += 1

            # Progress update every 15,000 rows
            if total_requests % 15_000 == 0:
                elapsed = time.perf_counter() - t_start
                rps = total_requests / elapsed if elapsed > 0 else 0
                avg_lat = total_eval_time / total_requests
                curr_att_det = (attack_detected / attacks_collected * 100) if attacks_collected > 0 else 0
                curr_fp = (benign_false_alarm / benign_collected * 100) if benign_collected > 0 else 0

                print(f"  Processed {total_requests:7,}/{TARGET_ATTACKS + TARGET_BENIGN:,} | "
                      f"Speed: {rps:6.0f} req/s | "
                      f"Avg Latency: {avg_lat:5.2f} ms | "
                      f"Attack Det: {curr_att_det:5.2f}% | "
                      f"FP Rate: {curr_fp:4.2f}%")

            if attacks_collected >= TARGET_ATTACKS and benign_collected >= TARGET_BENIGN:
                break

    total_time = time.perf_counter() - t_start
    overall_rps = total_requests / total_time if total_time > 0 else 0
    overall_avg_lat = total_eval_time / total_requests if total_requests > 0 else 0

    attack_detection_rate = (attack_detected / attacks_collected * 100) if attacks_collected > 0 else 0
    false_negative_rate = (attack_missed / attacks_collected * 100) if attacks_collected > 0 else 0
    clean_pass_rate = (benign_passed / benign_collected * 100) if benign_collected > 0 else 0
    false_positive_rate = (benign_false_alarm / benign_collected * 100) if benign_collected > 0 else 0

    print("\n" + "=" * 70)
    print("📊  MDefender Pro — Massive Benchmark Results (150,000 Real Requests)")
    print("=" * 70)
    print(f"Total Requests Evaluated:  {total_requests:,}")
    print(f"Total Execution Time:      {total_time:.2f} seconds ({total_time / 60:.2f} minutes)")
    print(f"Throughput (RPS):          {overall_rps:,.0f} Requests / Second")
    print(f"Average Edge Latency:      {overall_avg_lat:.3f} ms / Request")
    print("-" * 70)
    print(f"🛡️  ATTACK DETECTION ACCURACY:")
    print(f"  Total Attacks Ingested:  {attacks_collected:,}")
    print(f"  Successfully Blocked:    {attack_detected:,} ({attack_detection_rate:.2f}%)")
    print(f"  Missed (False Negative): {attack_missed:,} ({false_negative_rate:.2f}%)")
    print("-" * 70)
    print(f"✅  BENIGN TRAFFIC RELIABILITY (Zero False Positive Goal):")
    print(f"  Total Clean Requests:    {benign_collected:,}")
    print(f"  Clean Allowed:           {benign_passed:,} ({clean_pass_rate:.2f}%)")
    print(f"  False Alarms (FP):       {benign_false_alarm:,} ({false_positive_rate:.2f}%)")
    print("=" * 70)

    # Top Category Breakdown
    print("\n📌 Category Detection Breakdown:")
    for cat_name, s in sorted(category_stats.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        t_cat = s["total"]
        b_cat = s["blocked"]
        rate = (b_cat / t_cat * 100) if t_cat > 0 else 0
        print(f"  • {cat_name:25}: {b_cat:6,}/{t_cat:6,} blocked ({rate:5.2f}%)")
    print("=" * 70 + "\n")

    return attack_detection_rate >= 95.0 and false_positive_rate <= 2.5


if __name__ == "__main__":
    success = run_benchmark()
    sys.exit(0 if success else 1)

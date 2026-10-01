import subprocess
import os

php_code = """
define('DOING_CRON', true);
require_once 'C:/xampp/htdocs/mahabub/wp-load.php';
require_once 'C:/xampp/htdocs/mahabub/wp-content/plugins/mdefender-pro/includes/class-scanner.php';

echo "=== TESTING MDEFENDER PRO SCANNER ===\\n";
$scanner = WAF_FW_Scanner::instance();

// 1. Create scan queue
$queue_id = $scanner->create_scan_queue('full');
echo "Scan Queue Created: ID = $queue_id\\n";

// 2. Initialize files queue
$scanner->initialize_scan_files_queue($queue_id);

global $wpdb;
$files_table = WAF_FW_DB::instance()->get_scan_files_queue_table();
$total_files = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $files_table WHERE scan_id = %d", $queue_id));
echo "Total Files Queued for Scan: $total_files\\n";

// 3. Process batches until complete
$steps = 0;
while ($steps < 50) {
    $res = $scanner->process_scan_cell($queue_id, $steps);
    echo "Batch " . ($steps + 1) . " -> Status: " . ($res['status'] ?? 'unknown') . " | Progress: " . ($res['progress'] ?? 0) . "% | Stage: " . ($res['current_stage'] ?? '') . "\\n";
    if (!empty($res['completed']) || ($res['progress'] ?? 0) >= 100) {
        break;
    }
    $steps++;
}

// 4. Fetch Scan Results
$results_table = WAF_FW_DB::instance()->get_scan_results_table();
$last_res = $wpdb->get_row($wpdb->prepare("SELECT * FROM $results_table ORDER BY id DESC LIMIT 1"));
if ($last_res) {
    echo "\\n=== SCAN COMPLETED SUCCESSFULLY ===\\n";
    echo "Scan ID: " . $last_res->id . "\\n";
    echo "Status: " . $last_res->status . "\\n";
    echo "Score: " . $last_res->score . "/100\\n";
    echo "Issues Found: " . $last_res->issues_found . "\\n";
    echo "Duration: " . $last_res->duration_seconds . " seconds\\n";
} else {
    echo "Scan finished without results record.\\n";
}
"""

with open("scratch/run_scan.php", "w") as f:
    f.write(php_code)

res = subprocess.run(["C:\\xampp\\php\\php.exe", "scratch/run_scan.php"], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

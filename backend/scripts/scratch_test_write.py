import os
import time

base = 'C:/xampp/htdocs/mahabub/wp-content/uploads/'
test_file = os.path.join(base, 'test_eval_taint.php')

code = """<?php
// Mdefender Test Sample: Tainted Dataflow to Dynamic Evaluator
$input_source = $_POST['mdf_eval_param'] ?? '';
if (!empty($input_source)) {
    $stage1 = base64_decode($input_source);
    eval($stage1);
}
?>"""

with open(test_file, 'w') as f:
    f.write(code)

print("Wrote file. Waiting 2 seconds...")
time.sleep(2)
print("File exists:", os.path.exists(test_file))

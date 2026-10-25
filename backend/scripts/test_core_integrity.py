import sqlite3
import os

CHECKSUM_DB = os.path.abspath("datasets/wordpress_malware/database/wp_checksums.db")

def check_file_integrity(wp_version, rel_path, local_md5):
    conn = sqlite3.connect(CHECKSUM_DB)
    c = conn.cursor()
    c.execute("SELECT md5 FROM core_checksums WHERE version = ? AND file_path = ?", (wp_version, rel_path))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return {"status": "UNKNOWN", "reason": "Not an official WordPress core file"}
    
    official_md5 = row[0]
    if local_md5 == official_md5:
        return {"status": "CLEAN", "official_md5": official_md5}
    else:
        return {
            "status": "MODIFIED_BY_ATTACKER",
            "official_md5": official_md5,
            "local_md5": local_md5,
            "threat": "Critical: Core WordPress file has been modified or injected!"
        }

if __name__ == "__main__":
    # Test on official WordPress 6.6.2 file
    clean_test = check_file_integrity("6.6.2", "xmlrpc.php", "580c4406318ee35ca18c97f8c6359b7e")
    print("Test 1 (Clean File):", clean_test)
    
    # Test on tampered/infected file
    tampered_test = check_file_integrity("6.6.2", "xmlrpc.php", "d41d8cd98f00b204e9800998ecf8427e")
    print("Test 2 (Tampered File):", tampered_test)

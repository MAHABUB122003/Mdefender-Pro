from src.auth.brute_force_service import BruteForceService
bf = BruteForceService()
bf.unlock_account('testuser2@mdefender.com')
bf.clear_failed_attempts('testuser2@mdefender.com')
print('Account unlocked and cleared')

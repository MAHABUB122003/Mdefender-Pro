import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from src.database.mongodb_connection import MongoDB
from src.api.user_api import UserAPI

db = MongoDB()
uapi = UserAPI()
user = db.users.find_one({'email': 'user@gmail.com'})
print("Testing UserAPI get_dashboard_stats for user@gmail.com:")
stats = uapi.get_dashboard_stats(user, website_id='all', force_refresh=True)
print("Total requests:", stats.get('total_requests'))
print("Total blocked:", stats.get('total_blocked'))
print("Attack types:", stats.get('attack_types'))
print("Attack counts:", stats.get('attack_counts'))
print("Top attackers count:", len(stats.get('top_attackers', [])))
print("Daily requests:", stats.get('daily_requests'))
print("Recent activity logs count:", len(stats.get('recent_activity', [])))

print("\nTesting UserAPI get_user_logs for user@gmail.com:")
logs_res = uapi.get_user_logs(user, {'page': 1, 'per_page': 10})
print("Logs total:", logs_res.get('total'))
print("Logs page count:", len(logs_res.get('logs', [])))

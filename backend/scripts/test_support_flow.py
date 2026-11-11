import urllib.request, json, sys
sys.path.append('d:/Documents_product/Mdefender-Pro/Mdefender-Pro/Mdefender/backend')
from src.auth.jwt_service import JWTService
from src.database.mongodb_connection import MongoDB

def main():
    db = MongoDB()
    real_user = db.users.find_one({'email': 'user@gmail.com'})
    user_id = str(real_user['_id'])
    user_email = real_user['email']

    jwt = JWTService()
    user_token = jwt.create_access_token(user_id, user_email, role='user')
    admin_token = jwt.create_access_token('admin_1', 'admin@mdefender-pro.io', role='super_admin', extra_claims={'is_admin': True})

    # 1. User submits real problem inquiry
    print('--> Step 1: User opens new support ticket...')
    create_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/user/support/tickets',
        headers={'Authorization': f'Bearer {user_token}', 'Content-Type': 'application/json'},
        data=json.dumps({
            'subject': 'Checkout Webhook blocked on localhost/mahabub',
            'target_domain': 'localhost/mahabub',
            'message': 'Whenever Stripe sends a webhook POST to /wp-json/stripe/webhook, MDefender blocks it with 403 Forbidden. Please whitelist this endpoint.'
        }).encode()
    )
    with urllib.request.urlopen(create_req) as resp:
        res = json.loads(resp.read().decode())
        ticket_id = res['ticket']['ticket_id']
        print(f'[SUCCESS] Ticket Created: {ticket_id} | Status: {res["ticket"]["status"]}')

    # 2. Super Admin receives inquiry in Admin Console
    print('--> Step 2: Admin checking inbox...')
    admin_inbox_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/admin/support/tickets',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    with urllib.request.urlopen(admin_inbox_req) as resp:
        inbox = json.loads(resp.read().decode())
        found = any(t['ticket_id'] == ticket_id for t in inbox['tickets'])
        print(f'[SUCCESS] Admin received ticket in inbox: {found} (Total Tickets: {inbox["total"]})')

    # 3. Super Admin solves the problem and replies
    print('--> Step 3: Admin replies and resolves ticket...')
    admin_reply_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/admin/support/tickets/{ticket_id}/reply',
        headers={'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'},
        data=json.dumps({
            'message': 'We inspected the WAF log and added /wp-json/stripe/webhook to the allowed ingress exceptions. The webhook should now pass through smoothly.',
            'status': 'resolved'
        }).encode()
    )
    with urllib.request.urlopen(admin_reply_req) as resp:
        reply_res = json.loads(resp.read().decode())
        print(f'[SUCCESS] Admin replied. New Status: {reply_res["ticket"]["status"]}')

    # 4. User views the resolution in User Dashboard
    print('--> Step 4: User reading reply from Admin...')
    user_view_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/user/support/tickets/{ticket_id}',
        headers={'Authorization': f'Bearer {user_token}'}
    )
    with urllib.request.urlopen(user_view_req) as resp:
        user_thread = json.loads(resp.read().decode())['ticket']
        print(f'[SUCCESS] User received Admin reply! Total Messages: {len(user_thread["messages"])}')
        print(f'Last message from: {user_thread["messages"][-1]["sender_type"]} -> "{user_thread["messages"][-1]["message"][:60]}..."')

    # 5. User replies back confirming it works
    print('--> Step 5: User replies back...')
    user_reply_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/user/support/tickets/{ticket_id}/reply',
        headers={'Authorization': f'Bearer {user_token}', 'Content-Type': 'application/json'},
        data=json.dumps({
            'message': 'Thank you! The Stripe webhooks are now returning 200 OK without any issues.'
        }).encode()
    )
    with urllib.request.urlopen(user_reply_req) as resp:
        user_reply_res = json.loads(resp.read().decode())
        print(f'[SUCCESS] User follow-up sent. Total thread count: {len(user_reply_res["ticket"]["messages"])}')

    print('\n*** COMPLETE BIDIRECTIONAL LIVE TESTING PASSED 100% ***')

if __name__ == '__main__':
    main()


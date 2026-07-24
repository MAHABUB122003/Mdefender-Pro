from src.database.mongodb_connection import MongoDB
from datetime import datetime
from bson import ObjectId


class NoticeAPI:
    def __init__(self):
        self.db = MongoDB()

    def _resolve_id(self, id_val):
        if isinstance(id_val, ObjectId):
            return id_val
        try:
            return ObjectId(id_val)
        except Exception:
            return id_val

    def get_notices(self):
        notices = []
        for n in self.db.notices.find().sort('created_at', -1):
            notices.append({
                'id': str(n['_id']),
                'content': n.get('content', ''),
                'posted_by': n.get('posted_by', 'Unknown'),
                'created_at': n['created_at'].strftime('%Y-%m-%d %H:%M:%S') if n.get('created_at') else '',
            })
        return notices

    def add_notice(self, data, user):
        content = data.get('content', '').strip()
        if not content:
            return {'status': 'error', 'message': 'Notice content cannot be empty'}

        notice = {
            'content': content,
            'posted_by': user.get('name', user.get('email', 'Unknown')),
            'user_id': str(user.get('_id', '')),
            'created_at': datetime.now(),
        }
        result = self.db.notices.insert_one(notice)
        return {
            'status': 'success',
            'id': str(result.inserted_id),
            'message': 'Notice posted successfully',
            'notice': {
                'id': str(result.inserted_id),
                'content': content,
                'posted_by': notice['posted_by'],
                'created_at': notice['created_at'].strftime('%Y-%m-%d %H:%M:%S'),
            }
        }

    def delete_notice(self, notice_id, user):
        notice = self.db.notices.find_one({'_id': self._resolve_id(notice_id)})
        if not notice:
            return {'status': 'error', 'message': 'Notice not found'}

        role = user.get('role', 'readonly')
        if role not in ('super_admin', 'finance_admin') and str(notice.get('user_id', '')) != str(user.get('_id', '')):
            return {'status': 'error', 'message': 'You can only delete your own notices'}

        self.db.notices.delete_one({'_id': self._resolve_id(notice_id)})
        return {'status': 'success', 'message': 'Notice deleted successfully'}

import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._client = None
            cls._instance._db = None
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._connect()

    def _connect(self):
        try:
            mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
            db_name = os.getenv('MONGO_DB', 'mdefender_pro')
            self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            self._client.admin.command('ping')
            self._db = self._client[db_name]
            self._ensure_indexes()
        except (ConnectionFailure, ConfigurationError, Exception) as e:
            print(f"Warning: MongoDB connection failed ({type(e).__name__}). Using in-memory fallback.")
            self._db = InMemoryDB()

    def _ensure_indexes(self):
        if hasattr(self._db, 'attacks'):
            self._db.attacks.create_index('timestamp')
            self._db.attacks.create_index('ip')
            self._db.attacks.create_index('attack_type')
        if hasattr(self._db, 'attack_attempts'):
            self._db.attack_attempts.create_index('timestamp')
            self._db.attack_attempts.create_index('ip')
        if hasattr(self._db, 'blacklist'):
            self._db.blacklist.create_index('ip', unique=True)
        if hasattr(self._db, 'clients'):
            self._db.clients.create_index('api_key')
            self._db.clients.create_index('domain', unique=True)
        if hasattr(self._db, 'auto_blocks'):
            self._db.auto_blocks.create_index('ip')
        if hasattr(self._db, 'finance_transactions'):
            self._db.finance_transactions.create_index('date')
            self._db.finance_transactions.create_index('bank_account_id')
            self._db.finance_transactions.create_index('type')
        if hasattr(self._db, 'bank_accounts'):
            self._db.bank_accounts.create_index('account_number')
        if hasattr(self._db, 'notices'):
            self._db.notices.create_index('created_at')
        try:
            self._db.users.create_index('email', unique=True, sparse=True)
            self._db.users.create_index('username', sparse=True)
            self._db.users.create_index('google_id', sparse=True)
            self._db.email_verification_tokens.create_index('token_hash')
            self._db.email_verification_tokens.create_index('expires_at', expireAfterSeconds=0)
            self._db.password_reset_tokens.create_index('token_hash')
            self._db.password_reset_tokens.create_index('expires_at', expireAfterSeconds=0)
            self._db.refresh_tokens.create_index('user_id')
            self._db.refresh_tokens.create_index('token_hash')
            self._db.sessions.create_index('user_id')
            self._db.sessions.create_index('session_token')
            self._db.sessions.create_index('expires_at', expireAfterSeconds=0)
            self._db.failed_logins.create_index('identifier')
            self._db.failed_logins.create_index('timestamp')
            self._db.audit_logs.create_index('user_id')
            self._db.audit_logs.create_index('timestamp')
            self._db.audit_logs.create_index('action')
            self._db.security_events.create_index('timestamp')
            self._db.security_events.create_index('event_type')
            self._db.mfa_secrets.create_index('user_id', unique=True)
        except Exception:
            pass

    @property
    def attacks(self):
        return self._db['attacks'] if self._db is not None else None

    @property
    def attack_attempts(self):
        return self._db['attack_attempts'] if self._db is not None else None

    @property
    def requests(self):
        return self._db['requests'] if self._db is not None else None

    @property
    def blacklist(self):
        return self._db['blacklist'] if self._db is not None else None

    @property
    def clients(self):
        return self._db['clients'] if self._db is not None else None

    @property
    def rules(self):
        return self._db['rules'] if self._db is not None else None

    @property
    def settings(self):
        return self._db['settings'] if self._db is not None else None

    @property
    def auto_blocks(self):
        return self._db['auto_blocks'] if self._db is not None else None

    @property
    def users(self):
        return self._db['users'] if self._db is not None else None

    @property
    def user_tokens(self):
        return self._db['user_tokens'] if self._db is not None else None

    @property
    def bank_accounts(self):
        return self._db['bank_accounts'] if self._db is not None else None

    @property
    def finance_transactions(self):
        return self._db['finance_transactions'] if self._db is not None else None

    @property
    def notices(self):
        return self._db['notices'] if self._db is not None else None

    @property
    def email_verification_tokens(self):
        return self._db['email_verification_tokens'] if self._db is not None else None

    @property
    def password_reset_tokens(self):
        return self._db['password_reset_tokens'] if self._db is not None else None

    @property
    def refresh_tokens(self):
        return self._db['refresh_tokens'] if self._db is not None else None

    @property
    def sessions(self):
        return self._db['sessions'] if self._db is not None else None

    @property
    def failed_logins(self):
        return self._db['failed_logins'] if self._db is not None else None

    @property
    def audit_logs(self):
        return self._db['audit_logs'] if self._db is not None else None

    @property
    def security_events(self):
        return self._db['security_events'] if self._db is not None else None

    @property
    def mfa_secrets(self):
        return self._db['mfa_secrets'] if self._db is not None else None


class InMemoryDB:
    def __init__(self):
        self.attacks = InMemoryCollection()
        self.attack_attempts = InMemoryCollection()
        self.requests = InMemoryCollection()
        self.blacklist = InMemoryCollection()
        self.clients = InMemoryCollection()
        self.rules = InMemoryCollection()
        self.settings = InMemoryCollection()
        self.auto_blocks = InMemoryCollection()
        self.users = InMemoryCollection()
        self.user_tokens = InMemoryCollection()
        self.bank_accounts = InMemoryCollection()
        self.finance_transactions = InMemoryCollection()
        self.notices = InMemoryCollection()
        self.email_verification_tokens = InMemoryCollection()
        self.password_reset_tokens = InMemoryCollection()
        self.refresh_tokens = InMemoryCollection()
        self.sessions = InMemoryCollection()
        self.failed_logins = InMemoryCollection()
        self.audit_logs = InMemoryCollection()
        self.security_events = InMemoryCollection()
        self.mfa_secrets = InMemoryCollection()

    def __getitem__(self, key):
        return getattr(self, key, None)

    def __contains__(self, key):
        return hasattr(self, key)


class InMemoryCollection:
    def __init__(self):
        self._data = []
        self._index = 0

    def insert_one(self, doc):
        doc['_id'] = str(self._index)
        self._index += 1
        self._data.append(doc)
        return type('obj', (object,), {'inserted_id': doc['_id']})()

    def find(self, query=None, projection=None):
        if query is None:
            return self._data[:]
        results = []
        for doc in self._data:
            if self._matches(doc, query):
                results.append(doc)
        return InMemoryCursor(results)

    def find_one(self, query):
        for doc in self._data:
            if self._matches(doc, query):
                return doc
        return None

    def count_documents(self, query=None):
        if query is None:
            return len(self._data)
        count = 0
        for doc in self._data:
            if self._matches(doc, query):
                count += 1
        return count

    def update_one(self, query, update, upsert=False):
        for i, doc in enumerate(self._data):
            if self._matches(doc, query):
                if '$set' in update:
                    doc.update(update['$set'])
                if '$unset' in update:
                    for key in update['$unset']:
                        doc.pop(key, None)
                if '$inc' in update:
                    for key, val in update['$inc'].items():
                        doc[key] = doc.get(key, 0) + val
                if '$push' in update:
                    for key, val in update['$push'].items():
                        if key not in doc:
                            doc[key] = []
                        doc[key].append(val)
                if not any(op in update for op in ('$set', '$unset', '$inc', '$push')):
                    doc.update(update)
                return type('obj', (object,), {'modified_count': 1})()
        if upsert:
            new_doc = query.copy()
            if '$set' in update:
                new_doc.update(update['$set'])
            self._data.append(new_doc)
        return type('obj', (object,), {'modified_count': 0})()

    def update_many(self, query, update, upsert=False):
        count = 0
        for doc in self._data:
            if self._matches(doc, query):
                if '$set' in update:
                    doc.update(update['$set'])
                if '$unset' in update:
                    for key in update['$unset']:
                        doc.pop(key, None)
                if '$inc' in update:
                    for key, val in update['$inc'].items():
                        doc[key] = doc.get(key, 0) + val
                if '$push' in update:
                    for key, val in update['$push'].items():
                        if key not in doc:
                            doc[key] = []
                        doc[key].append(val)
                if not any(op in update for op in ('$set', '$unset', '$inc', '$push')):
                    doc.update(update)
                count += 1
        if upsert and count == 0:
            new_doc = query.copy()
            if '$set' in update:
                new_doc.update(update['$set'])
            self._data.append(new_doc)
            count = 1
        return type('obj', (object,), {'modified_count': count})()

    def delete_one(self, query):
        for i, doc in enumerate(self._data):
            if self._matches(doc, query):
                self._data.pop(i)
                return type('obj', (object,), {'deleted_count': 1})()
        return type('obj', (object,), {'deleted_count': 0})()

    def delete_many(self, query):
        count = 0
        to_remove = []
        for i, doc in enumerate(self._data):
            if self._matches(doc, query):
                to_remove.append(i)
                count += 1
        for i in reversed(to_remove):
            self._data.pop(i)
        return type('obj', (object,), {'deleted_count': count})()

    def aggregate(self, pipeline):
        result = []
        data = self._data[:]
        for stage in pipeline:
            if '$group' in stage:
                groups = {}
                group_key = stage['$group'].get('_id')
                for doc in data:
                    key = doc.get(group_key, 'Unknown') if group_key != 'null' else 'total'
                    if key not in groups:
                        groups[key] = {'_id': key}
                    for field, expr in stage['$group'].items():
                        if field == '_id':
                            continue
                        if '$sum' in str(expr):
                            val = 1
                            groups[key][field] = groups[key].get(field, 0) + val
                result = list(groups.values())
            elif '$sort' in stage:
                field = list(stage['$sort'].keys())[0]
                direction = stage['$sort'][field]
                result.sort(key=lambda x: x.get(field, 0), reverse=(direction == -1))
            elif '$limit' in stage:
                result = result[:stage['$limit']]
            elif '$match' in stage:
                data = [d for d in data if self._matches(d, stage['$match'])]
                result = data
        return result

    def _matches(self, doc, query):
        for key, value in query.items():
            if key == '$or':
                if not any(self._matches(doc, cond) for cond in value):
                    return False
                continue
            if key == '$and':
                if not all(self._matches(doc, cond) for cond in value):
                    return False
                continue
            if isinstance(value, dict):
                if '$regex' in value:
                    import re
                    if not re.search(value['$regex'], str(doc.get(key, '')), re.IGNORECASE if value.get('$options', '').lower() == 'i' else 0):
                        return False
                elif '$gte' in value:
                    if not (doc.get(key) and doc[key] >= value['$gte']):
                        return False
                elif '$lte' in value:
                    if not (doc.get(key) and doc[key] <= value['$lte']):
                        return False
                elif '$ne' in value:
                    if doc.get(key) == value['$ne']:
                        return False
                else:
                    if doc.get(key) != value:
                        return False
            else:
                if doc.get(key) != value:
                    return False
        return True

    def create_index(self, field):
        pass

    def sort(self, key, direction=-1):
        self._data.sort(key=lambda x: x.get(key, ''), reverse=(direction == -1))
        return self


class InMemoryCursor:
    def __init__(self, data):
        self._data = data

    def sort(self, key, direction=-1):
        self._data.sort(key=lambda x: x.get(key, ''), reverse=(direction == -1))
        return self

    def skip(self, n):
        self._data = self._data[n:]
        return self

    def limit(self, n):
        self._data = self._data[:n]
        return self

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

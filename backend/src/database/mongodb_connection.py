import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from dotenv import load_dotenv

load_dotenv()

class MongoCollectionProxy:
    def __init__(self, collection, db_instance):
        self._collection = collection
        self._db_instance = db_instance

    def __getattr__(self, name):
        attr = getattr(self._collection, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                import time
                from pymongo.errors import AutoReconnect
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        return attr(*args, **kwargs)
                    except AutoReconnect as e:
                        if attempt == max_retries - 1:
                            raise
                        print(f"[!] Mongo AutoReconnect in method '{name}' (attempt {attempt+1}/{max_retries}), retrying...")
                        try:
                            self._db_instance._client.admin.command('ping')
                        except Exception:
                            pass
                        time.sleep(0.2 * (attempt + 1))
            return wrapper
        return attr

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

    def __getattribute__(self, name):
        val = super().__getattribute__(name)
        if val is not None and type(val).__name__ == 'Collection' and type(val).__module__.startswith('pymongo'):
            return MongoCollectionProxy(val, self)
        return val

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(f"'MongoDB' object has no attribute '{name}'")
        if self._db is not None:
            val = self._db[name]
            if type(val).__name__ == 'Collection' and type(val).__module__.startswith('pymongo'):
                return MongoCollectionProxy(val, self)
            return val
        raise AttributeError(f"'MongoDB' object has no attribute '{name}'")

    def _connect(self):
        try:
            mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
            db_name = os.getenv('MONGO_DB', 'mdefender_pro')
            # Add SSL and connection parameters for production
            if 'mongodb+srv://' in mongo_uri:
                # Add SSL parameters for MongoDB Atlas
                uri_connector = '&' if '?' in mongo_uri else '?'
                mongo_uri = f"{mongo_uri}{uri_connector}retryWrites=true&w=majority"
            
            # Try to use certifi CA bundle for proper SSL on Windows
            tls_ca_file = None
            try:
                import certifi
                tls_ca_file = certifi.where()
            except ImportError:
                pass

            connect_kwargs = {
                'serverSelectionTimeoutMS': 30000,
                'connectTimeoutMS': 30000,
                'socketTimeoutMS': 30000,
                'retryWrites': True,
                'retryReads': True,
                'maxIdleTimeMS': 15000,
            }

            if 'mongodb+srv://' in mongo_uri or 'ssl=true' in mongo_uri.lower():
                connect_kwargs['tls'] = True
                if tls_ca_file:
                    connect_kwargs['tlsCAFile'] = tls_ca_file
                else:
                    # Fallback: allow invalid certificates if certifi is not available
                    connect_kwargs['tlsAllowInvalidCertificates'] = True

            self._client = MongoClient(mongo_uri, **connect_kwargs)
            self._client.admin.command('ping')
            self._db = self._client[db_name]
            print("[+] MongoDB connection successful")
            self._ensure_indexes()
        except (ConnectionFailure, ConfigurationError, Exception) as e:
            print(f"[-] Warning: MongoDB connection failed ({type(e).__name__}): {e}")
            print("   Using in-memory fallback for now.")
            self._db = InMemoryDB()

    def _ensure_indexes(self):
        if hasattr(self._db, 'attacks'):
            self._db.attacks.create_index('timestamp')
            self._db.attacks.create_index('ip')
            self._db.attacks.create_index('attack_type')
            self._db.attacks.create_index('user_id')
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
        if hasattr(self._db, 'malware_scans'):
            self._db.malware_scans.create_index('timestamp')
            self._db.malware_scans.create_index('verdict')
            self._db.malware_scans.create_index('domain')
        if hasattr(self._db, 'websites'):
            self._db.websites.create_index('user_id')
            self._db.websites.create_index('domain', unique=True)
        if hasattr(self._db, 'api_keys'):
            self._db.api_keys.create_index('user_id')
            self._db.api_keys.create_index('key_hash', unique=True)
            self._db.api_keys.create_index('website_id')
        if hasattr(self._db, 'subscriptions'):
            self._db.subscriptions.create_index('user_id', unique=True)
        if hasattr(self._db, 'waf_events'):
            self._db.waf_events.create_index('user_id')
            self._db.waf_events.create_index('website_id')
            self._db.waf_events.create_index('timestamp')
        if hasattr(self._db, 'security_events'):
            self._db.security_events.create_index('user_id')
            self._db.security_events.create_index('website_id')
            self._db.security_events.create_index('timestamp')
        for coll in ('entitlements', 'notifications', 'usage_metrics', 'paddle_transactions'):
            if hasattr(self._db, coll):
                self._db[coll].create_index('user_id')
        try:
            self._db.users.create_index('email', unique=True, sparse=True)
            self._db.users.create_index('username', sparse=True)
            self._db.users.create_index('google_id', sparse=True)
            self._db.email_verification_tokens.create_index('token_hash')
            self._db.email_verification_tokens.create_index('expires_at', expireAfterSeconds=0)
            self._db.email_verification_tokens.create_index('request_ip')
            self._db.email_verification_tokens.create_index('email')
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
    def whitelist(self):
        return self._db['whitelist'] if self._db is not None else None

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

    @property
    def malware_scans(self):
        return self._db['malware_scans'] if self._db is not None else None

    @property
    def websites(self):
        return self._db['websites'] if self._db is not None else None

    @property
    def api_keys(self):
        return self._db['api_keys'] if self._db is not None else None

    @property
    def subscriptions(self):
        return self._db['subscriptions'] if self._db is not None else None

    @property
    def waf_events(self):
        return self._db['waf_events'] if self._db is not None else None

    @property
    def malware_findings(self):
        return self._db['malware_findings'] if self._db is not None else None

    @property
    def quarantine_files(self):
        return self._db['quarantine_files'] if self._db is not None else None

    @property
    def wordpress_sites(self):
        return self._db['wordpress_sites'] if self._db is not None else None

    @property
    def entitlements(self):
        return self._db['entitlements'] if self._db is not None else None

    @property
    def notifications(self):
        return self._db['notifications'] if self._db is not None else None

    @property
    def usage_metrics(self):
        return self._db['usage_metrics'] if self._db is not None else None

    @property
    def paddle_transactions(self):
        return self._db['paddle_transactions'] if self._db is not None else None

    def __getitem__(self, key):
        return getattr(self, key, None)


class InMemoryDB:
    def __init__(self):
        self.attacks = InMemoryCollection()
        self.attack_attempts = InMemoryCollection()
        self.requests = InMemoryCollection()
        self.blacklist = InMemoryCollection()
        self.whitelist = InMemoryCollection()
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
        self.malware_scans = InMemoryCollection()
        self.websites = InMemoryCollection()
        self.api_keys = InMemoryCollection()
        self.subscriptions = InMemoryCollection()
        self.waf_events = InMemoryCollection()
        self.malware_findings = InMemoryCollection()
        self.quarantine_files = InMemoryCollection()
        self.wordpress_sites = InMemoryCollection()
        self.entitlements = InMemoryCollection()
        self.notifications = InMemoryCollection()
        self.usage_metrics = InMemoryCollection()
        self.paddle_transactions = InMemoryCollection()

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
            return InMemoryCursor(self._data[:])
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

            def check_eq(a, b):
                if (key == '_id' or key.endswith('_id')) and (a is not None and b is not None):
                    return str(a) == str(b)
                return a == b

            doc_val = doc.get(key)
            if isinstance(value, dict):
                if '$regex' in value:
                    import re
                    if not re.search(value['$regex'], str(doc_val or ''), re.IGNORECASE if value.get('$options', '').lower() == 'i' else 0):
                        return False
                elif '$gte' in value:
                    if not (doc_val is not None and doc_val >= value['$gte']):
                        return False
                elif '$lte' in value:
                    if not (doc_val is not None and doc_val <= value['$lte']):
                        return False
                elif '$ne' in value:
                    if check_eq(doc_val, value['$ne']):
                        return False
                elif '$in' in value:
                    in_list = value['$in']
                    if key == '_id' or key.endswith('_id'):
                        in_list_str = [str(x) for x in in_list]
                        doc_val_str = str(doc_val) if doc_val is not None else None
                        if doc_val_str not in in_list_str:
                            return False
                    else:
                        if isinstance(doc_val, list):
                            if not any(item in in_list for item in doc_val):
                                return False
                        else:
                            if doc_val not in in_list:
                                return False
                else:
                    if not check_eq(doc_val, value):
                        return False
            else:
                if not check_eq(doc_val, value):
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

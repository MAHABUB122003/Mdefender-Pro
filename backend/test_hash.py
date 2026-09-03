import hashlib
from src.database.mongodb_connection import MongoDB
db = MongoDB()
h = hashlib.sha256('CLPpTwIzHmVALWTc0aYV7aGPRtMmczQhXni8i8JnXYkEC4-dKFmgHDcTp71ialqh'.encode()).hexdigest()
key = db._db.api_keys.find_one({'key_hash': h})
print('API Key found:', key is not None)
if key:
    print('Website ID:', key.get('website_id'))
    website = db._db.websites.find_one({'_id': key.get('website_id')})
    print('Website Domain:', website.get('domain') if website else 'None')

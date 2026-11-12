from pymongo import MongoClient
from bson import ObjectId

db = MongoClient('mongodb://localhost:27017/')['mdefender_pro']
u_mahabub = db.users.find_one({'email': 'rahmanmdmahabubur575@gmail.com'})
u_test = db.users.find_one({'email': 'rahmanmdmahabubur251595@gmail.com'})

if u_mahabub:
    db.websites.update_one({'_id': '56af1d88-657b-4e28-be92-6942fa82b1fe'}, {'$set': {'user_id': str(u_mahabub['_id'])}})
    db.users.update_one({'_id': u_mahabub['_id']}, {'$set': {'websites': ['56af1d88-657b-4e28-be92-6942fa82b1fe'], 'onboarded': True}})
    print('Mahabub restored with site 56af1d88-657b-4e28-be92-6942fa82b1fe')

if u_test:
    db.users.update_one({'_id': u_test['_id']}, {'$set': {'websites': [], 'onboarded': False, 'onboarding_step': 'workspace'}})
    print('Test user reset to pristine un-onboarded state: websites=[], onboarded=False, onboarding_step=workspace')


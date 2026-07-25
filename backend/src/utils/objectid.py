from bson import ObjectId


def to_object_id(value):
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str):
        return ObjectId(value)
    return None


def to_str(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, str):
        return value
    return ''

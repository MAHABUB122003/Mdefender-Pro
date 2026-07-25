from bson import ObjectId


def to_object_id(value):
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str):
        try:
            return ObjectId(value)
        except Exception:
            return None
    return None


def to_str(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, str):
        return value
    return ''

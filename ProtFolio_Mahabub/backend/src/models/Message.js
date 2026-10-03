import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, default: 'General Inquiry' },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    read: { type: Boolean, default: false }
}, { timestamps: true });

messageSchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
    }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;

import Message from '../models/Message.js';

export async function createMessage(req, res, next) {
    try {
        const { name, email, title, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Name, email and message are required' });
        }

        const doc = await Message.create({
            name: name.trim(),
            email: email.trim(),
            title: (title || 'General Inquiry').trim(),
            message: message.trim()
        });

        res.status(201).json({ success: true, message: 'Message received', data: doc });
    } catch (err) {
        next(err);
    }
}

export async function getMessages(req, res, next) {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json({ success: true, messages });
    } catch (err) {
        next(err);
    }
}

export async function getMessageById(req, res, next) {
    try {
        const doc = await Message.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: doc });
    } catch (err) {
        next(err);
    }
}

export async function markMessageRead(req, res, next) {
    try {
        const doc = await Message.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: doc });
    } catch (err) {
        next(err);
    }
}

export async function deleteMessage(req, res, next) {
    try {
        const doc = await Message.findByIdAndDelete(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
        next(err);
    }
}

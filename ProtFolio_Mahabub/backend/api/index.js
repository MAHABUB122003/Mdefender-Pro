import mongoose from 'mongoose';
import app from '../server.js';
import { connectDB } from '../src/config/db.js';

export default async function handler(req, res) {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
    return app(req, res);
}

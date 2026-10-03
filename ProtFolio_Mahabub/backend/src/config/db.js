import mongoose from 'mongoose';
import dns from 'node:dns';

dns.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);

export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        throw err;
    }
}

export async function disconnectDB() {
    await mongoose.disconnect();
}

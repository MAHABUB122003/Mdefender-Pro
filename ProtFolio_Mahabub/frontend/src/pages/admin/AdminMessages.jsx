import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaInbox, FaTrash, FaEnvelopeOpen, FaEnvelope, FaSyncAlt, FaUser, FaClock, FaTag, FaReply, FaCheckDouble, FaSearch } from 'react-icons/fa';
import { api } from '../../utils/api';

function AdminMessages() {
    const [messages, setMessages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
    const [searchQuery, setSearchQuery] = useState('');

    const loadMessages = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api('/messages', { auth: true });
            setMessages(res.messages || []);
        } catch (e) {
            setError(e.message || 'Failed to load messages');
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadMessages(); }, [loadMessages]);

    const markRead = async (msg) => {
        const id = msg._id || msg.id;
        try {
            await api(`/messages/${id}/read`, { method: 'PATCH', auth: true });
            setMessages(prev => prev.map(m => (m._id === id || m.id === id) ? { ...m, read: true } : m));
        } catch (e) {
            alert('Failed to mark as read: ' + e.message);
        }
    };

    const markAllRead = async () => {
        const unreadList = (messages || []).filter(m => !m.read);
        if (unreadList.length === 0) return;
        try {
            await Promise.all(unreadList.map(m => api(`/messages/${m._id || m.id}/read`, { method: 'PATCH', auth: true })));
            setMessages(prev => prev.map(m => ({ ...m, read: true })));
        } catch (e) {
            alert('Failed to mark all as read: ' + e.message);
        }
    };

    const remove = async (msg) => {
        const id = msg._id || msg.id;
        if (!window.confirm(`Delete message from ${msg.name}?`)) return;
        try {
            await api(`/messages/${id}`, { method: 'DELETE', auth: true });
            setMessages(prev => prev.filter(m => (m._id !== id && m.id !== id)));
        } catch (e) {
            alert('Failed to delete: ' + e.message);
        }
    };

    const unreadCount = messages ? messages.filter(m => !m.read).length : 0;

    const filteredMessages = (messages || []).filter(m => {
        if (filter === 'unread' && m.read) return false;
        if (filter === 'read' && !m.read) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = m.name?.toLowerCase().includes(q);
            const matchEmail = m.email?.toLowerCase().includes(q);
            const matchTitle = m.title?.toLowerCase().includes(q);
            const matchMsg = m.message?.toLowerCase().includes(q);
            return matchName || matchEmail || matchTitle || matchMsg;
        }
        return true;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                        <FaInbox className="text-orange-400" /> Client Messages & Inquiries
                        {unreadCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 text-xs rounded-full font-bold border border-rose-500/30">
                                {unreadCount} new
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">Real-time incoming submissions from your portfolio contact form</p>
                </div>

                <div className="flex items-center gap-2.5">
                    {unreadCount > 0 && (
                        <motion.button
                            onClick={markAllRead}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-200 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <FaCheckDouble className="text-emerald-400 text-xs" /> Mark All Read
                        </motion.button>
                    )}
                    <motion.button
                        onClick={loadMessages}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                        <FaSyncAlt className={`text-xs ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </motion.button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-gray-800/60 border border-gray-700/60 rounded-xl w-full sm:w-auto">
                    {[
                        { id: 'all', label: `All (${messages ? messages.length : 0})` },
                        { id: 'unread', label: `Unread (${unreadCount})` },
                        { id: 'read', label: `Read (${messages ? messages.length - unreadCount : 0})` }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filter === tab.id
                                    ? 'bg-orange-500 text-white font-semibold shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-800/60 border border-gray-700/60 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>

            {/* Messages Feed */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm">
                        <FaSyncAlt className="animate-spin text-xl text-orange-400 mx-auto mb-2" />
                        Fetching messages from database...
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="p-16 text-center">
                        <FaInbox className="text-4xl text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-300 font-medium text-sm">No messages found</p>
                        <p className="text-gray-500 text-xs mt-1">
                            {filter === 'unread' ? 'All caught up! No unread messages.' : 'New contact submissions will appear here automatically.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700/50">
                        {filteredMessages.map((msg, idx) => {
                            const id = msg._id || msg.id;
                            return (
                                <motion.div
                                    key={id || idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={`p-5 sm:p-6 hover:bg-gray-700/20 transition-all ${!msg.read ? 'bg-orange-500/[0.04] border-l-4 border-orange-500' : ''}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                msg.read ? 'bg-gray-700/60 text-gray-400' : 'bg-orange-500/20 text-orange-400 shadow-md shadow-orange-950/40'
                                            }`}>
                                                {msg.read ? <FaEnvelopeOpen className="text-sm" /> : <FaEnvelope className="text-sm" />}
                                            </div>

                                            <div className="space-y-1.5 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                                                        <FaUser className="text-orange-400 text-xs" />
                                                        {msg.name}
                                                    </h4>
                                                    {!msg.read && (
                                                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded-full font-bold border border-orange-500/30">
                                                            NEW
                                                        </span>
                                                    )}
                                                    <a href={`mailto:${msg.email}`} className="text-gray-400 text-xs hover:text-orange-400 transition-colors font-mono">
                                                        {msg.email}
                                                    </a>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded font-medium flex items-center gap-1">
                                                        <FaTag className="text-[9px]" /> {msg.title || 'General Inquiry'}
                                                    </span>
                                                    <span className="text-gray-500 text-[11px] flex items-center gap-1 font-mono">
                                                        <FaClock className="text-[10px]" /> {new Date(msg.createdAt || Date.now()).toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="pt-2">
                                                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-normal bg-gray-900/40 p-3.5 rounded-xl border border-gray-700/40">
                                                        {msg.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                                            <a
                                                href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.title || 'Portfolio Inquiry')}&body=Hi ${encodeURIComponent(msg.name)},%0D%0A%0D%0AThank you for reaching out!`}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                                title="Reply via Email"
                                            >
                                                <FaReply className="text-[10px]" /> Reply
                                            </a>

                                            {!msg.read && (
                                                <button
                                                    onClick={() => markRead(msg)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-all cursor-pointer"
                                                    title="Mark as Read"
                                                >
                                                    <FaEnvelopeOpen className="text-xs" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => remove(msg)}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all cursor-pointer"
                                                title="Delete Message"
                                            >
                                                <FaTrash className="text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default AdminMessages;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaPlus, FaTimes, FaEnvelope, FaLink, FaComment } from 'react-icons/fa';
import { getSection, updateSection, saveSectionToBackend } from '../../utils/portfolioData';

function AdminContact() {
    const [data, setData] = useState(null);
    const [saved, setSaved] = useState(false);
    const [socialInput, setSocialInput] = useState({ platform: '', url: '' });
    const [qrInput, setQrInput] = useState({ label: '', value: '' });

    useEffect(() => { setData(getSection('contact')); }, []);

    if (!data) return null;

    const handleInfoChange = (idx, field, value) => {
        const info = [...data.info];
        info[idx] = { ...info[idx], [field]: value };
        setData({ ...data, info });
        setSaved(false);
    };
    const addInfo = () => setData({ ...data, info: [...data.info, { type: 'email', value: '', detail: '' }] });
    const removeInfo = (idx) => setData({ ...data, info: data.info.filter((_, i) => i !== idx) });

    const addSocial = () => { if (socialInput.platform && socialInput.url) { setData({ ...data, socials: [...data.socials, { ...socialInput }] }); setSocialInput({ platform: '', url: '' }); } };
    const removeSocial = (idx) => setData({ ...data, socials: data.socials.filter((_, i) => i !== idx) });

    const addQR = () => { if (qrInput.label) { setData({ ...data, quickResponses: [...data.quickResponses, { ...qrInput }] }); setQrInput({ label: '', value: '' }); } };
    const removeQR = (idx) => setData({ ...data, quickResponses: data.quickResponses.filter((_, i) => i !== idx) });

    const handleSave = async () => {
        updateSection('contact', data);
        try {
            await saveSectionToBackend('contact', data);
        } catch (e) {
            alert('Saved locally, but failed to save to server: ' + e.message);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all";

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><FaEnvelope className="text-orange-400" /> Contact Section</h2>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'}`}>
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            {/* Availability */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-400">Available for Work</label>
                    <button onClick={() => setData({ ...data, available: !data.available })}
                        className={`w-12 h-6 rounded-full transition-all ${data.available ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${data.available ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                    <input value={data.availableText} onChange={(e) => setData({ ...data, availableText: e.target.value })} className={`${inputClass} flex-1`} />
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Contact Info</h3>
                    <button onClick={addInfo} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex items-center gap-1"><FaPlus /> Add</button>
                </div>
                <div className="space-y-3">
                    {data.info.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-gray-700/30 rounded-lg p-3">
                            <select value={item.type} onChange={(e) => handleInfoChange(idx, 'type', e.target.value)} className="px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-xs w-28">
                                {['email', 'phone', 'location', 'website'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input value={item.value} onChange={(e) => handleInfoChange(idx, 'value', e.target.value)} className={`${inputClass} flex-1`} placeholder="Value" />
                            <input value={item.detail} onChange={(e) => handleInfoChange(idx, 'detail', e.target.value)} className={`${inputClass} w-40`} placeholder="Detail" />
                            <button onClick={() => removeInfo(idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><FaLink className="text-orange-400 text-xs" /> Social Links</h3>
                </div>
                <div className="flex gap-2 mb-3">
                    <select value={socialInput.platform} onChange={(e) => setSocialInput({ ...socialInput, platform: e.target.value })} className="px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-xs w-32">
                        <option value="">Platform</option>
                        {['github', 'linkedin', 'twitter', 'instagram', 'whatsapp', 'telegram', 'facebook', 'youtube'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input value={socialInput.url} onChange={(e) => setSocialInput({ ...socialInput, url: e.target.value })} className={`${inputClass} flex-1`} placeholder="URL" />
                    <button onClick={addSocial} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                </div>
                <div className="space-y-2">
                    {data.socials.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded font-medium">{s.platform}</span>
                                <span className="text-gray-400 text-xs truncate max-w-xs">{s.url}</span>
                            </div>
                            <button onClick={() => removeSocial(idx)} className="text-gray-500 hover:text-red-400"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Responses */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><FaComment className="text-orange-400 text-xs" /> Quick Responses</h3>
                </div>
                <div className="flex gap-2 mb-3">
                    <input value={qrInput.label} onChange={(e) => setQrInput({ ...qrInput, label: e.target.value })} className={`${inputClass} w-40`} placeholder="Label" />
                    <input value={qrInput.value} onChange={(e) => setQrInput({ ...qrInput, value: e.target.value })} className={`${inputClass} flex-1`} placeholder="Value" />
                    <button onClick={addQR} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                </div>
                <div className="space-y-2">
                    {data.quickResponses.map((qr, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-white text-xs font-medium">{qr.label}</span>
                                <span className="text-gray-500 text-xs">{qr.value}</span>
                            </div>
                            <button onClick={() => removeQR(idx)} className="text-gray-500 hover:text-red-400"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export default AdminContact;

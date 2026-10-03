import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaPlus, FaTimes, FaArrowUp, FaArrowDown, FaUser, FaLink, FaRocket } from 'react-icons/fa';
import { getSection, updateSection, saveSectionToBackend } from '../../utils/portfolioData';

function AdminHero() {
    const [data, setData] = useState(null);
    const [saved, setSaved] = useState(false);
    const [roleInput, setRoleInput] = useState('');
    const [socialInput, setSocialInput] = useState({ platform: '', url: '' });

    useEffect(() => { setData(getSection('hero')); }, []);

    if (!data) return null;

    const handleChange = (field, value) => {
        setData({ ...data, [field]: value });
        setSaved(false);
    };

    const handleStatChange = (idx, field, value) => {
        const stats = [...data.stats];
        stats[idx] = { ...stats[idx], [field]: value };
        setData({ ...data, stats });
        setSaved(false);
    };

    const addStat = () => {
        setData({ ...data, stats: [...data.stats, { value: '', label: '' }] });
    };

    const removeStat = (idx) => {
        setData({ ...data, stats: data.stats.filter((_, i) => i !== idx) });
    };

    const addRole = () => {
        if (roleInput.trim()) {
            setData({ ...data, roles: [...data.roles, roleInput.trim()] });
            setRoleInput('');
        }
    };

    const removeRole = (idx) => {
        setData({ ...data, roles: data.roles.filter((_, i) => i !== idx) });
    };

    const addSocial = () => {
        if (socialInput.platform && socialInput.url) {
            setData({ ...data, socials: [...data.socials, { ...socialInput }] });
            setSocialInput({ platform: '', url: '' });
        }
    };

    const removeSocial = (idx) => {
        setData({ ...data, socials: data.socials.filter((_, i) => i !== idx) });
    };

    const handleSave = async () => {
        updateSection('hero', data);
        try {
            await saveSectionToBackend('hero', data);
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
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><FaRocket className="text-orange-400" /> Hero Section</h2>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'}`}>
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-5">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                    <input value={data.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Tagline</label>
                    <input value={data.title} onChange={(e) => handleChange('title', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
                    <textarea value={data.description} onChange={(e) => handleChange('description', e.target.value)} rows="3" className={`${inputClass} resize-none`} />
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-400">Available Badge</label>
                    <button onClick={() => handleChange('available', !data.available)}
                        className={`w-12 h-6 rounded-full transition-all ${data.available ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${data.available ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                    <input value={data.availableText} onChange={(e) => handleChange('availableText', e.target.value)} className={`${inputClass} flex-1`} />
                </div>
            </div>

            {/* Roles */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><FaUser className="text-orange-400 text-xs" /> Rotating Roles</h3>
                <div className="flex gap-2 mb-3">
                    <input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())} className={`${inputClass} flex-1`} placeholder="Add role" />
                    <button onClick={addRole} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {data.roles.map((role, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-700/50 text-gray-300 text-xs rounded-lg flex items-center gap-2">
                            {role}
                            <button onClick={() => removeRole(idx)} className="text-gray-500 hover:text-red-400"><FaTimes className="text-[10px]" /></button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Stats</h3>
                    <button onClick={addStat} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex items-center gap-1"><FaPlus /> Add</button>
                </div>
                <div className="space-y-3">
                    {data.stats.map((stat, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input value={stat.value} onChange={(e) => handleStatChange(idx, 'value', e.target.value)} className={`${inputClass} w-24`} placeholder="Value" />
                            <input value={stat.label} onChange={(e) => handleStatChange(idx, 'label', e.target.value)} className={`${inputClass} flex-1`} placeholder="Label" />
                            <button onClick={() => removeStat(idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><FaLink className="text-orange-400 text-xs" /> Social Links</h3>
                <div className="flex gap-2 mb-3">
                    <select value={socialInput.platform} onChange={(e) => setSocialInput({ ...socialInput, platform: e.target.value })} className="px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm">
                        <option value="">Platform</option>
                        {['github', 'linkedin', 'facebook', 'instagram', 'twitter', 'youtube'].map(p => <option key={p} value={p}>{p}</option>)}
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
        </motion.div>
    );
}

export default AdminHero;

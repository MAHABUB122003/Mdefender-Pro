import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaPlus, FaTimes, FaUserTie, FaGraduationCap, FaCertificate, FaStar } from 'react-icons/fa';
import { getSection, updateSection, saveSectionToBackend } from '../../utils/portfolioData';

function AdminAbout() {
    const [data, setData] = useState(null);
    const [saved, setSaved] = useState(false);
    const [certInput, setCertInput] = useState({ name: '', issuer: '', year: '2024', level: '' });
    const [valueInput, setValueInput] = useState({ title: '', description: '' });

    useEffect(() => { setData(getSection('about')); }, []);

    if (!data) return null;

    const handleChange = (field, value) => { setData({ ...data, [field]: value }); setSaved(false); };
    const handleDetailChange = (field, value) => { setData({ ...data, personalDetails: { ...(data.personalDetails || {}), [field]: value } }); setSaved(false); };
    const handleBioChange = (idx, value) => { const bio = [...data.bio]; bio[idx] = value; setData({ ...data, bio }); setSaved(false); };
    const addBio = () => setData({ ...data, bio: [...data.bio, ''] });
    const removeBio = (idx) => setData({ ...data, bio: data.bio.filter((_, i) => i !== idx) });

    const handleEduChange = (idx, field, value) => {
        const edu = [...data.education]; edu[idx] = { ...edu[idx], [field]: value }; setData({ ...data, education: edu }); setSaved(false);
    };
    const addEdu = () => setData({ ...data, education: [...data.education, { degree: '', institution: '', year: '', description: '' }] });
    const removeEdu = (idx) => setData({ ...data, education: data.education.filter((_, i) => i !== idx) });

    const addCert = () => { if (certInput.name) { setData({ ...data, certifications: [...data.certifications, { ...certInput }] }); setCertInput({ name: '', issuer: '', year: '2024', level: '' }); } };
    const removeCert = (idx) => setData({ ...data, certifications: data.certifications.filter((_, i) => i !== idx) });

    const handleStatChange = (idx, field, value) => { const stats = [...data.stats]; stats[idx] = { ...stats[idx], [field]: value }; setData({ ...data, stats }); setSaved(false); };
    const addStat = () => setData({ ...data, stats: [...data.stats, { number: '', label: '', description: '' }] });
    const removeStat = (idx) => setData({ ...data, stats: data.stats.filter((_, i) => i !== idx) });

    const addValue = () => { if (valueInput.title) { setData({ ...data, coreValues: [...data.coreValues, { ...valueInput }] }); setValueInput({ title: '', description: '' }); } };
    const removeValue = (idx) => setData({ ...data, coreValues: data.coreValues.filter((_, i) => i !== idx) });

    const handleSave = async () => {
        updateSection('about', data);
        try {
            await saveSectionToBackend('about', data);
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
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><FaUserTie className="text-orange-400" /> About Section</h2>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'}`}>
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            {/* Tagline */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Tagline</h3>
                <input value={data.tagline} onChange={(e) => handleChange('tagline', e.target.value)} className={inputClass} />
            </div>

            {/* Bio */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Bio Paragraphs</h3>
                    <button onClick={addBio} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex items-center gap-1"><FaPlus /> Add</button>
                </div>
                <div className="space-y-3">
                    {data.bio.map((b, idx) => (
                        <div key={idx} className="flex gap-2">
                            <textarea value={b} onChange={(e) => handleBioChange(idx, e.target.value)} rows="2" className={`${inputClass} flex-1 resize-none`} />
                            <button onClick={() => removeBio(idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personal Details */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">Personal Details</h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(data.personalDetails).map(([key, val]) => (
                        <div key={key}>
                            <label className="block text-[10px] text-gray-500 mb-1 capitalize">{key}</label>
                            <input value={val} onChange={(e) => handleDetailChange(key, e.target.value)} className={inputClass} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Education */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><FaGraduationCap className="text-orange-400 text-xs" /> Education</h3>
                    <button onClick={addEdu} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex items-center gap-1"><FaPlus /> Add</button>
                </div>
                <div className="space-y-3">
                    {data.education.map((edu, idx) => (
                        <div key={idx} className="bg-gray-700/30 rounded-lg p-4 space-y-2">
                            <input value={edu.degree} onChange={(e) => handleEduChange(idx, 'degree', e.target.value)} className={inputClass} placeholder="Degree" />
                            <input value={edu.institution} onChange={(e) => handleEduChange(idx, 'institution', e.target.value)} className={inputClass} placeholder="Institution" />
                            <div className="flex gap-2">
                                <input value={edu.year} onChange={(e) => handleEduChange(idx, 'year', e.target.value)} className={`${inputClass} flex-1`} placeholder="Year" />
                                <button onClick={() => removeEdu(idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center"><FaTimes className="text-xs" /></button>
                            </div>
                            <textarea value={edu.description} onChange={(e) => handleEduChange(idx, 'description', e.target.value)} rows="2" className={`${inputClass} resize-none`} placeholder="Description" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Certifications */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><FaCertificate className="text-orange-400 text-xs" /> Certifications</h3>
                </div>
                <div className="flex gap-2 mb-3 flex-wrap">
                    <input value={certInput.name} onChange={(e) => setCertInput({ ...certInput, name: e.target.value })} className={`${inputClass} flex-1 min-w-[200px]`} placeholder="Certification name" />
                    <input value={certInput.issuer} onChange={(e) => setCertInput({ ...certInput, issuer: e.target.value })} className={`${inputClass} w-32`} placeholder="Issuer" />
                    <input value={certInput.year} onChange={(e) => setCertInput({ ...certInput, year: e.target.value })} className={`${inputClass} w-20`} placeholder="Year" />
                    <input value={certInput.level} onChange={(e) => setCertInput({ ...certInput, level: e.target.value })} className={`${inputClass} w-28`} placeholder="Level" />
                    <button onClick={addCert} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                </div>
                <div className="space-y-2">
                    {data.certifications.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded font-medium">{c.level}</span>
                                <span className="text-white text-xs truncate">{c.name}</span>
                                <span className="text-gray-500 text-[10px]">{c.issuer} • {c.year}</span>
                            </div>
                            <button onClick={() => removeCert(idx)} className="text-gray-500 hover:text-red-400 flex-shrink-0"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><FaStar className="text-orange-400 text-xs" /> Stats</h3>
                    <button onClick={addStat} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs flex items-center gap-1"><FaPlus /> Add</button>
                </div>
                <div className="space-y-2">
                    {data.stats.map((s, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input value={s.number} onChange={(e) => handleStatChange(idx, 'number', e.target.value)} className={`${inputClass} w-20`} placeholder="Number" />
                            <input value={s.label} onChange={(e) => handleStatChange(idx, 'label', e.target.value)} className={`${inputClass} flex-1`} placeholder="Label" />
                            <input value={s.description} onChange={(e) => handleStatChange(idx, 'description', e.target.value)} className={`${inputClass} w-36`} placeholder="Description" />
                            <button onClick={() => removeStat(idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center"><FaTimes className="text-xs" /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Core Values */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Core Values</h3>
                </div>
                <div className="flex gap-2 mb-3">
                    <input value={valueInput.title} onChange={(e) => setValueInput({ ...valueInput, title: e.target.value })} className={`${inputClass} w-40`} placeholder="Title" />
                    <input value={valueInput.description} onChange={(e) => setValueInput({ ...valueInput, description: e.target.value })} className={`${inputClass} flex-1`} placeholder="Description" />
                    <button onClick={addValue} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {data.coreValues.map((v, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-700/50 text-gray-300 text-xs rounded-lg flex items-center gap-2">
                            <strong>{v.title}</strong> - {v.description}
                            <button onClick={() => removeValue(idx)} className="text-gray-500 hover:text-red-400"><FaTimes className="text-[10px]" /></button>
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export default AdminAbout;

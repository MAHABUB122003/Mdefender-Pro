import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaPlus, FaTimes, FaBrain, FaCode } from 'react-icons/fa';
import { getSection, updateSection, saveSectionToBackend } from '../../utils/portfolioData';

function AdminSkills() {
    const [data, setData] = useState(null);
    const [saved, setSaved] = useState(false);
    const [catInput, setCatInput] = useState({ name: '', gradient: 'from-orange-500 to-purple-500' });
    const [skillInput, setSkillInput] = useState({ name: '', level: 80 });
    const [activeCat, setActiveCat] = useState(0);
    const [tagInputs, setTagInputs] = useState({});

    useEffect(() => { setData(getSection('skills')); }, []);

    if (!data) return null;

    const handleCategoryNameChange = (idx, value) => {
        const cats = [...data.categories];
        cats[idx] = { ...cats[idx], name: value };
        setData({ ...data, categories: cats });
    };

    const handleSkillChange = (catIdx, skillIdx, field, value) => {
        const cats = [...data.categories];
        const skills = [...cats[catIdx].skills];
        skills[skillIdx] = { ...skills[skillIdx], [field]: field === 'level' ? parseInt(value) || 0 : value };
        cats[catIdx] = { ...cats[catIdx], skills };
        setData({ ...data, categories: cats });
        setSaved(false);
    };

    const addSkillToCategory = (catIdx) => {
        if (!skillInput.name) return;
        const cats = [...data.categories];
        cats[catIdx] = { ...cats[catIdx], skills: [...cats[catIdx].skills, { ...skillInput }] };
        setData({ ...data, categories: cats });
        setSkillInput({ name: '', level: 80 });
    };

    const removeSkill = (catIdx, skillIdx) => {
        const cats = [...data.categories];
        cats[catIdx] = { ...cats[catIdx], skills: cats[catIdx].skills.filter((_, i) => i !== skillIdx) };
        setData({ ...data, categories: cats });
    };

    const addCategory = () => {
        if (!catInput.name) return;
        setData({ ...data, categories: [...data.categories, { ...catInput, skills: [] }] });
        setCatInput({ name: '', gradient: 'from-orange-500 to-purple-500' });
    };

    const removeCategory = (idx) => {
        const newCats = data.categories.filter((_, i) => i !== idx);
        setData({ ...data, categories: newCats });
        if (activeCat >= newCats.length) setActiveCat(Math.max(0, newCats.length - 1));
    };

    const handleAdditionalChange = (section, value) => {
        setData({ ...data, additional: { ...data.additional, [section]: value } });
        setSaved(false);
    };

    const addTag = (section) => {
        const input = tagInputs[section] || '';
        if (input.trim()) {
            const current = data.additional[section] || [];
            handleAdditionalChange(section, [...current, input.trim()]);
            setTagInputs({ ...tagInputs, [section]: '' });
        }
    };

    const removeTag = (section, idx) => {
        const current = data.additional[section].filter((_, i) => i !== idx);
        handleAdditionalChange(section, current);
    };

    const handleSave = async () => {
        updateSection('skills', data);
        try {
            await saveSectionToBackend('skills', data);
        } catch (e) {
            alert('Saved locally, but failed to save to server: ' + e.message);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all";
    const gradients = ['from-cyan-500 to-blue-500', 'from-green-500 to-emerald-500', 'from-purple-500 to-pink-500', 'from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-yellow-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-teal-500 to-cyan-500'];

    const additionalSections = [
        { key: 'development', label: 'Development & Cloud', icon: <FaCode /> },
        { key: 'security', label: 'Security Tools', icon: <FaBrain /> },
        { key: 'ml', label: 'Machine Learning & Data Science', icon: <FaBrain /> },
        { key: 'vulnerabilities', label: 'Vulnerabilities', icon: <FaCode /> },
        { key: 'os', label: 'Operating Systems', icon: <FaCode /> }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><FaBrain className="text-orange-400" /> Skills Section</h2>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'}`}>
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            {/* Categories */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Skill Categories</h3>
                    <div className="flex gap-2">
                        <input value={catInput.name} onChange={(e) => setCatInput({ ...catInput, name: e.target.value })} className="px-3 py-1.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-xs w-40" placeholder="Category name" />
                        <select value={catInput.gradient} onChange={(e) => setCatInput({ ...catInput, gradient: e.target.value })} className="px-3 py-1.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-xs">
                            {gradients.map(g => <option key={g} value={g}>{g.replace('from-', '').replace(' to-', ' → ')}</option>)}
                        </select>
                        <button onClick={addCategory} className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs"><FaPlus /></button>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {data.categories.map((cat, idx) => (
                        <button key={idx} onClick={() => setActiveCat(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                                activeCat === idx ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'
                            }`}>
                            {cat.name} ({cat.skills.length})
                            <span onClick={(e) => { e.stopPropagation(); removeCategory(idx); }} className="text-gray-500 hover:text-red-400"><FaTimes className="text-[8px]" /></span>
                        </button>
                    ))}
                </div>

                {/* Active Category Skills */}
                {data.categories[activeCat] && (
                    <div className="space-y-3">
                        <div className="flex gap-2 items-center mb-3">
                            <input value={data.categories[activeCat].name} onChange={(e) => handleCategoryNameChange(activeCat, e.target.value)} className={`${inputClass} flex-1`} />
                        </div>

                        {data.categories[activeCat].skills.map((skill, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-gray-700/30 rounded-lg px-4 py-3">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <input value={skill.name} onChange={(e) => handleSkillChange(activeCat, idx, 'name', e.target.value)} className={inputClass} placeholder="Skill name" />
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="0" max="100" value={skill.level} onChange={(e) => handleSkillChange(activeCat, idx, 'level', e.target.value)} className="flex-1 accent-orange-500" />
                                        <span className="text-orange-400 text-xs font-bold w-8 text-right">{skill.level}%</span>
                                    </div>
                                </div>
                                <button onClick={() => removeSkill(activeCat, idx)} className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20"><FaTimes className="text-xs" /></button>
                            </div>
                        ))}

                        <div className="flex gap-2 mt-3">
                            <input value={skillInput.name} onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addSkillToCategory(activeCat)} className={`${inputClass} flex-1`} placeholder="New skill name" />
                            <input type="number" min="0" max="100" value={skillInput.level} onChange={(e) => setSkillInput({ ...skillInput, level: parseInt(e.target.value) || 0 })} className={`${inputClass} w-20`} placeholder="Level" />
                            <button onClick={() => addSkillToCategory(activeCat)} className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Additional Tags */}
            {additionalSections.map((section) => (
                <div key={section.key} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">{section.icon} {section.label}</h3>
                    <div className="flex gap-2 mb-3">
                        <input value={tagInputs[section.key] || ''} onChange={(e) => setTagInputs({ ...tagInputs, [section.key]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addTag(section.key)} className={`${inputClass} flex-1`} placeholder="Add tag" />
                        <button onClick={() => addTag(section.key)} className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"><FaPlus className="text-sm" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(data.additional[section.key] || []).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-lg flex items-center gap-1.5">
                                {tag}
                                <button onClick={() => removeTag(section.key, idx)} className="text-gray-500 hover:text-red-400"><FaTimes className="text-[8px]" /></button>
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </motion.div>
    );
}

export default AdminSkills;

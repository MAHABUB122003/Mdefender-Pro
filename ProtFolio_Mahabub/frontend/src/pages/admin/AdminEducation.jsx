import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaPlus, FaTimes, FaGraduationCap, FaCertificate, FaArrowUp, FaArrowDown, FaCalendarAlt, FaUniversity, FaAward } from 'react-icons/fa';
import { getSection, updateSection, saveSectionToBackend } from '../../utils/portfolioData';

function AdminEducation() {
    const [aboutData, setAboutData] = useState(null);
    const [saved, setSaved] = useState(false);
    
    const [newEdu, setNewEdu] = useState({
        degree: '',
        institution: '',
        year: '',
        description: ''
    });

    const [newCert, setNewCert] = useState({
        name: '',
        issuer: '',
        year: new Date().getFullYear().toString(),
        level: 'Practitioner',
        topics: ''
    });

    useEffect(() => {
        const data = getSection('about');
        if (data) {
            setAboutData({
                ...data,
                education: data.education || [],
                certifications: data.certifications || []
            });
        }
    }, []);

    if (!aboutData) return null;

    const handleEduChange = (idx, field, value) => {
        const updated = [...aboutData.education];
        updated[idx] = { ...updated[idx], [field]: value };
        setAboutData({ ...aboutData, education: updated });
        setSaved(false);
    };

    const addEducation = () => {
        if (!newEdu.degree.trim() || !newEdu.institution.trim()) {
            alert('Please provide Degree and Institution');
            return;
        }
        setAboutData({
            ...aboutData,
            education: [...aboutData.education, { ...newEdu }]
        });
        setNewEdu({ degree: '', institution: '', year: '', description: '' });
        setSaved(false);
    };

    const removeEducation = (idx) => {
        if (window.confirm('Delete this education entry?')) {
            setAboutData({
                ...aboutData,
                education: aboutData.education.filter((_, i) => i !== idx)
            });
            setSaved(false);
        }
    };

    const moveEducation = (idx, direction) => {
        const list = [...aboutData.education];
        const target = idx + direction;
        if (target < 0 || target >= list.length) return;
        const temp = list[idx];
        list[idx] = list[target];
        list[target] = temp;
        setAboutData({ ...aboutData, education: list });
        setSaved(false);
    };

    const handleCertChange = (idx, field, value) => {
        const updated = [...aboutData.certifications];
        updated[idx] = { ...updated[idx], [field]: value };
        setAboutData({ ...aboutData, certifications: updated });
        setSaved(false);
    };

    const addCert = () => {
        if (!newCert.name.trim()) {
            alert('Certification name is required');
            return;
        }
        const topicsArray = typeof newCert.topics === 'string'
            ? newCert.topics.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        setAboutData({
            ...aboutData,
            certifications: [
                ...aboutData.certifications,
                {
                    name: newCert.name.trim(),
                    issuer: newCert.issuer.trim() || 'Security Research',
                    year: newCert.year.trim() || '2024',
                    level: newCert.level.trim() || 'Practitioner',
                    topics: topicsArray
                }
            ]
        });
        setNewCert({ name: '', issuer: '', year: '2024', level: 'Practitioner', topics: '' });
        setSaved(false);
    };

    const removeCert = (idx) => {
        if (window.confirm('Delete this certification?')) {
            setAboutData({
                ...aboutData,
                certifications: aboutData.certifications.filter((_, i) => i !== idx)
            });
            setSaved(false);
        }
    };

    const handleSave = async () => {
        updateSection('about', aboutData);
        try {
            await saveSectionToBackend('about', aboutData);
        } catch (e) {
            alert('Saved locally, but failed to sync to server: ' + e.message);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all";

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaGraduationCap className="text-orange-400" /> Education & Certifications
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">Manage academic background and professional credentials</p>
                </div>
                <motion.button
                    onClick={handleSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg ${
                        saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'
                    }`}
                >
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            {/* Education Degrees Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-gray-700/50 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FaUniversity className="text-orange-400 text-xs" /> Academic Degrees ({aboutData.education.length})
                    </h3>
                </div>

                {/* New Education Form */}
                <div className="p-4 rounded-xl bg-gray-700/30 border border-gray-600/50 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-300">Add New Degree</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            value={newEdu.degree}
                            onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                            className={inputClass}
                            placeholder="Degree (e.g. B.Sc. in CSE)"
                        />
                        <input
                            value={newEdu.institution}
                            onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                            className={inputClass}
                            placeholder="Institution / University"
                        />
                        <input
                            value={newEdu.year}
                            onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                            className={inputClass}
                            placeholder="Timeline (e.g. 2022 - 2026)"
                        />
                    </div>
                    <textarea
                        value={newEdu.description}
                        onChange={(e) => setNewEdu({ ...newEdu, description: e.target.value })}
                        rows="2"
                        className={`${inputClass} resize-none`}
                        placeholder="Relevant coursework & highlights..."
                    />
                    <button
                        onClick={addEducation}
                        className="px-4 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <FaPlus /> Add Degree
                    </button>
                </div>

                {/* List of Degrees */}
                <div className="space-y-4">
                    {aboutData.education.map((edu, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-gray-700/20 border border-gray-700/60 flex items-start gap-4">
                            <div className="flex flex-col gap-1 mt-1">
                                <button
                                    onClick={() => moveEducation(idx, -1)}
                                    disabled={idx === 0}
                                    className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"
                                >
                                    <FaArrowUp className="text-xs" />
                                </button>
                                <button
                                    onClick={() => moveEducation(idx, 1)}
                                    disabled={idx === aboutData.education.length - 1}
                                    className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"
                                >
                                    <FaArrowDown className="text-xs" />
                                </button>
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        value={edu.degree || ''}
                                        onChange={(e) => handleEduChange(idx, 'degree', e.target.value)}
                                        className={inputClass}
                                        placeholder="Degree"
                                    />
                                    <input
                                        value={edu.institution || ''}
                                        onChange={(e) => handleEduChange(idx, 'institution', e.target.value)}
                                        className={inputClass}
                                        placeholder="Institution"
                                    />
                                    <input
                                        value={edu.year || ''}
                                        onChange={(e) => handleEduChange(idx, 'year', e.target.value)}
                                        className={inputClass}
                                        placeholder="Year"
                                    />
                                </div>
                                <textarea
                                    value={edu.description || ''}
                                    onChange={(e) => handleEduChange(idx, 'description', e.target.value)}
                                    rows="2"
                                    className={`${inputClass} resize-none`}
                                    placeholder="Description"
                                />
                            </div>

                            <button
                                onClick={() => removeEducation(idx)}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center shrink-0 mt-1"
                                title="Delete"
                            >
                                <FaTimes className="text-xs" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Certifications & Badges Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-gray-700/50 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FaCertificate className="text-orange-400 text-xs" /> Professional Certifications ({aboutData.certifications.length})
                    </h3>
                </div>

                {/* New Certification Form */}
                <div className="p-4 rounded-xl bg-gray-700/30 border border-gray-600/50 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-300">Add New Certification</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <input
                            value={newCert.name}
                            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                            className={inputClass}
                            placeholder="Certification Name"
                        />
                        <input
                            value={newCert.issuer}
                            onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                            className={inputClass}
                            placeholder="Issuer (e.g. PortSwigger, THM)"
                        />
                        <input
                            value={newCert.year}
                            onChange={(e) => setNewCert({ ...newCert, year: e.target.value })}
                            className={inputClass}
                            placeholder="Year (e.g. 2024)"
                        />
                        <input
                            value={newCert.level}
                            onChange={(e) => setNewCert({ ...newCert, level: e.target.value })}
                            className={inputClass}
                            placeholder="Level (e.g. Practitioner, Elite)"
                        />
                    </div>
                    <input
                        value={newCert.topics}
                        onChange={(e) => setNewCert({ ...newCert, topics: e.target.value })}
                        className={inputClass}
                        placeholder="Topics / Tags (comma-separated, e.g.: XSS, SQLi, SSRF, JWT)"
                    />
                    <button
                        onClick={addCert}
                        className="px-4 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <FaPlus /> Add Certification
                    </button>
                </div>

                {/* List of Certifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aboutData.certifications.map((cert, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-gray-700/20 border border-gray-700/60 flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                                <input
                                    value={cert.name || ''}
                                    onChange={(e) => handleCertChange(idx, 'name', e.target.value)}
                                    className={`${inputClass} font-semibold`}
                                    placeholder="Cert Name"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        value={cert.issuer || ''}
                                        onChange={(e) => handleCertChange(idx, 'issuer', e.target.value)}
                                        className={inputClass}
                                        placeholder="Issuer"
                                    />
                                    <input
                                        value={cert.year || ''}
                                        onChange={(e) => handleCertChange(idx, 'year', e.target.value)}
                                        className={inputClass}
                                        placeholder="Year"
                                    />
                                    <input
                                        value={cert.level || ''}
                                        onChange={(e) => handleCertChange(idx, 'level', e.target.value)}
                                        className={inputClass}
                                        placeholder="Level"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => removeCert(idx)}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center shrink-0 mt-1"
                                title="Delete"
                            >
                                <FaTimes className="text-xs" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export default AdminEducation;

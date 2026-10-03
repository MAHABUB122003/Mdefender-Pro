import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSave, FaCog, FaDownload, FaUpload, FaTrash, FaLink, FaFileAlt, FaShieldAlt, FaKey, FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { getSection, updateSection, exportData, importData, saveSectionToBackend, resetAllDataFromBackend, syncSectionsFromBackend } from '../../utils/portfolioData';
import { api, getToken } from '../../utils/api';
import { changeAdminPassword, getCurrentUser } from '../../utils/adminAuth';

function AdminGeneral() {
    const [data, setData] = useState(null);
    const [footerData, setFooterData] = useState(null);
    const [saved, setSaved] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [confirmReset, setConfirmReset] = useState(false);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');
    const [changingPass, setChangingPass] = useState(false);

    const currentUser = getCurrentUser();

    useEffect(() => {
        setData(getSection('general'));
        setFooterData(getSection('footer'));
    }, []);

    if (!data) return null;

    const handleSave = async () => {
        updateSection('general', data);
        const currentFooter = footerData || getSection('footer');
        if (currentFooter) {
            updateSection('footer', currentFooter);
        }
        try {
            await Promise.all([
                saveSectionToBackend('general', data),
                currentFooter ? saveSectionToBackend('footer', currentFooter) : Promise.resolve()
            ]);
        } catch (e) {
            alert('Saved locally, but failed to save to server: ' + e.message);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setPassError('');
        setPassSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPassError('Please fill in all password fields.');
            return;
        }

        if (newPassword.length < 8) {
            setPassError('New password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPassError('New password and confirmation do not match.');
            return;
        }

        setChangingPass(true);
        try {
            await changeAdminPassword(currentPassword, newPassword);
            setPassSuccess('Admin password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPassError(err.message || 'Failed to update password. Check your current password.');
        } finally {
            setChangingPass(false);
        }
    };

    const handleExport = async () => {
        let json;
        if (getToken()) {
            try {
                const res = await api('/sections/export', { auth: true });
                json = JSON.stringify(res.data, null, 2);
            } catch (e) {
                alert('Export failed: ' + e.message);
                return;
            }
        } else {
            json = exportData();
        }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        if (!importJson.trim()) return;
        let result;
        if (getToken()) {
            try {
                let parsed;
                try {
                    parsed = JSON.parse(importJson);
                } catch {
                    alert('Invalid JSON data format');
                    return;
                }
                await api('/sections/import', {
                    method: 'POST',
                    body: { data: parsed },
                    auth: true
                });
                await syncSectionsFromBackend();
                result = { success: true };
            } catch (e) {
                alert('Import failed: ' + e.message);
                return;
            }
        } else {
            result = importData(importJson);
        }
        if (result.success) {
            alert('Data imported successfully!');
            window.location.reload();
        } else {
            alert(result.error || 'Invalid JSON data');
        }
    };

    const handleReset = async () => {
        if (confirmReset) {
            try {
                await resetAllDataFromBackend();
            } catch (e) {
                alert('Reset failed: ' + e.message);
                return;
            }
            alert('Portfolio reset to default successfully!');
            window.location.reload();
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 5000);
        }
    };

    const handleFooterChange = (field, value) => {
        const updated = { ...(footerData || {}), [field]: value };
        setFooterData(updated);
        setSaved(false);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all";

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaCog className="text-orange-400" /> General & System Settings
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">Configure global portfolio SEO, metadata, security credentials, and backups</p>
                </div>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg ${saved ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'}`}>
                    <FaSave /> {saved ? 'Saved!' : 'Save Changes'}
                </motion.button>
            </div>

            {/* High Security & Credentials Card */}
            <div className="bg-gray-800/50 border border-emerald-500/30 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FaShieldAlt className="text-emerald-400" /> High Security & Credentials
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                        <FaCheckCircle className="text-[10px]" /> Rate Limiting & Protection Active
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Security Overview */}
                    <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-700/60 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FaLock className="text-orange-400 text-xs" /> Security Policy
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <strong>Logged In As:</strong> <span className="text-white">{currentUser?.email || 'Administrator'}</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <strong>Brute-force Shield:</strong> 5 failed attempts locks login for 15 minutes.
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <strong>Anti-NoSQL Injection:</strong> Payload sanitization enabled.
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <strong>Security Headers:</strong> Helmet CSP & cross-origin isolation enabled.
                            </li>
                        </ul>
                    </div>

                    {/* Change Password Form */}
                    <form onSubmit={handlePasswordUpdate} className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FaKey className="text-orange-400 text-xs" /> Update Admin Password
                        </h4>
                        <div>
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                type="password"
                                placeholder="New Password (min 8 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={inputClass}
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        {passError && (
                            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-1.5">
                                <FaExclamationTriangle /> {passError}
                            </p>
                        )}
                        {passSuccess && (
                            <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-1.5">
                                <FaCheckCircle /> {passSuccess}
                            </p>
                        )}
                        <motion.button
                            type="submit"
                            disabled={changingPass}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {changingPass ? 'Updating...' : 'Update Password'}
                        </motion.button>
                    </form>
                </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FaFileAlt className="text-orange-400 text-xs" /> SEO & Meta Information
                </h3>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Site Title</label>
                    <input value={data.siteTitle || ''} onChange={(e) => { setData({ ...data, siteTitle: e.target.value }); setSaved(false); }} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Meta Description</label>
                    <textarea value={data.metaDescription || ''} onChange={(e) => { setData({ ...data, metaDescription: e.target.value }); setSaved(false); }} rows="2" className={`${inputClass} resize-none`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Primary Accent Color</label>
                        <div className="flex gap-2 items-center">
                            <input type="color" value={data.themeColor || '#f43f5e'} onChange={(e) => { setData({ ...data, themeColor: e.target.value }); setSaved(false); }} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                            <input value={data.themeColor || '#f43f5e'} onChange={(e) => { setData({ ...data, themeColor: e.target.value }); setSaved(false); }} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Default Dark Mode</label>
                        <button onClick={() => { setData({ ...data, defaultDarkMode: !data.defaultDarkMode }); setSaved(false); }}
                            className={`w-12 h-6 rounded-full transition-all mt-2 ${data.defaultDarkMode ? 'bg-orange-500' : 'bg-gray-600'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${data.defaultDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Settings */}
            {footerData && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FaLink className="text-orange-400 text-xs" /> Footer Configuration
                </h3>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Tagline</label>
                    <input value={footerData.tagline || ''} onChange={(e) => handleFooterChange('tagline', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Description</label>
                    <textarea value={footerData.description || ''} onChange={(e) => handleFooterChange('description', e.target.value)} rows="2" className={`${inputClass} resize-none`} />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Copyright Name</label>
                    <input value={footerData.copyright || ''} onChange={(e) => handleFooterChange('copyright', e.target.value)} className={inputClass} />
                </div>
            </div>
            )}

            {/* Data Management & Backup */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-5">
                <h3 className="text-sm font-bold text-white">Database Backup & Recovery</h3>

                {/* Export */}
                <div className="p-4 rounded-xl bg-gray-700/20 border border-gray-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-semibold text-white">Export Full Portfolio Snapshot</h4>
                        <p className="text-xs text-gray-400">Download complete database including all projects and sections as JSON</p>
                    </div>
                    <motion.button onClick={handleExport} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-blue-500/30 transition-all">
                        <FaDownload /> Export Backup (JSON)
                    </motion.button>
                </div>

                {/* Import */}
                <div className="p-4 rounded-xl bg-gray-700/20 border border-gray-700/60 space-y-3">
                    <div>
                        <h4 className="text-sm font-semibold text-white">Import / Restore Snapshot</h4>
                        <p className="text-xs text-gray-400">Paste raw JSON backup to restore all portfolio configurations</p>
                    </div>
                    <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} rows="3" className={`${inputClass} resize-none font-mono text-xs`} placeholder='{"sections": {...}, "projects": [...]}' />
                    <motion.button onClick={handleImport} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-green-500/30 transition-all">
                        <FaUpload /> Import & Sync
                    </motion.button>
                </div>

                {/* Reset */}
                <div className="pt-3 border-t border-gray-700/50">
                    <motion.button onClick={handleReset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            confirmReset ? 'bg-red-500 text-white shadow-lg shadow-red-900/40' : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                        }`}>
                        <FaTrash /> {confirmReset ? 'Click again to confirm reset' : 'Reset All Portfolio Data to Default'}
                    </motion.button>
                    {confirmReset && <p className="text-red-400 text-xs mt-1.5 font-medium">⚠️ Warning: This will overwrite all custom entries with initial default seed data.</p>}
                </div>
            </div>
        </motion.div>
    );
}

export default AdminGeneral;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaFolderOpen, FaPlus, FaShieldAlt, FaCode, FaBrain, FaEye, FaEdit, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { getProjects, deleteProject, moveProjectUp, moveProjectDown, syncProjectsFromBackend } from '../../utils/projectStorage';
import { getCurrentUser } from '../../utils/adminAuth';

function AdminDashboard() {
    const [projects, setProjects] = useState(() => getProjects());
    const user = getCurrentUser();

    useEffect(() => {
        setProjects(getProjects());

        const handleUpdate = () => {
            setProjects(getProjects());
        };

        window.addEventListener('portfolio_projects_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        syncProjectsFromBackend().then((res) => {
            if (res) setProjects(getProjects());
        }).catch(() => {});

        return () => {
            window.removeEventListener('portfolio_projects_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const handleDelete = async (id, title) => {
        if (window.confirm(`Delete "${title}"?`)) {
            try {
                await deleteProject(id);
                setProjects(getProjects());
            } catch (e) {
                alert('Failed to delete project. Check console for details.');
                console.error('Delete failed:', e);
            }
        }
    };

    const handleMoveUp = async (id) => {
        try {
            await moveProjectUp(id);
            setProjects(getProjects());
        } catch (e) {
            console.error('Move up failed:', e);
        }
    };

    const handleMoveDown = async (id) => {
        try {
            await moveProjectDown(id);
            setProjects(getProjects());
        } catch (e) {
            console.error('Move down failed:', e);
        }
    };

    const getCategoryIcon = (cat) => {
        switch(cat) {
            case 'security': return <FaShieldAlt className="text-orange-400" />;
            case 'ml': return <FaBrain className="text-purple-400" />;
            default: return <FaCode className="text-blue-400" />;
        }
    };

    const getCategoryColor = (cat) => {
        switch(cat) {
            case 'security': return 'bg-orange-500/20 text-orange-400';
            case 'ml': return 'bg-purple-500/20 text-purple-400';
            default: return 'bg-blue-500/20 text-blue-400';
        }
    };

    const stats = {
        total: projects.length,
        web: projects.filter(p => p.category === 'web').length,
        security: projects.filter(p => p.category === 'security').length,
        ml: projects.filter(p => p.category === 'ml').length,
    };

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
            >
                <h1 className="text-2xl font-bold text-white mb-1">
                    Welcome back, <span className="bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">{user?.name}</span>
                </h1>
                <p className="text-gray-400 text-sm">Manage your portfolio projects and change their importance order.</p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Projects', value: stats.total, color: 'from-orange-500 to-amber-500', icon: <FaFolderOpen /> },
                    { label: 'Web Dev', value: stats.web, color: 'from-blue-500 to-cyan-500', icon: <FaCode /> },
                    { label: 'Security', value: stats.security, color: 'from-red-500 to-orange-500', icon: <FaShieldAlt /> },
                    { label: 'ML Projects', value: stats.ml, color: 'from-purple-500 to-pink-500', icon: <FaBrain /> },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-gray-400">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
                <Link
                    to="/admin/projects/new"
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:shadow-lg transition-all"
                >
                    <FaPlus /> Add New Project
                </Link>
            </div>

            {/* Projects List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">All Projects (Drag to Reorder)</h2>
                    <span className="text-xs text-gray-400">Use arrows to change importance</span>
                </div>
                <div className="divide-y divide-gray-700/50">
                    {projects.map((project, idx) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="px-6 py-4 hover:bg-gray-700/20 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                {/* Order Controls */}
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => handleMoveUp(project.id)}
                                        disabled={idx === 0}
                                        className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Move up (higher importance)"
                                    >
                                        <FaArrowUp className="text-xs" />
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(project.id)}
                                        disabled={idx === projects.length - 1}
                                        className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Move down (lower importance)"
                                    >
                                        <FaArrowDown className="text-xs" />
                                    </button>
                                </div>

                                {/* Order Number */}
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {idx + 1}
                                </div>

                                {/* Project Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-white font-semibold text-sm truncate">{project.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(project.category)} flex items-center gap-1`}>
                                            {getCategoryIcon(project.category)}
                                            {project.category}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                            project.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                            project.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs truncate">{project.description}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {project.tech.slice(0, 4).map((t, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-gray-700/50 text-gray-300 text-[10px] rounded">
                                                {t}
                                            </span>
                                        ))}
                                        {project.tech.length > 4 && (
                                            <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-300 text-[10px] rounded">
                                                +{project.tech.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link
                                        to={`/admin/projects/edit/${project.id}`}
                                        className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-all"
                                        title="Edit"
                                    >
                                        <FaEdit className="text-xs" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(project.id, project.title)}
                                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                                        title="Delete"
                                    >
                                        <FaTrash className="text-xs" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;

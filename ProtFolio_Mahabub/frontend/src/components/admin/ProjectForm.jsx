import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaTimes, FaPlus, FaTrash, FaImage } from 'react-icons/fa';
import { addProject, updateProject, getProjects } from '../../utils/projectStorage';

function ProjectForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState({
        title: '',
        category: 'web',
        image: '',
        description: '',
        fullDescription: '',
        tech: [],
        features: [],
        github: 'https://github.com/MAHABUB122003',
        demo: '#',
        date: new Date().getFullYear().toString(),
        status: 'Completed'
    });

    const [techInput, setTechInput] = useState('');
    const [featureInput, setFeatureInput] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isEditing) {
            const projects = getProjects();
            const project = projects.find(p => String(p.id) === String(id));
            if (project) {
                setFormData({
                    title: project.title || '',
                    category: project.category || 'web',
                    image: project.image || '',
                    description: project.description || '',
                    fullDescription: project.fullDescription || '',
                    tech: project.tech || [],
                    features: project.features || [],
                    github: project.github || 'https://github.com/MAHABUB122003',
                    demo: project.demo || '#',
                    date: project.date || new Date().getFullYear().toString(),
                    status: project.status || 'Completed'
                });
            } else {
                setError('Project not found');
            }
        }
    }, [id, isEditing]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const addTech = () => {
        if (techInput.trim() && !formData.tech.includes(techInput.trim())) {
            setFormData({ ...formData, tech: [...formData.tech, techInput.trim()] });
            setTechInput('');
        }
    };

    const removeTech = (tech) => {
        setFormData({ ...formData, tech: formData.tech.filter(t => t !== tech) });
    };

    const addFeature = () => {
        if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
            setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
            setFeatureInput('');
        }
    };

    const removeFeature = (feature) => {
        setFormData({ ...formData, features: formData.features.filter(f => f !== feature) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }
        if (!formData.description.trim()) {
            setError('Description is required');
            return;
        }
        if (formData.tech.length === 0) {
            setError('Add at least one technology');
            return;
        }

        try {
            if (isEditing) {
                const result = await updateProject(id, formData);
                if (!result) {
                    setError('Failed to update project. The project may have been deleted.');
                    return;
                }
                setSuccess('Project updated successfully!');
            } else {
                await addProject(formData);
                setSuccess('Project added successfully!');
            }
        } catch (err) {
            setError(err.message || 'Failed to save project. Please try again.');
            return;
        }

        setTimeout(() => navigate('/admin/projects'), 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
            <h2 className="text-xl font-bold text-white mb-6">
                {isEditing ? 'Edit Project' : 'Add New Project'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Project Title *</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        placeholder="e.g., MDefender Pro - AI Security Platform"
                    />
                </div>

                {/* Category & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                        >
                            <option value="web">Web Development</option>
                            <option value="security">Cybersecurity</option>
                            <option value="ml">Machine Learning</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                        >
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="In Progress">In Progress</option>
                        </select>
                    </div>
                </div>

                {/* Project Cover Image Upload */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                        <FaImage className="text-orange-400" /> Project Cover Image
                        <span className="text-gray-500 font-normal">(1200×800px · max 2MB)</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/30 transition-all flex items-center gap-2">
                            <FaImage /> Choose Image
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    if (file.size > 2 * 1024 * 1024) {
                                        setError('Image is too large. Maximum size is 2MB.');
                                        return;
                                    }
                                    setUploading(true);
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const img = new Image();
                                        img.onload = () => {
                                            const maxW = 1200;
                                            const maxH = 800;
                                            let w = img.width;
                                            let h = img.height;
                                            if (w > maxW) { h = h * maxW / w; w = maxW; }
                                            if (h > maxH) { w = w * maxH / h; h = maxH; }
                                            const canvas = document.createElement('canvas');
                                            canvas.width = w;
                                            canvas.height = h;
                                            const ctx = canvas.getContext('2d');
                                            ctx.drawImage(img, 0, 0, w, h);
                                            const compressed = canvas.toDataURL('image/jpeg', 0.7);
                                            setFormData({ ...formData, image: compressed });
                                            setError('');
                                            setUploading(false);
                                        };
                                        img.onerror = () => {
                                            setError('Failed to process image. Try a different file.');
                                            setUploading(false);
                                        };
                                        img.src = ev.target.result;
                                    };
                                    reader.onerror = () => {
                                        setError('Failed to read image file. Try a different file.');
                                        setUploading(false);
                                    };
                                    reader.readAsDataURL(file);
                                }}
                            />
                        </label>
                        {formData.image && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, image: '' })}
                                className="px-3 py-2.5 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all text-sm"
                            >
                                <FaTrash className="text-xs" />
                            </button>
                        )}
                    </div>
                    {formData.image && (
                        <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-gray-700 group">
                            <img
                                src={formData.image}
                                alt="Project Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>

                {/* Short Description */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Short Description *</label>
                    <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        placeholder="Brief one-line description"
                    />
                </div>

                {/* Full Description */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Description</label>
                    <textarea
                        name="fullDescription"
                        value={formData.fullDescription}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                        placeholder="Detailed project description..."
                    />
                </div>

                {/* Tech Stack */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Technologies *</label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={techInput}
                            onChange={(e) => setTechInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="Add technology and press Enter"
                        />
                        <button
                            type="button"
                            onClick={addTech}
                            className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all"
                        >
                            <FaPlus className="text-sm" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {formData.tech.map((tech, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-lg flex items-center gap-1.5"
                            >
                                {tech}
                                <button
                                    type="button"
                                    onClick={() => removeTech(tech)}
                                    className="text-gray-500 hover:text-red-400"
                                >
                                    <FaTimes className="text-[10px]" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Key Features</label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="Add feature and press Enter"
                        />
                        <button
                            type="button"
                            onClick={addFeature}
                            className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all"
                        >
                            <FaPlus className="text-sm" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {formData.features.map((feature, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-lg flex items-center gap-1.5"
                            >
                                {feature}
                                <button
                                    type="button"
                                    onClick={() => removeFeature(feature)}
                                    className="text-gray-500 hover:text-red-400"
                                >
                                    <FaTimes className="text-[10px]" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* GitHub & Demo */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">GitHub URL</label>
                        <input
                            type="url"
                            name="github"
                            value={formData.github}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="https://github.com/..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Demo URL</label>
                        <input
                            type="url"
                            name="demo"
                            value={formData.demo}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="https://... or #"
                        />
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
                    <input
                        type="text"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                        placeholder="2024"
                    />
                </div>

                {/* Error & Success */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2"
                    >
                        {error}
                    </motion.p>
                )}
                {success && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg p-2"
                    >
                        {success}
                    </motion.p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <motion.button
                        type="submit"
                        disabled={uploading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                            uploading
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-purple-500 text-white hover:shadow-lg'
                        }`}
                    >
                        <FaSave /> {uploading ? 'Processing...' : (isEditing ? 'Update Project' : 'Save Project')}
                    </motion.button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/projects')}
                        className="px-6 py-2.5 bg-gray-700/50 text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-700 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

export default ProjectForm;

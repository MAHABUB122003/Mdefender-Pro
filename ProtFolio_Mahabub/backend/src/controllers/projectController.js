import Project from '../models/Project.js';

export async function getProjects(req, res, next) {
    try {
        const projects = await Project.find().sort({ order: 1 });
        res.json({ success: true, projects });
    } catch (err) {
        next(err);
    }
}

export async function getProjectById(req, res, next) {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (err) {
        next(err);
    }
}

export async function createProject(req, res, next) {
    try {
        const max = await Project.findOne().sort({ order: -1 });
        const order = (max?.order ?? 0) + 1;
        const project = await Project.create({ ...req.body, order });
        res.status(201).json({ success: true, project });
    } catch (err) {
        next(err);
    }
}

export async function updateProject(req, res, next) {
    try {
        const { id } = req.params;
        const { _id, id: clientId, order, ...updates } = req.body;
        const project = await Project.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (err) {
        next(err);
    }
}

export async function deleteProject(req, res, next) {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
        next(err);
    }
}

export async function reorderProjects(req, res, next) {
    try {
        const orderedIds = req.body.orderedIds;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ success: false, message: 'orderedIds array is required' });
        }

        const ops = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { order: index + 1 }
            }
        }));

        if (ops.length > 0) {
            await Project.bulkWrite(ops);
        }

        const projects = await Project.find().sort({ order: 1 });
        res.json({ success: true, projects });
    } catch (err) {
        next(err);
    }
}

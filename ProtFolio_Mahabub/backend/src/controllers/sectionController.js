import Section from '../models/Section.js';
import Project from '../models/Project.js';
import { defaultSections } from '../data/defaultData.js';
import { defaultProjects } from '../data/defaultProjects.js';

export async function getAllSections(req, res, next) {
    try {
        const docs = await Section.find();
        const sections = {};
        docs.forEach(d => { sections[d.key] = d.data; });
        res.json({ success: true, sections });
    } catch (err) {
        next(err);
    }
}

export async function getSectionByKey(req, res, next) {
    try {
        const doc = await Section.findOne({ key: req.params.key });
        if (!doc) {
            return res.status(404).json({ success: false, message: `Section '${req.params.key}' not found` });
        }
        res.json({ success: true, key: doc.key, data: doc.data });
    } catch (err) {
        next(err);
    }
}

export async function updateSectionByKey(req, res, next) {
    try {
        const { key } = req.params;
        const data = req.body.data ?? req.body;

        if (data === undefined || data === null || typeof data !== 'object') {
            return res.status(400).json({ success: false, message: 'Section data is required' });
        }

        const doc = await Section.findOneAndUpdate(
            { key },
            { key, data },
            { new: true, upsert: true, runValidators: true }
        );
        res.json({ success: true, key: doc.key, data: doc.data });
    } catch (err) {
        next(err);
    }
}

export async function resetSectionByKey(req, res, next) {
    try {
        const { key } = req.params;
        const defaults = defaultSections[key];
        if (!defaults) {
            return res.status(400).json({ success: false, message: `No defaults for section '${key}'` });
        }
        const doc = await Section.findOneAndUpdate(
            { key },
            { key, data: defaults },
            { new: true, upsert: true }
        );
        res.json({ success: true, key: doc.key, data: doc.data });
    } catch (err) {
        next(err);
    }
}

export async function resetAllSections(req, res, next) {
    try {
        for (const [key, data] of Object.entries(defaultSections)) {
            await Section.findOneAndUpdate(
                { key },
                { key, data },
                { upsert: true, new: true }
            );
        }
        await Project.deleteMany({});
        await Project.insertMany(
            defaultProjects.map((p, i) => ({ ...p, order: p.order ?? i + 1 }))
        );
        res.json({ success: true, message: 'All portfolio data reset to defaults' });
    } catch (err) {
        next(err);
    }
}

export async function exportAll(req, res, next) {
    try {
        const sectionDocs = await Section.find();
        const sections = {};
        sectionDocs.forEach(d => { sections[d.key] = d.data; });
        const projects = await Project.find().sort({ order: 1 });
        res.json({ success: true, data: { sections, projects } });
    } catch (err) {
        next(err);
    }
}

export async function importAll(req, res, next) {
    try {
        const { sections, projects } = req.body.data ?? req.body ?? {};

        if (sections && typeof sections === 'object') {
            for (const [key, data] of Object.entries(sections)) {
                if (typeof data === 'object') {
                    await Section.findOneAndUpdate(
                        { key },
                        { key, data },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        if (Array.isArray(projects)) {
            await Project.deleteMany({});
            await Project.insertMany(
                projects.map((p, i) => ({ ...p, order: p.order ?? i + 1 }))
            );
        }

        res.json({ success: true, message: 'Data imported successfully' });
    } catch (err) {
        next(err);
    }
}

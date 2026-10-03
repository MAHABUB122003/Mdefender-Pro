import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'web' },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    fullDescription: { type: String, default: '' },
    tech: [{ type: String }],
    features: [{ type: String }],
    github: { type: String, default: '' },
    demo: { type: String, default: '#' },
    date: { type: String, default: '' },
    status: { type: String, default: 'Completed' },
    order: { type: Number, default: 0 }
}, { timestamps: true });

projectSchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
    }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;

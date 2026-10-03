import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

sectionSchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
    }
});

const Section = mongoose.model('Section', sectionSchema);
export default Section;

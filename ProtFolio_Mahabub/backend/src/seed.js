import 'dotenv/config';
import { connectDB, disconnectDB } from './config/db.js';
import User from './models/User.js';
import Section from './models/Section.js';
import Project from './models/Project.js';
import { defaultSections } from './data/defaultData.js';
import { defaultProjects } from './data/defaultProjects.js';

async function seedUser() {
    const email = (process.env.ADMIN_EMAIL || 'rahmanmdmahabubur666@gmail.com').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || '*1610833658#';
    const name = process.env.ADMIN_NAME || 'MD Mahabubur Rahman';

    let user = await User.findOne({ email });
    if (user) {
        user.name = name;
        user.password = password;
        await user.save();
        console.log('Admin user updated:', email);
    } else {
        await User.create({ name, email, password });
        console.log('Admin user created:', email);
    }
}

async function seedSections() {
    for (const [key, data] of Object.entries(defaultSections)) {
        await Section.findOneAndUpdate(
            { key },
            { key, data },
            { upsert: true, new: true }
        );
    }
    console.log('Sections seeded:', Object.keys(defaultSections).join(', '));
}

async function seedProjects() {
    await Project.deleteMany({});
    await Project.insertMany(
        defaultProjects.map((p, i) => ({ ...p, order: p.order ?? i + 1 }))
    );
    console.log('Projects seeded:', defaultProjects.length);
}

async function seed() {
    await connectDB();
    await seedUser();
    await seedSections();
    await seedProjects();
    await disconnectDB();
    console.log('Seed complete');
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});

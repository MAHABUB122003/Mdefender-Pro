import { api, getToken } from './api';

const PORTFOLIO_KEY = 'portfolio_data_v3';

const defaultData = {
    hero: {
        name: 'MD MAHABUBUR RAHMAN',
        title: 'Full-Stack Developer & Cybersecurity Specialist & ML Engineer',
        roles: ['Full-Stack Developer', 'Cybersecurity Specialist', 'ML Engineer', 'Bug Bounty Hunter'],
        description: 'Innovative developer, cybersecurity specialist, and machine learning engineer bridging the gap between intelligent systems and secure web applications. Proficient in offensive/defensive operations, Secure SDLC, and modern MERN/FastAPI stacks, with a focus on integrating predictive ML models for threat detection.',
        available: true,
        availableText: 'Available for opportunities',
        stats: [
            { value: '9+', label: 'Projects' },
            { value: '20+', label: 'Reports' },
            { value: '3+', label: 'Years Exp' }
        ],
        socials: [
            { platform: 'github', url: 'https://github.com/MAHABUB122003' },
            { platform: 'linkedin', url: 'https://linkedin.com/in/md-mahabubur-rahman-41674b33a' },
            { platform: 'facebook', url: 'https://www.facebook.com/md.abrar.ayman.mahabub/' },
            { platform: 'instagram', url: 'https://instagram.com' }
        ]
    },
    about: {
        tagline: 'Bridging the gap between intelligent systems and secure web applications',
        bio: [
            "Innovative developer, cybersecurity specialist, and machine learning engineer bridging the gap between intelligent systems and secure web applications.",
            "Proficient in building scalable, secure applications using MongoDB, Express, React, Node.js, and FastAPI with Secure SDLC principles. Advanced proficiency in Machine Learning and Data Science, specializing in supervised learning, ensemble methods, feature engineering, and predictive modeling.",
            "Experienced in vulnerability assessment, penetration testing, SIEM implementation, and digital forensics. Passionate about architecting AI-powered security solutions for threat detection and mitigation."
        ],
        personalDetails: {
            location: 'Dhaka, Bangladesh',
            student: 'B.Sc. CSE',
            email: 'rahmanmdmahabubur666@gmail.com',
            phone: '+880 1715044575',
            graduation: '2026'
        },
        education: [
            {
                degree: 'B.Sc. in Computer Science & Engineering',
                institution: 'Shanto Mariam University of Creative Technology, Dhaka',
                year: 'Expected 2026',
                description: 'Relevant Coursework: Network Security, Cryptography, Secure SDLC, Digital Forensics, Machine Learning, Data Science, Statistics'
            }
        ],
        certifications: [
            { name: 'PortSwigger Web Security Academy', issuer: 'PortSwigger', year: '2024', level: 'Practitioner' },
            { name: 'TryHackMe - AD & Network Pentesting', issuer: 'TryHackMe', year: '2024', level: 'Specialized' },
            { name: 'Active Bug Bounty Hunter', issuer: 'Security Research', year: '2024', level: 'Professional' },
            { name: 'ML: Scikit-learn, XGBoost, CatBoost, LightGBM', issuer: 'Machine Learning', year: '2024', level: 'Proficient' },
            { name: 'CTF Competitor: Web, Binary, Forensics', issuer: 'CTF Security', year: '2024', level: 'Active' }
        ],
        stats: [
            { number: '9+', label: 'Projects Completed', description: 'Full-stack & Security' },
            { number: '20+', label: 'Security Reports', description: 'Vulnerabilities Found' },
            { number: '3+', label: 'Years Experience', description: 'Learning & Growing' },
            { number: '100%', label: 'Commitment', description: 'Quality Assurance' }
        ],
        coreValues: [
            { title: 'Clean Code', description: 'Writing maintainable solutions' },
            { title: 'Security First', description: 'Building secure applications' },
            { title: 'Innovation', description: 'Embracing new technologies' },
            { title: 'Continuous Growth', description: 'Learning every day' }
        ]
    },
    skills: {
        categories: [
            {
                name: 'Frontend',
                gradient: 'from-cyan-500 to-blue-500',
                skills: [
                    { name: 'React.js', level: 90 },
                    { name: 'JavaScript', level: 85 },
                    { name: 'Tailwind CSS', level: 88 },
                    { name: 'HTML/CSS', level: 85 }
                ]
            },
            {
                name: 'Backend',
                gradient: 'from-green-500 to-emerald-500',
                skills: [
                    { name: 'Node.js', level: 85 },
                    { name: 'Express.js', level: 85 },
                    { name: 'MongoDB', level: 80 },
                    { name: 'FastAPI', level: 80 }
                ]
            },
            {
                name: 'Machine Learning',
                gradient: 'from-purple-500 to-pink-500',
                skills: [
                    { name: 'XGBoost', level: 85 },
                    { name: 'CatBoost', level: 82 },
                    { name: 'LightGBM', level: 82 },
                    { name: 'Scikit-learn', level: 85 }
                ]
            },
            {
                name: 'Cybersecurity',
                gradient: 'from-red-500 to-orange-500',
                skills: [
                    { name: 'Pen Testing', level: 85 },
                    { name: 'SOC/SIEM', level: 82 },
                    { name: 'Network Security', level: 85 },
                    { name: 'Digital Forensics', level: 78 }
                ]
            },
            {
                name: 'DevOps & Tools',
                gradient: 'from-purple-500 to-pink-500',
                skills: [
                    { name: 'Git/GitHub', level: 90 },
                    { name: 'Docker', level: 78 },
                    { name: 'REST APIs', level: 88 },
                    { name: 'JWT Auth', level: 85 }
                ]
            },
            {
                name: 'Languages',
                gradient: 'from-blue-500 to-cyan-500',
                skills: [
                    { name: 'Python', level: 88 },
                    { name: 'JavaScript', level: 85 },
                    { name: 'Bash', level: 80 },
                    { name: 'PowerShell', level: 78 }
                ]
            },
            {
                name: 'Security Tools',
                gradient: 'from-green-500 to-teal-500',
                skills: [
                    { name: 'Metasploit', level: 85 },
                    { name: 'Burp Suite', level: 88 },
                    { name: 'YARA/Snort', level: 82 },
                    { name: 'Splunk/Wazuh', level: 80 }
                ]
            }
        ],
        additional: {
            development: ['FastAPI', 'Next.js', 'GraphQL', 'Redis', 'PostgreSQL', 'Docker', 'Firebase', 'Tailwind CSS', 'JWT', 'Bcrypt'],
            security: ['Burp Suite', 'Nessus', 'Nmap', 'Wireshark', 'Metasploit', 'Sqlmap', 'Hydra', 'John the Ripper', 'Hashcat', 'Gobuster', 'Nikto', 'OWASP ZAP', 'Splunk', 'Wazuh', 'Autopsy', 'Snort', 'YARA'],
            ml: ['XGBoost', 'CatBoost', 'LightGBM', 'Random Forest', 'Decision Trees', 'SVM', 'Logistic Regression', 'Linear Regression', 'KNN', 'Naïve Bayes', 'TF-IDF', 'Count Vectorization', 'PCA', 'Feature Selection', 'Dimensionality Reduction', 'One-Hot Encoding', 'Standardization', 'Normalization', 'GridSearchCV', 'RandomizedSearchCV', 'Cross-Validation', 'Hyperparameter Tuning', 'Ensemble Methods', 'Scikit-learn', 'NumPy', 'Pandas', 'Matplotlib', 'Seaborn'],
            vulnerabilities: ['XSS', 'SQLi', 'LFI', 'RFI', 'CSRF', 'SSRF', 'XXE', 'IDOR', 'Path Traversal', 'Command Injection', 'JWT Attacks', 'Open Redirect', 'Clickjacking', 'SSTI', 'NoSQLi', 'AD Exploitation', 'Privilege Escalation', 'CVE Exploits', 'Pivoting', 'RATs', 'MITM', 'Phishing', 'Social Engineering'],
            os: ['Kali Linux', 'Ubuntu', 'Windows Server', 'Windows 10/11']
        }
    },
    contact: {
        info: [
            { type: 'email', value: 'rahmanmdmahabubur666@gmail.com', detail: 'Send me an email' },
            { type: 'phone', value: '+880 1715044575', detail: 'Available for calls' },
            { type: 'location', value: 'Dhaka, Bangladesh', detail: 'Remote work available' }
        ],
        socials: [
            { platform: 'github', url: 'https://github.com/MAHABUB122003' },
            { platform: 'linkedin', url: 'https://linkedin.com/in/md-mahabubur-rahman-41674b33a' },
            { platform: 'twitter', url: 'https://twitter.com' },
            { platform: 'instagram', url: 'https://instagram.com' },
            { platform: 'whatsapp', url: 'https://wa.me/8801715044575' },
            { platform: 'telegram', url: 'https://t.me/mahabub' }
        ],
        quickResponses: [
            { label: 'Project Inquiry', value: 'Project Inquiry - Need a custom solution' },
            { label: 'Job Opportunity', value: 'Job Opportunity - Interested in a position' },
            { label: 'ML Solution', value: 'ML Solution - Need machine learning implementation' },
            { label: 'Security Audit', value: 'Security Audit - Need security assessment' }
        ],
        available: true,
        availableText: 'Open to freelance opportunities'
    },
    footer: {
        tagline: 'Full-Stack Developer, Cybersecurity Specialist & ML Engineer',
        description: 'Building secure, scalable, and intelligent digital solutions with MERN stack, cybersecurity, and machine learning expertise.',
        services: [
            { name: 'Web Development', desc: 'Full-stack MERN applications' },
            { name: 'Cybersecurity', desc: 'Security auditing & pentesting' },
            { name: 'Machine Learning', desc: 'ML-powered threat detection' },
            { name: 'API Development', desc: 'FastAPI & REST APIs' }
        ],
        socials: [
            { platform: 'github', url: 'https://github.com/MAHABUB122003' },
            { platform: 'linkedin', url: 'https://linkedin.com/in/md-mahabubur-rahman-41674b33a' },
            { platform: 'twitter', url: 'https://twitter.com' },
            { platform: 'instagram', url: 'https://instagram.com' },
            { platform: 'facebook', url: 'https://facebook.com' }
        ],
        copyright: 'MD MAHABUBUR RAHMAN',
        builtWith: 'React & Tailwind'
    },
    general: {
        siteTitle: 'MD Mahabubur Rahman | Full-Stack Developer, Cybersecurity Specialist & ML Engineer',
        metaDescription: 'Portfolio of MD Mahabubur Rahman - Full-Stack Developer, Cybersecurity Expert, and Machine Learning Engineer.',
        themeColor: '#8B5CF6',
        defaultDarkMode: true
    }
};

export function getPortfolioData() {
    const stored = localStorage.getItem(PORTFOLIO_KEY);
    if (!stored) {
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    return JSON.parse(stored);
}

export function getSection(section) {
    const data = getPortfolioData();
    return data[section] || defaultData[section];
}

export function updateSection(section, newData) {
    const data = getPortfolioData();
    data[section] = { ...data[section], ...newData };
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
    return data[section];
}

export function resetSection(section) {
    const data = getPortfolioData();
    data[section] = defaultData[section];
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
    return data[section];
}

export function resetAllData() {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(defaultData));
    return defaultData;
}

export function exportData() {
    return JSON.stringify(getPortfolioData(), null, 2);
}

export function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
        return { success: true };
    } catch {
        return { success: false, error: 'Invalid JSON' };
    }
}

export async function syncSectionsFromBackend() {
    try {
        const res = await api('/sections');
        const sections = res?.sections;
        if (!sections || typeof sections !== 'object') return false;
        const data = getPortfolioData();
        let changed = false;
        for (const [key, value] of Object.entries(sections)) {
            if (value && typeof value === 'object') {
                data[key] = value;
                changed = true;
            }
        }
        if (changed) localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(data));
        return changed;
    } catch {
        return false;
    }
}

export async function saveSectionToBackend(key, sectionData) {
    if (!getToken()) return;
    return api(`/sections/${key}`, { method: 'PUT', body: { data: sectionData }, auth: true });
}

export async function resetAllDataFromBackend() {
    if (!getToken()) {
        resetAllData();
        return { success: true, message: 'Data reset locally' };
    }
    const res = await api('/sections/reset-all', { method: 'POST', auth: true });
    await syncSectionsFromBackend();
    return res;
}

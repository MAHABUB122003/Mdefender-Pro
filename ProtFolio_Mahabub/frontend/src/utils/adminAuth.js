import { api } from './api';

const ADMIN_KEY = 'portfolio_admin_session';
const ATTEMPTS_KEY = 'portfolio_login_attempts';
const LOCKOUT_KEY = 'portfolio_lockout';
const SESSION_TIMEOUT = 45 * 60 * 1000; // 45 minutes auto-expiry
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getAttempts() {
    const data = localStorage.getItem(ATTEMPTS_KEY);
    if (!data) return { count: 0, timestamps: [] };
    try {
        return JSON.parse(data);
    } catch {
        return { count: 0, timestamps: [] };
    }
}

function recordAttempt() {
    const attempts = getAttempts();
    const now = Date.now();
    const recent = (attempts.timestamps || []).filter(t => now - t < LOCKOUT_DURATION);
    recent.push(now);
    const newCount = recent.length;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: newCount, timestamps: recent }));
    return newCount;
}

function clearAttempts() {
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
}

function isLocked() {
    const lockout = localStorage.getItem(LOCKOUT_KEY);
    if (!lockout) return false;
    try {
        const lockTime = JSON.parse(lockout);
        if (Date.now() - lockTime > LOCKOUT_DURATION) {
            localStorage.removeItem(LOCKOUT_KEY);
            localStorage.removeItem(ATTEMPTS_KEY);
            return false;
        }
        return true;
    } catch {
        localStorage.removeItem(LOCKOUT_KEY);
        return false;
    }
}

function getRemainingLockTime() {
    const lockout = localStorage.getItem(LOCKOUT_KEY);
    if (!lockout) return 0;
    try {
        const lockTime = JSON.parse(lockout);
        const remaining = LOCKOUT_DURATION - (Date.now() - lockTime);
        return remaining > 0 ? remaining : 0;
    } catch {
        return 0;
    }
}

function lockAccount() {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(Date.now()));
}

export async function loginUser(email, password) {
    if (isLocked()) {
        const remaining = getRemainingLockTime();
        const mins = Math.ceil(remaining / 60000);
        return { success: false, error: `Account temporarily locked due to security policy. Please try again in ${mins} minute${mins > 1 ? 's' : ''}.`, locked: true, remaining };
    }

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    const attempts = getAttempts();
    if (attempts.count >= MAX_ATTEMPTS) {
        lockAccount();
        const remaining = getRemainingLockTime();
        const mins = Math.ceil(remaining / 60000);
        return { success: false, error: `Too many failed attempts. Locked for ${mins} minute${mins > 1 ? 's' : ''}.`, locked: true, remaining };
    }

    try {
        const res = await api('/auth/login', { method: 'POST', body: { email, password } });
        clearAttempts();

        const session = {
            email: res.user.email,
            name: res.user.name,
            loggedInAt: new Date().toISOString(),
            expiresAt: Date.now() + SESSION_TIMEOUT,
            token: res.token
        };
        localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
        return { success: true, user: session };
    } catch (err) {
        if (err.status === 429) {
            lockAccount();
            return { success: false, error: err.message || 'Rate limit exceeded. Try again later.', locked: true };
        }
        if (err.status === 401 || err.status === 400) {
            const count = recordAttempt();
            const remaining = MAX_ATTEMPTS - count;
            if (count >= MAX_ATTEMPTS) {
                lockAccount();
                const lockRemaining = getRemainingLockTime();
                const mins = Math.ceil(lockRemaining / 60000);
                return { success: false, error: `Account locked for ${mins} minute${mins > 1 ? 's' : ''} due to multiple failed attempts.`, locked: true, remaining: lockRemaining };
            }
            return { success: false, error: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before temporary lockout.` };
        }
        return { success: false, error: err.message || 'Cannot reach the server. Please try again.' };
    }
}

export async function changeAdminPassword(currentPassword, newPassword) {
    const user = getCurrentUser();
    if (!user || !user.token) {
        throw new Error('Not authenticated');
    }

    const res = await api('/auth/change-password', {
        method: 'POST',
        token: user.token,
        body: { currentPassword, newPassword }
    });

    if (res.token) {
        user.token = res.token;
        user.expiresAt = Date.now() + SESSION_TIMEOUT;
        localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
    }

    return res;
}

export function logoutUser() {
    localStorage.removeItem(ADMIN_KEY);
}

export function getCurrentUser() {
    const session = localStorage.getItem(ADMIN_KEY);
    if (!session) return null;
    try {
        const data = JSON.parse(session);
        if (Date.now() > data.expiresAt) {
            localStorage.removeItem(ADMIN_KEY);
            return null;
        }
        return data;
    } catch {
        localStorage.removeItem(ADMIN_KEY);
        return null;
    }
}

export function isAuthenticated() {
    return getCurrentUser() !== null;
}

export function getLoginAttempts() {
    if (isLocked()) {
        return { locked: true, remaining: getRemainingLockTime() };
    }
    const attempts = getAttempts();
    return { locked: false, attempts: attempts.count, remaining: MAX_ATTEMPTS - (attempts.count || 0) };
}

export function refreshSession() {
    const user = getCurrentUser();
    if (!user) return null;
    user.expiresAt = Date.now() + SESSION_TIMEOUT;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
    return user;
}

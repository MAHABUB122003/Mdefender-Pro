const SESSION_KEY = 'portfolio_admin_session';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

export function getApiBase() {
    return API_BASE;
}

export function getToken() {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return null;
        const data = JSON.parse(session);
        return data.token || null;
    } catch {
        return null;
    }
}

export async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        const networkError = new Error('Cannot reach the server. Please try again.');
        networkError.isNetworkError = true;
        throw networkError;
    }

    let json;
    try {
        json = await res.json();
    } catch {
        json = null;
    }

    if (!res.ok) {
        const error = new Error(json?.message || json?.error || `Request failed (${res.status})`);
        error.status = res.status;
        error.data = json;
        throw error;
    }

    return json;
}

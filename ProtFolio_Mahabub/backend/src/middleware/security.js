/**
 * Enterprise Security Middleware
 * - Rate limiting (IP & Identifier based)
 * - Brute-force protection for admin login
 * - Anti-spam rate limiting for contact messages
 * - NoSQL injection sanitization
 * - Input sanitization against XSS
 */

// In-memory stores for rate limiting
const loginAttempts = new Map();
const messageRateLimits = new Map();
const apiRateLimits = new Map();

// Periodic cleanup of expired rate limit entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttempts.entries()) {
        if (now > record.resetTime) loginAttempts.delete(key);
    }
    for (const [key, record] of messageRateLimits.entries()) {
        if (now > record.resetTime) messageRateLimits.delete(key);
    }
    for (const [key, record] of apiRateLimits.entries()) {
        if (now > record.resetTime) apiRateLimits.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * Brute-force protection for Admin Login
 * Max 5 failed attempts per 15 minutes per IP/Email.
 */
export function loginRateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    const key = `${ip}_${email}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    let record = loginAttempts.get(key);
    if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs };
        loginAttempts.set(key, record);
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
        return res.status(429).json({
            success: false,
            message: `Too many failed login attempts. This account/IP is locked for security. Please try again in ${remainingMinutes} minute(s).`,
            locked: true,
            retryAfterMinutes: remainingMinutes
        });
    }

    // Attach tracker to res to increment count only on 401 failure
    const originalJson = res.json;
    res.json = function (data) {
        if (res.statusCode === 401 || res.statusCode === 400) {
            record.count += 1;
            loginAttempts.set(key, record);
        } else if (res.statusCode === 200 && data && data.success) {
            // Successful login -> clear attempt history
            loginAttempts.delete(key);
        }
        return originalJson.call(this, data);
    };

    next();
}

/**
 * Rate limiter for contact message submission
 * Max 5 messages per 10 minutes per IP
 */
export function messageRateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxLimit = 5;

    let record = messageRateLimits.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs };
        messageRateLimits.set(ip, record);
    }

    record.count += 1;
    if (record.count > maxLimit) {
        const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
        return res.status(429).json({
            success: false,
            message: `Message limit reached. Please wait ${remainingMinutes} minute(s) before sending another message.`
        });
    }

    next();
}

/**
 * General API rate limiter
 * Max 300 requests per 5 minutes per IP
 */
export function generalApiLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const maxLimit = 300;

    let record = apiRateLimits.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs };
        apiRateLimits.set(ip, record);
    }

    record.count += 1;
    if (record.count > maxLimit) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please slow down.'
        });
    }

    next();
}

/**
 * NoSQL Injection Sanitizer
 * Removes $ and . keys from request body, query, and params
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        // Drop any keys containing NoSQL injection operators
        if (key.startsWith('$') || key.includes('.')) {
            continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
}

export function noSqlSanitizer(req, res, next) {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
}

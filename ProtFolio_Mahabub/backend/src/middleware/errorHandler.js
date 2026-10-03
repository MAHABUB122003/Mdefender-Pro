export function notFound(req, res, next) {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
    console.error(err.stack);

    let status = 500;
    let message = 'Server error';

    if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors)
            .map(e => e.message)
            .join(', ');
    } else if (err.name === 'CastError') {
        status = 400;
        message = 'Invalid id format';
    } else if (err.code === 11000) {
        status = 409;
        message = 'Duplicate value entered';
    } else if (err.message) {
        message = err.message;
    }

    res.status(status).json({ success: false, message });
}

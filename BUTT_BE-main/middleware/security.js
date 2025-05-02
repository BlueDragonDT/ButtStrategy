/* eslint-disable @typescript-eslint/no-require-imports */
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const ApiKey = require('../model/apiKey');

// Create a store for rate limiters
const rateLimiters = new Map();

// Function to get or create a rate limiter for an API key
const getRateLimiter = (keyDoc) => {
    const key = keyDoc.key;
    if (!rateLimiters.has(key)) {
        const limiter = rateLimit({
            windowMs: keyDoc.rateLimit.windowMs,
            max: keyDoc.rateLimit.max,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                return keyDoc.rateLimit.keyGenerator === 'ip' ? req.ip : key;
            },
            handler: (req, res) => {
                console.warn('[SECURITY] Rate limit exceeded', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    keyName: keyDoc.name,
                    currentRequests: req.rateLimit.current,
                    maxRequests: keyDoc.rateLimit.max,
                    windowMs: keyDoc.rateLimit.windowMs
                });
                res.status(429).json({
                    success: false,
                    message: `Rate limit exceeded. Maximum ${keyDoc.rateLimit.max} requests per ${keyDoc.rateLimit.windowMs / 60000} minutes.`
                });
            }
        });
        rateLimiters.set(key, limiter);
    }
    return rateLimiters.get(key);
};

// API key validation middleware
const validateApiKey = async (req, res, next) => {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
        console.error('[SECURITY] API Key validation: MongoDB not connected', {
            state: mongoose.connection.readyState,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return res.status(503).json({ 
            success: false, 
            message: 'Service temporarily unavailable' 
        });
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        console.error('[SECURITY] API Key validation: Missing API key', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return res.status(401).json({ 
            success: false, 
            message: 'API key is required' 
        });
    }

    try {
        const keyDoc = await ApiKey.findOne({ 
            key: apiKey,
            isActive: true 
        }).lean();

        if (!keyDoc) {
            console.error('[SECURITY] API Key validation: Invalid API key', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                providedKey: apiKey.substring(0, 8) + '...'
            });
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid API key' 
            });
        }

        // Attach the API key info to the request
        req.apiKey = keyDoc;
        next();
    } catch (error) {
        console.error('[SECURITY] API Key validation error:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during API key validation' 
        });
    }
};

// Rate limiter middleware
const applyRateLimit = async (req, res, next) => {
    try {
        const limiter = getRateLimiter(req.apiKey);
        limiter(req, res, next);
    } catch (error) {
        console.error('[SECURITY] Rate limiter error:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during rate limiting' 
        });
    }
};

// Dynamic CORS middleware
const corsMiddleware = async (req, res, next) => {
    const origin = req.headers.origin;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        console.error('[SECURITY] CORS: Missing API key', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            origin: origin
        });
        return res.status(401).json({ 
            success: false, 
            message: 'API key is required' 
        });
    }

    try {
        const keyDoc = await ApiKey.findOne({ 
            key: apiKey,
            isActive: true 
        });

        if (!keyDoc) {
            console.error('[SECURITY] CORS: Invalid API key', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                origin: origin,
                providedKey: apiKey.substring(0, 8) + '...'
            });
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid API key' 
            });
        }

        // Check if the origin is allowed
        if (origin && keyDoc.allowedOrigins.length > 0) {
            if (!keyDoc.allowedOrigins.includes(origin)) {
                console.error('[SECURITY] CORS: Origin not allowed', {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    origin: origin,
                    allowedOrigins: keyDoc.allowedOrigins,
                    keyName: keyDoc.name
                });
                return res.status(403).json({ 
                    success: false, 
                    message: 'Origin not allowed' 
                });
            }
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Attach the API key info to the request for later use
        req.apiKey = keyDoc;
        next();
    } catch (error) {
        console.error('[SECURITY] CORS validation error:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            path: req.path,
            method: req.method,
            origin: origin
        });
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during validation' 
        });
    }
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    try {
        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        
        next();
    } catch (error) {
        console.error('[SECURITY] Error setting security headers:', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        next(error);
    }
};

module.exports = {
    validateApiKey,
    applyRateLimit,
    corsMiddleware,
    securityHeaders,
    ApiKey
}; 

const mongoose = require('mongoose');

// Create a schema for API keys
const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    allowedOrigins: [{ type: String }], // Array of allowed origins
    rateLimit: {
        windowMs: { type: Number, default: 15 * 60 * 1000 }, // Default 15 minutes
        max: { type: Number, default: 100 }, // Default 100 requests per window
        keyGenerator: { type: String, enum: ['ip', 'apiKey'], default: 'ip' } // How to identify the client
    },
    createdAt: { type: Date, default: Date.now },
});

// Create the model
const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey; 
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");
const mongoose = require("mongoose");
const SolanaMonitor = require("./solana-monitor");
const transactions = require("./routes/transaction");
const { 
    validateApiKey,
    applyRateLimit,
    corsMiddleware, 
    securityHeaders
} = require("./middleware/security");

require("dotenv").config();

const app = express();

// Basic express setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB first
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: "BUTTdatabase",
  })
  .then(() => {
    console.log("MongoDB Connected");
    
    // Apply security middleware after MongoDB connection is established
    app.use(securityHeaders);
    app.use(corsMiddleware);
    app.use(validateApiKey); // First validate API key
    app.use(applyRateLimit); // Then apply rate limiting

    // Apply routes
    app.use("/", transactions);

    // Start Solana monitor
    const monitor = new SolanaMonitor(process.env.SOLANA_RPC_URL);
    const trackingWallets = JSON.parse(process.env.TRACKING_WALLETS || "[]");
    monitor.monitorWallets(trackingWallets);

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const database = mongoose.connection;
database.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

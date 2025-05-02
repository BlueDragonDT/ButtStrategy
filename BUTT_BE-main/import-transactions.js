const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Transactions = require('./model/Transaction');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  dbName: "BUTTdatabase"
}).then(() => {
  console.log("Connected to MongoDB");
  importTransactions();
}).catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

async function importTransactions() {
  try {
    // Read Excel file
    const workbook = xlsx.readFile('Backend - Purchases.xlsx');
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} transactions in Excel file`);
    
    // Show Excel column names
    if (data.length > 0) {
      console.log('\nExcel columns found:', Object.keys(data[0]));
    }
    
    // Process each transaction
    for (const row of data) {
      try {
        console.log('\nProcessing row:');
        console.log('Reported:', row['Reported']);
        console.log('Buttcoin Holdings:', row['Buttcoin Holdings']);
        console.log('Avg Buttcoin Cost:', row['Avg Buttcoin Cost']);
        console.log('Buttcoin Acquisitions:', row['Buttcoin Acquisitions']);
        console.log('TX Hash:', row['TX Hash']);
        console.log('Type:', row['Type']);
        
        // Map Excel columns to transaction fields
        const transaction = {
          timestamp: row['Reported'], // Required
          balance: row['Buttcoin Holdings'], // Required
          price: row['Avg Buttcoin Cost'], // Required
          amount: row['Buttcoin Acquisitions'], // Required
          txhash: row['TX Hash'] || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Required but auto-generated if missing
          type: row['Type'] || 'manual' // Not required
        };

        // Show what we're trying to save
        console.log('\nTrying to save:', transaction);

        // Check if transaction already exists
        const existingTx = await Transactions.findOne({ txhash: transaction.txhash });
        
        if (existingTx) {
          console.log(`Transaction ${transaction.txhash} already exists, skipping...`);
          continue;
        }

        // Create new transaction
        const newTransaction = new Transactions(transaction);
        await newTransaction.save();
        console.log(`Imported transaction: ${transaction.txhash}`);
        
      } catch (err) {
        console.error(`Error processing row:`, err);
        // Show more error details
        if (err.errors) {
          Object.keys(err.errors).forEach(field => {
            console.error(`Field '${field}' error:`, err.errors[field].message);
          });
        }
      }
    }
    
    console.log('\nImport completed');
    process.exit(0);
    
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  }
} 
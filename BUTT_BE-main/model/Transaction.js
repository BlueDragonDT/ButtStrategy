const mongoose = require("mongoose");

const TransactionsSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  txhash: {
    type: String,
    required: true,
    unique: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
});

module.exports = Transactions = mongoose.model(
  "Transactions",
  TransactionsSchema
);

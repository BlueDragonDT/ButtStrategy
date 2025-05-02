const express = require("express");
const router = express.Router();
const Transactions = require("../model/Transaction");

router.get("/getalltransactions", async (req, res) => {
  try {
    const transactions = await Transactions.find();
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/get_transaction/:id", async (req, res) => {
  try {
    const transaction = await Transactions.findById({ _id: req.params.id });
    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/add_transaction", async (req, res) => {
  console.log("=========Transactions==========", req.body);

  try {
    const newTransaction = new Transactions({...req.body});
    await newTransaction.save();
    return res
      .status(200)
      .json({ message: "Transaction added successfully", newTransaction });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error during addition" });
  }
});

router.put("/update_transaction/:id", async (req, res) => {
  try {
    console.log("=========Transactions==========", req.body);

    const updatedTransaction = await Transactions.findByIdAndUpdate(
      req.params.id,
      {
        $set: { ...req.body },
      },
      { new: true, runValidators: true } // Return updated doc & validate
    );

    if (!updatedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res
      .status(200)
      .json({ message: "Transaction updated successfully", updatedTransaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete_transaction/:id", async (req, res) => {
  try {
    const deletedTransaction = await Transactions.findByIdAndDelete(req.params.id);

    if (!deletedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res
      .status(200)
      .json({ message: "Transaction deleted successfully", deletedTransaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

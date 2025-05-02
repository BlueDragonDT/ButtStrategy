const { Connection, PublicKey } = require("@solana/web3.js");
const Transactions = require("./model/Transaction");

require("dotenv").config();

/**
 * DEX Program IDs Configuration
 * Mapping of different DEX programs on Solana to track specific interactions
 * Includes Jupiter, Raydium, and Pump.fun platforms
 */
const PROGRAMS = {
  JUPITER: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  RAYDIUM: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  PUMP_FUN: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  PUMP_FUN_TOKEN_MINT_AUTH: "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM",
};

/**
 * Formats JSON data into a readable string format for Telegram messages
 * Recursively processes nested objects and creates a formatted string
 *
 * @param {Object} jsonData - The JSON data to format
 * @returns {string} Formatted string representation of the JSON data
 */
const formatJsonToString = (jsonData) => {
  const result = [];

  function processObject(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (typeof value === "object") {
        result.push(`${prefix}${key}:`);
        processObject(value, "  ");
      } else {
        result.push(`${prefix}${key}: ${value}`);
      }
    }
  }

  processObject(jsonData);
  console.log(result);
  //return result.join('\n');
};

/**
 * TokenUtils Class
 * Utility class for token-related operations on Solana
 * Handles token mint address retrieval and balance calculations
 */
class TokenUtils {
  /**
   * @param {Connection} connection - Solana RPC connection instance
   */
  constructor(connection) {
    this.connection = connection;
  }

  /**
   * Retrieves the mint address for a given token account
   *
   * @param {string} accountAddress - Token account address
   * @returns {Promise<string|null>} Token mint address or null if not found
   */
  async getTokenMintAddress(accountAddress) {
    try {
      const accountInfo = await this.connection.getParsedAccountInfo(
        new PublicKey(accountAddress)
      );
      return accountInfo.value?.data?.parsed?.info?.mint || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Calculates SOL balance changes for a transaction
   * Determines if the transaction was a buy or sell based on balance change
   *
   * @param {Object[]} transactionDetails - Transaction information from Solana
   * @returns {Object|null} Transaction type and balance change amount
   */
  calculateNativeBalanceChanges(transactionDetails) {
    try {
      const preBalance = transactionDetails[0].meta.preBalances[0];
      const postBalance = transactionDetails[0].meta.postBalances[0];
      const balanceChange = (postBalance - preBalance) / 1e9;

      return {
        type: balanceChange < 0 ? "buy" : "sell",
        balanceChange: Math.abs(balanceChange),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

/**
 * TransactionParser Class
 * Handles parsing of Solana transactions to extract relevant swap information
 * Analyzes token transfers and balance changes
 */
class TransactionParser {
  /**
   * @param {Connection} connection - Solana RPC connection instance
   */
  constructor(connection) {
    this.connection = connection;
    this.tokenUtils = new TokenUtils(connection);
  }

  /**
   * Parses transaction details to extract swap information
   *
   * @param {Object[]} txDetails - Transaction details from Solana
   * @param {Object} dexInfo - Information about the DEX used
   * @returns {Promise<Object|null>} Parsed transaction information or null if invalid
   */
  async parseTransaction(txDetails, dexInfo) {
    try {
      if (!txDetails || !txDetails[0]) return null;

      const nativeBalance =
        this.tokenUtils.calculateNativeBalanceChanges(txDetails);
      if (!nativeBalance) return null;

      const accountKeys = txDetails[0].transaction.message.accountKeys;
      const signerAccount = accountKeys.find((account) => account.signer);
      const owner = signerAccount?.pubkey.toString();

      // Extract token transfers from instructions
      const transfers = [];
      txDetails[0].meta?.innerInstructions?.forEach((instruction) => {
        instruction.instructions.forEach((ix) => {
          if (ix.parsed?.type === "transfer" && ix.parsed.info.amount) {
            transfers.push({
              amount: ix.parsed.info.amount,
              source: ix.parsed.info.source,
              destination: ix.parsed.info.destination,
            });
          }
        });
      });

      if (transfers.length === 0) return null;

      // Analyze first and last transfers to determine swap details
      const firstTransfer = transfers[0];
      const lastTransfer = transfers[transfers.length - 1];

      const [tokenInMint, tokenOutMint] = await Promise.all([
        this.tokenUtils.getTokenMintAddress(lastTransfer.source),
        this.tokenUtils.getTokenMintAddress(firstTransfer.destination),
      ]);

      return {
        type: nativeBalance.type,
        monitored_wallet: owner,
        dex: dexInfo.dex,
        operation: dexInfo.type,
        tokenIn: {
          mint: tokenInMint,
          amount: (lastTransfer.amount / 1e9).toFixed(6),
        },
        tokenOut: {
          mint: tokenOutMint,
          amount: (firstTransfer.amount / 1e9).toFixed(6),
        },
        signature: txDetails[0].transaction.signatures[0],
        timestamp: txDetails[0].blockTime
          ? new Date(txDetails[0].blockTime * 1000).toISOString()
          : "",
      };
    } catch (error) {
      console.error("Error parsing transaction:", error);
      return null;
    }
  }
}

/**
 * SolanaMonitor Class
 * Main class for monitoring Solana wallet activities
 * Tracks transactions and DEX interactions for specified wallets
 */
class SolanaMonitor {
  /**
   * @param {string} rpcUrl - Solana RPC endpoint URL
   */
  constructor(rpcUrl) {
    this.connection = new Connection(rpcUrl);
    this.parser = new TransactionParser(this.connection);
  }

  /**
   * Starts monitoring specified wallets for transactions
   * Sets up log listeners for each wallet
   *
   * @param {string[]} wallets - Array of wallet addresses to monitor
   */

  async fetchButtcoinBalance(walletAddress) {
    try {
      // Using Helius to get token accounts by owner
      const response = await fetch(process.env.HELIUS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getTokenAccountsByOwner",
          params: [
            walletAddress,
            {
              mint: process.env.BUTTCOIN_CONTRACT_ADDRESS,
            },
            {
              encoding: "jsonParsed",
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error("Helius API error:", data.error.message);
      }

      if (data.result && data.result.value && data.result.value.length > 0) {
        // Get the token account info
        const tokenAccount = data.result.value[0];
        const balance =
          tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        const decimals =
          tokenAccount.account.data.parsed.info.tokenAmount.decimals;
        const rawBalance =
          tokenAccount.account.data.parsed.info.tokenAmount.amount;
        return balance;
      } else {
        console.log("No token account found for this token mint and wallet");
        return 0;
      }
    } catch (error) {
      console.error("Error fetching token balance from Helius:", error);
      return 0;
    }
  }

  async fetchButtcoinPrice() {
    try {
      const response = await fetch(process.env.JUPITER_FETCH_PRICE_API_URL);

      if (!response.ok) {
        throw new Error(`Jupiter Api Error: ${response.statusText}`);
      }

      const jupiterData = await response.json();
      const price =
        jupiterData.data[process.env.BUTTCOIN_CONTRACT_ADDRESS]?.price;
      if (!price) {
        throw new Error("Price not found in response");
      }

      return price;
    } catch (error) {
      console.error("Failed to fetch Buttcoin data:", error);
    }
  }

  async monitorWallets(wallets) {
    wallets.forEach((wallet) => {
      this.connection.onLogs(
        new PublicKey(wallet),
        async (logs) => {
          try {
            const dexInfo = this.identifyDex(logs.logs);
            if (!dexInfo.dex) return;

            const txDetails = await this.connection.getParsedTransactions(
              [logs.signature],
              { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
            );

            const parsedTx = await this.parser.parseTransaction(
              txDetails,
              dexInfo
            );
            console.log(parsedTx);
            if (
              parsedTx &&
              (parsedTx.tokenIn.mint == process.env.BUTTCOIN_CONTRACT_ADDRESS ||
                parsedTx.tokenOut.mint == process.env.BUTTCOIN_CONTRACT_ADDRESS)
            ) {
              const price = await this.fetchButtcoinPrice();
              const balance = await this.fetchButtcoinBalance(wallet);
              const amount =
                (parsedTx.tokenIn.mint ==
                  process.env.BUTTCOIN_CONTRACT_ADDRESS &&
                  parsedTx.tokenIn.amount * 1e3) ||
                (parsedTx.tokenOut.mint ==
                  process.env.BUTTCOIN_CONTRACT_ADDRESS &&
                  parsedTx.tokenOut.amount * 1e3);
              const newTransaction = new Transactions({
                price,
                balance,
                amount,
                type: parsedTx.type,
                txhash: parsedTx.signature,
                timestamp: parsedTx.timestamp,
              });
              await newTransaction.save();
              // formatJsonToString(parsedTx);
              console.log({
                ...parsedTx,
                price,
              });
            }
          } catch (error) {
            console.error("Error processing transaction:", error);
          }
        },
        "confirmed"
      );
      console.log(`Monitoring wallet: ${wallet}`);
    });
  }

  /**
   * Identifies the DEX used in a transaction based on program IDs
   *
   * @param {string[]} logs - Transaction logs
   * @returns {Object} DEX information including name and operation type
   */
  identifyDex(logs) {
    if (!logs?.length) return { dex: null, type: null };

    const logString = logs.join(" ");

    if (logString.includes(PROGRAMS.PUMP_FUN_TOKEN_MINT_AUTH)) {
      return { dex: "Pump.fun", type: "mint" };
    }
    if (logString.includes(PROGRAMS.PUMP_FUN)) {
      return { dex: "Pump.fun", type: "swap" };
    }
    if (logString.includes(PROGRAMS.JUPITER)) {
      return { dex: "Jupiter", type: "swap" };
    }
    if (logString.includes(PROGRAMS.RAYDIUM)) {
      return { dex: "Raydium", type: "swap" };
    }

    return { dex: null, type: null };
  }
}

module.exports = SolanaMonitor;

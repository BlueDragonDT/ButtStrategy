// Constants from environment variables
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS || "";
const TOKEN_MINT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS || "";
const TOTAL_SUPPLY = 1000000000; // 1 billion
const TOTAL_USD_SPENT = 131142;
const QTD_BASE_PRICE = 0.0014; // Q1 2025 start price

// Validate required environment variables
if (!HELIUS_API_KEY || !WALLET_ADDRESS || !TOKEN_MINT_ADDRESS) {
  throw new Error('Missing required environment variables for buttcoin service');
}

// Interfaces for type safety
export interface TokenBalance {
  balance: number;
  decimals: number;
  rawBalance: string;
}

export interface TokenPrice {
  price: string;
}

export interface ButtcoinData {
  price: string;
  balance: number;
  supplyPercentage: number;
  investmentValue: number;
  netProfit: number;
  avgCostPerCoin: number;
  roi: number;
  yieldQtd: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the token balance from Helius API
 */
export const getTokenBalance = async (): Promise<TokenBalance> => {
  const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  try {
    const response = await fetch(HELIUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getTokenAccountsByOwner",
        params: [
          WALLET_ADDRESS,
          {
            mint: TOKEN_MINT_ADDRESS,
          },
          {
            encoding: "jsonParsed",
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Helius API error: ${data.error.message}`);
    }

    if (data.result && data.result.value && data.result.value.length > 0) {
      const tokenAccount = data.result.value[0];
      const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;
      const rawBalance = tokenAccount.account.data.parsed.info.tokenAmount.amount;

      return { balance, decimals, rawBalance };
    } else {
      throw new Error("No token account found for this token mint and wallet");
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw error;
  }
};

/**
 * Fetches the buttcoin price from Jupiter API
 */
export const getButtcoinPrice = async (): Promise<TokenPrice> => {
  const jupiterApiUrl = `https://api.jup.ag/price/v2?ids=${TOKEN_MINT_ADDRESS}`;

  try {
    const response = await fetch(jupiterApiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jupiterData = await response.json();
    const price = jupiterData.data[TOKEN_MINT_ADDRESS]?.price;
    
    if (!price) {
      throw new Error('Price not found in response');
    }

    return { price };
  } catch (error) {
    console.error("Failed to fetch Buttcoin price:", error);
    throw error;
  }
};

/**
 * Fetches and calculates all buttcoin data in one call
 */
export const getButtcoinData = async (): Promise<ButtcoinData> => {
  try {
    // Fetch both price and balance in parallel
    const [priceData, balanceData] = await Promise.all([
      getButtcoinPrice(),
      getTokenBalance()
    ]);

    const price = priceData.price;
    const balance = balanceData.balance;
    
    // Calculate derived values
    const supplyPercentage = (balance / TOTAL_SUPPLY) * 100;
    const investmentValue = balance * Number(price);
    const netProfit = investmentValue - TOTAL_USD_SPENT;
    const avgCostPerCoin = TOTAL_USD_SPENT / balance;
    const roi = (netProfit / TOTAL_USD_SPENT) * 100;
    const yieldQtd = ((Number(price) - QTD_BASE_PRICE) / QTD_BASE_PRICE) * 100;

    return {
      price,
      balance,
      supplyPercentage,
      investmentValue,
      netProfit,
      avgCostPerCoin,
      roi,
      yieldQtd,
      isLoading: false,
      error: null
    };
  } catch (error) {
    console.error("Error getting buttcoin data:", error);
    return {
      price: "0.0000",
      balance: 0,
      supplyPercentage: 0,
      investmentValue: 0,
      netProfit: 0,
      avgCostPerCoin: 0,
      roi: 0,
      yieldQtd: 0,
      isLoading: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}; 
"use client";

import React, { useState } from "react";
import StatItem from "./btc_button";
import { MdCurrencyBitcoin } from "react-icons/md";
import type { ButtcoinData } from "../../services/buttcoinService";
import useSWR from 'swr';

const Btc: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [buttcoinData, setButtcoinData] = useState<ButtcoinData>({
    price: "0.0000",
    balance: 0,
    supplyPercentage: 0,
    investmentValue: 0,
    netProfit: 0,
    avgCostPerCoin: 0,
    roi: 0,
    yieldQtd: 0,
    isLoading: true,
    error: null
  });

  // Using SWR for data fetching with caching and revalidation
  const { mutate: refreshData } = useSWR<ButtcoinData>(
    'buttcoin-data',
    async () => {
      const response = await fetch('/api/buttcoin');
      if (!response.ok) {
        throw new Error('Failed to fetch buttcoin data');
      }
      return response.json();
    },
    {
      refreshInterval: 60 * 60 * 1000, // Refresh every hour
      revalidateOnFocus: false,
      onSuccess: (data) => {
        setButtcoinData(data);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err.message || 'Failed to load Buttcoin data');
        setIsLoading(false);
      }
    }
  );

  // Handle manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    refreshData();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fa660f] mr-3"></div>
        <span>Loading Buttcoin data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-black text-white">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-[#fa660f] rounded-md hover:bg-[#d55a0f] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    price,
    balance,
    supplyPercentage,
    investmentValue,
    netProfit,
    avgCostPerCoin,
    roi,
    yieldQtd
  } = buttcoinData;

  const TotalUsdSpent = 255687; // For display purposes only, calculations use the service value

  const stats = [
    { name: "Buttcoin Price", value: `$${Number(price).toFixed(4)}` },
    {
      name: "Buttcoin Count",
      value: (
        <>
          <MdCurrencyBitcoin className="text-4xl text-[#fa660f] rotate-90" />{" "}
          {Math.floor(balance).toLocaleString()}
        </>
      ),
    },
    {
      name: "Buttcoin Supply %",
      value: `${supplyPercentage.toFixed(4)}%`,
    },
    { name: "Current Investment Value", value: `$${Math.floor(investmentValue).toLocaleString()}`},
    { name: "Total USD Spent", value: `$${TotalUsdSpent.toLocaleString()}`},
    { name: "Net Profit", value: `$${Math.floor(netProfit).toLocaleString()}` },
    { name: "Avg. Cost Per Coin", value: `$${avgCostPerCoin.toFixed(4)}` },
    { name: "ROI", value: `${roi.toFixed(2)}%` },
    { name: "Buttcoin Yield QTD", value: `${yieldQtd.toFixed(2)}%` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6 bg-black relative">
      
      {stats.map((stat, index) => (
        <StatItem key={index} name={stat.name} value={stat.value} />
      ))}
    </div>
  );
};

export default Btc;

"use client";

import React, { useState } from "react";
import { MdCurrencyBitcoin } from "react-icons/md";
import { getProcessedTransactions, PurchaseData, TransactionSummary } from "../../services/transactionService";
import useSWR from 'swr';

const Purchase: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PurchaseData[]>([]);
  const [summary, setSummary] = useState<{
    totalButtcoinAcquisitions: number;
    averageAcquisitionCost: number;
    totalAcquisitionCost: number;
    latestHoldings: number;
  }>({
    totalButtcoinAcquisitions: 0,
    averageAcquisitionCost: 0,
    totalAcquisitionCost: 0,
    latestHoldings: 0,
  });

  // Using SWR for data fetching with caching and revalidation
  const { mutate: refreshData } = useSWR<TransactionSummary>(
    'transactions-summary',
    getProcessedTransactions,
    {
      refreshInterval: 60 * 60 * 1000, // Refresh every hour
      revalidateOnFocus: false,
      onSuccess: (data) => {
        setData(data.transactions);
        setSummary({
          totalButtcoinAcquisitions: data.totalButtcoinAcquisitions,
          averageAcquisitionCost: data.averageAcquisitionCost,
          totalAcquisitionCost: data.totalAcquisitionCost,
          latestHoldings: data.latestHoldings,
        });
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err.message || 'Failed to load transaction data');
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
        <span>Loading transaction data...</span>
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

  const { totalButtcoinAcquisitions, averageAcquisitionCost, totalAcquisitionCost, latestHoldings } = summary;

  return (
    <div className="overflow-x-auto p-4 relative">
      <div className="overflow-y-auto">
        <table className="w-full border-collapse text-white text-sm">
          <thead>
            <tr className="border-b border-gray-600 text-center text-gray-400 sticky top-0 z-10 bg-black">
              {[
                "Reported",
                "Buttcoin Acquisitions",
                "Avg Buttcoin Cost",
                "Acquisition Cost",
                "Buttcoin Holdings",
                "Buttcoin Supply",
                "Type",
                "TX Hash",
              ].map((header, index) => (
                <th key={index} className="p-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Total summary row */}
            <tr className="border-b border-gray-700 text-yellow-400 text-center font-bold">
              <td className="p-1"></td>
              <td className="p-1 flex justify-around items-center gap-1">
                <MdCurrencyBitcoin className="text-2xl text-[#fa660f] rotate-90" />
                {totalButtcoinAcquisitions}
              </td>
              <td className="p-1">${averageAcquisitionCost.toFixed(4)}</td>
              <td className="p-1">${totalAcquisitionCost.toFixed(0)}</td>
              <td className="p-1 px-4 flex justify-around items-center">
                <MdCurrencyBitcoin className="text-2xl text-[#fa660f] rotate-90" />
                {latestHoldings}
              </td>
              <td colSpan={3}></td>
            </tr>

            {/* Transaction rows */}
            {data.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 text-center hover:bg-[#2A3435] transition-colors duration-200"
              >
                <td className="p-1 text-white">{item.reported}</td>
                <td className="p-1 px-4 flex justify-around items-center">
                  <MdCurrencyBitcoin className="text-2xl text-[#fa660f] rotate-90" />
                  {item.buttcoinAcquisitions}
                </td>
                <td className="p-1">${item.avgbuttcoinCost.toFixed(4)}</td>
                <td className="p-1">${item.acquisitionCost.toFixed(0)}</td>
                <td className="p-1 px-4 flex justify-around items-center">
                  <MdCurrencyBitcoin className="text-2xl text-[#fa660f] rotate-90" />
                  {item.buttcoinHoldings}
                </td>
                <td className="p-1">{item.buttcoinSupply.toFixed(4)}%</td>
                <td className="p-1">{item.type}</td>
                <td className="p-1 truncate max-w-[200px]">{item.txHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Purchase;

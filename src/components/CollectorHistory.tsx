import React, { useState } from 'react';
import { PackageX, ArrowLeft, Filter, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { TransactionRecord } from '../types.js';

interface CollectorHistoryProps {
  transactions: TransactionRecord[];
  onBack: () => void;
  onSelectTransaction: (tx: TransactionRecord) => void;
  onStartNewPickup: () => void;
}

export const CollectorHistory: React.FC<CollectorHistoryProps> = ({
  transactions,
  onBack,
  onSelectTransaction,
  onStartNewPickup,
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const filtered = transactions.filter((tx) => {
    if (filter === 'completed') return tx.status === 'completed';
    if (filter === 'pending') return tx.status !== 'completed';
    return true;
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-gray-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <h1 className="text-base font-bold text-[#111827]">Pickup History</h1>
        <span className="text-xs font-mono text-[#4B5563]">{filtered.length} records</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-[#F9FAFB] p-1 rounded-xl border border-[#E5E7EB]">
        {(['all', 'completed', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
              filter === tab
                ? 'bg-white text-[#166534] shadow-xs border border-[#E5E7EB]'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        /* Honest empty state */
        <div className="py-12 px-4 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-white space-y-3">
          <PackageX className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-bold text-base text-[#111827]">No transaction records found</h3>
          <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
            {filter === 'all'
              ? 'You have not recorded any e-waste pickups yet. As transactions are created and verified, they are stored securely here.'
              : `No ${filter} pickups recorded in your account.`}
          </p>
          <button
            onClick={onStartNewPickup}
            className="mt-2 py-2.5 px-5 rounded-xl text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] cursor-pointer"
          >
            + ADD FIRST E-WASTE PICKUP
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const isDone = tx.status === 'completed';
            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="p-4 bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#16A34A] shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827]">{tx.category}</span>
                    <span className="text-xs font-mono text-[#4B5563]">({tx.weightKg} kg)</span>
                    {tx.is_test && (
                      <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        TEST
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#4B5563] font-mono flex items-center gap-2">
                    <span>{tx.id}</span>
                    <span>•</span>
                    <span>{new Date(tx.timestamps.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-bold text-sm text-[#166534] block">
                      {tx.finalPrice !== null ? `₹${tx.finalPrice}` : tx.indicativePrice ? `~₹${tx.indicativePrice}` : 'N/A'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        isDone
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[#DBEAFE] text-[#1E3A8A]'
                      }`}
                    >
                      {isDone ? '✓ Completed' : 'Pending OTP'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

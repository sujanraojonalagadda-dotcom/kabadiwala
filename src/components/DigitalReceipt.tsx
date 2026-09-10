import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  User,
  Scale,
  Calendar,
  ArrowLeft,
  Share2,
  Printer,
  Hash,
} from 'lucide-react';
import { TransactionRecord } from '../types.js';

interface DigitalReceiptProps {
  transaction: TransactionRecord;
  onBack: () => void;
  onSimulateRecyclerHandover?: (txId: string, otp: string) => void;
}

export const DigitalReceipt: React.FC<DigitalReceiptProps> = ({
  transaction,
  onBack,
  onSimulateRecyclerHandover,
}) => {
  const isCompleted = transaction.status === 'completed';

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-gray-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pickups</span>
        </button>
        <span className="text-xs font-mono text-[#4B5563]">Receipt #{transaction.id}</span>
      </div>

      {/* Main Digital Receipt Container */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Receipt Top Header */}
        <div
          className={`p-6 text-center ${
            isCompleted
              ? 'bg-[#DCFCE7] border-b border-[#16A34A]/20'
              : 'bg-[#DBEAFE] border-b border-[#2563EB]/20'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${
              isCompleted ? 'bg-[#16A34A] text-white' : 'bg-[#2563EB] text-white'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            {isCompleted ? '✓ HANDOVER COMPLETE' : 'HANDOVER IN PROGRESS'}
          </h1>
          <p className="text-xs font-medium text-[#4B5563] mt-1">
            {isCompleted
              ? 'Material officially transferred and verified by authorized recycler'
              : 'Awaiting physical check-in and weighing at recycler facility'}
          </p>

          {transaction.is_test && (
            <div className="mt-3 inline-block bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[11px] font-black px-3 py-1 rounded-full">
              TEST DATA — NOT A REAL TRANSACTION
            </div>
          )}
        </div>

        {/* Core Financial & Physical Summary */}
        <div className="p-6 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                {isCompleted ? 'Final Confirmed Price' : 'Indicative Valuation'}
              </span>
              <span className="text-3xl font-black text-[#166534] mt-0.5 block">
                {transaction.finalPrice !== null
                  ? `₹${transaction.finalPrice}`
                  : transaction.indicativePrice !== null
                  ? `~₹${transaction.indicativePrice}`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-gray-400">
                {transaction.isTestRate ? 'Labelled Test Calculation' : 'Standard Rate Factor'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                {isCompleted ? 'Confirmed Weight' : 'Estimated Weight'}
              </span>
              <span className="text-3xl font-black text-[#111827] mt-0.5 block font-mono">
                {transaction.finalWeightKg || transaction.weightKg} kg
              </span>
              <span className="text-[10px] text-gray-400">
                Category: {transaction.category} ({transaction.condition})
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Handover Audit Details */}
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[#4B5563] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Transaction ID:
            </span>
            <span className="font-mono font-bold text-[#111827]">{transaction.id}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[#4B5563] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Collector Name:
            </span>
            <span className="font-semibold text-[#111827]">
              {transaction.collectorName} ({transaction.collectorPhone})
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[#4B5563] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Destination Recycler:
            </span>
            <span className="font-semibold text-[#111827]">
              {transaction.recyclerName || 'Direct Facility Handover'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-[#4B5563] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Initiated Timestamp:
            </span>
            <span className="font-mono text-[#111827]">
              {new Date(transaction.timestamps.createdAt).toLocaleString()}
            </span>
          </div>

          {transaction.timestamps.completedAt && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-[#4B5563] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Completion Timestamp:
              </span>
              <span className="font-mono text-[#111827]">
                {new Date(transaction.timestamps.completedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* Tamper-Evident Record Integrity Badge */}
          <div className="pt-2">
            <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                <span className="text-[11px] font-semibold text-[#111827]">
                  Tamper-Evident Audit Hash:
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {transaction.tamperHash || 'COMPLETION PENDING'}
              </span>
            </div>
            <p className="text-[10px] text-[#4B5563] mt-1 italic text-center">
              Described as tamper-evident. Built with verifiable record integrity checks.
            </p>
          </div>
        </div>

        {/* Recycler Handover Simulation for Demo / Test Mode */}
        {!isCompleted && onSimulateRecyclerHandover && (
          <div className="p-5 bg-[#DBEAFE]/40 border-t border-[#2563EB]/20 text-center space-y-2">
            <span className="text-xs font-bold text-[#1E3A8A] block">
              Recycler Check-in Action
            </span>
            <p className="text-[11px] text-[#4B5563]">
              Handover OTP: <strong className="font-mono text-[#1E3A8A]">{transaction.handoverOtp}</strong>
            </p>
            <button
              onClick={() => onSimulateRecyclerHandover(transaction.id, transaction.handoverOtp)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] cursor-pointer shadow-xs"
            >
              Simulate Recycler Verification (Stage Demo)
            </button>
          </div>
        )}
      </div>

      {/* Print / Download Receipt Buttons */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 bg-white border border-[#2563EB] text-[#1E3A8A] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export Receipt</span>
        </button>
      </div>
    </div>
  );
};

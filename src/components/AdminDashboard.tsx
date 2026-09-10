import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Building,
  Scale,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { AdminStats, RecyclerRecord, TransactionRecord } from '../types.js';

interface AdminDashboardProps {
  isTestDataMode: boolean;
  onRefreshGlobalData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isTestDataMode,
  onRefreshGlobalData,
}) => {
  const [stats, setStats] = useState<AdminStats>({
    totalTransactions: 0,
    totalEwasteKg: 0,
    activeCollectors: 0,
    verifiedRecyclers: 0,
    formalChannelizationRateText: 'N/A',
    completedTransactionsCount: 0,
  });
  const [recyclers, setRecyclers] = useState<RecyclerRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Recycler verification modal state
  const [verifyingRecycler, setVerifyingRecycler] = useState<RecyclerRecord | null>(null);
  const [cpcbInput, setCpcbInput] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, recyclersRes, txRes] = await Promise.all([
        fetch(`/api/admin/stats?includeTest=${isTestDataMode ? 'true' : 'false'}`),
        fetch(`/api/recyclers?includeTest=${isTestDataMode ? 'true' : 'false'}`),
        fetch(`/api/transactions?includeTest=${isTestDataMode ? 'true' : 'false'}`),
      ]);

      const statsData = await statsRes.json();
      const recyclersData = await recyclersRes.json();
      const txData = await txRes.json();

      if (statsData.stats) setStats(statsData.stats);
      if (recyclersData.recyclers) setRecyclers(recyclersData.recyclers);
      if (txData.transactions) setTransactions(txData.transactions);
    } catch {
      // Keep empty defaults per honesty rules
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isTestDataMode]);

  const handleVerifyRecyclerSubmit = async (status: 'verified' | 'rejected') => {
    if (!verifyingRecycler) return;

    setIsSubmittingVerification(true);
    try {
      await fetch('/api/admin/verify-recycler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recyclerId: verifyingRecycler.id,
          cpcbRegistrationNo: cpcbInput.trim() || 'CPCB/EW/GEN/VERIFIED',
          status,
        }),
      });

      setVerifyingRecycler(null);
      loadAdminData();
      onRefreshGlobalData();
    } catch {
      alert('Verification action failed.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-3">
        <div>
          <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block">
            Regulatory & Platform Governance
          </span>
          <h1 className="text-2xl font-black text-[#111827]">Admin Verification Portal</h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Audit trail monitoring and Central Pollution Control Board (CPCB) facility compliance.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="self-start sm:self-auto py-2 px-3 bg-white border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#111827] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Analytics Computed ONLY from Stored Records (Honesty Rules: 0s & N/A when empty) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
            Total Transactions
          </span>
          <div className="text-3xl font-black text-[#111827] mt-1 font-mono">
            {stats.totalTransactions}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {stats.completedTransactionsCount} completed, {stats.totalTransactions - stats.completedTransactionsCount} pending
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
            Total E-Waste Handled
          </span>
          <div className="text-3xl font-black text-[#166534] mt-1 font-mono">
            {stats.totalEwasteKg} kg
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Real physical weight recorded
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
            Formal Channelization Rate
          </span>
          <div className="text-3xl font-black text-[#2563EB] mt-1 font-mono">
            {stats.formalChannelizationRateText}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {stats.formalChannelizationRateText === 'N/A' ? 'No transactions to calculate' : 'Completed / Initiated ratio'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
            Verified Stakeholders
          </span>
          <div className="text-3xl font-black text-[#1E3A8A] mt-1 font-mono">
            {stats.verifiedRecyclers} / {stats.activeCollectors}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {stats.verifiedRecyclers} Recyclers • {stats.activeCollectors} Collectors
          </span>
        </div>
      </div>

      {/* Recycler Facility Verification Table */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              Recycler Authorization & CPCB Compliance
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Review recycler applications and confirm official CPCB registration status.
            </p>
          </div>
          <span className="text-xs font-mono text-[#4B5563]">
            {recyclers.length} facilities registered
          </span>
        </div>

        {recyclers.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
            <Building className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-[#111827]">No recycler facilities registered yet</p>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              Enable &quot;TEST DATA MODE&quot; in the header to view sample test recyclers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#4B5563] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-3">Recycler Facility</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">CPCB Reg No</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recyclers.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#111827]">{rec.name}</div>
                      <div className="text-[11px] font-mono text-gray-400">{rec.contactPhone}</div>
                      {rec.is_test && (
                        <span className="inline-block bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-black px-1.5 py-0.2 rounded mt-0.5">
                          TEST DATA
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#4B5563]">{rec.location}</td>
                    <td className="py-3.5 px-3 font-mono text-[#111827]">
                      {rec.cpcbRegistrationNo || 'Pending Submission'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          rec.verificationStatus === 'verified'
                            ? 'bg-[#DCFCE7] text-[#166534] border border-[#16A34A]'
                            : 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]'
                        }`}
                      >
                        {rec.verificationStatus === 'verified' ? '✓ Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {rec.verificationStatus !== 'verified' ? (
                        <button
                          onClick={() => {
                            setVerifyingRecycler(rec);
                            setCpcbInput(rec.cpcbRegistrationNo || '');
                          }}
                          className="py-1.5 px-3 bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                        >
                          Verify Facility
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#166534] font-medium">
                          Verified on {new Date(rec.verificationDate || '').toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Audit Stream */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Transaction Audit Monitor</h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Tamper-evident record logs for formal e-waste channelization compliance.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-[#111827]">No transactions recorded yet</p>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              Every pickup and handover creates an immutable tamper-evident audit record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#4B5563] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-3">TX ID</th>
                  <th className="py-3 px-3">Collector</th>
                  <th className="py-3 px-3">Category & Weight</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Tamper Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-[#111827]">{tx.id}</td>
                    <td className="py-3 px-3 text-[#4B5563]">
                      {tx.collectorName} ({tx.collectorPhone})
                    </td>
                    <td className="py-3 px-3 text-[#111827] font-semibold">
                      {tx.category} ({tx.finalWeightKg || tx.weightKg} kg)
                    </td>
                    <td className="py-3 px-3 text-[#166534] font-bold">
                      {tx.finalPrice !== null ? `₹${tx.finalPrice}` : tx.indicativePrice ? `~₹${tx.indicativePrice}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#DBEAFE] text-[#1E3A8A]'
                        }`}
                      >
                        {tx.status === 'completed' ? '✓ Completed' : 'Pending Handover'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#1E3A8A]">
                      {tx.tamperHash || 'PENDING'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Research Statistics (Sits visually apart with explicit source citation) */}
      <div className="p-5 rounded-2xl bg-[#DBEAFE]/30 border border-[#2563EB]/20 text-xs text-[#1E3A8A] space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#2563EB]" />
          <h4 className="font-bold uppercase tracking-wider text-[11px]">
            National E-Waste Context & Baseline Research
          </h4>
        </div>
        <p className="leading-relaxed">
          &quot;India is estimated to have generated approximately 1.71 million metric tonnes of e-waste in 2022-23. Over 90% of discarded electronics are historically collected by the informal sector (kabadiwalas), with a nationwide formal dismantling rate estimated under 33%.&quot;
        </p>
        <p className="text-[10px] text-[#4B5563] italic">
          Source: Central Pollution Control Board (CPCB) Annual E-Waste Report & MeitY E-Waste Rules baseline. This external research statistic sits visually separated from app-generated operational data.
        </p>
      </div>

      {/* Recycler Verification Modal */}
      {verifyingRecycler && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5E7EB] shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#111827]">
              Verify Recycler Authorization
            </h3>
            <p className="text-xs text-[#4B5563]">
              Confirm authorization for <strong>{verifyingRecycler.name}</strong> located at {verifyingRecycler.location}.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                CPCB Authorization / Registration Number
              </label>
              <input
                type="text"
                required
                value={cpcbInput}
                onChange={(e) => setCpcbInput(e.target.value)}
                placeholder="e.g. CPCB/EW/2026/REG-0812"
                className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingRecycler(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingVerification}
                onClick={() => handleVerifyRecyclerSubmit('verified')}
                className="flex-2 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE & CERTIFY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

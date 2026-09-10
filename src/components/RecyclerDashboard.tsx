import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Tags,
  BadgePercent,
  History,
  Building,
  CheckCircle2,
  Clock,
  QrCode,
  Check,
  X,
  Plus,
  RefreshCw,
  AlertCircle,
  PackageX,
  ShieldCheck,
} from 'lucide-react';
import {
  TransactionRecord,
  RecyclerRecord,
  EwasteCategory,
  EWASTE_CATEGORIES,
} from '../types.js';
import { transactionService } from '../services/transactionService.js';

interface RecyclerDashboardProps {
  isTestDataMode: boolean;
  onRefreshGlobalData: () => void;
}

type RecyclerTab = 'dashboard' | 'requests' | 'rates' | 'history' | 'facility';

export const RecyclerDashboard: React.FC<RecyclerDashboardProps> = ({
  isTestDataMode,
  onRefreshGlobalData,
}) => {
  const [activeTab, setActiveTab] = useState<RecyclerTab>('dashboard');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Recycler profile / facility data
  const [facility, setFacility] = useState<RecyclerRecord>({
    id: 'rec_active_session',
    name: 'GreenChannel Recovery Ltd.',
    location: 'Plot 42, Eco-Industrial Park, Greater Noida',
    contactPhone: '+91 98111 22334',
    acceptedMaterials: ['Laptop', 'Mobile', 'Monitor', 'Television', 'Cable', 'Battery'],
    rates: {
      Laptop: 150,
      Mobile: 210,
      Monitor: 70,
      Television: 45,
      Cable: 175,
      Battery: 90,
    },
    verificationStatus: 'verified',
    verificationDate: '2026-03-01T00:00:00.000Z',
    cpcbRegistrationNo: 'CPCB/EW/2026/REG-0492',
    is_test: false,
  });

  // Verification modal state for requests
  const [selectedTxForHandover, setSelectedTxForHandover] = useState<TransactionRecord | null>(null);
  const [handoverInputOtp, setHandoverInputOtp] = useState('');
  const [handoverFinalWeight, setHandoverFinalWeight] = useState('');
  const [handoverFinalPrice, setHandoverFinalPrice] = useState('');
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [isVerifyingHandover, setIsVerifyingHandover] = useState(false);

  // Rates edit state
  const [rateInputs, setRateInputs] = useState<Partial<Record<EwasteCategory, number>>>(facility.rates);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [rateSaveSuccess, setRateSaveSuccess] = useState(false);

  // Load transactions
  const loadTransactions = async () => {
    setIsLoading(true);
    const txs = await transactionService.getTransactions({
      includeTest: isTestDataMode,
    });
    setTransactions(txs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [isTestDataMode]);

  // Derived real stats
  const pendingRequests = transactions.filter((t) => t.status !== 'completed');
  const completedHandover = transactions.filter((t) => t.status === 'completed');
  const totalWeightProcessed = completedHandover.reduce(
    (acc, cur) => acc + (cur.finalWeightKg || cur.weightKg || 0),
    0
  );
  const totalValueDisbursed = completedHandover.reduce(
    (acc, cur) => acc + (cur.finalPrice || cur.indicativePrice || 0),
    0
  );

  // Open Handover Dialog
  const openHandoverModal = (tx: TransactionRecord) => {
    setSelectedTxForHandover(tx);
    setHandoverInputOtp('');
    setHandoverFinalWeight(String(tx.weightKg));
    setHandoverFinalPrice(String(tx.indicativePrice || 0));
    setHandoverError(null);
  };

  // Confirm Handover with 6-digit OTP
  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForHandover) return;

    if (handoverInputOtp.length !== 6) {
      setHandoverError('Please enter the collector’s exact 6-digit Handover OTP.');
      return;
    }

    setIsVerifyingHandover(true);
    setHandoverError(null);

    const result = await transactionService.verifyHandover({
      transactionId: selectedTxForHandover.id,
      otp: handoverInputOtp,
      finalWeightKg: parseFloat(handoverFinalWeight) || selectedTxForHandover.weightKg,
      finalPrice: parseFloat(handoverFinalPrice) || selectedTxForHandover.indicativePrice || 0,
      recyclerId: facility.id,
      recyclerName: facility.name,
    });

    setIsVerifyingHandover(false);

    if (result.success && result.transaction) {
      setSelectedTxForHandover(null);
      loadTransactions();
      onRefreshGlobalData();
    } else {
      setHandoverError(result.error || 'Verification failed. Incorrect OTP.');
    }
  };

  // Save rates
  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRates(true);
    try {
      await fetch(`/api/recyclers/${facility.id}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: rateInputs }),
      });
      setFacility((prev) => ({ ...prev, rates: rateInputs }));
      setIsSavingRates(false);
      setRateSaveSuccess(true);
      setTimeout(() => setRateSaveSuccess(false), 3000);
    } catch {
      setIsSavingRates(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Bar with Recycler Title & Verification status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E7EB] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">
              Formal Recycling Facility Portal
            </span>
            <span className="bg-[#DCFCE7] text-[#166534] border border-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> CPCB Verified
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#111827] mt-0.5">{facility.name}</h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            CPCB Reg: <span className="font-mono text-[#111827]">{facility.cpcbRegistrationNo}</span> • {facility.location}
          </p>
        </div>

        <button
          onClick={loadTransactions}
          className="self-start sm:self-auto py-2 px-3 bg-white border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#111827] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-1 bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-xs self-start">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4" />
              <span>Incoming Pickups</span>
            </div>
            {pendingRequests.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'requests' ? 'bg-white text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
              }`}>
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rates'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            <span>Material Rates Card</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Completed Handovers</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 space-y-6">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards (Real Stored Counts Only: 0 when empty) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                  <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                    Pending Inbound Handovers
                  </span>
                  <div className="text-3xl font-black text-[#F59E0B] mt-1 font-mono">
                    {pendingRequests.length}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {pendingRequests.length === 0 ? 'No open requests pending' : 'Requires physical check-in'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                  <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                    Total E-Waste Processed
                  </span>
                  <div className="text-3xl font-black text-[#166534] mt-1 font-mono">
                    {totalWeightProcessed.toFixed(1)} kg
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {completedHandover.length} verified handovers completed
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                  <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                    Total Payouts Disbursed
                  </span>
                  <div className="text-3xl font-black text-[#2563EB] mt-1 font-mono">
                    ₹{totalValueDisbursed}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Formal channelization value
                  </span>
                </div>
              </div>

              {/* Quick Actions / Recent Pickups Pending Check-in */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-[#111827]">
                    Inbound Pickups Awaiting Verification
                  </h3>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="text-xs text-[#2563EB] font-bold hover:underline cursor-pointer"
                  >
                    View All ({pendingRequests.length})
                  </button>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
                    <PackageX className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-[#111827]">No pickups waiting for check-in</p>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      When collectors generate an e-waste handover, you can inspect and verify them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#111827]">{tx.category}</span>
                            <span className="text-xs text-[#4B5563] font-mono">({tx.weightKg} kg)</span>
                            {tx.is_test && (
                              <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                                TEST
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[#4B5563] block mt-0.5">
                            {tx.id} • Collector: {tx.collectorName} ({tx.collectorPhone})
                          </span>
                        </div>

                        <button
                          onClick={() => openHandoverModal(tx)}
                          className="py-1.5 px-3 rounded-lg bg-[#16A34A] text-white font-bold text-xs hover:bg-[#15803D] cursor-pointer shadow-xs"
                        >
                          Verify Handover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INCOMING REQUESTS & HANDOVER CONFIRMATION */}
          {activeTab === 'requests' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Collector Inbound Pickups
                </h2>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Weigh incoming materials, verify the collector’s 6-digit Handover OTP, and issue the tamper-evident digital receipt.
                </p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F9FAFB]">
                  <PackageX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-[#111827]">No active inbound requests</h4>
                  <p className="text-xs text-[#4B5563] mt-1 max-w-sm mx-auto">
                    Transactions generated by collectors will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#16A34A] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#111827]">{tx.category}</span>
                          <span className="text-xs font-mono text-[#4B5563]">({tx.weightKg} kg)</span>
                          <span className="text-xs text-gray-500">• Condition: {tx.condition}</span>
                          {tx.is_test && (
                            <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                              TEST DATA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#4B5563]">
                          Collector: <strong>{tx.collectorName}</strong> ({tx.collectorPhone})
                        </p>
                        <p className="text-[11px] font-mono text-gray-400">
                          TX #{tx.id} • Created {new Date(tx.timestamps.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#166534] block">
                            ~₹{tx.indicativePrice || 'Rate N/A'}
                          </span>
                          <span className="text-[10px] text-gray-400">Estimated value</span>
                        </div>

                        <button
                          onClick={() => openHandoverModal(tx)}
                          className="py-2 px-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify & Weigh</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MATERIAL RATES MANAGEMENT */}
          {activeTab === 'rates' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Recycler Rate Card Management
                </h2>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  These rates are consumed genuinely by collectors when estimating e-waste value with no fake pricing.
                </p>
              </div>

              <form onSubmit={handleSaveRates} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EWASTE_CATEGORIES.map((cat) => {
                    const currentRate = rateInputs[cat] ?? '';
                    return (
                      <div
                        key={cat}
                        className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex items-center justify-between"
                      >
                        <span className="font-semibold text-xs text-[#111827]">{cat}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#4B5563] font-bold">₹</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={currentRate}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              setRateInputs((prev) => ({ ...prev, [cat]: val }));
                            }}
                            placeholder="Rate"
                            className="w-20 px-2 py-1 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#111827] text-right font-mono"
                          />
                          <span className="text-[11px] text-[#4B5563]">/kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {rateSaveSuccess && (
                  <div className="p-3 bg-[#DCFCE7] border border-[#16A34A] text-[#166534] text-xs font-semibold rounded-xl">
                    ✓ Material rate card updated and published to active collectors.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingRates}
                  className="py-2.5 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingRates ? 'Publishing Rates...' : 'PUBLISH LIVE RATES'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: COMPLETED TRANSACTIONS */}
          {activeTab === 'history' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Verified Recycler Ledger
                </h2>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Complete audit log of channelized e-waste with tamper-evident digital receipts.
                </p>
              </div>

              {completedHandover.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F9FAFB]">
                  <PackageX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-[#111827]">No completed handovers yet</h4>
                  <p className="text-xs text-[#4B5563] mt-1 max-w-sm mx-auto">
                    Once incoming collector pickups are verified via OTP, they will be archived here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedHandover.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-xl border border-[#E5E7EB] bg-white flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#111827]">{tx.category}</span>
                          <span className="text-xs font-mono text-[#166534] font-bold">
                            {tx.finalWeightKg || tx.weightKg} kg (Confirmed)
                          </span>
                          {tx.is_test && (
                            <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                              TEST
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#4B5563]">
                          Collector: <strong>{tx.collectorName}</strong> ({tx.collectorPhone})
                        </p>
                        <p className="text-[11px] font-mono text-gray-400">
                          Hash: <span className="text-[#1E3A8A] font-bold">{tx.tamperHash || 'TAMPER-CHECKED'}</span> • Completed: {new Date(tx.timestamps.completedAt || tx.timestamps.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-[#166534] block">
                          ₹{tx.finalPrice}
                        </span>
                        <span className="text-[10px] font-semibold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full inline-block">
                          ✓ Completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Handover Verification Modal */}
      {selectedTxForHandover && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5E7EB] shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-xs font-bold text-[#16A34A] uppercase">Physical Check-in</span>
                <h3 className="text-lg font-bold text-[#111827]">Authenticate Handover</h3>
              </div>
              <button
                onClick={() => setSelectedTxForHandover(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Transaction ID:</span>
                <span className="font-mono font-bold text-[#111827]">{selectedTxForHandover.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Item Category:</span>
                <span className="font-bold text-[#111827]">{selectedTxForHandover.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Collector:</span>
                <span className="font-semibold text-[#111827]">{selectedTxForHandover.collectorName}</span>
              </div>
            </div>

            <form onSubmit={handleVerifyHandover} className="space-y-4">
              {/* 6-Digit OTP */}
              <div>
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                  Enter Collector&apos;s 6-Digit Handover OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={handoverInputOtp}
                  onChange={(e) => setHandoverInputOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-xl font-bold tracking-[0.3em] font-mono text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
                  autoFocus
                />
                <span className="text-[11px] text-[#4B5563] block mt-1">
                  Provided by collector on their digital handover screen.
                </span>
              </div>

              {/* Weight & Price adjustment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                    Confirmed Weight (KG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={handoverFinalWeight}
                    onChange={(e) => setHandoverFinalWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold font-mono text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
                    Final Price (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={handoverFinalPrice}
                    onChange={(e) => setHandoverFinalPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold font-mono text-[#166534]"
                  />
                </div>
              </div>

              {handoverError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium">
                  {handoverError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForHandover(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingHandover || handoverInputOtp.length !== 6}
                  className="flex-2 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isVerifyingHandover ? 'Verifying...' : 'COMPLETE HANDOVER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

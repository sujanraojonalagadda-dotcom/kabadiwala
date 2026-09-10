import React from 'react';
import {
  Plus,
  Laptop,
  Smartphone,
  Tv,
  Battery,
  Monitor,
  Printer,
  History,
  User,
  ArrowRight,
  PackageX,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { UserProfile, TransactionRecord, EwasteCategory } from '../types.js';

interface CollectorHomeProps {
  currentUser: UserProfile;
  recentPickups: TransactionRecord[];
  onStartAddEwaste: (category?: EwasteCategory) => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onViewReceipt: (tx: TransactionRecord) => void;
}

export const CollectorHome: React.FC<CollectorHomeProps> = ({
  currentUser,
  recentPickups,
  onStartAddEwaste,
  onViewHistory,
  onViewProfile,
  onViewReceipt,
}) => {
  const quickCategories: { name: EwasteCategory; icon: React.ReactNode; label: string }[] = [
    { name: 'Laptop', icon: <Laptop className="w-8 h-8 text-[#166534]" />, label: 'Laptop' },
    { name: 'Mobile', icon: <Smartphone className="w-8 h-8 text-[#166534]" />, label: 'Mobile Phone' },
    { name: 'Television', icon: <Tv className="w-8 h-8 text-[#166534]" />, label: 'Television / Screen' },
    { name: 'Battery', icon: <Battery className="w-8 h-8 text-[#166534]" />, label: 'Battery / Inverter' },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Personalized Greeting with High Contrast */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#16A34A] uppercase tracking-wider block mb-0.5">
            Verified Waste Collector
          </span>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            Namaste, {currentUser.name || 'Collector'}
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5 flex items-center gap-1.5">
            <span>{currentUser.location || 'Local Collection Ward'}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="font-mono">{currentUser.phone}</span>
          </p>
        </div>

        <button
          id="btn-home-profile"
          onClick={onViewProfile}
          className="w-11 h-11 rounded-full bg-[#DCFCE7] border border-[#16A34A] flex items-center justify-center text-[#166534] hover:bg-[#bbf7d0] transition-colors cursor-pointer"
          title="Open Profile"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Primary Massive Call-to-Action: + ADD E-WASTE */}
      {/* Per instruction: "+ ADD E-WASTE is the strongest thing on the screen." */}
      <button
        id="btn-add-ewaste-primary"
        onClick={() => onStartAddEwaste()}
        className="w-full py-5 px-6 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white font-black text-xl sm:text-2xl tracking-wide flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all border-2 border-[#166534] cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Plus className="w-7 h-7 stroke-[3]" />
        </div>
        <span>+ ADD E-WASTE</span>
      </button>

      {/* 3. "What are you collecting?" 2x2 Category Grid */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#166534]">
            What are you collecting today?
          </h2>
          <span className="text-[11px] text-[#4B5563]">Quick select category</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quickCategories.map((item) => (
            <button
              key={item.name}
              id={`btn-category-${item.name.toLowerCase()}`}
              onClick={() => onStartAddEwaste(item.name)}
              className="p-4 rounded-xl border border-[#E5E7EB] hover:border-[#16A34A] bg-[#F9FAFB] hover:bg-[#DCFCE7]/40 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] group-hover:border-[#16A34A] flex items-center justify-center shadow-xs">
                {item.icon}
              </div>
              <span className="font-bold text-sm text-[#111827] group-hover:text-[#166534]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Recent Pickups (Strict Honesty: Empty state when none exist) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
            Recent Pickups
          </h2>
          {recentPickups.length > 0 && (
            <button
              onClick={onViewHistory}
              className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all ({recentPickups.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentPickups.length === 0 ? (
          /* Honest Empty State: Counts of 0, empty screen beats fabricated one */
          <div className="py-8 px-4 text-center border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
            <PackageX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-sm text-[#111827]">No pickups recorded yet</p>
            <p className="text-xs text-[#4B5563] mt-1 max-w-xs mx-auto">
              Whenever you collect and channelize e-waste, your verifiable transactions and receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentPickups.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                onClick={() => onViewReceipt(tx)}
                className="p-3.5 rounded-xl border border-[#E5E7EB] hover:border-[#16A34A] bg-[#F9FAFB] hover:bg-white flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111827]">{tx.category}</span>
                    <span className="text-xs font-mono text-[#4B5563]">({tx.weightKg} kg)</span>
                    {tx.is_test && (
                      <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        TEST
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[#4B5563] block mt-0.5">
                    {tx.id} • {new Date(tx.timestamps.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-[#166534]">
                    {tx.finalPrice !== null ? `₹${tx.finalPrice}` : tx.indicativePrice ? `~₹${tx.indicativePrice}` : 'Rate N/A'}
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      tx.status === 'completed'
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#DBEAFE] text-[#1E3A8A]'
                    }`}
                  >
                    {tx.status === 'completed' ? '✓ Handed Over' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Mobile Floating Action Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] p-3 flex justify-around max-w-xl mx-auto z-20">
        <button
          onClick={() => onStartAddEwaste()}
          className="flex-1 py-3 mx-1 bg-[#16A34A] text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>+ ADD E-WASTE</span>
        </button>

        <button
          onClick={onViewHistory}
          className="px-4 py-3 mx-1 bg-white border border-[#2563EB] text-[#1E3A8A] font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-50"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
      </div>
    </div>
  );
};

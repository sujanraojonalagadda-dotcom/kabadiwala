import React, { useState } from 'react';
import { User, Phone, MapPin, Globe, ShieldCheck, ArrowLeft, Save, LogOut } from 'lucide-react';
import { UserProfile } from '../types.js';
import { authService } from '../services/authService.js';

interface CollectorProfileProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
}

export const CollectorProfile: React.FC<CollectorProfileProps> = ({
  currentUser,
  onBack,
  onUpdateUser,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [location, setLocation] = useState(currentUser.location);
  const [preferredLanguage, setPreferredLanguage] = useState(currentUser.preferredLanguage || 'hi');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const clean = currentUser.phone.replace(/\D/g, '').slice(-10);
    const result = await authService.registerCollector({
      phone: clean,
      name,
      preferredLanguage,
      location,
      role: currentUser.role,
    });

    setIsSaving(false);
    if (result.success && result.user) {
      onUpdateUser(result.user);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-gray-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-base font-bold text-[#111827]">Collector Profile</h1>
        <div className="w-8"></div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-[#E5E7EB]">
          <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] border border-[#16A34A] flex items-center justify-center text-[#166534]">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#111827]">{currentUser.name || 'Waste Collector'}</h2>
            <p className="text-xs font-mono text-[#4B5563]">{currentUser.phone}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] border border-[#16A34A]">
                <ShieldCheck className="w-3 h-3" />
                {currentUser.verified ? 'Verified Collector' : 'Registered Collector'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
              User ID
            </label>
            <input
              type="text"
              disabled
              value={currentUser.id}
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-[#E5E7EB] rounded-xl text-xs font-mono text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="prof-name" className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prof-loc" className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
              Collection Ward / Locality
            </label>
            <input
              id="prof-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ward 14, Okhla, New Delhi"
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prof-lang" className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">
              Preferred Language
            </label>
            <select
              id="prof-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
            >
              <option value="hi">हिंदी (Hindi)</option>
              <option value="en">English</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-[#DCFCE7] border border-[#16A34A] text-[#166534] text-xs rounded-xl font-medium">
              ✓ Profile changes saved successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'UPDATE PROFILE'}</span>
          </button>
        </form>

        {/* Sign out section */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <button
            onClick={onLogout}
            className="w-full py-2.5 text-xs font-bold text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>SIGN OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

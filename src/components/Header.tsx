import React from 'react';
import { ShieldCheck, Wifi, WifiOff, AlertTriangle, User, LogOut, Recycle } from 'lucide-react';
import { UserProfile, UserRole } from '../types.js';

interface HeaderProps {
  currentUser: UserProfile | null;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isTestDataMode: boolean;
  onToggleTestDataMode: () => void;
  isGuidedTestMode: boolean;
  onToggleGuidedTestMode: () => void;
  isOnline: boolean;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeRole,
  onRoleChange,
  isTestDataMode,
  onToggleTestDataMode,
  isGuidedTestMode,
  onToggleGuidedTestMode,
  isOnline,
  onLogout,
  onOpenProfile,
}) => {
  return (
    <header className="w-full bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
      {/* Guided Test Mode Top Banner (Stage Demo) */}
      {isGuidedTestMode && (
        <div className="bg-[#FEF3C7] border-b border-[#F59E0B] px-4 py-2 text-center text-xs sm:text-sm font-semibold text-[#92400E] flex items-center justify-center gap-2">
          <span>🧪 GUIDED TEST MODE — This uses test records only. No real recycler/price claim is being made.</span>
          <button
            onClick={onToggleGuidedTestMode}
            className="underline ml-2 text-xs text-[#78350F] hover:text-black cursor-pointer font-bold"
          >
            Turn Off
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] border border-[#16A34A] flex items-center justify-center text-[#166534] shadow-xs">
            <Recycle className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-[#166534]">
                KABADIWALA CONNECT
              </span>
            </div>
            <p className="text-[11px] text-[#4B5563] hidden sm:block">
              Honest E-Waste Channelization Platform
            </p>
          </div>
        </div>

        {/* Status Indicators & Role Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
              isOnline
                ? 'bg-[#DCFCE7] text-[#166534] border-[#16A34A]'
                : 'bg-red-100 text-[#DC2626] border-red-300'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="font-medium">Offline Store</span>
              </>
            )}
          </div>

          {/* Test Data Mode Toggle */}
          <button
            id="test-data-toggle"
            type="button"
            onClick={onToggleTestDataMode}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer font-medium ${
              isTestDataMode
                ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]'
                : 'bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:bg-gray-100'
            }`}
            title="Toggle Test Data Mode for stage demo"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="whitespace-nowrap">
              {isTestDataMode ? 'TEST DATA MODE: ON' : 'Test Mode: OFF'}
            </span>
          </button>

          {/* User / Role Switcher */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
              {/* Role selector dropdown */}
              <div className="relative">
                <select
                  value={activeRole}
                  onChange={(e) => onRoleChange(e.target.value as UserRole)}
                  className="text-xs bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-[#16A34A] focus:outline-none cursor-pointer"
                  title="Switch workspace view"
                >
                  <option value="collector">Collector View</option>
                  <option value="recycler">Recycler Dashboard</option>
                  <option value="admin">Admin Portal</option>
                </select>
              </div>

              {/* Profile button */}
              <button
                id="header-profile-btn"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 text-xs text-[#111827] bg-[#F9FAFB] hover:bg-gray-100 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                title="View Collector Profile"
              >
                <User className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {currentUser.name || currentUser.phone}
                </span>
              </button>

              {/* Logout */}
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-1.5 text-[#4B5563] hover:text-[#DC2626] rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

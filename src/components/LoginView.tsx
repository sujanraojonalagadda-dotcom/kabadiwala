import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, KeyRound, AlertCircle, ArrowRight, RefreshCw, CheckCircle2, Recycle, Info, Sparkles } from 'lucide-react';
import { authService } from '../services/authService.js';
import { UserProfile, UserRole } from '../types.js';

interface LoginViewProps {
  onSuccess: (user: UserProfile) => void;
  isGuidedTestMode: boolean;
  onToggleGuidedTestMode: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  isGuidedTestMode,
  onToggleGuidedTestMode,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [smsStatus, setSmsStatus] = useState<{ smsConfigured: boolean; provider: string } | null>(null);

  // New Collector Registration Form State
  const [regName, setRegName] = useState('');
  const [regLanguage, setRegLanguage] = useState('hi');
  const [regLocation, setRegLocation] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('collector');

  // Check SMS gateway configuration on mount
  useEffect(() => {
    async function checkConfig() {
      const status = await authService.checkSmsStatus();
      setSmsStatus(status);
    }
    checkConfig();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendOtp(clean, isGuidedTestMode);
      setIsLoading(false);

      if (response.success) {
        setStep('otp');
        setInfoMsg(response.message);
        setResendCooldown(response.cooldownSeconds || 45);
      } else {
        setErrorMsg(response.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Network error: Unable to reach the authentication service. Check connection.');
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const clean = phoneNumber.replace(/\D/g, '');
      const response = await authService.verifyOtp(clean, otpCode, isGuidedTestMode);
      setIsLoading(false);

      if (response.success && response.user) {
        if (response.isNewUser || !response.user.name) {
          // Proceed to collector registration
          setStep('register');
        } else {
          onSuccess(response.user);
        }
      } else {
        setErrorMsg(response.message || 'Incorrect verification code. Please try again.');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Verification failed due to a network connection error.');
    }
  };

  // Handle Complete Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!regLocation.trim()) {
      setErrorMsg('Please enter your area, locality, or collection ward.');
      return;
    }

    setIsLoading(true);
    const clean = phoneNumber.replace(/\D/g, '');
    const result = await authService.registerCollector({
      phone: clean,
      name: regName.trim(),
      preferredLanguage: regLanguage,
      location: regLocation.trim(),
      role: regRole,
    });
    setIsLoading(false);

    if (result.success && result.user) {
      onSuccess(result.user);
    } else {
      setErrorMsg(result.message || 'Failed to complete registration.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center px-4 py-8">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#DCFCE7] border border-[#16A34A] text-[#166534] mb-3">
            <Recycle className="w-8 h-8 text-[#16A34A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#166534] tracking-tight">
            KABADIWALA CONNECT
          </h1>
          <p className="text-sm text-[#4B5563] mt-1">
            Empowering informal waste collectors with formal recyclers
          </p>
        </div>

        {/* Guided Test Mode Notice if enabled */}
        {isGuidedTestMode && (
          <div className="mb-5 p-3 rounded-xl bg-[#FEF3C7] border border-[#F59E0B] text-xs text-[#92400E]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Stage Demo Mode Active</strong>
                <span>Test OTP is active for rapid verification (use code 123456).</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Mobile Number Input */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="login-phone" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                Mobile Number (India)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-semibold text-[#4B5563] border-r border-[#E5E7EB] pr-2">
                  +91
                </span>
                <input
                  id="login-phone"
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full pl-16 pr-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-base text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white transition-all font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[#4B5563] mt-1.5">
                We will send a 6-digit real OTP via SMS to verify your mobile number.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              id="btn-send-otp"
              type="submit"
              disabled={isLoading || phoneNumber.length < 10}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLoading || phoneNumber.length < 10
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#16A34A] text-white hover:bg-[#15803D] active:scale-[0.99] shadow-xs'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP...</span>
                </>
              ) : (
                <>
                  <span>SEND OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Honest SMS Status & Configuration Info */}
            <div className="pt-4 border-t border-[#E5E7EB] text-xs text-[#4B5563] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                  SMS Gateway:
                </span>
                <span className="font-medium text-[#111827]">
                  {smsStatus?.smsConfigured ? (
                    <span className="text-[#166534] font-semibold">Active ({smsStatus.provider})</span>
                  ) : (
                    <span className="text-[#DC2626] font-medium">Not Configured</span>
                  )}
                </span>
              </div>

              {!smsStatus?.smsConfigured && !isGuidedTestMode && (
                <div className="p-3 bg-[#DBEAFE] border border-[#2563EB] rounded-xl text-[#1E3A8A] text-[11px] leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Honest Configuration Notice:
                  </p>
                  <p>
                    Per project honesty rules: fake OTPs are never substituted. To send live SMS OTPs to +91 numbers, configure Twilio or Indian SMS gateway in server environment variables.
                  </p>
                  <button
                    type="button"
                    onClick={onToggleGuidedTestMode}
                    className="mt-2 text-xs font-bold text-[#2563EB] underline hover:text-[#1E3A8A] block cursor-pointer"
                  >
                    Or click here to enable Guided Test Mode for stage demo
                  </button>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Step 2: 6-Digit OTP Entry */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center pb-2">
              <span className="text-xs text-[#4B5563]">Verification code sent to</span>
              <p className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                +91 {phoneNumber}
              </p>
            </div>

            <div>
              <label htmlFor="login-otp" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                id="login-otp"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-2xl font-bold tracking-[0.4em] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white transition-all font-mono"
                autoFocus
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Info Message */}
            {infoMsg && (
              <div className="p-2.5 rounded-xl bg-[#DCFCE7] border border-[#16A34A] text-[#166534] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              id="btn-verify-otp"
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLoading || otpCode.length !== 6
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#16A34A] text-white hover:bg-[#15803D] active:scale-[0.99] shadow-xs'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VERIFY & SIGN IN</span>
                </>
              )}
            </button>

            {/* Resend OTP and Change Number */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setErrorMsg(null);
                }}
                className="text-[#4B5563] hover:text-[#111827] underline cursor-pointer"
              >
                Change Number
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={() => handleSendOtp()}
                className={`font-semibold cursor-pointer ${
                  resendCooldown > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-[#16A34A] hover:text-[#166534] underline'
                }`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: New Collector Profile Registration */}
        {step === 'register' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-[#166534]">
                Collector Registration
              </h2>
              <p className="text-xs text-[#4B5563]">
                Welcome! Setup your profile for +91 {phoneNumber}
              </p>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="reg-location" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1">
                Collection Location / Area
              </label>
              <input
                id="reg-location"
                type="text"
                required
                value={regLocation}
                onChange={(e) => setRegLocation(e.target.value)}
                placeholder="e.g. Okhla Phase 3 / Ward 12, Delhi"
                className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-lang" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1">
                  Preferred Language
                </label>
                <select
                  id="reg-lang"
                  value={regLanguage}
                  onChange={(e) => setRegLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
                >
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-role" className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1">
                  User Role
                </label>
                <select
                  id="reg-role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:outline-none"
                >
                  <option value="collector">Waste Collector</option>
                  <option value="recycler">Authorized Recycler</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs">
                {errorMsg}
              </div>
            )}

            <button
              id="btn-complete-reg"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>SAVE & ENTER PLATFORM</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer honesty policy reminder */}
      <div className="max-w-md text-center mt-6 text-[11px] text-[#4B5563] space-y-1">
        <p>Governing rule: Nothing invented is ever shown as real.</p>
        <p>An empty screen beats a fabricated one.</p>
      </div>
    </div>
  );
};

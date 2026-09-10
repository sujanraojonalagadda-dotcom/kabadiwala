import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Info,
  RefreshCw,
  QrCode,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  EwasteCategory,
  EWASTE_CATEGORIES,
  ItemCondition,
  UserProfile,
  RecyclerRecord,
  TransactionRecord,
  AiClassificationResult,
} from '../types.js';
import { ewasteClassifier } from '../services/ewasteClassifier.js';
import { priceService } from '../services/priceService.js';
import { matchingService } from '../services/matchingService.js';
import { transactionService } from '../services/transactionService.js';
import { notificationService } from '../services/notificationService.js';

interface AddEwasteFlowProps {
  currentUser: UserProfile;
  initialCategory?: EwasteCategory;
  isTestDataMode: boolean;
  onCancel: () => void;
  onComplete: (tx: TransactionRecord) => void;
}

type FlowStep = 'photo_category' | 'weight_condition' | 'pricing_recycler' | 'handover_ready';

export const AddEwasteFlow: React.FC<AddEwasteFlowProps> = ({
  currentUser,
  initialCategory,
  isTestDataMode,
  onCancel,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('photo_category');

  // Step 1: Photo & Category
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EwasteCategory>(initialCategory || 'Laptop');
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiResult, setAiResult] = useState<AiClassificationResult | null>(null);

  // Step 2: Weight & Condition
  const [weightKg, setWeightKg] = useState<string>('1.5');
  const [condition, setCondition] = useState<ItemCondition>('Working');
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  // Step 3: Recycler & Price
  const [availableRecyclers, setAvailableRecyclers] = useState<RecyclerRecord[]>([]);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string | null>(null);
  const [emptyRecyclersMsg, setEmptyRecyclersMsg] = useState<string>('No verified recyclers available yet.');
  const [manualTestRate, setManualTestRate] = useState<string>('120');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 4: Handover & QR
  const [createdTx, setCreatedTx] = useState<TransactionRecord | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch matching recyclers when category changes
  useEffect(() => {
    async function loadRecyclers() {
      const res = await matchingService.getAvailableRecyclers({
        category: selectedCategory,
        isTestDataMode,
      });
      setAvailableRecyclers(res.recyclers);
      setEmptyRecyclersMsg(res.emptyMessage);
      if (res.recyclers.length > 0) {
        setSelectedRecyclerId(res.recyclers[0].id);
      } else {
        setSelectedRecyclerId(null);
      }
    }
    loadRecyclers();
  }, [selectedCategory, isTestDataMode]);

  // Handle Photo Upload / Capture
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resizedBase64 = await ewasteClassifier.preprocessImage(file);
      setPhotoPreview(resizedBase64);

      // Run AI Classification verbatim
      setIsClassifying(true);
      const result = await ewasteClassifier.classify(resizedBase64);
      setIsClassifying(false);
      setAiResult(result);

      if (result.available && result.category) {
        setSelectedCategory(result.category);
      }
    } catch (err) {
      setIsClassifying(false);
      setAiResult({
        available: false,
        category: null,
        confidenceVerbatim: null,
        explanation: '',
        message: 'AI classification unavailable',
      });
    }
  };

  // Voice recognition ("Laptop 3 kilo hai")
  const startVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by this browser. Please enter manually.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Supports Hindi / English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListeningVoice(true);
    setVoiceTranscript('Listening... Speak now (e.g. "Laptop 3 kilo hai")');

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(`Heard: "${transcript}"`);
      setIsListeningVoice(false);

      const parsed = notificationService.parseVoiceInput(transcript);
      if (parsed.category) {
        setSelectedCategory(parsed.category);
      }
      if (parsed.weightKg) {
        setWeightKg(String(parsed.weightKg));
      }
    };

    recognition.onerror = (event: any) => {
      setIsListeningVoice(false);
      setVoiceTranscript(`Voice error: ${event.error || 'Could not hear clearly'}`);
    };

    recognition.onend = () => {
      setIsListeningVoice(false);
    };

    recognition.start();
  };

  // Selected recycler rate lookup
  const selectedRecycler = availableRecyclers.find((r) => r.id === selectedRecyclerId);
  const recyclerRate = selectedRecycler
    ? matchingService.getRecyclerRateForCategory(selectedRecycler, selectedCategory)
    : null;

  // Price Calculation result from PriceService
  const numericWeight = parseFloat(weightKg) || 0;
  const priceResult = priceService.calculatePrice({
    weightKg: numericWeight,
    category: selectedCategory,
    condition,
    recyclerRatePerKg: recyclerRate,
    isTestDataMode,
    manualTestRatePerKg: parseFloat(manualTestRate) || 0,
  });

  // Voice playback of calculated price
  const handleSpeakPrice = () => {
    notificationService.speakPriceFeedback({
      calculatedPrice: priceResult.totalCalculatedPrice,
      category: selectedCategory,
      language: 'hi',
    });
  };

  // Confirm and Create Transaction
  const handleGenerateHandover = async () => {
    setIsSubmitting(true);

    const txPayload: Partial<TransactionRecord> = {
      collectorId: currentUser.id,
      collectorName: currentUser.name,
      collectorPhone: currentUser.phone,
      recyclerId: selectedRecycler?.id || null,
      recyclerName: selectedRecycler?.name || null,
      category: selectedCategory,
      weightKg: numericWeight,
      condition,
      conditionFactor: priceResult.conditionFactor,
      ratePerKg: priceResult.ratePerKg,
      isTestRate: priceResult.isTestCalculation,
      indicativePrice: priceResult.totalCalculatedPrice,
      is_test: isTestDataMode || Boolean(selectedRecycler?.is_test),
      photoUrl: photoPreview,
      aiClassification: aiResult?.available
        ? {
            suggestedCategory: aiResult.category || selectedCategory,
            confidenceVerbatim: aiResult.confidenceVerbatim || 'Model reported',
            modelUsed: 'Gemini Vision',
          }
        : undefined,
    };

    const result = await transactionService.createTransaction(txPayload);
    setIsSubmitting(false);

    if (result.success && result.transaction) {
      setCreatedTx(result.transaction);

      // Generate QR Code for Handover
      const qrData = await transactionService.generateQrData({
        txId: result.transaction.id,
        otp: result.transaction.handoverOtp,
        collectorPhone: currentUser.phone,
        category: selectedCategory,
        weightKg: numericWeight,
        indicativePrice: priceResult.totalCalculatedPrice,
      });
      setQrCodeDataUrl(qrData);

      setCurrentStep('handover_ready');
    } else {
      alert('Could not generate handover. Please verify network or try again.');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onCancel}
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-gray-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <span className="text-xs font-bold text-[#166534] uppercase tracking-wider">
          Step {currentStep === 'photo_category' ? '1/3' : currentStep === 'weight_condition' ? '2/3' : '3/3'}
        </span>
      </div>

      {/* ================= STEP 1: PHOTO & CATEGORY ================= */}
      {currentStep === 'photo_category' && (
        <div className="space-y-5 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              1. Take Photo & Verify Category
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Photograph the e-waste item for visual verification and honest audit trails.
            </p>
          </div>

          {/* Photo Capture Area */}
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#E5E7EB] bg-black max-h-64 flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Captured E-Waste"
                  className="w-full h-auto object-cover max-h-64"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] shadow-xs cursor-pointer flex items-center gap-1.5 text-[#111827]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-[#16A34A] rounded-xl bg-[#DCFCE7]/20 hover:bg-[#DCFCE7]/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-sm text-[#166534] block">
                    Take Photo or Upload Image
                  </span>
                  <span className="text-[11px] text-[#4B5563]">
                    Click to open camera or browse files
                  </span>
                </div>
              </button>
            )}

            {/* AI Vision Status Box */}
            {isClassifying ? (
              <div className="p-3 bg-[#DBEAFE] border border-[#2563EB] rounded-xl text-[#1E3A8A] text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>Analyzing photo with vision model...</span>
              </div>
            ) : aiResult ? (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  aiResult.available
                    ? 'bg-[#DCFCE7] border-[#16A34A] text-[#166534]'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'
                }`}
              >
                {aiResult.available ? (
                  <Sparkles className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {aiResult.available
                      ? `AI Detected: ${aiResult.category} (Confidence: ${aiResult.confidenceVerbatim})`
                      : aiResult.message || 'AI classification unavailable'}
                  </div>
                  {aiResult.explanation && (
                    <p className="text-[11px] opacity-90 mt-0.5">{aiResult.explanation}</p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1 italic">
                    Collector always confirms or overrides the category below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[11px] text-[#4B5563] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>
                  Photo analysis ready. Take a photo to run automated category identification.
                </span>
              </div>
            )}
          </div>

          {/* 10 Standard Categories (Manual Selection / Confirmation) */}
          <div>
            <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
              Confirm Item Category (10 Official Categories)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EWASTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#DCFCE7] border-[#16A34A] text-[#166534] shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep('weight_condition')}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>NEXT: WEIGHT & CONDITION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= STEP 2: WEIGHT & CONDITION ================= */}
      {currentStep === 'weight_condition' && (
        <div className="space-y-5 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              2. Weight & Working Condition
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Enter the measured physical weight and operational condition.
            </p>
          </div>

          {/* Voice Assist Button */}
          <div className="p-3.5 bg-[#DBEAFE] border border-[#2563EB] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1E3A8A] block">
                🎤 Voice Assistant (Hindi / English)
              </span>
              <p className="text-[11px] text-[#1E3A8A] opacity-90">
                Tap mic and speak: &quot;Laptop 3 kilo hai&quot;
              </p>
            </div>
            <button
              type="button"
              onClick={startVoiceInput}
              className={`p-3 rounded-full border cursor-pointer transition-all ${
                isListeningVoice
                  ? 'bg-red-500 text-white animate-pulse border-red-600'
                  : 'bg-white text-[#2563EB] border-[#2563EB] hover:bg-blue-50'
              }`}
            >
              {isListeningVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          {voiceTranscript && (
            <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs font-mono text-[#111827]">
              {voiceTranscript}
            </div>
          )}

          {/* Weight in kg */}
          <div>
            <label htmlFor="input-weight" className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
              Weight in Kilograms (KG)
            </label>
            <div className="relative">
              <input
                id="input-weight"
                type="number"
                step="0.1"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="1.5"
                className="w-full text-2xl font-bold py-3 pl-4 pr-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#16A34A] focus:bg-white focus:outline-none font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#4B5563]">
                KG
              </span>
            </div>
          </div>

          {/* Condition: Working / Partially Working / Not Working */}
          <div>
            <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
              Physical & Operational Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Working', 'Partially Working', 'Not Working'] as ItemCondition[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    condition === c
                      ? 'bg-[#DCFCE7] border-[#16A34A] text-[#166534] font-bold shadow-xs'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs block">{c}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {c === 'Working' ? '1.0x factor' : c === 'Partially Working' ? '0.7x factor' : '0.4x factor'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('photo_category')}
              className="flex-1 py-3 rounded-xl font-semibold text-xs border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('pricing_recycler')}
              className="flex-2 py-3 rounded-xl font-bold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>NEXT: PRICE & RECYCLER</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PRICING & RECYCLER MATCHING ================= */}
      {currentStep === 'pricing_recycler' && (
        <div className="space-y-5 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              3. Rate & Recycler Matching
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Real recycler directories or test calculations under Test Data Mode.
            </p>
          </div>

          {/* Price Calculation Card (Adhering Strictly to Honesty Rules) */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4B5563] uppercase">
                Indicative Valuation
              </span>
              <button
                type="button"
                onClick={handleSpeakPrice}
                className="p-1.5 text-[#2563EB] hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs font-medium cursor-pointer"
                title="Speak Price Output"
              >
                <Volume2 className="w-4 h-4" />
                <span>Speak</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#166534]">
                {priceResult.totalCalculatedPrice !== null
                  ? `₹${priceResult.totalCalculatedPrice}`
                  : 'N/A'}
              </span>
              <span className="text-xs text-[#4B5563]">
                ({selectedCategory}, {weightKg} kg)
              </span>
            </div>

            {/* Honesty Status Badge */}
            <div className="pt-2 border-t border-[#E5E7EB]">
              {priceResult.isTestCalculation ? (
                <div className="inline-block bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[11px] font-bold px-2.5 py-1 rounded-md">
                  {priceResult.statusLabel}
                </div>
              ) : priceResult.isAvailable ? (
                <div className="inline-block bg-[#DCFCE7] border border-[#16A34A] text-[#166534] text-[11px] font-bold px-2.5 py-1 rounded-md">
                  {priceResult.statusLabel}: ₹{priceResult.ratePerKg}/kg
                </div>
              ) : (
                <div className="inline-block bg-gray-100 border border-gray-300 text-gray-600 text-[11px] font-medium px-2.5 py-1 rounded-md">
                  {priceResult.statusLabel} • {priceResult.details}
                </div>
              )}
            </div>

            {/* Test Rate Entry if in TEST DATA MODE */}
            {isTestDataMode && (
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] bg-[#FEF3C7]/40 p-2.5 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="test-rate-input" className="text-[11px] font-bold text-[#92400E]">
                    Enter Test Buying Rate (₹/kg):
                  </label>
                  <span className="text-[10px] text-[#92400E] font-medium">TEST MODE ONLY</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#92400E]">₹</span>
                  <input
                    id="test-rate-input"
                    type="number"
                    value={manualTestRate}
                    onChange={(e) => setManualTestRate(e.target.value)}
                    className="w-24 px-2 py-1 bg-white border border-[#F59E0B] rounded text-xs font-bold text-[#111827]"
                  />
                  <span className="text-[11px] text-[#4B5563]">per kg</span>
                </div>
              </div>
            )}
          </div>

          {/* Recycler Directory Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider">
                Select Destination Recycler
              </label>
              <span className="text-[11px] text-[#4B5563]">
                {availableRecyclers.length} registered
              </span>
            </div>

            {availableRecyclers.length === 0 ? (
              /* Honest Empty State: Empty means empty */
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-center">
                <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-[#111827]">{emptyRecyclersMsg}</p>
                <p className="text-[11px] text-[#4B5563] mt-0.5">
                  No invented recyclers are displayed. Switch on &quot;TEST DATA MODE&quot; in the top bar to inspect demo recyclers.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableRecyclers.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecyclerId(rec.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRecyclerId === rec.id
                        ? 'border-[#16A34A] bg-[#DCFCE7]/20 shadow-xs'
                        : 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-gray-300'
                    }`}
                  >
                    {/* If test recycler, display mandatory label */}
                    {rec.is_test && (
                      <div className="mb-1.5 inline-block bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-black px-2 py-0.5 rounded">
                        TEST DATA — NOT A REAL RECYCLER
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#111827]">{rec.name}</h4>
                        <p className="text-xs text-[#4B5563] mt-0.5">{rec.location}</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{rec.contactPhone}</p>
                      </div>

                      <div className="text-right">
                        {rec.rates && rec.rates[selectedCategory] ? (
                          <span className="text-xs font-bold text-[#166534]">
                            ₹{rec.rates[selectedCategory]}/kg
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Rate N/A</span>
                        )}
                        <span className="block text-[10px] text-gray-400 mt-0.5">
                          {rec.verificationStatus === 'verified' ? '✓ CPCB Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('weight_condition')}
              className="flex-1 py-3 rounded-xl font-semibold text-xs border border-[#E5E7EB] text-[#4B5563] hover:bg-gray-50 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGenerateHandover}
              className="flex-2 py-3 rounded-xl font-bold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              <span>CONFIRM & GENERATE HANDOVER</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: HANDOVER QR & 6-DIGIT OTP ================= */}
      {currentStep === 'handover_ready' && createdTx && (
        <div className="space-y-5 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto mb-1">
            <CheckCircle2 className="w-7 h-7 text-[#16A34A]" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#111827]">Handover Initiated</h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Show this QR code or 6-digit OTP to the authorized recycler for physical weighing & verification.
            </p>
          </div>

          {/* Transaction ID & Test Badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-sm bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1 rounded-lg text-[#111827]">
              {createdTx.id}
            </span>
            {createdTx.is_test && (
              <span className="bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] text-[10px] font-bold px-2 py-1 rounded-lg">
                TEST TRANSACTION
              </span>
            )}
          </div>

          {/* QR Code Canvas */}
          {qrCodeDataUrl ? (
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl inline-block shadow-xs">
              <img src={qrCodeDataUrl} alt="Handover QR Code" className="w-48 h-48 mx-auto" />
              <span className="text-[10px] text-[#4B5563] mt-2 block font-medium">
                Recycler scans to import pickup details
              </span>
            </div>
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center mx-auto text-xs text-gray-400">
              Generating QR...
            </div>
          )}

          {/* Handover OTP */}
          <div className="p-4 bg-[#DBEAFE] border border-[#2563EB] rounded-2xl max-w-xs mx-auto">
            <span className="text-[11px] font-bold text-[#1E3A8A] uppercase tracking-wider block">
              6-Digit Handover OTP
            </span>
            <div className="text-3xl font-black tracking-[0.3em] text-[#1E3A8A] font-mono mt-1">
              {createdTx.handoverOtp}
            </div>
            <span className="text-[10px] text-[#1E3A8A] opacity-90 block mt-1">
              Provide this code to the recycler to authenticate handover
            </span>
          </div>

          {/* Action Button: Finish */}
          <button
            type="button"
            onClick={() => onComplete(createdTx)}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#16A34A] text-white hover:bg-[#15803D] cursor-pointer shadow-xs"
          >
            VIEW DIGITAL RECEIPT & PICKUP STATUS
          </button>
        </div>
      )}
    </div>
  );
};

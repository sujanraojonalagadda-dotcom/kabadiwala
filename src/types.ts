export type UserRole = 'collector' | 'recycler' | 'admin';

export type EwasteCategory =
  | 'Laptop'
  | 'Mobile'
  | 'Monitor'
  | 'Television'
  | 'Printer'
  | 'Keyboard'
  | 'Mouse'
  | 'Cable'
  | 'Battery'
  | 'Other';

export const EWASTE_CATEGORIES: EwasteCategory[] = [
  'Laptop',
  'Mobile',
  'Monitor',
  'Television',
  'Printer',
  'Keyboard',
  'Mouse',
  'Cable',
  'Battery',
  'Other',
];

export type ItemCondition = 'Working' | 'Partially Working' | 'Not Working';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  preferredLanguage: string;
  location: string;
  verified: boolean;
  createdAt: string;
}

export interface RecyclerRate {
  category: EwasteCategory;
  ratePerKg: number;
  lastUpdated: string;
}

export interface RecyclerRecord {
  id: string;
  name: string;
  location: string;
  contactPhone: string;
  acceptedMaterials: EwasteCategory[];
  rates: Partial<Record<EwasteCategory, number>>;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  verificationDate: string | null;
  cpcbRegistrationNo: string | null;
  is_test: boolean;
  notes?: string;
}

export type TransactionStatus =
  | 'draft'
  | 'pending_handover'
  | 'handover_in_progress'
  | 'completed'
  | 'cancelled';

export interface TransactionRecord {
  id: string; // e.g. KC-2026-000142
  collectorId: string;
  collectorName: string;
  collectorPhone: string;
  recyclerId: string | null;
  recyclerName: string | null;
  category: EwasteCategory;
  weightKg: number;
  condition: ItemCondition;
  conditionFactor: number;
  ratePerKg: number | null;
  isTestRate: boolean;
  indicativePrice: number | null;
  finalPrice: number | null;
  finalWeightKg: number | null;
  handoverOtp: string;
  otpVerified: boolean;
  status: TransactionStatus;
  receiptNumber: string | null;
  tamperHash: string | null;
  photoUrl: string | null;
  aiClassification?: {
    suggestedCategory: string;
    confidenceVerbatim: string;
    modelUsed: string;
  };
  timestamps: {
    createdAt: string;
    handoverInitiatedAt?: string;
    completedAt?: string;
  };
  is_test: boolean;
}

export interface AuthSendOtpResponse {
  success: boolean;
  smsConfigured: boolean;
  message: string;
  cooldownSeconds?: number;
  isTestDemo?: boolean;
}

export interface AuthVerifyOtpResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  isNewUser?: boolean;
  message: string;
}

export interface PriceCalculationResult {
  isAvailable: boolean;
  ratePerKg: number | null;
  conditionFactor: number;
  totalCalculatedPrice: number | null;
  statusLabel: string;
  isTestCalculation: boolean;
  details: string;
}

export interface AiClassificationResult {
  available: boolean;
  category: EwasteCategory | null;
  confidenceVerbatim: string | null;
  explanation: string;
  message?: string;
}

export interface AdminStats {
  totalTransactions: number;
  totalEwasteKg: number;
  activeCollectors: number;
  verifiedRecyclers: number;
  formalChannelizationRateText: string;
  completedTransactionsCount: number;
}

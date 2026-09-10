import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  UserProfile,
  RecyclerRecord,
  TransactionRecord,
  EwasteCategory,
  EWASTE_CATEGORIES,
  AdminStats,
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// In-Memory Durable Store for Container Lifetime
interface ServerState {
  users: Map<string, UserProfile>;
  recyclers: Map<string, RecyclerRecord>;
  transactions: Map<string, TransactionRecord>;
  otpStore: Map<
    string,
    {
      codeHash: string;
      expiresAt: number;
      attempts: number;
      isTest: boolean;
    }
  >;
  transactionCounter: number;
}

const state: ServerState = {
  users: new Map(),
  recyclers: new Map(),
  transactions: new Map(),
  otpStore: new Map(),
  transactionCounter: 1001,
};

// Seed 1 labelled test recycler ONLY for TEST DATA MODE
// Real recycler directory starts completely EMPTY per Honesty Rules!
const TEST_RECYCLER_ID = 'rec_test_ecocycle';
state.recyclers.set(TEST_RECYCLER_ID, {
  id: TEST_RECYCLER_ID,
  name: 'EcoCycle Test Facility (Demo)',
  location: 'Industrial Area Phase 2, New Delhi',
  contactPhone: '+91 98765 43210',
  acceptedMaterials: ['Laptop', 'Mobile', 'Monitor', 'Television', 'Printer', 'Keyboard', 'Mouse', 'Cable', 'Battery'],
  rates: {
    Laptop: 140, // rate per kg
    Mobile: 220,
    Monitor: 65,
    Television: 45,
    Printer: 40,
    Keyboard: 25,
    Mouse: 25,
    Cable: 180,
    Battery: 95,
  },
  verificationStatus: 'unverified',
  verificationDate: null,
  cpcbRegistrationNo: null,
  is_test: true,
  notes: 'TEST DATA — NOT A REAL RECYCLER. Used strictly for flow demonstration.',
});

// Helper for hashing OTPs
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Generate KC-YYYY-NNNNNN Transaction ID
function generateTransactionId(): string {
  const year = new Date().getFullYear();
  const num = state.transactionCounter++;
  const padded = String(num).padStart(6, '0');
  return `KC-${year}-${padded}`;
}

// Generate 6-digit random code
function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Compute tamper-evident receipt hash
function generateReceiptHash(tx: Partial<TransactionRecord>): string {
  const payload = `${tx.id}|${tx.collectorPhone}|${tx.recyclerId}|${tx.category}|${tx.finalWeightKg}|${tx.finalPrice}|${tx.timestamps?.completedAt}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();
}

// Check SMS Provider configuration
function getSmsConfigStatus() {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;

  const isTwilioConfigured = Boolean(twilioSid && twilioAuth && twilioPhone);
  const isFast2SmsConfigured = Boolean(fast2SmsKey);

  return {
    isConfigured: isTwilioConfigured || isFast2SmsConfigured,
    provider: isTwilioConfigured ? 'Twilio' : isFast2SmsConfigured ? 'Fast2SMS' : 'None',
  };
}

// Dispatch SMS via configured gateway
async function sendSmsViaGateway(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const { isConfigured, provider } = getSmsConfigStatus();
  if (!isConfigured) {
    return { success: false, error: 'SMS Provider not configured in environment variables' };
  }

  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;

  if (provider === 'Twilio') {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID!;
      const token = process.env.TWILIO_AUTH_TOKEN!;
      const from = process.env.TWILIO_PHONE_NUMBER!;
      const body = `Your Kabadiwala Connect verification code is: ${otp}. Valid for 5 minutes. Do not share this OTP.`;

      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      params.append('From', from);
      params.append('Body', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Twilio error: ${errText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Twilio send failure' };
    }
  } else if (provider === 'Fast2SMS') {
    try {
      const apiKey = process.env.FAST2SMS_API_KEY!;
      const cleanNumber = formattedPhone.replace('+91', '');
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: otp,
          route: 'otp',
          numbers: cleanNumber,
        }),
      });
      const json = await response.json();
      if (!json.return) {
        return { success: false, error: json.message || 'Fast2SMS send error' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Fast2SMS failure' };
    }
  }

  return { success: false, error: 'Unsupported SMS gateway' };
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// 1. Auth Status & SMS Config Check
app.get('/api/auth/sms-status', (req, res) => {
  const smsStatus = getSmsConfigStatus();
  res.json({
    smsConfigured: smsStatus.isConfigured,
    provider: smsStatus.provider,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. Send Mobile OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone, isGuidedTestMode } = req.body;
  const cleanPhone = (phone || '').replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid mobile number. Please enter a valid 10-digit Indian phone number.',
    });
  }

  const normalizedPhone = cleanPhone.slice(-10);
  const smsStatus = getSmsConfigStatus();

  // If SMS is NOT configured and NOT in Guided Test Mode:
  if (!smsStatus.isConfigured && !isGuidedTestMode) {
    return res.status(503).json({
      success: false,
      smsConfigured: false,
      message:
        'SMS sending account is not configured in Cloud settings. To receive real OTP SMS on +91 numbers, please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER (or FAST2SMS_API_KEY). In accordance with the Honesty Rules, fake codes are never substituted.',
    });
  }

  // Generate 6-digit OTP
  const otp = isGuidedTestMode && !smsStatus.isConfigured ? '123456' : generate6DigitCode();
  const codeHash = hashOtp(otp);

  state.otpStore.set(normalizedPhone, {
    codeHash,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    isTest: Boolean(isGuidedTestMode && !smsStatus.isConfigured),
  });

  if (smsStatus.isConfigured) {
    const smsResult = await sendSmsViaGateway(`+91${normalizedPhone}`, otp);
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        smsConfigured: true,
        message: `Failed to deliver real SMS: ${smsResult.error}`,
      });
    }

    return res.json({
      success: true,
      smsConfigured: true,
      message: `Verification code sent via SMS to +91 ${normalizedPhone}.`,
      cooldownSeconds: 45,
    });
  }

  // Guided test mode without SMS gateway
  return res.json({
    success: true,
    smsConfigured: false,
    isTestDemo: true,
    message: 'GUIDED TEST MODE: Test OTP generated for stage demonstration (123456).',
    cooldownSeconds: 30,
  });
});

// 3. Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp, isGuidedTestMode } = req.body;
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

  if (!cleanPhone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and 6-digit OTP are required.' });
  }

  const record = state.otpStore.get(cleanPhone);
  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'No active OTP request found for this number. Please tap Resend OTP.',
    });
  }

  if (Date.now() > record.expiresAt) {
    state.otpStore.delete(cleanPhone);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }

  if (record.attempts >= 4) {
    state.otpStore.delete(cleanPhone);
    return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
  }

  const inputHash = hashOtp(String(otp).trim());
  if (inputHash !== record.codeHash) {
    record.attempts++;
    return res.status(400).json({
      success: false,
      message: `Incorrect OTP. ${4 - record.attempts} attempts remaining.`,
    });
  }

  // OTP verified! Clean up OTP record
  state.otpStore.delete(cleanPhone);

  // Check if profile exists
  let user = state.users.get(cleanPhone);
  const isNewUser = !user;

  if (!user) {
    user = {
      id: `usr_${cleanPhone}`,
      name: '',
      phone: `+91 ${cleanPhone}`,
      role: 'collector',
      preferredLanguage: 'hi',
      location: '',
      verified: false,
      createdAt: new Date().toISOString(),
    };
    state.users.set(cleanPhone, user);
  }

  return res.json({
    success: true,
    isNewUser,
    user,
    token: `token_${cleanPhone}_${Date.now()}`,
    message: isNewUser ? 'Phone verified. Complete your collector registration.' : 'Signed in successfully.',
  });
});

// 4. Collector Profile Update / Registration
app.post('/api/auth/register-collector', (req, res) => {
  const { phone, name, preferredLanguage, location, role } = req.body;
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

  if (!cleanPhone) {
    return res.status(400).json({ success: false, message: 'Invalid phone' });
  }

  let user = state.users.get(cleanPhone);
  if (!user) {
    user = {
      id: `usr_${cleanPhone}`,
      name: name || 'Waste Collector',
      phone: `+91 ${cleanPhone}`,
      role: role || 'collector',
      preferredLanguage: preferredLanguage || 'hi',
      location: location || '',
      verified: true,
      createdAt: new Date().toISOString(),
    };
  } else {
    user.name = name || user.name;
    user.preferredLanguage = preferredLanguage || user.preferredLanguage;
    user.location = location || user.location;
    user.role = role || user.role;
    user.verified = true;
  }

  state.users.set(cleanPhone, user);
  return res.json({ success: true, user });
});

// 5. Get Recyclers Directory
app.get('/api/recyclers', (req, res) => {
  const includeTest = req.query.includeTest === 'true';
  const list: RecyclerRecord[] = [];

  for (const recycler of state.recyclers.values()) {
    if (recycler.is_test) {
      if (includeTest) {
        list.push(recycler);
      }
    } else {
      // Real recycler records
      list.push(recycler);
    }
  }

  res.json({ recyclers: list });
});

// 6. Create / Update Recycler (Real onboarding)
app.post('/api/recyclers', (req, res) => {
  const { name, location, contactPhone, acceptedMaterials, rates, cpcbRegistrationNo } = req.body;
  if (!name || !contactPhone) {
    return res.status(400).json({ error: 'Name and contact phone are required' });
  }

  const id = `rec_${Date.now()}`;
  const newRecycler: RecyclerRecord = {
    id,
    name,
    location: location || 'Unspecified Location',
    contactPhone,
    acceptedMaterials: acceptedMaterials || ['Laptop', 'Mobile'],
    rates: rates || {},
    verificationStatus: 'unverified',
    verificationDate: null,
    cpcbRegistrationNo: cpcbRegistrationNo || null,
    is_test: false,
  };

  state.recyclers.set(id, newRecycler);
  res.json({ success: true, recycler: newRecycler });
});

// 7. Recycler Update Rates
app.post('/api/recyclers/:id/rates', (req, res) => {
  const { id } = req.params;
  const { rates } = req.body;

  const recycler = state.recyclers.get(id);
  if (!recycler) {
    return res.status(404).json({ error: 'Recycler not found' });
  }

  recycler.rates = { ...recycler.rates, ...rates };
  res.json({ success: true, recycler });
});

// 8. Admin Verify Recycler
app.post('/api/admin/verify-recycler', (req, res) => {
  const { recyclerId, cpcbRegistrationNo, status } = req.body;
  const recycler = state.recyclers.get(recyclerId);

  if (!recycler) {
    return res.status(404).json({ error: 'Recycler not found' });
  }

  recycler.verificationStatus = status === 'verified' ? 'verified' : 'rejected';
  recycler.verificationDate = status === 'verified' ? new Date().toISOString() : null;
  if (cpcbRegistrationNo) {
    recycler.cpcbRegistrationNo = cpcbRegistrationNo;
  }

  res.json({ success: true, recycler });
});

// 9. Transactions API
app.get('/api/transactions', (req, res) => {
  const { collectorPhone, recyclerId, includeTest } = req.query;
  const list: TransactionRecord[] = [];

  for (const tx of state.transactions.values()) {
    if (tx.is_test && includeTest !== 'true') {
      continue;
    }
    if (collectorPhone && !tx.collectorPhone.includes(String(collectorPhone))) {
      continue;
    }
    if (recyclerId && tx.recyclerId !== recyclerId) {
      continue;
    }
    list.push(tx);
  }

  // Sort descending by creation
  list.sort((a, b) => new Date(b.timestamps.createdAt).getTime() - new Date(a.timestamps.createdAt).getTime());
  res.json({ transactions: list });
});

app.post('/api/transactions', (req, res) => {
  const {
    collectorId,
    collectorName,
    collectorPhone,
    recyclerId,
    recyclerName,
    category,
    weightKg,
    condition,
    conditionFactor,
    ratePerKg,
    isTestRate,
    indicativePrice,
    is_test,
    photoUrl,
    aiClassification,
  } = req.body;

  if (!category || !weightKg) {
    return res.status(400).json({ error: 'Category and weight in kg are required' });
  }

  const txId = generateTransactionId();
  const handoverOtp = generate6DigitCode();

  const newTx: TransactionRecord = {
    id: txId,
    collectorId: collectorId || 'anon',
    collectorName: collectorName || 'Waste Collector',
    collectorPhone: collectorPhone || 'Unknown',
    recyclerId: recyclerId || null,
    recyclerName: recyclerName || null,
    category: category as EwasteCategory,
    weightKg: Number(weightKg),
    condition: condition || 'Working',
    conditionFactor: Number(conditionFactor || 1.0),
    ratePerKg: ratePerKg !== null ? Number(ratePerKg) : null,
    isTestRate: Boolean(isTestRate),
    indicativePrice: indicativePrice !== null ? Number(indicativePrice) : null,
    finalPrice: null,
    finalWeightKg: null,
    handoverOtp,
    otpVerified: false,
    status: 'pending_handover',
    receiptNumber: null,
    tamperHash: null,
    photoUrl: photoUrl || null,
    aiClassification,
    timestamps: {
      createdAt: new Date().toISOString(),
      handoverInitiatedAt: new Date().toISOString(),
    },
    is_test: Boolean(is_test),
  };

  state.transactions.set(txId, newTx);
  res.json({ success: true, transaction: newTx });
});

// 10. Handover Confirmation by Recycler (QR / OTP)
app.post('/api/transactions/:id/handover', (req, res) => {
  const { id } = req.params;
  const { otp, finalWeightKg, finalPrice, recyclerId, recyclerName } = req.body;

  const tx = state.transactions.get(id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (tx.status === 'completed') {
    return res.status(400).json({ error: 'Transaction is already completed' });
  }

  // Check OTP
  if (String(tx.handoverOtp).trim() !== String(otp).trim()) {
    return res.status(400).json({ error: 'Invalid 6-digit Handover OTP. Handover denied.' });
  }

  // Complete handover
  tx.otpVerified = true;
  tx.status = 'completed';
  tx.finalWeightKg = Number(finalWeightKg || tx.weightKg);
  tx.finalPrice = Number(finalPrice !== undefined ? finalPrice : tx.indicativePrice || 0);
  if (recyclerId) tx.recyclerId = recyclerId;
  if (recyclerName) tx.recyclerName = recyclerName;
  tx.receiptNumber = `REC-${tx.id.replace('KC-', '')}`;
  tx.timestamps.completedAt = new Date().toISOString();
  tx.tamperHash = generateReceiptHash(tx);

  res.json({ success: true, transaction: tx });
});

// 11. Admin Aggregated Analytics (Real stored counts only!)
app.get('/api/admin/stats', (req, res) => {
  const includeTest = req.query.includeTest === 'true';

  let totalTransactions = 0;
  let totalEwasteKg = 0;
  let completedTransactionsCount = 0;

  for (const tx of state.transactions.values()) {
    if (tx.is_test && !includeTest) continue;
    totalTransactions++;
    if (tx.status === 'completed') {
      completedTransactionsCount++;
      totalEwasteKg += tx.finalWeightKg || tx.weightKg || 0;
    }
  }

  let verifiedRecyclers = 0;
  for (const rec of state.recyclers.values()) {
    if (rec.is_test && !includeTest) continue;
    if (rec.verificationStatus === 'verified') {
      verifiedRecyclers++;
    }
  }

  // Active collectors
  let activeCollectors = 0;
  for (const user of state.users.values()) {
    if (user.role === 'collector') {
      activeCollectors++;
    }
  }

  const stats: AdminStats = {
    totalTransactions,
    totalEwasteKg: Math.round(totalEwasteKg * 10) / 10,
    activeCollectors,
    verifiedRecyclers,
    // Per honesty rules: no invented numbers. Empty/zero state displays "N/A"
    formalChannelizationRateText: totalTransactions === 0 ? 'N/A' : `${Math.round((completedTransactionsCount / totalTransactions) * 100)}%`,
    completedTransactionsCount,
  };

  res.json({ stats });
});

// 12. Gemini AI E-Waste Classification Route
app.post('/api/ai/classify-ewaste', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      available: false,
      message: 'AI classification not connected. GEMINI_API_KEY is not configured in server secrets.',
      category: null,
      confidenceVerbatim: null,
    });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'Image data is required for classification' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are an honest e-waste classification vision system.
Analyze the provided item image carefully.
Choose the MOST accurate category ONLY from this exact allowed list:
- Laptop
- Mobile
- Monitor
- Television
- Printer
- Keyboard
- Mouse
- Cable
- Battery
- Other

Output your response strictly as valid JSON in this exact structure:
{
  "category": "Laptop | Mobile | Monitor | Television | Printer | Keyboard | Mouse | Cable | Battery | Other",
  "confidenceVerbatim": "e.g. 92% or 88% based on visual clarity",
  "explanation": "Brief 1-sentence physical observation of what you identified in the photo"
}
Do not invent anything. If the image is unclear or not e-waste, categorize as "Other".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        category: 'Other',
        confidenceVerbatim: 'Unspecified',
        explanation: text.substring(0, 100),
      };
    }

    // Verify category is valid
    const validCategory = EWASTE_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';

    return res.json({
      available: true,
      category: validCategory,
      confidenceVerbatim: parsed.confidenceVerbatim || 'High confidence',
      explanation: parsed.explanation || 'Visual analysis completed',
    });
  } catch (err: any) {
    console.error('AI classification error:', err);
    return res.json({
      available: false,
      message: `AI classification unavailable: ${err.message || 'Model call failed'}`,
      category: null,
      confidenceVerbatim: null,
    });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Production Static
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`♻ Kabadiwala Connect Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

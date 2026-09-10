# Security Specification: Kabadiwala Connect Firestore Rules

## 1. Data Invariants
- **Identity Invariant**: Users can read and update only their own profile record (`/users/{userId}`). No user may self-elevate permissions or spoof another user's identifier.
- **Role Invariant**: Administrative capabilities (such as verifying recycling facilities or overriding statuses) require an explicit admin record in `/admins/{adminId}` or designated admin privileges.
- **Transaction State Machine Invariant**: A transaction begins in `created` or `pending_pickup` and moves to `completed` only when confirmed with valid parameters. Once marked `completed` (terminal state), no further mutations to financial or physical figures are permitted.
- **Physical Handover Integrity**: The `handoverOtp` must remain a 6-digit numeric sequence. Scale-confirmed weights and final prices can only be committed during completion.
- **Recycler Authorization Invariant**: Only verified recyclers and admins can modify published material pricing rates.
- **Public & Diagnostic Path Invariant**: The diagnostic connectivity test doc `/test/{testId}` allows reading for client boot health checks.

## 2. The "Dirty Dozen" Threat Payloads (Must be Denied)

1. **DD-01 (Identity Spoofing on User Profile Creation)**: Unauthenticated or mismatched user attempting to create or overwrite `/users/usr_victim_123` with a different UID.
2. **DD-02 (Privilege Escalation via Role Modification)**: Standard collector attempting an update to set `"role": "admin"` on their profile.
3. **DD-03 (Ghost Field Injection / Shadow Update)**: Update payload on `/users/{userId}` injecting unauthorized field `"isPlatformSuperAdmin": true`.
4. **DD-04 (Terminal State Mutation)**: Attempting to update `finalPrice` or `finalWeightKg` on a transaction where `status == "completed"`.
5. **DD-05 (Denial of Wallet / 10MB String Ingestion)**: Writing a transaction with a massive junk payload (e.g. 1MB description in `category`).
6. **DD-06 (Invalid Handover OTP Format)**: Setting `handoverOtp` to `"ABCD1234"` or string exceeding 6 characters.
7. **DD-07 (Unauthorized Recycler Rate Tampering)**: An unauthenticated client writing higher payout rates to `/recyclers/{recId}`.
8. **DD-08 (Unauthorized CPCB Compliance Self-Certification)**: A recycler attempting to self-mark `"verificationStatus": "verified"` without admin approval.
9. **DD-09 (Cross-Collector Transaction Deletion)**: A collector attempting to delete another collector's transaction history.
10. **DD-10 (Negative Weight / Price Injection)**: Submitting a transaction with `weightKg: -50.0` or `finalPrice: -1000`.
11. **DD-11 (Timestamp Falsification)**: Providing a client-forged future timestamp for `createdAt` instead of conforming to standard request timing.
12. **DD-12 (Global Catch-All Probe)**: Probing random system paths `/databases/(default)/documents/system_secrets/config` expecting read access.

## 3. Test Runner Design
The companion test suite `firestore.rules.test.ts` validates that every one of the 12 Dirty Dozen payloads triggers `PERMISSION_DENIED`.

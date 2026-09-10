import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, TransactionRecord, EwasteCategory } from './types.js';
import { authService } from './services/authService.js';
import { transactionService } from './services/transactionService.js';
import { offlineService } from './services/offlineService.js';
import { Header } from './components/Header.js';
import { LoginView } from './components/LoginView.js';
import { CollectorHome } from './components/CollectorHome.js';
import { AddEwasteFlow } from './components/AddEwasteFlow.js';
import { DigitalReceipt } from './components/DigitalReceipt.js';
import { CollectorHistory } from './components/CollectorHistory.js';
import { CollectorProfile } from './components/CollectorProfile.js';
import { RecyclerDashboard } from './components/RecyclerDashboard.js';
import { AdminDashboard } from './components/AdminDashboard.js';

type CollectorScreen = 'home' | 'add_ewaste' | 'history' | 'profile' | 'receipt';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || 'collector');
  const [collectorScreen, setCollectorScreen] = useState<CollectorScreen>('home');
  const [activeCategoryForAdd, setActiveCategoryForAdd] = useState<EwasteCategory | undefined>(undefined);
  const [activeReceiptTx, setActiveReceiptTx] = useState<TransactionRecord | null>(null);

  // Test Data Mode & Guided Test Mode state
  const [isTestDataMode, setIsTestDataMode] = useState<boolean>(true); // Enabled by default for stage demo preview
  const [isGuidedTestMode, setIsGuidedTestMode] = useState<boolean>(true); // Guided test mode for demo

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(offlineService.isOnline());

  // Recent pickups cache
  const [collectorPickups, setCollectorPickups] = useState<TransactionRecord[]>([]);

  // Auth listener
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
      if (user) {
        setActiveRole(user.role);
      }
    });
    return () => unsub();
  }, []);

  // Online listener
  useEffect(() => {
    const unsub = offlineService.subscribeOnline((online) => {
      setIsOnline(online);
      if (online) {
        loadCollectorPickups();
      }
    });
    return () => unsub();
  }, []);

  // Load collector pickups
  const loadCollectorPickups = async () => {
    if (!currentUser) return;
    const cleanPhone = currentUser.phone.replace(/\D/g, '').slice(-10);
    const list = await transactionService.getTransactions({
      collectorPhone: cleanPhone,
      includeTest: isTestDataMode,
    });
    setCollectorPickups(list);
  };

  useEffect(() => {
    if (currentUser) {
      loadCollectorPickups();
    }
  }, [currentUser, isTestDataMode]);

  // If not logged in, render Phase 1 LoginView
  if (!currentUser) {
    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          setActiveRole(user.role);
          setCollectorScreen('home');
        }}
        isGuidedTestMode={isGuidedTestMode}
        onToggleGuidedTestMode={() => setIsGuidedTestMode((prev) => !prev)}
      />
    );
  }

  // Handle stage demo handover simulation
  const handleSimulateHandover = async (txId: string, otp: string) => {
    const result = await transactionService.verifyHandover({
      transactionId: txId,
      otp,
      finalWeightKg: activeReceiptTx?.weightKg || 1.5,
      finalPrice: activeReceiptTx?.indicativePrice || 180,
      recyclerId: 'rec_test_ecocycle',
      recyclerName: 'EcoCycle Test Facility (Demo)',
    });

    if (result.success && result.transaction) {
      setActiveReceiptTx(result.transaction);
      loadCollectorPickups();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleChange={(role) => {
          setActiveRole(role);
          authService.switchRole(role);
        }}
        isTestDataMode={isTestDataMode}
        onToggleTestDataMode={() => setIsTestDataMode((prev) => !prev)}
        isGuidedTestMode={isGuidedTestMode}
        onToggleGuidedTestMode={() => setIsGuidedTestMode((prev) => !prev)}
        isOnline={isOnline}
        onLogout={() => authService.logout()}
        onOpenProfile={() => setCollectorScreen('profile')}
      />

      {/* Main Role-Based Views */}
      <main className="flex-1">
        {activeRole === 'collector' && (
          <>
            {collectorScreen === 'home' && (
              <CollectorHome
                currentUser={currentUser}
                recentPickups={collectorPickups}
                onStartAddEwaste={(cat) => {
                  setActiveCategoryForAdd(cat);
                  setCollectorScreen('add_ewaste');
                }}
                onViewHistory={() => setCollectorScreen('history')}
                onViewProfile={() => setCollectorScreen('profile')}
                onViewReceipt={(tx) => {
                  setActiveReceiptTx(tx);
                  setCollectorScreen('receipt');
                }}
              />
            )}

            {collectorScreen === 'add_ewaste' && (
              <AddEwasteFlow
                currentUser={currentUser}
                initialCategory={activeCategoryForAdd}
                isTestDataMode={isTestDataMode}
                onCancel={() => setCollectorScreen('home')}
                onComplete={(tx) => {
                  setActiveReceiptTx(tx);
                  setCollectorScreen('receipt');
                  loadCollectorPickups();
                }}
              />
            )}

            {collectorScreen === 'receipt' && activeReceiptTx && (
              <DigitalReceipt
                transaction={activeReceiptTx}
                onBack={() => setCollectorScreen('home')}
                onSimulateRecyclerHandover={handleSimulateHandover}
              />
            )}

            {collectorScreen === 'history' && (
              <CollectorHistory
                transactions={collectorPickups}
                onBack={() => setCollectorScreen('home')}
                onSelectTransaction={(tx) => {
                  setActiveReceiptTx(tx);
                  setCollectorScreen('receipt');
                }}
                onStartNewPickup={() => {
                  setActiveCategoryForAdd(undefined);
                  setCollectorScreen('add_ewaste');
                }}
              />
            )}

            {collectorScreen === 'profile' && (
              <CollectorProfile
                currentUser={currentUser}
                onBack={() => setCollectorScreen('home')}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onLogout={() => authService.logout()}
              />
            )}
          </>
        )}

        {activeRole === 'recycler' && (
          <RecyclerDashboard
            isTestDataMode={isTestDataMode}
            onRefreshGlobalData={loadCollectorPickups}
          />
        )}

        {activeRole === 'admin' && (
          <AdminDashboard
            isTestDataMode={isTestDataMode}
            onRefreshGlobalData={loadCollectorPickups}
          />
        )}
      </main>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_BALANCE = '@unigo_wallet_balance';
const STORAGE_KEY_TRANSACTIONS = '@unigo_wallet_transactions';

const WalletContext = createContext({
  balance: 0,
  transactions: [],
  addMoney: async () => {},
  deductMoney: async () => {},
});

export function WalletProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Load from AsyncStorage on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [savedBalance, savedTxns] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_BALANCE),
          AsyncStorage.getItem(STORAGE_KEY_TRANSACTIONS),
        ]);
        if (mounted) {
          if (savedBalance !== null) setBalance(parseFloat(savedBalance));
          if (savedTxns !== null) setTransactions(JSON.parse(savedTxns));
        }
      } catch (e) {
        console.warn('WalletProvider load error:', e);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const persist = useCallback(async (newBalance, newTxns) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_BALANCE, String(newBalance)),
        AsyncStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(newTxns)),
      ]);
    } catch (e) {
      console.warn('WalletProvider persist error:', e);
    }
  }, []);

  const addMoney = useCallback(async (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    const newBalance = balance + numAmount;
    const txn = {
      id: Date.now().toString(),
      title: 'Added to wallet',
      amount: numAmount,
      type: 'credit',
      date: new Date().toISOString(),
    };
    const newTxns = [txn, ...transactions];
    setBalance(newBalance);
    setTransactions(newTxns);
    await persist(newBalance, newTxns);
  }, [balance, transactions, persist]);

  const deductMoney = useCallback(async (amount, note = 'Payment') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;
    if (numAmount > balance) return false;
    const newBalance = balance - numAmount;
    const txn = {
      id: Date.now().toString(),
      title: note,
      amount: numAmount,
      type: 'debit',
      date: new Date().toISOString(),
    };
    const newTxns = [txn, ...transactions];
    setBalance(newBalance);
    setTransactions(newTxns);
    await persist(newBalance, newTxns);
    return true;
  }, [balance, transactions, persist]);

  return (
    <WalletContext.Provider value={{ balance, transactions, addMoney, deductMoney }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, WalletStats, AccountType, EntryMode, TransactionType, PersonRecord, WalletAccount } from './types';
import { LockScreen } from './components/LockScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AddWalletModal } from './components/AddWalletModal';
import { TransactionSlipModal } from './components/TransactionSlipModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { isSessionAuthenticated, lockWalletSession } from './services/security';
import { addTransactionToGoogleSheet, isAutoSyncEnabled, getSheetUrl } from './services/sheetService';

// --- Default Wallets ---
const DEFAULT_ACCOUNTS: WalletAccount[] = [
  { id: 'b1', name: 'বিকাশ ১', icon: 'fa-dove', iconBg: 'bg-rose-50 dark:bg-rose-950/40', iconColor: 'text-rose-500', isDefault: true },
  { id: 'b2', name: 'বিকাশ ২', icon: 'fa-dove', iconBg: 'bg-rose-50 dark:bg-rose-950/40', iconColor: 'text-rose-500', isDefault: true },
  { id: 'bank', name: 'ব্যাংক', icon: 'fa-building-columns', iconBg: 'bg-sky-50 dark:bg-sky-950/40', iconColor: 'text-sky-500', isDefault: true },
  { id: 'cash', name: 'ক্যাশ', icon: 'fa-money-bill-wave', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-500', isDefault: true },
];

// --- Helper Components ---

const DashboardCard: React.FC<{ 
  label: string; 
  amount: number; 
  icon: string; 
  iconBg: string; 
  iconColor: string; 
  borderColor?: string; 
  onClick?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}> = ({ label, amount, icon, iconBg, iconColor, borderColor = '', onClick, onDelete, canDelete }) => (
  <div 
    onClick={onClick}
    className={`bg-[var(--card)] px-3 py-5 rounded-[22px] text-center border-2 ${borderColor || 'border-[var(--border)]'} shadow-sm premium-card cursor-pointer group theme-transition relative`}
  >
    {canDelete && onDelete && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="ওয়ালেট ডিলেট করুন"
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-[9px] cursor-pointer"
      >
        <i className="fa-solid fa-trash-can"></i>
      </button>
    )}
    <div className={`w-11 h-11 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center mx-auto mb-2.5 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">{label}</span>
    <p className="text-base font-black group-hover:text-[var(--accent)] transition-colors duration-300">৳ {amount.toLocaleString('bn-BD')}</p>
  </div>
);

const TabItem: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`group flex flex-col items-center gap-1.5 p-4 rounded-[28px] border-2 font-black text-[12px] transition-all theme-transition cursor-pointer ${
      active 
        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xl scale-[1.02] z-10' 
        : 'bg-[var(--card)] text-slate-400 border-[var(--border)] hover:border-[var(--accent)]/40'
    }`}
  >
    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800/30'}`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    {label}
  </button>
);

const InputGroup: React.FC<{ label: string; icon: string; children: React.ReactNode; required?: boolean }> = ({ label, icon, children, required }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest ml-1 flex items-center gap-2">
       <i className={`fa-solid ${icon} text-[var(--accent)]`}></i> {label} {required && <span className="text-rose-500 font-bold">*</span>}
    </label>
    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]/40 focus-within:border-[var(--accent)] transition-all flex items-center gap-3">
       {children}
    </div>
  </div>
);

const CopyOverlay: React.FC<{ show: boolean }> = ({ show }) => (
  show ? (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--accent)]/5 rounded-2xl copy-checkmark-anim z-[1000] pointer-events-none">
      <div className="bg-[var(--accent)] text-white w-20 h-20 rounded-full flex items-center justify-center shadow-2xl scale-125">
        <i className="fa-solid fa-check text-4xl"></i>
      </div>
    </div>
  ) : null
);

const Watermark: React.FC = () => (
  <div className="mt-20 mb-10 text-center select-none opacity-20 hover:opacity-40 transition-opacity">
    <p className="text-[24px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[1.4em] whitespace-nowrap">MAHIM</p>
  </div>
);

const TransactionRow: React.FC<{ 
  t: Transaction; 
  onDelete?: (id: string) => void; 
  onReverse?: (id: string) => void; 
  onEdit?: (t: Transaction) => void; 
  onClick?: () => void; 
}> = ({ t, onDelete, onReverse, onEdit, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="relative flex items-center justify-between p-4 bg-[var(--card)] rounded-[22px] border border-[var(--border)] hover:border-[var(--accent)] transition-all group theme-transition cursor-pointer active:scale-95 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${
          t.type === 'Income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 
          t.type === 'Transfer' ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400' : 
          'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
        }`}>
          <i className={`fa-solid ${t.type === 'Income' ? 'fa-arrow-down' : t.type === 'Transfer' ? 'fa-repeat' : 'fa-arrow-up'}`}></i>
        </div>
        <div className="overflow-hidden">
          <p className="text-[12px] font-bold truncate max-w-[150px] text-slate-900 dark:text-slate-100">{t.description}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{t.date} • {t.account}{t.toAccount ? ` ➔ ${t.toAccount}` : ''}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <p className={`text-[12px] font-black ${
          t.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 
          t.type === 'Transfer' ? 'text-sky-500 dark:text-sky-400' : 
          'text-rose-600 dark:text-rose-400'
        }`}>
          {t.type === 'Income' ? '+' : t.type === 'Expense' ? '-' : ''}৳{t.amount.toLocaleString('bn-BD')}
        </p>
        {onDelete && onReverse && onEdit && (
          <div className="flex gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button title="স্লিপ" onClick={(e) => { e.stopPropagation(); if (onClick) onClick(); }} className="text-indigo-400 hover:text-indigo-600"><i className="fa-solid fa-receipt"></i></button>
            <button title="এডিট" onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="text-indigo-400 hover:text-indigo-600"><i className="fa-solid fa-pen-to-square"></i></button>
            <button title="উল্টান" onClick={(e) => { e.stopPropagation(); onReverse(t.id); }} className="text-sky-400 hover:text-sky-600"><i className="fa-solid fa-rotate-left"></i></button>
            <button title="ডিলেট" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash-can"></i></button>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const themes = ['light', 'dark', 'sakura', 'emerald'] as const;
  type ThemeType = typeof themes[number];
  
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('smart_wallet_theme') as ThemeType) || 'light';
  });

  // Password Lock
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isSessionAuthenticated());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Dynamic Wallets State
  const [accounts, setAccounts] = useState<WalletAccount[]>(() => {
    try {
      const saved = localStorage.getItem('smart_wallet_accounts');
      return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
    } catch (e) {
      return DEFAULT_ACCOUNTS;
    }
  });
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  // Google Sheets Modal State
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState(false);

  // Transactions State: synchronously loaded to avoid reload wipeout bug
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('smart_wallet_data');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [mode, setMode] = useState<EntryMode>('Self');
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; type: 'Lending' | 'Borrowing' } | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState<'full' | 'self'>('full');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Account specific filtering
  const [accountFilter, setAccountFilter] = useState<{label: string, value: string, type: 'account' | 'category'} | null>(null);
  const [isCopyingAccountView, setIsCopyingAccountView] = useState(false);
  const accountViewRef = useRef<HTMLDivElement>(null);

  // Copy Feedback States
  const [isCopyingStatement, setIsCopyingStatement] = useState(false);
  const [isCopyingSlip, setIsCopyingSlip] = useState(false);
  const [isCopyingLedger, setIsCopyingLedger] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    account: accounts[0]?.name || 'বিকাশ ১',
    toAccount: accounts[1]?.name || 'বিকাশ ২',
    description: '',
    amount: '',
    type: 'Expense' as 'Income' | 'Expense',
    person: '',
    ledgerType: 'Lending' as 'Lending' | 'Borrowing',
    action: 'ধার দেওয়া'
  });

  const receiptRef = useRef<HTMLDivElement>(null);
  const txReceiptRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('smart_wallet_data', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('smart_wallet_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    document.body.parentElement?.setAttribute('data-theme', theme);
    localStorage.setItem('smart_wallet_theme', theme);
  }, [theme]);

  // Ensure formData account is valid
  useEffect(() => {
    if (accounts.length > 0 && !accounts.some(a => a.name === formData.account)) {
      setFormData(prev => ({ ...prev, account: accounts[0].name }));
    }
  }, [accounts, formData.account]);

  // Core Math & Stats Calculation (Fixed Borrowing bug: ধার নেওয়া adds money to wallet (+))
  const stats = useMemo((): WalletStats => {
    const balances: Record<string, number> = {};
    accounts.forEach(a => { balances[a.name] = 0; });
    const personMap: Record<string, { Lending: number; Borrowing: number }> = {};

    transactions.forEach(t => {
      const amt = t.amount;
      const update = (acc: string, val: number) => {
        balances[acc] = (balances[acc] || 0) + val;
      };

      if (t.category === 'Self') {
        update(t.account, t.type === 'Income' ? amt : -amt);
      } else if (t.category === 'Transfer') {
        update(t.account, -amt);
        if (t.toAccount) update(t.toAccount, amt);
      } else {
        const p = t.person || 'Unknown';
        if (!personMap[p]) personMap[p] = { Lending: 0, Borrowing: 0 };

        if (t.category === 'Lending') {
          // পাওনা: ধার দেওয়া (- wallet, + Lending), ফেরত পাওয়া (+ wallet, - Lending)
          if (t.action === 'ধার দেওয়া') {
            personMap[p].Lending += amt;
            update(t.account, -amt);
          } else {
            personMap[p].Lending -= amt;
            update(t.account, amt);
          }
        } else {
          // দেনা (Borrowing) - USER FIX:
          // কারো কাছে ধার নেওয়া = ওয়ালেটে টাকা জমা (+ wallet), দেনা দায় বৃদ্ধি (+ Borrowing)
          // ধার শোধ দেওয়া = ওয়ালেট থেকে ব্যয় (- wallet), দেনা দায় হ্রাস (- Borrowing)
          if (t.action === 'ধার নেওয়া') {
            personMap[p].Borrowing += amt;
            update(t.account, amt); // (+) TO WALLET
          } else {
            personMap[p].Borrowing -= amt;
            update(t.account, -amt); // (-) FROM WALLET
          }
        }
      }
    });

    let rec = 0;
    let pay = 0;
    const pList: PersonRecord[] = [];
    Object.entries(personMap).forEach(([name, val]) => {
      if (val.Lending > 0) {
        pList.push({ name, amount: val.Lending, type: 'Lending' });
        rec += val.Lending;
      }
      if (val.Borrowing > 0) {
        pList.push({ name, amount: val.Borrowing, type: 'Borrowing' });
        pay += val.Borrowing;
      }
    });

    const totalCash = Object.values(balances).reduce((sum, v) => sum + v, 0);

    return {
      totalCash,
      loadingBalance: totalCash + rec - pay,
      receivable: rec,
      payable: pay,
      bikash1: balances['বিকাশ ১'] || 0,
      bikash2: balances['বিকাশ ২'] || 0,
      bank: balances['ব্যাংক'] || 0,
      cash: balances['ক্যাশ'] || 0,
      accountBalances: balances,
      recentTrans: [...transactions].reverse().slice(0, 15),
      personList: pList
    };
  }, [transactions, accounts]);

  const existingNames = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach(t => { if (t.person) names.add(t.person); });
    return Array.from(names);
  }, [transactions]);

  const handleSave = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      // @ts-ignore
      Swal.fire({ icon: 'error', title: 'টাকার পরিমাণ দিন' });
      return;
    }

    if (mode === 'Ledger' && !formData.person.trim()) {
      // @ts-ignore
      Swal.fire({ 
        icon: 'error', 
        title: 'ব্যক্তির নাম দিন', 
        text: 'দেনা-পাওনার হিসাবের জন্য ব্যক্তির নাম বাধ্যতামূলক।' 
      });
      return;
    }

    // Determine correct type
    let calculatedType: 'Income' | 'Expense' | 'Transfer' = formData.type;
    if (mode === 'Transfer') {
      calculatedType = 'Transfer';
    } else if (mode === 'Ledger') {
      if (formData.ledgerType === 'Lending') {
        calculatedType = formData.action === 'ধার দেওয়া' ? 'Expense' : 'Income';
      } else {
        calculatedType = formData.action === 'ধার নেওয়া' ? 'Income' : 'Expense';
      }
    }

    const newTx: Transaction = {
      id: editingId || Date.now().toString(),
      date: formData.date,
      category: mode === 'Ledger' ? formData.ledgerType : (mode as TransactionType),
      account: formData.account,
      toAccount: mode === 'Transfer' ? formData.toAccount : undefined,
      description: mode === 'Ledger' ? `${formData.ledgerType === 'Lending' ? 'পাওনা' : 'দেনা'}: ${formData.person} (${formData.action})` : formData.description || 'বিবরণ নেই',
      amount: parseFloat(formData.amount),
      type: calculatedType,
      person: mode === 'Ledger' ? formData.person.trim() : undefined,
      action: mode === 'Ledger' ? formData.action : undefined
    };

    if (editingId) {
      setTransactions(prev => prev.map(t => t.id === editingId ? newTx : t));
    } else {
      setTransactions(prev => [...prev, newTx]);
      if (isAutoSyncEnabled()) {
        addTransactionToGoogleSheet(newTx);
      }
    }

    setFormData(p => ({ ...p, amount: '', description: '', person: '' }));
    setEditingId(null);
    // @ts-ignore
    Swal.fire({ icon: 'success', title: 'সফল!', timer: 800, showConfirmButton: false });
  };

  const handleReverse = (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    const rev: Transaction = {
      ...t,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      description: `উল্টানো: ${t.description}`,
      type: t.type === 'Income' ? 'Expense' : t.type === 'Expense' ? 'Income' : 'Transfer',
      account: t.type === 'Transfer' && t.toAccount ? t.toAccount : t.account,
      toAccount: t.type === 'Transfer' ? t.account : t.toAccount,
    };
    setTransactions(prev => [...prev, rev]);
    // @ts-ignore
    Swal.fire({ icon: 'success', title: 'লেনদেন উল্টানো হয়েছে!', timer: 800 });
  };

  const handleDelete = (id: string) => {
    // @ts-ignore
    Swal.fire({
      title: 'ডিলেট করবেন?',
      text: "এটি স্থায়ীভাবে মুছে যাবে।",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ',
      cancelButtonText: 'না'
    }).then((res: any) => {
      if (res.isConfirmed) setTransactions(prev => prev.filter(t => t.id !== id));
    });
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    const targetMode = (t.category === 'Lending' || t.category === 'Borrowing') ? 'Ledger' : t.category === 'Transfer' ? 'Transfer' : 'Self';
    setMode(targetMode);
    setFormData({
      date: t.date,
      account: t.account,
      toAccount: t.toAccount || (accounts[1]?.name || 'বিকাশ ২'),
      description: t.description,
      amount: t.amount.toString(),
      type: t.type as any,
      person: t.person || '',
      ledgerType: (t.category === 'Borrowing' ? 'Borrowing' : 'Lending'),
      action: t.action || (t.category === 'Borrowing' ? 'ধার নেওয়া' : 'ধার দেওয়া')
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Delete Wallet Account: enforce 0-balance check
  const handleDeleteAccount = (account: WalletAccount) => {
    const balance = stats.accountBalances[account.name] || 0;
    if (Math.abs(balance) > 0.001) {
      // @ts-ignore
      Swal.fire({
        icon: 'error',
        title: 'ব্যালেন্স শূন্য (০) নয়!',
        html: `<b>${account.name}</b> একাউন্টে বর্তমানে <b>৳ ${balance.toLocaleString('bn-BD')}</b> রয়েছে।<br/><span class="text-rose-500 font-bold">ডিলেট করতে হলে ব্যালেন্স অবশ্যই ০ হতে হবে।</span><br/>টাকা অন্য ওয়ালেটে ট্রান্সফার করে ব্যালেন্স ০ করুন।`,
        confirmButtonText: 'ঠিক আছে'
      });
      return;
    }

    // @ts-ignore
    Swal.fire({
      title: 'ওয়ালেট ডিলিট করবেন?',
      text: `আপনি কি "${account.name}" ওয়ালেটটি মুছে ফেলতে চান?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ',
      cancelButtonText: 'না'
    }).then((res: any) => {
      if (res.isConfirmed) {
        setAccounts(prev => prev.filter(a => a.id !== account.id));
        // @ts-ignore
        Swal.fire({ icon: 'success', title: 'ওয়ালেট মুছে ফেলা হয়েছে!', timer: 800, showConfirmButton: false });
      }
    });
  };

  const handleLock = () => {
    lockWalletSession();
    setIsAuthenticated(false);
  };

  const downloadImage = (ref: React.RefObject<HTMLDivElement>, name: string) => {
    if (!ref.current) return;
    // @ts-ignore
    html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null }).then((canvas: HTMLCanvasElement) => {
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  const handleAreaCopy = (ref: React.RefObject<HTMLDivElement>, setFeedback: (v: boolean) => void) => {
    if (!ref.current) return;
    const text = ref.current.innerText;
    navigator.clipboard.writeText(text);
    setFeedback(true);
    setTimeout(() => setFeedback(false), 1200);
  };

  const personHistory = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions.filter(t => t.person === selectedPerson.name && (t.category === 'Lending' || t.category === 'Borrowing'));
  }, [transactions, selectedPerson]);

  const givenHistory = useMemo(() => personHistory.filter(t => t.action?.includes('দেওয়া') || t.action?.includes('শোধ')), [personHistory]);
  const receivedHistory = useMemo(() => personHistory.filter(t => t.action?.includes('পাওয়া') || t.action?.includes('নেওয়া')), [personHistory]);

  const totalGiven = useMemo(() => givenHistory.reduce((sum, t) => sum + t.amount, 0), [givenHistory]);
  const totalReceived = useMemo(() => receivedHistory.reduce((sum, t) => sum + t.amount, 0), [receivedHistory]);
  const personNetBalance = totalGiven - totalReceived;

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const ok = d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      return ok && (historyFilterType === 'self' ? t.category === 'Self' : true);
    });
  }, [transactions, filterMonth, filterYear, historyFilterType]);

  const inc = useMemo(() => filteredHistory.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [filteredHistory]);
  const exp = useMemo(() => filteredHistory.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [filteredHistory]);

  const dashboardFilteredTransactions = useMemo(() => {
    if (!accountFilter) return [];
    if (accountFilter.type === 'account') {
      return transactions.filter(t => t.account === accountFilter.value || t.toAccount === accountFilter.value);
    } else {
      return transactions.filter(t => t.category === accountFilter.value);
    }
  }, [transactions, accountFilter]);

  const dashInc = useMemo(() => dashboardFilteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [dashboardFilteredTransactions]);
  const dashExp = useMemo(() => dashboardFilteredTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [dashboardFilteredTransactions]);

  const isSheetConnected = !!getSheetUrl();

  // If not authenticated, render secure Lock Screen
  if (!isAuthenticated) {
    return <LockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  // Wallets to render in dashboard: all accounts plus Lending and Borrowing
  const customAccounts = accounts.filter(a => !['বিকাশ ১', 'বিকাশ ২', 'ব্যাংক', 'ক্যাশ'].includes(a.name));

  return (
    <div className="min-h-screen pb-24 theme-transition">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-black text-[var(--accent)] flex items-center gap-3">
          <i className="fa-solid fa-wallet text-2xl"></i> স্মার্ট ওয়ালেট
        </h2>
        <div className="flex items-center gap-3">
          {/* Google Sheets Sync Icon Button */}
          <button 
            onClick={() => setShowGoogleSheetModal(true)} 
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all shadow-sm cursor-pointer ${
              isSheetConnected 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                : 'bg-[var(--card)] border-[var(--border)] text-slate-400 hover:text-emerald-500'
            }`} 
            title={isSheetConnected ? 'গুগল শিট সংযুক্ত আছে' : 'গুগল শিট ব্যাকআপ'}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </button>

          {/* Password Change Button */}
          <button 
            onClick={() => setShowChangePasswordModal(true)} 
            className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] text-slate-400 hover:text-indigo-500 flex items-center justify-center text-xs transition-colors shadow-sm cursor-pointer" 
            title="পাসওয়ার্ড পরিবর্তন"
          >
            <i className="fa-solid fa-key"></i>
          </button>

          {/* Lock Button */}
          <button 
            onClick={handleLock} 
            className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] text-slate-400 hover:text-rose-500 flex items-center justify-center text-xs transition-colors shadow-sm cursor-pointer" 
            title="লক করুন"
          >
            <i className="fa-solid fa-lock"></i>
          </button>

          {/* Theme Selector */}
          <div className="flex gap-3 bg-[var(--card)] p-1.5 rounded-full shadow-md border border-[var(--border)]">
            {themes.map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t)}
                className={`w-7 h-7 rounded-full border-2 border-white shadow-sm transition-all cursor-pointer ${theme === t ? 'scale-125 ring-2 ring-[var(--accent)]' : 'opacity-60 hover:opacity-100'} ${
                  t === 'light' ? 'bg-indigo-500' : t === 'dark' ? 'bg-slate-900' : t === 'sakura' ? 'bg-rose-400' : 'bg-emerald-500'
                }`}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="bg-[var(--accent)] p-6 rounded-[35px] text-white shadow-2xl flex justify-between items-center relative overflow-hidden theme-transition">
          <div className="relative z-10">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">মোট নগদ ব্যালেন্স</span>
            <h1 className="text-4xl font-black mt-1.5">৳ {stats.totalCash.toLocaleString('bn-BD')}</h1>
          </div>
          <div className="bg-white/20 px-5 py-2 rounded-full text-[10px] font-black border border-white/30 backdrop-blur-md relative z-10 shadow-lg flex items-center gap-2 loading-pulse">
            <i className="fa-solid fa-circle-notch fa-spin text-[12px]"></i>
            লোডিং: ৳ {stats.loadingBalance.toLocaleString('bn-BD')}
          </div>
          <div className="absolute top-[-30px] left-[-30px] w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10px] right-[-10px] w-40 h-40 bg-black/5 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Grid Dashboard - Exactly the original 6-card layout, plus any custom wallets! */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
        <DashboardCard label="বিকাশ ১" amount={stats.bikash1} icon="fa-dove" iconBg="bg-rose-50 dark:bg-rose-950/40" iconColor="text-rose-500" onClick={() => setAccountFilter({label: 'বিকাশ ১', value: 'বিকাশ ১', type: 'account'})} />
        <DashboardCard label="বিকাশ ২" amount={stats.bikash2} icon="fa-dove" iconBg="bg-rose-50 dark:bg-rose-950/40" iconColor="text-rose-500" onClick={() => setAccountFilter({label: 'বিকাশ ২', value: 'বিকাশ ২', type: 'account'})} />
        <DashboardCard label="পাওনা" amount={stats.receivable} icon="fa-handshake" iconBg="bg-emerald-50 dark:bg-emerald-950/40" iconColor="text-emerald-500" borderColor="border-emerald-200 dark:border-emerald-900" onClick={() => setAccountFilter({label: 'পাওনা তালিকা', value: 'Lending', type: 'category'})} />
        <DashboardCard label="ব্যাংক" amount={stats.bank} icon="fa-building-columns" iconBg="bg-sky-50 dark:bg-sky-950/40" iconColor="text-sky-500" onClick={() => setAccountFilter({label: 'ব্যাংক', value: 'ব্যাংক', type: 'account'})} />
        <DashboardCard label="ক্যাশ" amount={stats.cash} icon="fa-money-bill-wave" iconBg="bg-emerald-50 dark:bg-emerald-950/40" iconColor="text-emerald-500" onClick={() => setAccountFilter({label: 'ক্যাশ', value: 'ক্যাশ', type: 'account'})} />
        <DashboardCard label="দেনা" amount={stats.payable} icon="fa-hourglass-start" iconBg="bg-rose-50 dark:bg-rose-950/40" iconColor="text-rose-500" borderColor="border-rose-200 dark:border-rose-900" onClick={() => setAccountFilter({label: 'দেনা তালিকা', value: 'Borrowing', type: 'category'})} />

        {/* Any custom wallets added by user (e.g. নগদ, রকেট) seamlessly show here */}
        {customAccounts.map(acc => (
          <DashboardCard
            key={acc.id}
            label={acc.name}
            amount={stats.accountBalances[acc.name] || 0}
            icon={acc.icon}
            iconBg={acc.iconBg}
            iconColor={acc.iconColor}
            borderColor={acc.borderColor}
            onClick={() => setAccountFilter({ label: acc.name, value: acc.name, type: 'account' })}
            canDelete={true}
            onDelete={() => handleDeleteAccount(acc)}
          />
        ))}
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 gap-4 mb-8">
        <TabItem active={mode === 'Self'} icon="fa-user-check" label="ব্যক্তিগত" onClick={() => setMode('Self')} />
        <TabItem active={mode === 'Transfer'} icon="fa-money-bill-transfer" label="ট্রান্সফার" onClick={() => setMode('Transfer')} />
        <TabItem active={mode === 'Ledger'} icon="fa-hand-holding-dollar" label="দেনা পাওয়া" onClick={() => setMode('Ledger')} />
      </div>

      {/* Form & Recent */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10" ref={formRef}>
        <div className="lg:col-span-2 bg-[var(--card)] p-8 rounded-[40px] border border-[var(--border)] shadow-xl h-fit theme-transition">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-[11px] uppercase text-slate-400 tracking-widest">
              {editingId ? 'লেনদেন সম্পাদনা' : 'নতুন এন্ট্রি'}
            </h3>
            <div className="flex gap-3">
              <button onClick={() => { setHistoryFilterType('full'); setShowHistoryModal(true); }} className="text-[11px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-5 py-2.5 rounded-2xl hover:shadow-md transition-all cursor-pointer">মাসিক স্টেটমেন্ট</button>
              <button onClick={() => { setHistoryFilterType('self'); setShowHistoryModal(true); }} className="text-[11px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-5 py-2.5 rounded-2xl hover:shadow-md transition-all cursor-pointer">ব্যক্তিগত স্টেটমেন্ট</button>
            </div>
          </div>
          
          <div className="space-y-5">
            {mode === 'Ledger' && (
              <div className="space-y-4">
                <InputGroup label="ব্যক্তির নাম" icon="fa-user-pen" required={true}>
                  <input 
                    list="names-list" 
                    type="text" 
                    value={formData.person} 
                    onChange={e => setFormData({...formData, person: e.target.value})} 
                    className="w-full bg-transparent outline-none text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                    placeholder="নাম টাইপ করুন (বাধ্যতামূলক)..." 
                  />
                  <datalist id="names-list">{existingNames.map(n => <option key={n} value={n} />)}</datalist>
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="টাইপ" icon="fa-tag">
                    <select 
                      value={formData.ledgerType} 
                      onChange={e => {
                        const newType = e.target.value as 'Lending' | 'Borrowing';
                        setFormData({
                          ...formData, 
                          ledgerType: newType,
                          action: newType === 'Lending' ? 'ধার দেওয়া' : 'ধার নেওয়া'
                        });
                      }} 
                      className="w-full bg-transparent outline-none text-[12px] font-black cursor-pointer text-slate-900 dark:text-slate-100"
                    >
                      <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Lending">পাওনা (Lending)</option>
                      <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Borrowing">দেনা (Borrowing)</option>
                    </select>
                  </InputGroup>
                  <InputGroup label="অ্যাকশন" icon="fa-bolt-lightning">
                    <select 
                      value={formData.action} 
                      onChange={e => setFormData({...formData, action: e.target.value})} 
                      className="w-full bg-transparent outline-none text-[12px] font-black cursor-pointer text-slate-900 dark:text-slate-100"
                    >
                      {formData.ledgerType === 'Lending' ? (
                        <>
                          <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ধার দেওয়া">ধার দিচ্ছি (খরচ -)</option>
                          <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ফেরত পাওয়া">ফেরত পাচ্ছি (প্রাপ্তি +)</option>
                        </>
                      ) : (
                        <>
                          <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ধার নেওয়া">ধার নিচ্ছি (প্রাপ্তি +)</option>
                          <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ধার শোধ">ধার শোধ দিচ্ছি (খরচ -)</option>
                        </>
                      )}
                    </select>
                  </InputGroup>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-5">
              <InputGroup label="তারিখ" icon="fa-calendar-day">
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="w-full bg-transparent outline-none text-[12px] font-bold text-slate-900 dark:text-slate-100 cursor-pointer" 
                />
              </InputGroup>
              <InputGroup label={mode === 'Transfer' ? 'কোথা থেকে' : 'অ্যাকাউন্ট'} icon="fa-wallet">
                <select 
                  value={formData.account} 
                  onChange={e => setFormData({...formData, account: e.target.value})} 
                  className="w-full bg-transparent outline-none text-[12px] font-black cursor-pointer text-slate-900 dark:text-slate-100"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </InputGroup>
            </div>
            {mode === 'Transfer' && (
              <InputGroup label="কোথায়" icon="fa-location-crosshairs">
                <select 
                  value={formData.toAccount} 
                  onChange={e => setFormData({...formData, toAccount: e.target.value})} 
                  className="w-full bg-transparent outline-none text-[12px] font-black cursor-pointer text-slate-900 dark:text-slate-100"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </InputGroup>
            )}
            <InputGroup label="বিবরণ" icon="fa-pen-clip">
              <input 
                type="text" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full bg-transparent outline-none text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                placeholder=" বিস্তারিত বিবরণ..." 
              />
            </InputGroup>
            <div className="grid grid-cols-2 gap-5">
              <InputGroup label="টাকার পরিমাণ" icon="fa-bangladeshi-taka-sign">
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  className="w-full bg-transparent outline-none font-black text-2xl text-[var(--accent)] placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                  placeholder="0" 
                />
              </InputGroup>
              {mode === 'Self' && (
                <InputGroup label="লেনদেন ধরণ" icon="fa-shuffle">
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as any})} 
                    className="w-full bg-transparent outline-none text-[12px] font-black cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold" value="Expense">ব্যয় (-)</option>
                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold" value="Income">আয় (+)</option>
                  </select>
                </InputGroup>
              )}
            </div>
            <button 
              onClick={handleSave} 
              className="w-full py-5 bg-[var(--accent)] text-white rounded-[25px] font-black text-lg shadow-2xl active:scale-95 transition-all hover:brightness-110 mt-3 cursor-pointer"
            >
               {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
            </button>
          </div>
        </div>
        
        <div className="bg-[var(--card)] p-7 rounded-[40px] border border-[var(--border)] shadow-xl flex flex-col h-[580px] theme-transition">
          <h3 className="font-bold text-[11px] mb-6 uppercase text-slate-400 tracking-widest">সাম্প্রতিক লেনদেন</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll">
            {stats.recentTrans.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                <i className="fa-solid fa-receipt text-4xl mb-2"></i>
                <p className="text-xs font-bold">এখনও কোন লেনদেন নেই</p>
              </div>
            ) : (
              stats.recentTrans.map(t => (
                <TransactionRow 
                  key={t.id} 
                  t={t} 
                  onDelete={handleDelete} 
                  onReverse={handleReverse} 
                  onEdit={handleEdit} 
                  onClick={() => setSelectedTx(t)} 
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lending & Borrowing Tables */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
        <LedgerSection title="পাওনা তালিকা" items={stats.personList.filter(p => p.type === 'Lending')} color="text-emerald-500" onClick={n => setSelectedPerson({name:n, type:'Lending'})} icon="fa-handshake" />
        <LedgerSection title="দেনা তালিকা" items={stats.personList.filter(p => p.type === 'Borrowing')} color="text-rose-500" onClick={n => setSelectedPerson({name:n, type:'Borrowing'})} icon="fa-hourglass-start" />
      </div>

      {/* Floating Action Button (FAB) for Adding Wallet */}
      <div className="fixed bottom-16 right-6 z-[120]">
        <button
          onClick={() => setShowAddWalletModal(true)}
          className="w-13 h-13 rounded-full bg-[var(--accent)] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all cursor-pointer group relative ring-4 ring-white dark:ring-slate-900"
          title="নতুন ওয়ালেট যোগ করুন"
        >
          <i className="fa-solid fa-plus text-xl transition-transform duration-300 group-hover:rotate-90"></i>
          {/* Tooltip on hover */}
          <span className="absolute right-15 bg-slate-950 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
            ওয়ালেট যোগ করুন
          </span>
        </button>
      </div>

      {/* Modals */}

      {/* 1. Transaction Slip Modal */}
      <TransactionSlipModal 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
      />

      {/* 2. Add Wallet Modal (Pop-up from Floating Plus Icon) */}
      <AddWalletModal
        isOpen={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        existingAccounts={accounts}
        onAdd={(newAcc) => {
          setAccounts(prev => [...prev, newAcc]);
          // @ts-ignore
          Swal.fire({ icon: 'success', title: 'নতুন ওয়ালেট যুক্ত হয়েছে!', timer: 900, showConfirmButton: false });
        }}
      />

      {/* 3. Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* 4. Google Sheets Cloud Backup Modal */}
      <GoogleSheetModal
        isOpen={showGoogleSheetModal}
        onClose={() => setShowGoogleSheetModal(false)}
        transactions={transactions}
        accounts={accounts}
        onDataRestored={(restored) => {
          setTransactions(restored);
        }}
      />

      {/* 5. Account Specific Statement Modal */}
      {accountFilter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-4xl rounded-[50px] overflow-hidden flex flex-col shadow-4xl modal-slide-up h-[90vh] border-2 border-[var(--border)] theme-transition">
            <div className="p-7 border-b border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-xs uppercase tracking-widest">{accountFilter.label} বিবরণী</h3>
              <button onClick={() => setAccountFilter(null)} className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 custom-scroll relative cursor-pointer group" ref={accountViewRef} onClick={() => handleAreaCopy(accountViewRef, setIsCopyingAccountView)}>
              <CopyOverlay show={isCopyingAccountView} />
              <div className="text-center mb-16">
                <h4 className="font-black text-5xl mb-3 tracking-tighter">{accountFilter.label}</h4>
                <p className="text-[12px] text-[var(--accent)] font-black uppercase tracking-[0.5em]">বিস্তারিত লেনদেন ইতিহাস</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h5 className="bg-emerald-500 text-white text-[11px] font-black text-center rounded-xl py-3 uppercase shadow-lg">আয় (+)</h5>
                  <div className="space-y-4">{dashboardFilteredTransactions.filter(t => t.type === 'Income').length === 0 ? <p className="text-center text-[11px] py-12 text-slate-400 opacity-50 italic font-black">ডাটা পাওয়া যায়নি</p> : dashboardFilteredTransactions.filter(t => t.type === 'Income').map(t => <TransactionRow key={t.id} t={t} onClick={() => setSelectedTx(t)} />)}</div>
                </div>
                <div className="space-y-6">
                  <h5 className="bg-rose-500 text-white text-[11px] font-black text-center rounded-xl py-3 uppercase shadow-lg">ব্যয় (-)</h5>
                  <div className="space-y-4">{dashboardFilteredTransactions.filter(t => t.type === 'Expense').length === 0 ? <p className="text-center text-[11px] py-12 text-slate-400 opacity-50 italic font-black">ডাটা পাওয়া যায়নি</p> : dashboardFilteredTransactions.filter(t => t.type === 'Expense').map(t => <TransactionRow key={t.id} t={t} onClick={() => setSelectedTx(t)} />)}</div>
                </div>
              </div>
              <div className="mt-16 pt-10 border-t-2 border-slate-100 flex flex-col md:flex-row justify-around items-center gap-8">
                <div className="text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">মোট আয়</span><b className="text-3xl font-black text-emerald-600">৳ {dashInc.toLocaleString('bn-BD')}</b></div>
                <div className="text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">মোট ব্যয়</span><b className="text-3xl font-black text-rose-600">৳ {dashExp.toLocaleString('bn-BD')}</b></div>
              </div>
              <Watermark />
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 border-t border-[var(--border)] flex gap-4">
              <button onClick={() => downloadImage(accountViewRef, `History_${accountFilter.label}`)} className="w-full py-5 bg-[var(--accent)] text-white font-black rounded-[30px] shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-3 cursor-pointer"><i className="fa-solid fa-download"></i> ইমেজ সেভ</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Monthly Statement Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-2xl rounded-[50px] overflow-hidden flex flex-col shadow-3xl modal-slide-up h-[90vh] border-2 border-[var(--border)] theme-transition">
            <div className="p-7 border-b border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-xs uppercase tracking-widest">{historyFilterType === 'self' ? 'ব্যক্তিগত স্টেটমেন্ট' : 'মাসিক স্টেটমেন্ট'}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5 border-b border-[var(--border)] bg-[var(--card)]">
              <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-black outline-none border border-transparent focus:border-[var(--accent)] transition-all cursor-pointer">{["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"].map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
              <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-black outline-none border border-transparent focus:border-[var(--accent)] transition-all cursor-pointer">{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
            <div className="flex-1 overflow-y-auto p-12 custom-scroll relative cursor-pointer group" ref={statementRef} onClick={() => handleAreaCopy(statementRef, setIsCopyingStatement)}>
              <CopyOverlay show={isCopyingStatement} />
              <div className="text-center mb-16">
                <h4 className="font-black text-5xl mb-3 tracking-tighter">হিসাব বিবরণী</h4>
                <p className="text-[12px] text-[var(--accent)] font-black uppercase tracking-[0.5em]">{["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"][filterMonth]}, {filterYear}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h5 className="bg-emerald-500 text-white text-[11px] font-black text-center rounded-xl py-3 uppercase shadow-lg">প্রাপ্তি (+)</h5>
                  <div className="space-y-4">{filteredHistory.filter(t => t.type === 'Income').length === 0 ? <p className="text-center text-[11px] py-12 text-slate-400 opacity-50 italic font-black">ডাটা পাওয়া যায়নি</p> : filteredHistory.filter(t => t.type === 'Income').map(t => <TransactionRow key={t.id} t={t} onClick={() => setSelectedTx(t)} />)}</div>
                  <div className="text-right pt-5 border-t-4 border-emerald-500 font-black text-[14px] text-emerald-600">মোট আয়: ৳{inc.toLocaleString('bn-BD')}</div>
                </div>
                <div className="space-y-6">
                  <h5 className="bg-rose-500 text-white text-[11px] font-black text-center rounded-xl py-3 uppercase shadow-lg">খরচ (-)</h5>
                  <div className="space-y-4">{filteredHistory.filter(t => t.type === 'Expense').length === 0 ? <p className="text-center text-[11px] py-12 text-slate-400 opacity-50 italic font-black">ডাটা পাওয়া যায়নি</p> : filteredHistory.filter(t => t.type === 'Expense').map(t => <TransactionRow key={t.id} t={t} onClick={() => setSelectedTx(t)} />)}</div>
                  <div className="text-right pt-5 border-t-4 border-rose-500 font-black text-[14px] text-rose-600">মোট ব্যয়: ৳{exp.toLocaleString('bn-BD')}</div>
                </div>
              </div>
              <div className="bg-slate-950 text-white p-12 rounded-[50px] flex justify-between items-center mt-20 shadow-4xl relative overflow-hidden group">
                 <div className="relative z-10"><span className="text-[12px] font-black uppercase opacity-60 tracking-[0.3em]">নেট বিবরণী ব্যালেন্স</span><h2 className={`text-4xl font-black mt-3 tracking-tighter ${inc >= exp ? 'text-sky-400' : 'text-rose-400'}`}>৳ {(inc - exp).toLocaleString('bn-BD')}</h2></div>
                 <i className="fa-solid fa-chart-line absolute right-12 text-7xl opacity-5 group-hover:scale-125 transition-transform duration-700"></i>
              </div>
              <Watermark />
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 border-t border-[var(--border)] flex gap-4">
              <button onClick={() => downloadImage(statementRef, `Statement_${filterMonth + 1}`)} className="w-full py-5 bg-[var(--accent)] text-white font-black rounded-[30px] shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-3 cursor-pointer"><i className="fa-solid fa-file-arrow-down"></i> স্টেটমেন্ট ইমেজ সেভ</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Person Specific Ledger Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[400] flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 w-full max-w-xl rounded-[60px] overflow-hidden flex flex-col shadow-4xl h-[94vh] relative modal-slide-up">
            <button onClick={() => setSelectedPerson(null)} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all z-20 shadow-sm cursor-pointer"><i className="fa-solid fa-xmark text-2xl"></i></button>
            <div className="flex-1 overflow-y-auto custom-scroll p-12 pb-40 relative cursor-pointer" ref={receiptRef} onClick={() => handleAreaCopy(receiptRef, setIsCopyingLedger)}>
              <CopyOverlay show={isCopyingLedger} />
              <div className="text-center mt-6"><h3 className="text-3xl font-black text-[var(--accent)] mb-2 tracking-[0.1em]">লেনদেন বিবরণী</h3><p className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.4em]">রিপোর্ট: {new Date().toLocaleDateString('bn-BD')}</p><div className="w-full border-b-4 border-dashed border-slate-200 my-12"></div><h2 className="text-5xl font-black text-slate-900 mb-12 tracking-tight drop-shadow-sm">{selectedPerson.name}</h2></div>
              <div className="grid grid-cols-2 gap-0 relative"><div className="absolute left-1/2 top-0 bottom-0 border-l-4 border-dashed border-slate-200 transform -translate-x-1/2"></div>
                <div className="px-6">
                  <div className="bg-slate-100 text-slate-900 text-[12px] font-black text-center rounded-2xl py-3 mb-10 uppercase tracking-[0.2em]">দিয়েছি</div>
                  <div className="space-y-8">{givenHistory.map(t => (<div key={t.id} className="border-b-2 border-slate-100 pb-4 hover:bg-slate-50 transition-all cursor-pointer rounded-2xl p-2 group" onClick={(e) => { e.stopPropagation(); setSelectedTx(t); }}><p className="text-[11px] text-slate-400 font-black mb-1.5">{t.date}</p><div className="flex justify-between items-end"><span className="text-[11px] text-slate-500 font-black truncate max-w-[90px] group-hover:text-[var(--accent)]">{t.description.split(': ')[2] || 'নগদ'}</span><b className="text-[16px] font-black text-slate-900">৳ {t.amount}</b></div></div>))}</div>
                  <div className="mt-10 pt-5 flex justify-end border-t-2 border-slate-100"><span className="text-[18px] font-black text-slate-900 flex items-center gap-1.5">৳ <span className="tracking-tighter">{totalGiven.toLocaleString('bn-BD')}</span></span></div>
                </div>
                <div className="px-6">
                  <div className="bg-slate-100 text-slate-900 text-[12px] font-black text-center rounded-2xl py-3 mb-10 uppercase tracking-[0.2em]">পেয়েছি</div>
                  <div className="space-y-8">{receivedHistory.map(t => (<div key={t.id} className="border-b-2 border-slate-100 pb-4 hover:bg-slate-50 transition-all cursor-pointer rounded-2xl p-2 group" onClick={(e) => { e.stopPropagation(); setSelectedTx(t); }}><p className="text-[11px] text-slate-400 font-black mb-1.5">{t.date}</p><div className="flex justify-between items-end"><span className="text-[11px] text-slate-500 font-black truncate max-w-[90px] group-hover:text-[var(--accent)]">{t.description.split(': ')[2] || 'নগদ'}</span><b className="text-[16px] font-black text-slate-900">৳ {t.amount}</b></div></div>))}</div>
                  <div className="mt-10 pt-5 flex justify-end border-t-2 border-slate-100"><span className="text-[18px] font-black text-slate-900 flex items-center gap-1.5">৳ <span className="tracking-tighter">{totalReceived.toLocaleString('bn-BD')}</span></span></div>
                </div>
              </div>
              <div className="mt-20 flex justify-center"><div className="border-[5px] border-slate-950 rounded-[45px] px-14 py-8 w-full max-w-md text-center shadow-4xl bg-white transform hover:scale-105 transition-all"><p className="text-3xl font-black text-slate-950">{personNetBalance >= 0 ? `পাওনা - ${personNetBalance.toLocaleString('bn-BD')} টাকা` : `দেনা - ${Math.abs(personNetBalance).toLocaleString('bn-BD')} টাকা`}</p></div></div>
              <Watermark />
            </div>
            <div className="absolute bottom-0 left-0 w-full p-8 bg-white/95 backdrop-blur-xl shadow-[0_-30px_60px_rgba(0,0,0,0.15)] z-20 flex gap-5 border-t-2 border-slate-100"><button onClick={() => downloadImage(receiptRef, `Slip_${selectedPerson.name}`)} className="w-full py-6 bg-[var(--accent)] text-white font-black rounded-[35px] text-xl shadow-3xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 cursor-pointer"><i className="fa-solid fa-download"></i> ইমেজ সেভ</button></div>
          </div>
        </div>
      )}

      {/* Footer Ticker */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950 text-sky-400 py-4 border-t-2 border-[var(--accent)] overflow-hidden z-[100] shadow-2xl backdrop-blur-md">
        <div className="ticker-animate whitespace-nowrap inline-block px-10 font-black text-[13px] tracking-widest uppercase">
          {stats.personList.length > 0 ? stats.personList.map(p => (
            <button key={`${p.name}-${p.type}`} onClick={() => setSelectedPerson({ name: p.name, type: p.type })} className="hover:text-white transition-all cursor-pointer mr-16 active:scale-90">
              <i className={`fa-solid ${p.type === 'Lending' ? 'fa-handshake' : 'fa-hourglass-start'} mr-3`}></i>{p.name}: {p.amount}৳
            </button>
          )) : 'সব হিসাব ক্লিয়ার আছে!'}
        </div>
      </div>
    </div>
  );
};

const LedgerSection: React.FC<{ title: string; items: PersonRecord[]; color: string; onClick: (name: string) => void; icon: string }> = ({ title, items, color, onClick, icon }) => {
  return (
    <div className="bg-[var(--card)] p-10 rounded-[50px] border-2 border-[var(--border)] shadow-xl h-[520px] flex flex-col relative overflow-hidden group theme-transition">
      <h4 className={`text-[13px] font-black uppercase tracking-[0.3em] mb-8 border-b-2 border-[var(--border)] pb-5 ${color} flex items-center gap-3`}><i className={`fa-solid ${icon}`}></i> {title}</h4>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll">{items.length === 0 ? (<div className="flex flex-col items-center justify-center h-full opacity-10"><i className="fa-solid fa-clipboard-list text-6xl mb-5"></i><p className="text-[12px] font-black uppercase tracking-widest italic">কোন ডাটা নাই</p></div>) : (items.map((p, i) => (<div key={i} onClick={() => onClick(p.name)} className="relative flex justify-between items-center p-5 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-3xl transition-all cursor-pointer border-2 border-transparent hover:border-[var(--accent)]/30 shadow-sm active:scale-[0.97]"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center text-slate-300 shadow-inner group-hover:text-[var(--accent)] transition-colors"><i className="fa-solid fa-user-tag text-lg"></i></div><span className="font-bold text-sm tracking-tight">{p.name}</span></div><div className="flex items-center gap-5"><span className={`font-black text-[15px] ${color}`}>৳ {p.amount.toLocaleString('bn-BD')}</span><i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i></div></div>)))}</div>
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import { WalletAccount } from '../types';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: WalletAccount) => void;
  existingAccounts: WalletAccount[];
}

const ICONS = [
  { id: 'fa-dove', label: 'বিকাশ/পাখি' },
  { id: 'fa-money-bill-wave', label: 'নগদ ক্যাশ' },
  { id: 'fa-building-columns', label: 'ব্যাংক' },
  { id: 'fa-credit-card', label: 'কার্ড' },
  { id: 'fa-wallet', label: 'ওয়ালেট' },
  { id: 'fa-coins', label: 'কয়েন' },
  { id: 'fa-piggy-bank', label: 'সঞ্চয়' },
  { id: 'fa-bolt', label: 'রকেট/ফাস্ট' }
];

const COLORS = [
  { id: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-500', border: 'border-rose-200 dark:border-rose-900', label: 'গোলাপি/বিকাশ' },
  { id: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-500', border: 'border-emerald-200 dark:border-emerald-900', label: 'সবুজ/ক্যাশ' },
  { id: 'sky', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-500', border: 'border-sky-200 dark:border-sky-900', label: 'আকাশি/ব্যাংক' },
  { id: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-500', border: 'border-amber-200 dark:border-amber-900', label: 'হলুদ/নগদ' },
  { id: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-500', border: 'border-purple-200 dark:border-purple-900', label: 'বেগুনি/রকেট' },
  { id: 'indigo', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-500', border: 'border-indigo-200 dark:border-indigo-900', label: 'নীল/অন্যান্য' },
];

const SUGGESTIONS = ['নগদ', 'রকেট', 'উপায়', 'ইসলামী ব্যাংক', 'ডাচ-বাংলা ব্যাংক', 'ব্র্যাক ব্যাংক', 'সিটি ব্যাংক', 'সঞ্চয়ী হিসাব'];

export const AddWalletModal: React.FC<AddWalletModalProps> = ({ isOpen, onClose, onAdd, existingAccounts }) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('fa-wallet');
  const [selectedColor, setSelectedColor] = useState(COLORS[3]); // amber as default for nagad
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('ওয়ালেটের নাম দেওয়া বাধ্যতামূলক!');
      return;
    }

    const duplicate = existingAccounts.some(
      a => a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError('এই নামের একটি ওয়ালেট ইতোমধ্যে আছে!');
      return;
    }

    const newAccount: WalletAccount = {
      id: 'acc_' + Date.now(),
      name: trimmed,
      icon: selectedIcon,
      iconBg: selectedColor.bg,
      iconColor: selectedColor.text,
      borderColor: selectedColor.border,
      isDefault: false
    };

    onAdd(newAccount);
    setName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--card)] text-[var(--text)] border-2 border-[var(--border)] w-full max-w-lg rounded-[40px] p-8 shadow-2xl modal-slide-up relative">
        <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-4">
          <h3 className="text-lg font-black flex items-center gap-2.5">
            <i className="fa-solid fa-folder-plus text-[var(--accent)]"></i> নতুন ওয়ালেট যুক্ত করুন
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
              ওয়ালেটের নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="যেমন: নগদ, রকেট, সিটি ব্যাংক..."
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] text-[var(--text)]"
            />
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => {
                    setName(s);
                    if (s === 'নগদ') setSelectedColor(COLORS[3]);
                    if (s === 'রকেট') setSelectedColor(COLORS[4]);
                    if (s.includes('ব্যাংক')) setSelectedColor(COLORS[2]);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all cursor-pointer"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
              আইকন নির্বাচন করুন
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map(ic => (
                <button
                  type="button"
                  key={ic.id}
                  onClick={() => setSelectedIcon(ic.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedIcon === ic.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <i className={`fa-solid ${ic.id} text-lg`}></i>
                  <span className="text-[10px] font-bold truncate max-w-full">{ic.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
              কালার থিম
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedColor(c)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    selectedColor.id === c.id
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${c.text.replace('text-', 'bg-')}`}></span>
                  <span className="text-xs font-bold truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-4 bg-[var(--accent)] text-white font-black text-sm rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              ওয়ালেট যুক্ত করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

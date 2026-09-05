import React, { useState } from 'react';
import { updatePassword } from '../services/security';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPass || !newPass || !confirmPass) {
      setError('সবগুলো ঘর পূরণ করা আবশ্যক।');
      return;
    }

    if (newPass !== confirmPass) {
      setError('নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!');
      return;
    }

    if (newPass.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      const res = await updatePassword(currentPass, newPass);
      if (res.success) {
        setSuccess('পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!');
        setTimeout(() => {
          onClose();
          setCurrentPass('');
          setNewPass('');
          setConfirmPass('');
          setSuccess('');
        }, 1500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('পাসওয়ার্ড পরিবর্তনে ত্রুটি হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--card)] text-[var(--text)] border-2 border-[var(--border)] w-full max-w-md rounded-[40px] p-8 shadow-2xl modal-slide-up relative">
        <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-4">
          <h3 className="text-lg font-black flex items-center gap-2.5">
            <i className="fa-solid fa-key text-[var(--accent)]"></i> পাসওয়ার্ড পরিবর্তন
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">বর্তমান পাসওয়ার্ড</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
              placeholder="বর্তমান পাসওয়ার্ড লিখুন"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">নতুন পাসওয়ার্ড</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
              placeholder="নতুন পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর)"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">নতুন পাসওয়ার্ড পুনরায় লিখুন</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
              placeholder="কনফার্ম করুন"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-900">
              {success}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--accent)] text-white font-black text-sm rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

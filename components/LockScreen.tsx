import React, { useState } from 'react';
import { verifyPassword } from '../services/security';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setError('দয়া করে পাসওয়ার্ড প্রবেশ করান');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await verifyPassword(password);
      if (isValid) {
        onUnlock();
      } else {
        setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
      }
    } catch (err) {
      setError('পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="bg-slate-900 border-2 border-slate-800 w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl text-center relative overflow-hidden modal-slide-up">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Lock Icon */}
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-6 text-white text-3xl">
          <i className="fa-solid fa-shield-halved"></i>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          স্মার্ট ওয়ালেট সিকিউরিটি
        </h2>
        <p className="text-xs font-semibold text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
          আপনার ব্যক্তিগত আর্থিক তথ্য নিরাপদ রাখতে অনুগ্রহ করে ওয়ালেটের পাসওয়ার্ড প্রবেশ করান।
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <i className="fa-solid fa-lock text-sm"></i>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="পাসওয়ার্ড লিখুন..."
              autoFocus
              className="w-full pl-11 pr-12 py-4 bg-slate-800/80 border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl text-white placeholder:text-slate-500 text-sm font-bold tracking-wider outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 animate-shake">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-key"></i>
                <span>ওয়ালেট আনলক করুন</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500">
          <i className="fa-solid fa-lock text-[10px] text-emerald-400"></i>
          <span>২৫৬-বিট ক্রিপ্টোগ্রাফিক হ্যাশ সুরক্ষিত</span>
        </div>
      </div>
    </div>
  );
};

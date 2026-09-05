import React, { useRef, useState } from 'react';
import { Transaction } from '../types';

interface TransactionSlipModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionSlipModal: React.FC<TransactionSlipModalProps> = ({ transaction, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!transaction) return null;

  const t = transaction;

  const handleCopyText = () => {
    const text = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `       স্মার্ট ওয়ালেট লেনদেন রসিদ       `,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `ট্রানজ্যাকশন আইডি: #TX-${t.id.slice(-6)}`,
      `তারিখ: ${t.date}`,
      `অ্যাকাউন্ট: ${t.account}${t.toAccount ? ` ➔ ${t.toAccount}` : ''}`,
      `ধরণ: ${t.type === 'Income' ? 'আয় / প্রাপ্তি (+)' : t.type === 'Expense' ? 'ব্যয় / খরচ (-)' : 'ট্রান্সফার (⇄)'}`,
      t.person ? `ব্যক্তির নাম: ${t.person}` : '',
      t.action ? `অ্যাকশন: ${t.action}` : '',
      `বিবরণ: ${t.description}`,
      `-------------------------`,
      `টাকার পরিমাণ: ৳ ${t.amount.toLocaleString('bn-BD')}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `রিপোর্ট জেনারেট: ${new Date().toLocaleDateString('bn-BD')}`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadImage = () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    // @ts-ignore
    if (typeof html2canvas !== 'undefined') {
      // @ts-ignore
      html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `Slip_TX_${t.id.slice(-6)}_${t.date}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloading(false);
      }).catch(() => {
        setDownloading(false);
      });
    } else {
      setDownloading(false);
    }
  };

  const isIncome = t.type === 'Income';
  const isTransfer = t.type === 'Transfer';

  return (
    <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-[45px] overflow-hidden flex flex-col shadow-2xl modal-slide-up relative max-h-[95vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all z-20 cursor-pointer shadow-sm"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Printable/Canvas Card */}
        <div className="p-8 md:p-10 overflow-y-auto custom-scroll" ref={receiptRef}>
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-dashed border-slate-200">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
              isIncome ? 'bg-emerald-500 text-white shadow-emerald-500/30' : isTransfer ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'
            }`}>
              <i className={`fa-solid ${isIncome ? 'fa-arrow-down-left' : isTransfer ? 'fa-money-bill-transfer' : 'fa-arrow-up-right'} text-2xl`}></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">লেনদেন স্লিপ</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              আইডি: #TX-{t.id.slice(-8)}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {t.date}
            </p>
          </div>

          {/* Amount Showcase */}
          <div className="my-6 py-6 bg-slate-50 rounded-3xl text-center border border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">মোট পরিমাণ</span>
            <h2 className={`text-4xl font-black tracking-tight ${
              isIncome ? 'text-emerald-600' : isTransfer ? 'text-sky-600' : 'text-rose-600'
            }`}>
              {isIncome ? '+' : isTransfer ? '⇄ ' : '-'} ৳ {t.amount.toLocaleString('bn-BD')}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-white border border-slate-200 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isIncome ? 'bg-emerald-500' : isTransfer ? 'bg-sky-500' : 'bg-rose-500'}`}></span>
              <span>{isIncome ? 'প্রাপ্তি / আয়' : isTransfer ? 'ওয়ালেট ট্রান্সফার' : 'ব্যয় / খরচ'}</span>
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider">অ্যাকাউন্ট</span>
              <span className="font-black text-slate-800 text-sm">{t.account}</span>
            </div>

            {t.toAccount && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider">গন্তব্য অ্যাকাউন্ট</span>
                <span className="font-black text-slate-800 text-sm">{t.toAccount}</span>
              </div>
            )}

            {t.category && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider">ক্যাটাগরি</span>
                <span className="font-black text-slate-800">
                  {t.category === 'Self' ? 'ব্যক্তিগত লেনদেন' : t.category === 'Transfer' ? 'ট্রান্সফার' : t.category === 'Lending' ? 'পাওনা (Lending)' : 'দেনা (Borrowing)'}
                </span>
              </div>
            )}

            {t.person && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider">ব্যক্তির নাম</span>
                <span className="font-black text-indigo-600 text-sm">{t.person}</span>
              </div>
            )}

            {t.action && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase tracking-wider">অ্যাকশন</span>
                <span className="font-black text-slate-800">{t.action}</span>
              </div>
            )}

            <div className="flex justify-between items-start py-1.5 border-b border-slate-100 gap-4">
              <span className="text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">বিবরণ</span>
              <span className="font-bold text-slate-700 text-right break-words">{t.description || 'বিবরণ নেই'}</span>
            </div>
          </div>

          {/* Watermark Branding */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>স্মার্ট ওয়ালেট ডিজিটাল স্লিপ</span>
            <span>সুরক্ষিত রসিদ</span>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyText}
            className="py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
            <span>{copied ? 'কপি হয়েছে!' : 'টেক্সট কপি'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="py-3.5 px-4 bg-[var(--accent)] hover:brightness-110 active:scale-95 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <i className={`fa-solid ${downloading ? 'fa-circle-notch fa-spin' : 'fa-download'}`}></i>
            <span>{downloading ? 'সেভ হচ্ছে...' : 'ইমেজ সেভ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

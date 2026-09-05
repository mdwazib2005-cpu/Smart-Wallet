import React, { useState } from 'react';
import { Transaction, WalletAccount } from '../types';
import {
  getSheetUrl,
  setSheetUrl,
  isAutoSyncEnabled,
  setAutoSync,
  syncAllToGoogleSheet,
  fetchFromGoogleSheet,
  exportBackupJSON
} from '../services/sheetService';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: WalletAccount[];
  onDataRestored: (restoredTxs: Transaction[]) => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  transactions,
  accounts,
  onDataRestored
}) => {
  const [url, setUrl] = useState(getSheetUrl());
  const [autoSync, setAutoSyncState] = useState(isAutoSyncEnabled());
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    setSheetUrl(url);
    setStatusMsg({ type: 'success', text: 'গুগল শিট ওয়েব অ্যাপ ইউআরএল সংরক্ষিত হয়েছে!' });
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSyncState(next);
    setAutoSync(next);
  };

  const handleSyncNow = async () => {
    if (!url.trim()) {
      setStatusMsg({ type: 'error', text: 'দয়া করে আগে গুগল শিট ওয়েব অ্যাপ ইউআরএল দিন।' });
      return;
    }
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'গুগল শিটে ডাটা পাঠানো হচ্ছে...' });
    const res = await syncAllToGoogleSheet(transactions, accounts);
    setLoading(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handleRestoreFromSheet = async () => {
    if (!url.trim()) {
      setStatusMsg({ type: 'error', text: 'দয়া করে আগে গুগল শিট ওয়েব অ্যাপ ইউআরএল দিন।' });
      return;
    }
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'গুগল শিট থেকে ডাটা আনা হচ্ছে...' });
    const res = await fetchFromGoogleSheet();
    setLoading(false);
    if (res.success && res.data) {
      onDataRestored(res.data);
      setStatusMsg({ type: 'success', text: `${res.data.length}টি লেনদেন শিট থেকে সফলভাবে রিস্টোর করা হয়েছে!` });
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'ডাটা রিস্টোর করা যায়নি।' });
    }
  };

  const handleCopyScriptCode = () => {
    const scriptCode = `function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'get_all') {
    return ContentService.createTextOutput(getTransactions()).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput('<h3>স্মার্ট ওয়ালেট এপিআই সক্রিয় আছে!</h3>');
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : (e.parameter && e.parameter.data);
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');

    if (data.action === 'sync_all') {
      var txs = data.transactions || [];
      sheet.clear();
      sheet.appendRow(['Date', 'ID', 'Category', 'Account', 'ToAccount', 'Description', 'Amount', 'Type', 'Person', 'Action']);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f1f5f9');
      for (var i = 0; i < txs.length; i++) {
        var t = txs[i];
        sheet.appendRow([t.date, t.id, t.category, t.account, t.toAccount || '', t.description, t.amount, t.type, t.person || '', t.action || '']);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === 'add') {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Date', 'ID', 'Category', 'Account', 'ToAccount', 'Description', 'Amount', 'Type', 'Person', 'Action']);
      }
      var t = data.data;
      sheet.appendRow([t.date, t.id, t.category, t.account, t.toAccount || '', t.description, t.amount, t.type, t.person || '', t.action || '']);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getTransactions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions');
    if (!sheet) return JSON.stringify([]);
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return JSON.stringify([]);
    rows.shift();
    var transactions = rows.map(function(row) {
      return {
        date: row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[0]),
        id: String(row[1]),
        category: row[2],
        account: row[3],
        toAccount: row[4] || undefined,
        description: row[5],
        amount: Number(row[6]),
        type: row[7],
        person: row[8] || undefined,
        action: row[9] || undefined
      };
    });
    return JSON.stringify(transactions);
  } catch (e) {
    return JSON.stringify([]);
  }
}`;

    navigator.clipboard.writeText(scriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          onDataRestored(parsed.transactions);
          setStatusMsg({ type: 'success', text: `JSON ফাইল থেকে ${parsed.transactions.length}টি লেনদেন রিস্টোর করা হয়েছে!` });
        } else if (Array.isArray(parsed)) {
          onDataRestored(parsed);
          setStatusMsg({ type: 'success', text: `JSON ফাইল থেকে ${parsed.length}টি লেনদেন রিস্টোর করা হয়েছে!` });
        } else {
          setStatusMsg({ type: 'error', text: 'অকার্যকর ব্যাকআপ ফাইল ফরম্যাট।' });
        }
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'JSON ফাইল পড়তে সমস্যা হয়েছে।' });
      }
    };
    reader.readAsText(file);
  };

  const isConnected = !!url.trim();

  return (
    <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--card)] text-[var(--text)] border-2 border-[var(--border)] w-full max-w-2xl rounded-[40px] p-8 shadow-2xl modal-slide-up relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">
              <i className="fa-solid fa-table"></i>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">গুগল শিট ক্লাউড ব্যাকআপ ও সিঙ্ক</h3>
              <p className="text-[11px] font-bold text-slate-400">স্থায়ীভাবে ডাটা সংরক্ষণ ও সিঙ্ক রাখুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll py-6 space-y-6">
          {/* Connection Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-xs font-black">
                {isConnected ? 'গুগল শিট সংযুক্ত (Connected)' : 'গুগল শিট এখনও সংযুক্ত করা হয়নি'}
              </span>
            </div>
            <span className="text-[11px] font-bold opacity-80">
              মোট রেকর্ড: {transactions.length} টি
            </span>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>গুগল শিট ওয়েব অ্যাপ ইউআরএল (Web App URL)</span>
              <button
                type="button"
                onClick={handleCopyScriptCode}
                className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <i className={`fa-solid ${copiedCode ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                <span>{copiedCode ? 'স্ক্রিপ্ট কপি হয়েছে!' : 'স্ক্রিপ্ট কোড কপি করুন'}</span>
              </button>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs outline-none focus:border-[var(--accent)] text-[var(--text)]"
              />
              <button
                onClick={handleSaveUrl}
                className="px-5 py-3 bg-[var(--accent)] text-white font-bold text-xs rounded-xl shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>

          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">অটো-সিঙ্ক (Auto Sync)</p>
              <p className="text-[11px] font-medium text-slate-400">প্রতিবার নতুন লেনদেন যোগ করলে স্বয়ংক্রিয়ভাবে শিটে সেভ হবে</p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoSync}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                  autoSync ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Status Alert */}
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900'
            }`}>
              <i className={`fa-solid ${
                statusMsg.type === 'success' ? 'fa-circle-check' : statusMsg.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-notch fa-spin'
              }`}></i>
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSyncNow}
              disabled={loading}
              className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              <span>শিটে ব্যাকআপ পাঠান</span>
            </button>

            <button
              onClick={handleRestoreFromSheet}
              disabled={loading}
              className="py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-cloud-arrow-down"></i>
              <span>শিট থেকে রিস্টোর</span>
            </button>
          </div>

          {/* Offline JSON Backup Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-file-code text-[var(--accent)] mr-1.5"></i> অফলাইন ফাইল ব্যাকআপ (JSON)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportBackupJSON(transactions, accounts)}
                className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-download text-emerald-500"></i>
                <span>JSON ব্যাকআপ ডাউনলোড</span>
              </button>
              <label className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
                <i className="fa-solid fa-upload text-sky-500"></i>
                <span>JSON ফাইল আপলোড</span>
                <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Easy 4-step Setup Guide */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-2">
            <p className="font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-question"></i> কিভাবে গুগল শিট কানেক্ট করবেন? (সহজ ৪ ধাপ)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              <li>একটি নতুন গুগল শিট খুলুন এবং <b>Extensions &gt; Apps Script</b>-এ যান।</li>
              <li>উপরে <b>"স্ক্রিপ্ট কোড কপি করুন"</b> বাটনে চাপ দিয়ে কোডটি কপি করে Apps Script-এ পেস্ট করুন ও সেভ করুন।</li>
              <li><b>Deploy &gt; New deployment &gt; Web app</b> নির্বাচন করুন (Execute as: <b>Me</b>, Who has access: <b>Anyone</b>)।</li>
              <li>পাওয়া <b>Web App URL</b> টি কপি করে ওপরের ঘরে পেস্ট করে সংরক্ষণ করুন!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

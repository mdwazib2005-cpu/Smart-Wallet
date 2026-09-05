import { Transaction, WalletAccount } from '../types';

const SHEET_URL_KEY = 'smart_wallet_sheet_url';
const AUTO_SYNC_KEY = 'smart_wallet_auto_sync';

export function getSheetUrl(): string {
  return localStorage.getItem(SHEET_URL_KEY) || '';
}

export function setSheetUrl(url: string): void {
  localStorage.setItem(SHEET_URL_KEY, url.trim());
}

export function isAutoSyncEnabled(): boolean {
  return localStorage.getItem(AUTO_SYNC_KEY) === 'true';
}

export function setAutoSync(enabled: boolean): void {
  localStorage.setItem(AUTO_SYNC_KEY, enabled ? 'true' : 'false');
}

export async function syncAllToGoogleSheet(transactions: Transaction[], accounts?: WalletAccount[]): Promise<{ success: boolean; message: string }> {
  const url = getSheetUrl();
  if (!url) {
    return { success: false, message: 'গুগল শিট ওয়েব অ্যাপ ইউআরএল (Web App URL) সেট করা নেই।' };
  }

  try {
    const payload = {
      action: 'sync_all',
      transactions: transactions,
      accounts: accounts || []
    };

    const res = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script Web App redirects, no-cors ensures submission
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    // In no-cors mode we don't get body content back, but the network request completes
    return { success: true, message: 'গুগল শিটে সমস্ত ডাটা সফলভাবে ব্যাকআপ হয়েছে!' };
  } catch (err: any) {
    return { success: false, message: 'শিট সিঙ্ক করতে সমস্যা হয়েছে: ' + (err.message || err.toString()) };
  }
}

export async function addTransactionToGoogleSheet(transaction: Transaction): Promise<boolean> {
  const url = getSheetUrl();
  if (!url) return false;

  try {
    const payload = {
      action: 'add',
      data: transaction
    };
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.error('Error auto-syncing to Google Sheet:', err);
    return false;
  }
}

export async function fetchFromGoogleSheet(): Promise<{ success: boolean; data?: Transaction[]; message?: string }> {
  const url = getSheetUrl();
  if (!url) {
    return { success: false, message: 'গুগল শিট ইউআরএল পাওয়া যায়নি।' };
  }

  try {
    const fetchUrl = url.includes('?') ? `${url}&action=get_all` : `${url}?action=get_all`;
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    return { success: false, message: 'গুগল শিট থেকে সঠিক ফরম্যাটে ডাটা আসেনি।' };
  } catch (err: any) {
    return { success: false, message: 'ডাটা লোড করতে ব্যর্থ: ' + (err.message || 'নেটওয়ার্ক বা পারমিশন সমস্যা') };
  }
}

export function exportBackupJSON(transactions: Transaction[], accounts: WalletAccount[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    accounts,
    transactions
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Smart_Wallet_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

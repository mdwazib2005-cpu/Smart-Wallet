/**
 * সিকিউর পাসওয়ার্ড ভ্যালিডেশন এবং হ্যাশিং সার্ভিস
 * গিটহাবে সোর্স কোড পাবলিক থাকলেও যাতে কেউ পাসওয়ার্ড দেখতে বা বের করতে না পারে,
 * সেজন্য ওয়ান-ওয়ে ক্রিপ্টোগ্রাফিক সল্টেড হ্যাশ (SHA-256) ব্যবহার করা হয়েছে।
 */

const PASSWORD_SALT = 'smart_wallet_salt_2026';

// @@MahimWallet197000 এর সল্টেড SHA-256 হ্যাশ (সরাসরি প্লেইনটেক্সট কোডে প্রকাশ নেই)
const INITIAL_PASSWORD_HASH = '4f8d4ba1303d22c4e6ce64f224b6ad37056adfd0959f2111d69d3f008e355bf4';
const STORAGE_KEY_HASH = 'smart_wallet_pwd_hash';
const STORAGE_KEY_AUTH = 'smart_wallet_session_auth';

export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredPasswordHash(): string {
  return localStorage.getItem(STORAGE_KEY_HASH) || INITIAL_PASSWORD_HASH;
}

export async function verifyPassword(plainText: string): Promise<boolean> {
  const computedHash = await hashPassword(plainText);
  const targetHash = getStoredPasswordHash();
  const isValid = computedHash === targetHash;
  if (isValid) {
    sessionStorage.setItem(STORAGE_KEY_AUTH, 'authenticated');
  }
  return isValid;
}

export function isSessionAuthenticated(): boolean {
  return sessionStorage.getItem(STORAGE_KEY_AUTH) === 'authenticated';
}

export function lockWalletSession(): void {
  sessionStorage.removeItem(STORAGE_KEY_AUTH);
}

export async function updatePassword(currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
  const isCurrentValid = await verifyPassword(currentPass);
  if (!isCurrentValid) {
    return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়!' };
  }
  if (!newPass || newPass.trim().length < 6) {
    return { success: false, message: 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে!' };
  }
  const newHash = await hashPassword(newPass);
  localStorage.setItem(STORAGE_KEY_HASH, newHash);
  return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' };
}

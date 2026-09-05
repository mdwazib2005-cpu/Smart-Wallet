
export type AccountType = 'বিকাশ ১' | 'বিকাশ ২' | 'ব্যাংক' | 'ক্যাশ';
// Added 'Self' to TransactionType to fix comparison errors in App.tsx as it is used as a category value
export type TransactionType = 'Self' | 'Income' | 'Expense' | 'Transfer' | 'Lending' | 'Borrowing';
export type EntryMode = 'Self' | 'Transfer' | 'Ledger';

export interface Transaction {
  id: string;
  date: string;
  category: TransactionType;
  account: AccountType;
  toAccount?: AccountType;
  description: string;
  amount: number;
  type: 'Income' | 'Expense' | 'Transfer';
  person?: string;
  action?: string;
}

export interface PersonRecord {
  name: string;
  amount: number;
  type: 'Lending' | 'Borrowing';
}

export interface WalletStats {
  totalCash: number;
  loadingBalance: number;
  receivable: number;
  payable: number;
  bikash1: number;
  bikash2: number;
  bank: number;
  cash: number;
  recentTrans: Transaction[];
  personList: PersonRecord[];
}

export interface RefactorRequest {
  snippetA: string;
  snippetB: string;
  instruction: string;
}

export interface RefactorResponse {
  refinedCode: string;
  explanation: string;
  changes: string[];
}

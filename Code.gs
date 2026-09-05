/**
 * স্মার্ট ওয়ালেট - গুগল শিট ইন্টিগ্রেশন স্ক্রিপ্ট (Google Apps Script)
 * 
 * ব্যবহারের নির্দেশিকা:
 * ১. একটি নতুন Google Sheet খুলুন (https://sheets.new)।
 * ২. Extensions > Apps Script-এ যান।
 * ৩. সব কোড মুছে দিয়ে এই কোডটি পেস্ট করুন এবং Save করুন।
 * ৪. Deploy > New deployment > Select type: "Web app"-এ ক্লিক করুন।
 * ৫. Description দিন: "Smart Wallet API"
 *    Execute as: "Me"
 *    Who has access: "Anyone" (যাতে আপনার ওয়ালেট অ্যাপ থেকে ডাটা সেভ হতে পারে)
 * ৬. Deploy বাটনে চাপ দিন এবং Web App URL টি কপি করে স্মার্ট ওয়ালেট অ্যাপের "গুগল শিট ব্যাকআপ" অপশনে পেস্ট করুন!
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'get_all') {
    return ContentService.createTextOutput(getTransactions())
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">' +
    '<h2>স্মার্ট ওয়ালেট গুগল শিট এপিআই সক্রিয় আছে!</h2>' +
    '<p>এই ওয়েব অ্যাপটি আপনার স্মার্ট ওয়ালেট অ্যাপের সাথে সংযুক্ত হওয়ার জন্য প্রস্তুত।</p>' +
    '</body></html>'
  )
  .setTitle('স্মার্ট ওয়ালেট এপিআই')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : (e.parameter && e.parameter.data);
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(raw);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');

    // ১. সম্পূর্ণ ডাটা একবারে সিঙ্ক/ব্যাকআপ
    if (action === 'sync_all') {
      var txs = data.transactions || [];
      sheet.clear();
      sheet.appendRow(['Date', 'ID', 'Category', 'Account', 'ToAccount', 'Description', 'Amount', 'Type', 'Person', 'Action']);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f1f5f9');
      
      for (var i = 0; i < txs.length; i++) {
        var t = txs[i];
        sheet.appendRow([
          t.date,
          t.id,
          t.category,
          t.account,
          t.toAccount || '',
          t.description,
          t.amount,
          t.type,
          t.person || '',
          t.action || ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: txs.length })).setMimeType(ContentService.MimeType.JSON);
    }

    // ২. একক লেনদেন যুক্ত করা
    if (action === 'add') {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Date', 'ID', 'Category', 'Account', 'ToAccount', 'Description', 'Amount', 'Type', 'Person', 'Action']);
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f1f5f9');
      }
      var t = data.data;
      sheet.appendRow([
        t.date,
        t.id,
        t.category,
        t.account,
        t.toAccount || '',
        t.description,
        t.amount,
        t.type,
        t.person || '',
        t.action || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ৩. নির্দিষ্ট লেনদেন মুছে ফেলা
    if (action === 'delete') {
      deleteTransaction(data.id);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'unknown_action' })).setMimeType(ContentService.MimeType.JSON);
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
    rows.shift(); // remove header
    
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
}

function deleteTransaction(id) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions');
    if (!sheet) return;
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(id)) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  } catch (e) {
    Logger.log(e.toString());
  }
}

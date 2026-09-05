function doGet() {
  return HtmlService.createHtmlOutputFromFile('form')
    .setTitle('স্মার্ট ওয়ালেট প্রোপার্টি')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * গুগল শিটে ট্রানজ্যাকশন সেভ করার ফাংশন
 */
function saveData(jsonData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'ID', 'Category', 'Account', 'ToAccount', 'Description', 'Amount', 'Type', 'Person', 'Action']);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f1f5f9');
    }
    
    var data = JSON.parse(jsonData);
    sheet.appendRow([
      data.date,
      data.id,
      data.category,
      data.account,
      data.toAccount || '',
      data.description,
      data.amount,
      data.type,
      data.person || '',
      data.action || ''
    ]);
    return "Success";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

/**
 * গুগল শিট থেকে সব ডাটা রিড করার ফাংশন
 */
function getTransactions() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Transactions');
    if (!sheet) return JSON.stringify([]);
    
    var rows = sheet.getDataRange().getValues();
    var headers = rows.shift();
    var transactions = rows.map(function(row) {
      return {
        date: row[0],
        id: String(row[1]),
        category: row[2],
        account: row[3],
        toAccount: row[4],
        description: row[5],
        amount: Number(row[6]),
        type: row[7],
        person: row[8],
        action: row[9]
      };
    });
    return JSON.stringify(transactions);
  } catch (e) {
    return JSON.stringify([]);
  }
}

/**
 * একটি নির্দিষ্ট ট্রানজ্যাকশন ডিলিট করার ফাংশন
 */
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
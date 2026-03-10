// ============================================
// INVENTARIO ROODS - Google Apps Script Backend
// ============================================
// Pega este código en: Extensiones → Apps Script
// Luego despliega como Web App
// ============================================

const SHEET_ID = '1fS5NfpfmNgGxDvd0cNvKpSzt7x6tuEZGmzSdqOeCqbU';

// Handle GET requests (read data)
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getProviders':
        result = getData('Proveedores');
        break;
      case 'getInventories':
        result = getData('Inventarios');
        break;
      case 'getOrders':
        result = getData('Ordenes');
        break;
      case 'getAll':
        result = {
          providers: getData('Proveedores'),
          inventories: getData('Inventarios'),
          orders: getData('Ordenes')
        };
        break;
      default:
        result = { error: 'Acción no válida' };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (write data)
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case 'saveProviders':
        result = saveFullData('Proveedores', body.data);
        break;
      case 'saveInventory':
        result = appendData('Inventarios', body.data);
        break;
      case 'saveInventories':
        result = saveFullData('Inventarios', body.data);
        break;
      case 'saveOrders':
        result = saveFullData('Ordenes', body.data);
        break;
      default:
        result = { error: 'Acción no válida' };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ Helper Functions ============

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getData(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return []; // No data (only header or empty)
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      const val = row[i];
      // Try to parse JSON strings
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { obj[header] = JSON.parse(val); } catch (e) { obj[header] = val; }
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
}

function saveFullData(sheetName, dataArray) {
  const sheet = getOrCreateSheet(sheetName);
  
  if (!dataArray || dataArray.length === 0) {
    // Clear data but keep headers if they exist
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }
    return { saved: 0 };
  }
  
  // Get all keys from all objects to build complete headers
  const headerSet = new Set();
  dataArray.forEach(item => {
    Object.keys(item).forEach(key => headerSet.add(key));
  });
  const headers = Array.from(headerSet);
  
  // Clear sheet and write headers
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#22C55E');
  headerRange.setFontColor('#FFFFFF');
  
  // Write data
  const rows = dataArray.map(item => {
    return headers.map(header => {
      const val = item[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  return { saved: rows.length };
}

function appendData(sheetName, dataItem) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = Object.keys(dataItem);
  
  // If sheet is empty, add headers
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#22C55E');
    headerRange.setFontColor('#FFFFFF');
  }
  
  // Get existing headers to maintain column order
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = existingHeaders.map(header => {
    const val = dataItem[header];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return { appended: 1 };
}

// ============ Setup Function ============
// Run this once to create the sheets with headers

function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Proveedores
  let sheet = getOrCreateSheet('Proveedores');
  if (sheet.getLastRow() === 0) {
    const headers = ['name', 'icon', 'color', 'contact', 'phone', 'paymentMethod', 'bank', 'accountNumber', 'items'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaders(sheet, headers.length);
  }
  
  // Inventarios
  sheet = getOrCreateSheet('Inventarios');
  if (sheet.getLastRow() === 0) {
    const headers = ['id', 'date', 'userName', 'startTime', 'endTime', 'duration', 'data'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaders(sheet, headers.length);
  }
  
  // Ordenes
  sheet = getOrCreateSheet('Ordenes');
  if (sheet.getLastRow() === 0) {
    const headers = ['id', 'date', 'requester', 'notes', 'orders', 'statuses'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaders(sheet, headers.length);
  }
  
  // Delete default "Sheet1" / "Hoja 1" if it exists and is empty
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
  
  SpreadsheetApp.getUi().alert('✅ Hojas creadas exitosamente: Proveedores, Inventarios, Ordenes');
}

function formatHeaders(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight('bold');
  range.setBackground('#22C55E');
  range.setFontColor('#FFFFFF');
}

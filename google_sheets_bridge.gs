/**
 * RUN THIS FUNCTION MANUALLY to trigger the Google Authorization popup.
 */
function triggerAuth() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Permission Test", "If you received this, permissions are granted!");
  Logger.log("Permission Check Completed Successfully.");
}

function doPost(e) {
  // EXTREME DEBUG: Log the fact that a request arrived at all
  logActivity("!!! [BRIDGE ENTRY] Request Received !!!");
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15s concurrency timeout
    
    if (!e || !e.postData || !e.postData.contents) {
      logError("Empty Request", "No postData found");
      return ContentService.createTextOutput("Error: No data").setMimeType(ContentService.MimeType.TEXT);
    }

    const payload = JSON.parse(e.postData.contents);
    logActivity(`doPost: Received action "${payload.action}" from client`);
    
    // Handle Connection Test
    if (payload.action === 'PING') {
      logActivity("PING Received: Connection is working!");
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "PONG" })).setMimeType(ContentService.MimeType.JSON);
    }
    



    // Handle OTP Email Dispatch
    if (payload.action === 'SEND_OTP') {
      try {
        logActivity(`Sending OTP to: ${payload.to_email}`);
        MailApp.sendEmail({
          to: payload.to_email,
          subject: "Your Vista Access Code: " + payload.code,
          body: `Your verification code is: ${payload.code}\n\nThis code expires in 10 minutes.\n\nVista Auction HR Team`
        });
        logActivity(`✅ OTP sent to ${payload.to_email}`);
      } catch (err) {
        logError("OTP Send Failed", err.message);
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle carrier gateway SMS (More reliable than EmailJS)
    if (payload.action === 'SEND_GATEWAY_SMS') {
      try {
        logActivity(`Relaying SMS to: ${payload.to_email}`);
        MailApp.sendEmail({
          to: payload.to_email,
          subject: "", 
          body: payload.message
        });
        logActivity(`✅ Gateway SMS successfully relayed to Google Mail Server`);
      } catch (err) {
        logError("Gateway Relay Failed", err.message);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    const { record, old_record, type, table } = payload;
    const data = record || old_record;
    
    if (!data) {
      logActivity("Ignored: Empty Payload");
      return ContentService.createTextOutput("Ignored: No data").setMimeType(ContentService.MimeType.TEXT);
    }
    
    logActivity(`[START] ${type} | ${table} | Ref: ${data.full_name || data.email}`);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const appSheet = ss.getSheetByName("Applications");
    const hiredSheet = ss.getSheetByName("Hired");
    const interviewSheet = ss.getSheetByName("Interviews");

    const isAppTable = (table === 'vista_applications' || table === 'applications');
    const isEmpTable = (table === 'vista_employees' || table === 'employees');

    if (isAppTable) {
      if (!appSheet) throw new Error("Applications sheet missing");
      if (type === 'INSERT') {
        if (!isDuplicate(appSheet, data)) appendNewApplicant(appSheet, data);
      } else if (type === 'UPDATE') {
        updateExistingApplicant(appSheet, hiredSheet, interviewSheet, data);
      } else if (type === 'DELETE') {
        removeRecordFromSheet(appSheet, data, 4); 
        if (hiredSheet) removeRecordFromSheet(hiredSheet, data, 5); 
        if (interviewSheet) removeRecordFromSheet(interviewSheet, data, 4); 
      }
    } 
    else if (isEmpTable) {
      if (!hiredSheet) throw new Error("Hired sheet missing");
      if (type === 'INSERT' || type === 'UPDATE') {
        syncEmployeeToHired(hiredSheet, data);
      } else if (type === 'DELETE') {
        removeRecordFromSheet(hiredSheet, data, 6); 
      }
    } else {
      logActivity(`Skipped: ${table}`);
    }
    
    return ContentService.createTextOutput("Processed").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    logError(err.message, e ? e.postData.contents : "No data");
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}


function findFirstEmptyRow(sheet, colIndex) {
  const startRow = 9;
  const values = sheet.getRange(startRow, colIndex, 1000, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const val = values[i][0];
    if (val === "" || val === null || val === undefined) return startRow + i;
  }
  return startRow + 1000;
}

function syncEmployeeToHired(sheet, record) {
  const startRow = 9;
  const matchEmail = (record.email || "").toString().toLowerCase().trim();
  if (!matchEmail) return;

  const role = (record.role || "staff").toString().toLowerCase().trim();
  
  // EXCLUDE Managers and Assistant Managers from the Hired sheet sync
  if (role === 'manager' || role === 'assistant_manager' || role === 'hr_manager' || role === 'super admin') {
    logActivity(`SKIPPED leadership role: ${record.full_name} (${role})`);
    return;
  }

  const values = sheet.getRange(startRow, 6, 1000, 1).getValues();
  let targetRow = -1;

  for (let i = 0; i < values.length; i++) {
    const existingEmail = (values[i][0] || "").toString().toLowerCase().trim();
    if (existingEmail === matchEmail && matchEmail !== "") {
      targetRow = startRow + i;
      break;
    }
  }

  if (targetRow === -1) targetRow = findFirstEmptyRow(sheet, 5);

  sheet.getRange(targetRow, 4).setValue('ACTIVE');
  sheet.getRange(targetRow, 5).setValue(record.full_name || record.fullName || "Unnamed Staff");
  sheet.getRange(targetRow, 6).setValue(record.email);
  // Column K is skipped
  
  updateHiredRowColors(sheet, targetRow);
}

function isDuplicate(sheet, record) {
  const startRow = 9;
  const checkEmail = (record.email || "").toString().toLowerCase().trim();
  const checkName = (record.full_name || "").toString().toLowerCase().trim();
  if (!checkEmail && !checkName) return false;

  const data = sheet.getRange(startRow, 5, 200, 2).getValues(); // Name (5), Email (6)
  for (let i = 0; i < data.length; i++) {
    const sName = (data[i][0] || "").toString().toLowerCase().trim();
    const sEmail = (data[i][1] || "").toString().toLowerCase().trim();
    if (checkEmail && sEmail === checkEmail) return true;
    if (checkName && sName === checkName && sName.length > 3) return true;
  }
  return false;
}

function removeRecordFromSheet(sheet, record, col) {
  if (!sheet) return;
  const startRow = 9;
  const values = sheet.getRange(startRow, col, 200, 1).getValues();
  
  const targetId = (record.id || "").toString().toLowerCase().substring(0,8);
  const targetEmail = (record.email || "").toString().toLowerCase().trim();
  const targetName = (record.full_name || "").toString().toLowerCase().trim();

  for (let i = values.length - 1; i >= 0; i--) {
    const val = (values[i][0] || "").toString().toLowerCase().trim();
    let match = false;
    if (col === 4 && val.includes(targetId) && targetId) match = true;
    if (col === 5 && val === targetName && targetName) match = true;
    if (col === 6 && val === targetEmail && targetEmail) match = true;

    if (match) {
      sheet.deleteRow(startRow + i);
      logActivity(`Deleted row ${startRow + i} from ${sheet.getName()}`);
    }
  }
}

function appendNewApplicant(sheet, record) {
  const targetRow = findFirstEmptyRow(sheet, 5); 
  const notes = record.notes ? (typeof record.notes === 'string' && record.notes.startsWith('{') ? JSON.parse(record.notes) : {}) : {};

  sheet.getRange(targetRow, 4).setValue((record.id || "NEW").substring(0,8).toUpperCase());
  sheet.getRange(targetRow, 5).setValue(record.full_name || "Applicant");
  sheet.getRange(targetRow, 6).setValue(record.email || "");
  sheet.getRange(targetRow, 7).setValue("'"+(record.phone || ""));
  sheet.getRange(targetRow, 8).setValue(record.position || "");
  
  const is16 = record.is16OrOlder || notes["Age 16+"] === "Yes";
  const is18 = record.is18OrOlder || notes["Age 18+"] === "Yes";
  sheet.getRange(targetRow, 9).setValue(!!is16); 
  sheet.getRange(targetRow, 10).setValue(!!is18);
  sheet.getRange(targetRow, 16).setValue(new Date().toLocaleDateString());
  sheet.getRange(targetRow, 17).setValue("N/A"); 
  
  updateApplicationRowColors(sheet, targetRow);
}

function updateExistingApplicant(appSheet, hiredSheet, interviewSheet, record) {
  const startRow = 9;
  const matchId = (record.id || "").toString().toLowerCase().substring(0,8);
  const matchName = (record.full_name || "").toString().toLowerCase().trim();
  
  const values = appSheet.getRange(startRow, 4, 200, 2).getValues();
  let foundRow = -1;

  for (let i = 0; i < values.length; i++) {
    const rowId = (values[i][0] || "").toString().toLowerCase();
    const rowName = (values[i][1] || "").toString().toLowerCase().trim();
    if ((matchId && rowId.includes(matchId)) || (matchName && rowName === matchName)) {
      foundRow = startRow + i;
      break;
    }
  }

  if (foundRow !== -1) {
    const status = (record.status || "N/A").toUpperCase();
    appSheet.getRange(foundRow, 17).setValue(status === 'INTERVIEWING' ? 'INTERVIEW' : status);
    
    if (status === 'INTERVIEWING' && interviewSheet) syncToInterviews(interviewSheet, record);
    if (status === 'HIRED' && hiredSheet) syncToHired(hiredSheet, record);
    if (status === 'FIRED' && hiredSheet) updateStatusOnHiredSheet(hiredSheet, record, "FIRED");

    updateApplicationRowColors(appSheet, foundRow);
  }
}

function updateStatusOnHiredSheet(sheet, record, newStatus) {
  const startRow = 9;
  const matchEmail = (record.email || "").toString().toLowerCase();
  const values = sheet.getRange(startRow, 6, 200, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0].toString().toLowerCase() === matchEmail) {
      sheet.getRange(startRow + i, 4).setValue(newStatus);
      break;
    }
  }
}

function syncToInterviews(sheet, record) {
  const targetRow = findFirstEmptyRow(sheet, 4);
  sheet.getRange(targetRow, 4).setValue(record.full_name);
  if (record.interview_date) {
    const formattedDate = Utilities.formatDate(new Date(record.interview_date), "America/New_York", "MM/dd/yyyy hh:mm a 'EST'");
    sheet.getRange(targetRow, 5).setValue(formattedDate);
  }
}

function syncToHired(sheet, record) {
  const targetRow = findFirstEmptyRow(sheet, 5);
  sheet.getRange(targetRow, 4).setValue("ACTIVE");
  sheet.getRange(targetRow, 5).setValue(record.full_name);
  sheet.getRange(targetRow, 6).setValue(record.email);
  sheet.getRange(targetRow, 7).setValue("'"+(record.phone || ""));
  sheet.getRange(targetRow, 8).setValue(record.position || "");
  updateHiredRowColors(sheet, targetRow);
}

function updateApplicationRowColors(sheet, row) {
  // Narrow range to 13 columns (D through P) to protect Column Q (17)
  sheet.getRange(row, 4, 1, 13).setBackground("#434343").setFontColor("#ffffff");
  sheet.getRange(row, 11, 1, 2).setBackground("#141b46");
}

function updateHiredRowColors(sheet, row) {
  // Narrow range: Change Column E (5) to S (19). Column T is 20.
  sheet.getRange(row, 5, 1, 15).setFontColor("#ffffff");
}

function logActivity(msg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    sheet.appendRow([new Date(), msg]);
  } catch (e) {}
}

function logError(msg, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    sheet.appendRow([new Date(), "ERROR: " + msg, data]);
  } catch (e) {}
}

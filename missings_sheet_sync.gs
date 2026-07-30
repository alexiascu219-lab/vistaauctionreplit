/**
 * Vista — mirror the missing-items sheet into the floor app.
 *
 * PASTE THIS INTO THE APPS SCRIPT PROJECT BOUND TO THE MISSING-ITEMS SHEET.
 * (Not the careers-portal script — that one is bound to a different workbook.)
 *
 * This is one-way: the sheet is the source of truth and nothing here writes
 * back to it. The Apps Script keeps owning the spreadsheet exactly as it does
 * today; this only mirrors the open list into Supabase so the floor app has
 * something to check scans against.
 *
 * SETUP
 *   1. Extensions -> Apps Script, paste this file in.
 *   2. Project Settings -> Script Properties, add:
 *        INGEST_SECRET   a long random string
 *      Put the SAME string in Vercel as MISSINGS_INGEST_SECRET.
 *   3. Edit TAB_NAME below if the day-tab is not today's date.
 *   4. Run syncMissingsToApp once by hand and authorise it.
 *   5. Triggers -> Add Trigger -> syncMissingsToApp, time-driven, every 5 min.
 *
 * The endpoint maps your column headers itself, so the header row can say
 * "VALPN" or "Valpn #" or "item number" and it will still land. Run
 * syncMissingsToApp once and read the log: it prints exactly which of your
 * columns it matched, so you can confirm rather than assume.
 */

var ENDPOINT = 'https://vistaauction.vercel.app/api/missings-ingest';

/**
 * Which tab to mirror. The default is today's date in YYYY-MM-DD, matching the
 * day-tab convention. Replace with a fixed name if your tabs are named
 * differently, e.g. return 'Open Items'.
 */
function TAB_NAME() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Set to true once you have confirmed the sync is mapping columns correctly.
 *
 * When true, open items that are no longer on the sheet get closed in the app.
 * Leave it false until you trust the mapping — "gone from the sheet" is not the
 * same claim as "found", and turning this on early can quietly empty the
 * floor's work list.
 */
var CLOSE_ITEMS_MISSING_FROM_SHEET = false;

function syncMissingsToApp() {
  var secret = PropertiesService.getScriptProperties().getProperty('INGEST_SECRET');
  if (!secret) {
    Logger.log('ERROR: Script Property INGEST_SECRET is not set. Nothing sent.');
    return;
  }

  var tab = TAB_NAME();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sheet) {
    Logger.log('No tab named "' + tab + '" — nothing to sync.');
    return;
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('Tab "' + tab + '" has no data rows.');
    return;
  }

  var headers = values[0].map(function (h) {
    return String(h).trim();
  });

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    var blank = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var cell = values[i][c];
      // Dates must cross as ISO strings; a raw Date stringifies unpredictably.
      if (cell instanceof Date) cell = cell.toISOString();
      row[headers[c]] = cell;
      if (cell !== '' && cell !== null) blank = false;
    }
    // Skip trailing empty rows, which every hand-maintained sheet accumulates.
    if (!blank) {
      row.__row = i + 1;
      rows.push(row);
    }
  }

  var payload = {
    rows: rows,
    sheetTab: tab,
    absent: CLOSE_ITEMS_MISSING_FROM_SHEET ? 'resolve' : 'ignore',
  };

  var response = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-ingest-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code === 200) {
    Logger.log('Synced ' + rows.length + ' rows from "' + tab + '". ' + body);
  } else {
    // Never log the secret; the body from this endpoint never contains it.
    Logger.log('Sync FAILED (' + code + '): ' + body);
  }
}

/**
 * Run this once by hand. It sends nothing — it just shows which of your columns
 * the endpoint would match, so you can confirm the mapping before scheduling.
 */
function previewMissingsMapping() {
  var tab = TAB_NAME();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sheet) {
    Logger.log('No tab named "' + tab + '".');
    return;
  }
  var headers = sheet.getDataRange().getValues()[0];
  Logger.log('Tab: ' + tab);
  Logger.log('Headers found: ' + JSON.stringify(headers));
  Logger.log('Run syncMissingsToApp and read mappedColumns in its log to see what matched.');
}

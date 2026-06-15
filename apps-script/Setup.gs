/**
 * ==========================================================================
 * Setup.gs — One-Time Sheet Initialisation & Default Data Seeding
 * ==========================================================================
 *
 * Creates all required sheet tabs with proper headers and populates the
 * default Agriculture department with 4 cadres and 12 DPC workflow steps
 * per cadre.
 *
 * This should be run ONCE after creating the Google Sheet. It is exposed
 * as a POST action ("initializeSheets") and also as a menu-callable
 * function for manual setup.
 * ==========================================================================
 */

/**
 * Can be invoked from the Apps Script editor → Run.
 * Creates all tabs and seeds default data.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('DPC Tracker')
    .addItem('Initialize Sheets & Seed Data', 'runSetup')
    .addToUi();
}

/**
 * Menu-callable wrapper (no auth needed when run from the editor).
 */
function runSetup() {
  initializeSheets_internal();
  SpreadsheetApp.getActive().toast('Setup complete!', 'DPC Tracker', 5);
}

// ─── POST: initializeSheets (API-callable) ──────────────────────────────────

/**
 * API entry point for sheet initialization. Requires Super Admin.
 *
 * @param {Object} body - Request body (action only).
 * @param {Object} user - Authenticated user.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function initializeSheets(body, user) {
  requireRole(user, 'Super Admin');

  var lock = acquireLock(30000); // longer timeout for setup
  try {
    var result = initializeSheets_internal();
    return successResponse(result, 'Sheets initialized and default data seeded');
  } finally {
    lock.releaseLock();
  }
}

// ─── Internal: Full Initialisation ──────────────────────────────────────────

/**
 * Creates all required tabs (if not already present) and seeds default data.
 *
 * @return {Object} Summary of actions taken.
 */
function initializeSheets_internal() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var created = [];
  var skipped = [];

  // ── 1. Departments_Master ──────────────────────────────────────────────
  var deptHeaders = [
    'Department_ID', 'Department_Name', 'Created_Date', 'Is_Active', 'Drive_Root_Folder_ID'
  ];
  createTabIfMissing_(ss, 'Departments_Master', deptHeaders, created, skipped);

  // ── 2. Users ──────────────────────────────────────────────────────────
  var userHeaders = [
    'Email', 'Name', 'Password', 'Department_ID', 'Role', 'Created_Date', 'Is_Active'
  ];
  createTabIfMissing_(ss, 'Users', userHeaders, created, skipped);

  // Migration for existing Users sheet missing the Password column
  var existingUsersSheet = ss.getSheetByName('Users');
  if (existingUsersSheet) {
    var headers = existingUsersSheet.getRange(1, 1, 1, existingUsersSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('Password') === -1) {
      existingUsersSheet.insertColumnAfter(2); // insert after Name (2nd col)
      existingUsersSheet.getRange(1, 3).setValue('Password');
      existingUsersSheet.autoResizeColumn(3);
      var lastRow = existingUsersSheet.getLastRow();
      if (lastRow > 1) {
        var passwords = [];
        for (var r = 2; r <= lastRow; r++) {
          passwords.push(['password123']);
        }
        existingUsersSheet.getRange(2, 3, lastRow - 1, 1).setValues(passwords);
      }
    }
  }

  // ── 3. Master_Dashboard ───────────────────────────────────────────────
  var dashHeaders = [
    'Row_ID', 'Department_ID', 'Calendar_Year', 'Cadre',
    'Estimated_Vacancies', 'Last_Promoted_Name', 'Last_Promoted_EmpID',
    'Last_Promoted_SerialNo', 'Current_Step_ID', 'Overall_Status'
  ];
  createTabIfMissing_(ss, 'Master_Dashboard', dashHeaders, created, skipped);

  // ── 4. Step_Logs ──────────────────────────────────────────────────────
  var stepHeaders = [
    'Log_ID', 'Department_ID', 'Calendar_Year', 'Cadre',
    'Step_Name', 'Step_Order', 'Status', 'Started_Date', 'Completion_Date',
    'Document_Drive_Link', 'Remarks', 'Updated_By'
  ];
  createTabIfMissing_(ss, 'Step_Logs', stepHeaders, created, skipped);

  // ── 5. Workflow_Config ────────────────────────────────────────────────
  var wfHeaders = [
    'Config_ID', 'Department_ID', 'Cadre', 'Step_Order_No',
    'Step_Name', 'Is_Active', 'Created_Date'
  ];
  createTabIfMissing_(ss, 'Workflow_Config', wfHeaders, created, skipped);

  // ── Seed Default Data ─────────────────────────────────────────────────
  var seeded = seedDefaultAgricultureData_(ss);

  return {
    tabsCreated: created,
    tabsSkipped: skipped,
    defaultDataSeeded: seeded
  };
}

// ─── Helper: Create Tab If Missing ──────────────────────────────────────────

/**
 * Creates a sheet tab with the given headers if it does not already exist.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} tabName
 * @param {string[]} headers
 * @param {string[]} createdList - Mutated: names of created tabs.
 * @param {string[]} skippedList - Mutated: names of skipped tabs.
 * @private
 */
function createTabIfMissing_(ss, tabName, headers, createdList, skippedList) {
  var existing = ss.getSheetByName(tabName);
  if (existing) {
    skippedList.push(tabName);
    return;
  }

  var sheet = ss.insertSheet(tabName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86c8');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }

  createdList.push(tabName);
}

// ─── Seed: Agriculture Department Default Data ──────────────────────────────

/**
 * Seeds the Agriculture department with 4 cadres and 12 DPC steps each.
 * Skips if "Agriculture" already exists in Departments_Master.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {{ departmentCreated: boolean, departmentId: string, cadres: string[], stepsPerCadre: number }}
 * @private
 */
function seedDefaultAgricultureData_(ss) {
  var deptSheet = ss.getSheetByName('Departments_Master');
  var deptData = deptSheet.getDataRange().getValues();

  // Check if Agriculture already exists
  for (var i = 1; i < deptData.length; i++) {
    if (String(deptData[i][1]).toLowerCase() === 'agriculture') {
      return {
        departmentCreated: false,
        message: 'Agriculture department already exists',
        departmentId: String(deptData[i][0])
      };
    }
  }

  var deptId = Utilities.getUuid();
  var now = new Date().toISOString();

  // ── Create Department ──
  deptSheet.appendRow([
    deptId,
    'Agriculture',
    now,
    'TRUE',
    '' // Drive folder created lazily
  ]);

  // ── Define Cadres ──
  var cadres = [
    'AO_to_ADA',
    'ADA_to_DD',
    'DD_to_JD',
    'JD_to_Addl_Dir'
  ];

  // ── Define 12 Standard DPC Steps ──
  var dpcSteps = [
    'Identify Vacancies & Prepare Vacancy List',
    'Obtain Seniority List from Establishment',
    'Prepare Eligibility List of Candidates',
    'Verify Service Records & CRs/APARs',
    'Check Vigilance Clearance Status',
    'Send Proposal to UPSC / DPC Convener',
    'Schedule DPC Meeting Date',
    'Conduct DPC Meeting & Prepare Minutes',
    'Obtain DPC Panel Approval / Recommendations',
    'Issue Promotion Orders',
    'Update Service Records & Seniority',
    'Archive & Close DPC Cycle'
  ];

  // ── Populate Workflow_Config ──
  var wfSheet = ss.getSheetByName('Workflow_Config');

  for (var c = 0; c < cadres.length; c++) {
    for (var s = 0; s < dpcSteps.length; s++) {
      wfSheet.appendRow([
        Utilities.getUuid(),   // Config_ID
        deptId,                // Department_ID
        cadres[c],             // Cadre
        s + 1,                 // Step_Order_No
        dpcSteps[s],           // Step_Name
        'TRUE',                // Is_Active
        now                    // Created_Date
      ]);
    }
  }

  // ── Create a default Super Admin user (placeholder) ──
  var usersSheet = ss.getSheetByName('Users');
  var existingUsers = usersSheet.getDataRange().getValues();

  // Only seed if no users exist yet
  if (existingUsers.length <= 1) {
    usersSheet.appendRow([
      'admin@example.com',   // Email (placeholder — change this!)
      'System Administrator', // Name
      'admin123',            // Password
      deptId,                 // Department_ID
      'Super Admin',          // Role
      now,                    // Created_Date
      'TRUE'                  // Is_Active
    ]);
  }

  return {
    departmentCreated: true,
    departmentId: deptId,
    cadres: cadres,
    stepsPerCadre: dpcSteps.length,
    totalSteps: cadres.length * dpcSteps.length
  };
}

// ─── Utility: Delete All Data (Danger!) ─────────────────────────────────────

/**
 * Clears all data from all tabs (preserves headers). Useful for dev/testing.
 * Only callable from the Apps Script editor — NOT exposed via the API.
 */
function clearAllData() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tabs = [
    'Departments_Master', 'Users', 'Master_Dashboard',
    'Step_Logs', 'Workflow_Config'
  ];

  for (var t = 0; t < tabs.length; t++) {
    var sheet = ss.getSheetByName(tabs[t]);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }

  Logger.log('All data cleared (headers preserved).');
}

/**
 * Full reset: deletes all non-default sheets, then re-runs setup.
 * Only callable from the Apps Script editor.
 */
function fullReset() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tabs = [
    'Departments_Master', 'Users', 'Master_Dashboard',
    'Step_Logs', 'Workflow_Config'
  ];

  // Delete existing tabs
  for (var t = 0; t < tabs.length; t++) {
    var sheet = ss.getSheetByName(tabs[t]);
    if (sheet) {
      // Ensure there's always at least one sheet
      if (ss.getSheets().length === 1) {
        ss.insertSheet('_temp');
      }
      ss.deleteSheet(sheet);
    }
  }

  // Remove temp sheet if created
  var temp = ss.getSheetByName('_temp');
  if (temp && ss.getSheets().length > 1) {
    ss.deleteSheet(temp);
  }

  // Re-run setup
  initializeSheets_internal();
  Logger.log('Full reset complete.');
}

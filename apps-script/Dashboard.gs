/**
 * ==========================================================================
 * Dashboard.gs — Master Dashboard & Step-Log Operations
 * ==========================================================================
 *
 * Read/write operations on the Master_Dashboard and Step_Logs tabs.
 *
 * Tabs involved:
 *   - Master_Dashboard: Row_ID | Department_ID | Calendar_Year | Cadre |
 *       Estimated_Vacancies | Last_Promoted_Name | Last_Promoted_EmpID |
 *       Last_Promoted_SerialNo | Current_Step_ID | Overall_Status
 *   - Step_Logs: Log_ID | Department_ID | Calendar_Year | Cadre |
 *       Step_Name | Step_Order | Status | Started_Date | Completion_Date |
 *       Document_Drive_Link | Remarks | Updated_By
 * ==========================================================================
 */

// ─── GET: Master Dashboard ──────────────────────────────────────────────────

/**
 * Returns dashboard rows, optionally filtered by department and/or year.
 *
 * Query params:
 *   - departmentId (optional, required for non-Super-Admin)
 *   - calendarYear (optional)
 *   - cadre (optional)
 *
 * @param {Object} params - Query parameters.
 * @param {Object} user   - Authenticated user.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getMasterDashboard(params, user) {
  requireRole(user, 'Read-Only Observer');

  // Load steps from Step_Logs to embed in rows
  var stepSheet = getSheet('Step_Logs');
  var stepData = stepSheet.getDataRange().getValues();
  var stepHeaders = stepData[0];
  var stepsMap = {}; // cadre_year -> array of steps

  for (var j = 1; j < stepData.length; j++) {
    var stepRow = mapRowToObject(stepHeaders, stepData[j]);
    var deptCheck = isSuperAdmin(user) || stepRow['Department_ID'] === user.departmentId;
    if (deptCheck) {
      var cadre = stepRow['Cadre'];
      var sYear = String(stepRow['Calendar_Year']);
      var key = cadre + '_' + sYear;
      if (!stepsMap[key]) {
        stepsMap[key] = [];
      }
      stepsMap[key].push({
        name: stepRow['Step_Name'],
        status: stepRow['Status'],
        order: Number(stepRow['Step_Order']),
        completionDate: stepRow['Completion_Date']
      });
    }
  }

  // Sort steps inside each cadre
  for (var key in stepsMap) {
    stepsMap[key].sort(function(a, b) { return a.order - b.order; });
  }

  var sheet = getSheet('Master_Dashboard');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  var filterDeptId = params.departmentId || params.deptId;
  var filterYear = params.calendarYear || params.year;

  for (var i = 1; i < data.length; i++) {
    var row = mapRowToObject(headers, data[i]);

    // Department scoping
    if (!isSuperAdmin(user) && row['Department_ID'] !== user.departmentId) {
      continue;
    }
    if (filterDeptId && row['Department_ID'] !== filterDeptId) {
      continue;
    }
    if (filterYear && String(row['Calendar_Year']) !== String(filterYear)) {
      continue;
    }
    if (params.cadre && row['Cadre'] !== params.cadre) {
      continue;
    }

    var rKey = row['Cadre'] + '_' + String(row['Calendar_Year']);
    row.steps = stepsMap[rKey] || [];

    rows.push(row);
  }

  return successResponse(rows, 'Fetched ' + rows.length + ' dashboard record(s)');
}

// ─── POST: Update Vacancies ─────────────────────────────────────────────────

/**
 * Updates the Estimated_Vacancies for a specific dashboard row.
 * Can find row by rowId OR departmentId + calendarYear + cadre.
 * Auto-initializes the cycle year if it does not exist.
 *
 * @param {Object} body - Request body.
 * @param {Object} user - Authenticated user.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function updateVacancies(body, user) {
  requireRole(user, 'Dealing Assistant');

  var rowId = body.rowId;
  var vacancies = body.estimatedVacancies !== undefined ? body.estimatedVacancies : body.vacancies;
  var cadre = body.cadre;
  var year = body.calendarYear || body.year;
  var deptId = body.departmentId || user.departmentId;

  if (vacancies === undefined || vacancies === null) return errorResponse('Missing estimatedVacancies');
  if (isNaN(Number(vacancies)) || Number(vacancies) < 0) return errorResponse('estimatedVacancies must be a non-negative number');

  var lock = acquireLock();
  try {
    var sheet = getSheet('Master_Dashboard');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rowIdCol = headers.indexOf('Row_ID');
    var vacCol = headers.indexOf('Estimated_Vacancies');
    var deptCol = headers.indexOf('Department_ID');
    var yearCol = headers.indexOf('Calendar_Year');
    var cadreCol = headers.indexOf('Cadre');

    var targetRowIdx = -1;

    if (rowId) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][rowIdCol]) === String(rowId)) {
          targetRowIdx = i;
          break;
        }
      }
    } else if (cadre && year) {
      for (var i = 1; i < data.length; i++) {
        if (
          String(data[i][deptCol]) === String(deptId) &&
          String(data[i][yearCol]) === String(year) &&
          String(data[i][cadreCol]) === String(cadre)
        ) {
          targetRowIdx = i;
          rowId = String(data[i][rowIdCol]);
          break;
        }
      }
    }

    if (targetRowIdx === -1) {
      if (cadre && year && deptId) {
        lock.releaseLock();
        var initResult = initializeYearForCadre({ departmentId: deptId, calendarYear: year, cadre: cadre }, user);
        var initJson = JSON.parse(initResult.getContent());
        if (!initJson.success) {
          return initResult;
        }
        lock = acquireLock();
        sheet = getSheet('Master_Dashboard');
        data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (
            String(data[i][deptCol]) === String(deptId) &&
            String(data[i][yearCol]) === String(year) &&
            String(data[i][cadreCol]) === String(cadre)
          ) {
            targetRowIdx = i;
            rowId = String(data[i][rowIdCol]);
            break;
          }
        }
      } else {
        return errorResponse('Row not found and insufficient parameters for auto-initialization');
      }
    }

    requireDepartmentAccess(user, String(data[targetRowIdx][deptCol]));
    sheet.getRange(targetRowIdx + 1, vacCol + 1).setValue(Number(vacancies));
    return successResponse({ rowId: rowId, estimatedVacancies: Number(vacancies) }, 'Vacancies updated');
  } finally {
    if (lock) lock.releaseLock();
  }
}

// ─── POST: Update Baseline (Last Promoted info) ─────────────────────────────

/**
 * Updates the Last_Promoted_Name, Last_Promoted_EmpID, and
 * Last_Promoted_SerialNo for a dashboard row.
 * Can find row by rowId OR departmentId + calendarYear + cadre.
 * Auto-initializes the cycle year if it does not exist.
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function updateBaseline(body, user) {
  requireRole(user, 'Dealing Assistant');

  var rowId = body.rowId;
  var cadre = body.cadre;
  var year = body.calendarYear || body.year;
  var deptId = body.departmentId || user.departmentId;

  var lock = acquireLock();
  try {
    var sheet = getSheet('Master_Dashboard');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rowIdCol = headers.indexOf('Row_ID');
    var deptCol = headers.indexOf('Department_ID');
    var yearCol = headers.indexOf('Calendar_Year');
    var cadreCol = headers.indexOf('Cadre');

    var targetRowIdx = -1;

    if (rowId) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][rowIdCol]) === String(rowId)) {
          targetRowIdx = i;
          break;
        }
      }
    } else if (cadre && year) {
      for (var i = 1; i < data.length; i++) {
        if (
          String(data[i][deptCol]) === String(deptId) &&
          String(data[i][yearCol]) === String(year) &&
          String(data[i][cadreCol]) === String(cadre)
        ) {
          targetRowIdx = i;
          rowId = String(data[i][rowIdCol]);
          break;
        }
      }
    }

    if (targetRowIdx === -1) {
      if (cadre && year && deptId) {
        lock.releaseLock();
        var initResult = initializeYearForCadre({ departmentId: deptId, calendarYear: year, cadre: cadre }, user);
        var initJson = JSON.parse(initResult.getContent());
        if (!initJson.success) {
          return initResult;
        }
        lock = acquireLock();
        sheet = getSheet('Master_Dashboard');
        data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (
            String(data[i][deptCol]) === String(deptId) &&
            String(data[i][yearCol]) === String(year) &&
            String(data[i][cadreCol]) === String(cadre)
          ) {
            targetRowIdx = i;
            rowId = String(data[i][rowIdCol]);
            break;
          }
        }
      } else {
        return errorResponse('Row not found and insufficient parameters for auto-initialization');
      }
    }

    requireDepartmentAccess(user, String(data[targetRowIdx][deptCol]));

    var nameCol = headers.indexOf('Last_Promoted_Name');
    var empCol = headers.indexOf('Last_Promoted_EmpID');
    var serialCol = headers.indexOf('Last_Promoted_SerialNo');

    if (body.lastPromotedName !== undefined) {
      sheet.getRange(targetRowIdx + 1, nameCol + 1).setValue(String(body.lastPromotedName));
    }
    if (body.lastPromotedEmpID !== undefined) {
      sheet.getRange(targetRowIdx + 1, empCol + 1).setValue(String(body.lastPromotedEmpID));
    }
    if (body.lastPromotedSerialNo !== undefined) {
      sheet.getRange(targetRowIdx + 1, serialCol + 1).setValue(String(body.lastPromotedSerialNo));
    }

    return successResponse({ rowId: rowId }, 'Baseline updated');
  } finally {
    if (lock) lock.releaseLock();
  }
}

// ─── GET: Step Logs ─────────────────────────────────────────────────────────

/**
 * Returns step-log entries filtered by department, year, and cadre.
 *
 * Query params: departmentId, calendarYear, cadre (all required)
 *
 * @param {Object} params
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getStepLogs(params, user) {
  requireRole(user, 'Read-Only Observer');

  var deptId = params.departmentId || params.deptId || user.departmentId;
  var year = params.calendarYear || params.year;
  var cadre = params.cadre;

  if (!deptId || !year || !cadre) {
    return errorResponse('departmentId, calendarYear/year, and cadre are required');
  }

  requireDepartmentAccess(user, deptId);

  var sheet = getSheet('Step_Logs');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = mapRowToObject(headers, data[i]);
    if (
      row['Department_ID'] === deptId &&
      String(row['Calendar_Year']) === String(year) &&
      row['Cadre'] === cadre
    ) {
      results.push(row);
    }
  }

  // Sort by Step_Order ascending
  results.sort(function (a, b) {
    return Number(a['Step_Order']) - Number(b['Step_Order']);
  });

  return successResponse(results, 'Fetched ' + results.length + ' step log(s)');
}

// ─── POST: Update Step Status ───────────────────────────────────────────────

/**
 * Updates the status of a specific step log entry, and optionally sets
 * remarks and a document link. Also updates the Master_Dashboard's
 * Current_Step_ID and Overall_Status accordingly.
 *
 * Body fields:
 *   - logId (required)
 *   - status (required) — "Not Started" | "In Progress" | "Completed" | "Skipped"
 *   - remarks (optional)
 *   - documentDriveLink (optional)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function updateStepStatus(body, user) {
  requireRole(user, 'Dealing Assistant');

  var logId = body.logId;
  var newStatus = body.status;

  if (!logId) return errorResponse('Missing logId');
  var validStatuses = ['Not Started', 'In Progress', 'Completed', 'Skipped'];
  if (validStatuses.indexOf(newStatus) === -1) {
    return errorResponse('Invalid status. Must be one of: ' + validStatuses.join(', '));
  }

  var lock = acquireLock();
  try {
    var sheet = getSheet('Step_Logs');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var logIdCol = headers.indexOf('Log_ID');
    var statusCol = headers.indexOf('Status');
    var startedCol = headers.indexOf('Started_Date');
    var completionCol = headers.indexOf('Completion_Date');
    var docLinkCol = headers.indexOf('Document_Drive_Link');
    var remarksCol = headers.indexOf('Remarks');
    var updatedByCol = headers.indexOf('Updated_By');
    var deptCol = headers.indexOf('Department_ID');
    var yearCol = headers.indexOf('Calendar_Year');
    var cadreCol = headers.indexOf('Cadre');
    var stepOrderCol = headers.indexOf('Step_Order');

    var targetRow = -1;
    var deptId, year, cadre;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][logIdCol]) === String(logId)) {
        targetRow = i;
        deptId = String(data[i][deptCol]);
        year = String(data[i][yearCol]);
        cadre = String(data[i][cadreCol]);
        break;
      }
    }

    if (targetRow === -1) return errorResponse('Step log not found: ' + logId, 404);
    requireDepartmentAccess(user, deptId);

    var now = new Date().toISOString();

    // Update status
    sheet.getRange(targetRow + 1, statusCol + 1).setValue(newStatus);
    sheet.getRange(targetRow + 1, updatedByCol + 1).setValue(user.email);

    // Auto-set dates
    if (newStatus === 'In Progress' && !data[targetRow][startedCol]) {
      sheet.getRange(targetRow + 1, startedCol + 1).setValue(now);
    }
    if (newStatus === 'Completed') {
      sheet.getRange(targetRow + 1, completionCol + 1).setValue(now);
      if (!data[targetRow][startedCol]) {
        sheet.getRange(targetRow + 1, startedCol + 1).setValue(now);
      }
    }

    // Optional fields
    if (body.remarks !== undefined) {
      sheet.getRange(targetRow + 1, remarksCol + 1).setValue(String(body.remarks));
    }
    if (body.documentDriveLink !== undefined) {
      sheet.getRange(targetRow + 1, docLinkCol + 1).setValue(String(body.documentDriveLink));
    }

    // ── Cascade: update Master_Dashboard ──
    updateDashboardProgress_(deptId, year, cadre, data, headers);

    return successResponse({ logId: logId, status: newStatus }, 'Step status updated');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Internal helper — recalculates the Master_Dashboard's Current_Step_ID
 * and Overall_Status after a step log change.
 * @private
 */
function updateDashboardProgress_(deptId, year, cadre) {
  var stepSheet = getSheet('Step_Logs');
  var stepData = stepSheet.getDataRange().getValues();
  var stepHeaders = stepData[0];

  // Collect all steps for this dept/year/cadre
  var steps = [];
  for (var i = 1; i < stepData.length; i++) {
    if (
      String(stepData[i][stepHeaders.indexOf('Department_ID')]) === deptId &&
      String(stepData[i][stepHeaders.indexOf('Calendar_Year')]) === String(year) &&
      String(stepData[i][stepHeaders.indexOf('Cadre')]) === cadre
    ) {
      steps.push({
        logId: String(stepData[i][stepHeaders.indexOf('Log_ID')]),
        stepOrder: Number(stepData[i][stepHeaders.indexOf('Step_Order')]),
        status: String(stepData[i][stepHeaders.indexOf('Status')]),
        stepName: String(stepData[i][stepHeaders.indexOf('Step_Name')])
      });
    }
  }

  steps.sort(function (a, b) { return a.stepOrder - b.stepOrder; });

  // Determine current step & overall status
  var currentStepId = '';
  var overallStatus = 'Not Started';
  var allCompleted = true;
  var anyStarted = false;

  for (var j = 0; j < steps.length; j++) {
    var s = steps[j];
    if (s.status === 'In Progress') {
      currentStepId = s.logId;
      anyStarted = true;
      allCompleted = false;
    } else if (s.status === 'Not Started') {
      if (!currentStepId) currentStepId = s.logId;
      allCompleted = false;
    } else if (s.status === 'Completed' || s.status === 'Skipped') {
      anyStarted = true;
    }
  }

  if (steps.length === 0) {
    overallStatus = 'Not Started';
  } else if (allCompleted) {
    overallStatus = 'Completed';
    currentStepId = steps[steps.length - 1].logId;
  } else if (anyStarted) {
    overallStatus = 'In Progress';
  }

  // Write back to Master_Dashboard
  var dashSheet = getSheet('Master_Dashboard');
  var dashData = dashSheet.getDataRange().getValues();
  var dh = dashData[0];
  var dDeptCol = dh.indexOf('Department_ID');
  var dYearCol = dh.indexOf('Calendar_Year');
  var dCadreCol = dh.indexOf('Cadre');
  var dStepCol = dh.indexOf('Current_Step_ID');
  var dStatusCol = dh.indexOf('Overall_Status');

  for (var k = 1; k < dashData.length; k++) {
    if (
      String(dashData[k][dDeptCol]) === deptId &&
      String(dashData[k][dYearCol]) === String(year) &&
      String(dashData[k][dCadreCol]) === cadre
    ) {
      dashSheet.getRange(k + 1, dStepCol + 1).setValue(currentStepId);
      dashSheet.getRange(k + 1, dStatusCol + 1).setValue(overallStatus);
      break;
    }
  }
}

// ─── POST: Initialize Year for Cadre ────────────────────────────────────────

/**
 * Creates a new Master_Dashboard row and corresponding Step_Logs entries
 * for a given department + year + cadre, using the Workflow_Config template.
 *
 * Body fields: departmentId, calendarYear, cadre
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function initializeYearForCadre(body, user) {
  requireRole(user, 'Department Admin');

  var deptId = body.departmentId;
  var year = body.calendarYear;
  var cadre = body.cadre;

  if (!deptId || !year || !cadre) {
    return errorResponse('departmentId, calendarYear, and cadre are required');
  }
  requireDepartmentAccess(user, deptId);

  var lock = acquireLock();
  try {
    // Check for duplicates
    var dashSheet = getSheet('Master_Dashboard');
    var dashData = dashSheet.getDataRange().getValues();
    var dh = dashData[0];

    for (var d = 1; d < dashData.length; d++) {
      if (
        String(dashData[d][dh.indexOf('Department_ID')]) === deptId &&
        String(dashData[d][dh.indexOf('Calendar_Year')]) === String(year) &&
        String(dashData[d][dh.indexOf('Cadre')]) === cadre
      ) {
        return errorResponse('Year ' + year + ' already initialized for cadre "' + cadre + '" in this department');
      }
    }

    // Fetch workflow template
    var wfSheet = getSheet('Workflow_Config');
    var wfData = wfSheet.getDataRange().getValues();
    var wh = wfData[0];
    var steps = [];

    for (var w = 1; w < wfData.length; w++) {
      if (
        String(wfData[w][wh.indexOf('Department_ID')]) === deptId &&
        String(wfData[w][wh.indexOf('Cadre')]) === cadre &&
        String(wfData[w][wh.indexOf('Is_Active')]).toUpperCase() === 'TRUE'
      ) {
        steps.push({
          stepName: String(wfData[w][wh.indexOf('Step_Name')]),
          stepOrder: Number(wfData[w][wh.indexOf('Step_Order_No')])
        });
      }
    }

    if (steps.length === 0) {
      return errorResponse('No active workflow steps found for cadre "' + cadre + '" in department ' + deptId);
    }

    steps.sort(function (a, b) { return a.stepOrder - b.stepOrder; });

    // Create dashboard row
    var rowId = Utilities.getUuid();
    var firstLogId = '';

    dashSheet.appendRow([
      rowId,        // Row_ID
      deptId,       // Department_ID
      Number(year), // Calendar_Year
      cadre,        // Cadre
      0,            // Estimated_Vacancies
      '',           // Last_Promoted_Name
      '',           // Last_Promoted_EmpID
      '',           // Last_Promoted_SerialNo
      '',           // Current_Step_ID  (set after step logs)
      'Not Started' // Overall_Status
    ]);

    // Create step log entries
    var stepSheet = getSheet('Step_Logs');
    for (var s = 0; s < steps.length; s++) {
      var logId = Utilities.getUuid();
      if (s === 0) firstLogId = logId;

      stepSheet.appendRow([
        logId,                  // Log_ID
        deptId,                 // Department_ID
        Number(year),           // Calendar_Year
        cadre,                  // Cadre
        steps[s].stepName,      // Step_Name
        steps[s].stepOrder,     // Step_Order
        'Not Started',          // Status
        '',                     // Started_Date
        '',                     // Completion_Date
        '',                     // Document_Drive_Link
        '',                     // Remarks
        user.email              // Updated_By
      ]);
    }

    // Set current step to first step
    var newDashData = dashSheet.getDataRange().getValues();
    var newDh = newDashData[0];
    for (var nd = 1; nd < newDashData.length; nd++) {
      if (String(newDashData[nd][newDh.indexOf('Row_ID')]) === rowId) {
        dashSheet.getRange(nd + 1, newDh.indexOf('Current_Step_ID') + 1).setValue(firstLogId);
        break;
      }
    }

    return successResponse({
      rowId: rowId,
      stepsCreated: steps.length
    }, 'Year ' + year + ' initialized for cadre "' + cadre + '" with ' + steps.length + ' steps');
  } finally {
    lock.releaseLock();
  }
}

// ─── Utility: Map array row to object ────────────────────────────────────────

/**
 * Converts a sheet row (array) to a keyed object using the header row.
 * @param {string[]} headers
 * @param {Array} row
 * @return {Object}
 */
function mapRowToObject(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] !== undefined ? row[i] : '';
  }
  return obj;
}

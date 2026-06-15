/**
 * ==========================================================================
 * Workflow.gs — Workflow Configuration Management
 * ==========================================================================
 *
 * CRUD operations on the Workflow_Config tab and cadre management.
 *
 * Tab: Workflow_Config
 *   Config_ID | Department_ID | Cadre | Step_Order_No | Step_Name |
 *   Is_Active | Created_Date
 * ==========================================================================
 */

// ─── GET: Workflow Config ───────────────────────────────────────────────────

/**
 * Returns workflow configuration steps for a department and optionally a cadre.
 *
 * Query params:
 *   - departmentId (required)
 *   - cadre (optional)
 *
 * @param {Object} params
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getWorkflowConfig(params, user) {
  requireRole(user, 'Read-Only Observer');

  var deptId = params.departmentId || params.deptId || user.departmentId;
  if (!deptId) return errorResponse('departmentId is required');
  requireDepartmentAccess(user, deptId);

  var sheet = getSheet('Workflow_Config');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = mapRowToObject(headers, data[i]);
    if (row['Department_ID'] !== deptId) continue;
    if (params.cadre && row['Cadre'] !== params.cadre) continue;
    results.push(row);
  }

  // Sort by Cadre, then Step_Order_No
  results.sort(function (a, b) {
    if (a['Cadre'] < b['Cadre']) return -1;
    if (a['Cadre'] > b['Cadre']) return 1;
    return Number(a['Step_Order_No']) - Number(b['Step_Order_No']);
  });

  return successResponse(results, 'Fetched ' + results.length + ' workflow step(s)');
}

// ─── POST: Add Workflow Step ────────────────────────────────────────────────

/**
 * Adds a new workflow step to a department's cadre configuration.
 *
 * Body fields:
 *   - departmentId (required)
 *   - cadre (required)
 *   - stepName (required)
 *   - stepOrderNo (required, positive integer)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function addStep(body, user) {
  requireRole(user, 'Department Admin');

  var deptId = body.departmentId || body.deptId || user.departmentId;
  var cadre = body.cadre;
  var stepName = body.stepName;
  var stepOrderNo = body.stepOrderNo;

  if (!deptId || !cadre || !stepName) {
    return errorResponse('departmentId, cadre, and stepName are required');
  }
  if (!stepOrderNo || isNaN(Number(stepOrderNo)) || Number(stepOrderNo) < 1) {
    return errorResponse('stepOrderNo must be a positive integer');
  }
  requireDepartmentAccess(user, deptId);

  var lock = acquireLock();
  try {
    var sheet = getSheet('Workflow_Config');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Check for duplicate step name within the same cadre
    for (var i = 1; i < data.length; i++) {
      if (
        String(data[i][headers.indexOf('Department_ID')]) === deptId &&
        String(data[i][headers.indexOf('Cadre')]) === cadre &&
        String(data[i][headers.indexOf('Step_Name')]).toLowerCase() === stepName.toLowerCase()
      ) {
        return errorResponse('Step "' + stepName + '" already exists for cadre "' + cadre + '"');
      }
    }

    var configId = Utilities.getUuid();
    var now = new Date().toISOString();

    sheet.appendRow([
      configId,             // Config_ID
      deptId,               // Department_ID
      cadre,                // Cadre
      Number(stepOrderNo),  // Step_Order_No
      stepName,             // Step_Name
      'TRUE',               // Is_Active
      now                   // Created_Date
    ]);

    return successResponse({
      configId: configId,
      stepName: stepName,
      stepOrderNo: Number(stepOrderNo)
    }, 'Workflow step added');
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Delete Workflow Step ─────────────────────────────────────────────

/**
 * Soft-deletes a workflow step by setting Is_Active to FALSE.
 *
 * Body fields: configId
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function deleteStep(body, user) {
  requireRole(user, 'Department Admin');

  var configId = body.configId;
  if (!configId) return errorResponse('configId is required');

  var lock = acquireLock();
  try {
    var sheet = getSheet('Workflow_Config');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('Config_ID');
    var activeCol = headers.indexOf('Is_Active');
    var deptCol = headers.indexOf('Department_ID');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(configId)) {
        requireDepartmentAccess(user, String(data[i][deptCol]));
        sheet.getRange(i + 1, activeCol + 1).setValue('FALSE');
        return successResponse({ configId: configId }, 'Workflow step deactivated');
      }
    }

    return errorResponse('Config step not found: ' + configId, 404);
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Reorder Workflow Steps ───────────────────────────────────────────

/**
 * Reorders all steps for a given department + cadre.
 *
 * Body fields:
 *   - departmentId (required)
 *   - cadre (required)
 *   - orderedConfigIds (required, array of Config_IDs in desired order)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function reorderSteps(body, user) {
  requireRole(user, 'Department Admin');

  var deptId = body.departmentId || body.deptId || user.departmentId;
  var cadre = body.cadre;
  var orderedIds = body.orderedConfigIds;

  if (!deptId || !cadre) return errorResponse('departmentId and cadre are required');
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return errorResponse('orderedConfigIds must be a non-empty array');
  }
  requireDepartmentAccess(user, deptId);

  var lock = acquireLock();
  try {
    var sheet = getSheet('Workflow_Config');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('Config_ID');
    var orderCol = headers.indexOf('Step_Order_No');
    var deptCol = headers.indexOf('Department_ID');
    var cadreCol = headers.indexOf('Cadre');

    // Build a map of configId → row index
    var rowMap = {};
    for (var i = 1; i < data.length; i++) {
      var cId = String(data[i][idCol]);
      if (
        String(data[i][deptCol]) === deptId &&
        String(data[i][cadreCol]) === cadre
      ) {
        rowMap[cId] = i; // 0-based data index
      }
    }

    // Assign new order
    var updated = 0;
    for (var j = 0; j < orderedIds.length; j++) {
      var id = String(orderedIds[j]);
      if (rowMap[id] !== undefined) {
        sheet.getRange(rowMap[id] + 1, orderCol + 1).setValue(j + 1);
        updated++;
      }
    }

    return successResponse({ updated: updated }, updated + ' step(s) reordered');
  } finally {
    lock.releaseLock();
  }
}

// ─── GET: Get Cadres ────────────────────────────────────────────────────────

/**
 * Returns distinct cadre names for a department from Workflow_Config.
 *
 * Query params: departmentId (required)
 *
 * @param {Object} params
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getCadres(params, user) {
  requireRole(user, 'Read-Only Observer');

  var deptId = params.departmentId || params.deptId || user.departmentId;
  if (!deptId) return errorResponse('departmentId is required');
  requireDepartmentAccess(user, deptId);

  var sheet = getSheet('Workflow_Config');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var deptCol = headers.indexOf('Department_ID');
  var cadreCol = headers.indexOf('Cadre');
  var activeCol = headers.indexOf('Is_Active');

  var cadreSet = {};
  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][deptCol]) === deptId &&
      String(data[i][activeCol]).toUpperCase() === 'TRUE'
    ) {
      cadreSet[String(data[i][cadreCol])] = true;
    }
  }

  var cadres = Object.keys(cadreSet).sort();
  return successResponse(cadres, 'Found ' + cadres.length + ' cadre(s)');
}

// ─── POST: Add Cadre ────────────────────────────────────────────────────────

/**
 * Adds a new cadre to a department with a default set of DPC workflow steps.
 *
 * Body fields:
 *   - departmentId (required)
 *   - cadreName (required)
 *   - steps (optional, array of step name strings; defaults to standard 12 DPC steps)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function addCadre(body, user) {
  requireRole(user, 'Department Admin');

  var deptId = body.departmentId || body.deptId || user.departmentId;
  var cadreName = body.cadreName;

  if (!deptId || !cadreName) return errorResponse('departmentId and cadreName are required');
  requireDepartmentAccess(user, deptId);

  var lock = acquireLock();
  try {
    // Check if cadre already exists
    var sheet = getSheet('Workflow_Config');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (
        String(data[i][headers.indexOf('Department_ID')]) === deptId &&
        String(data[i][headers.indexOf('Cadre')]) === cadreName &&
        String(data[i][headers.indexOf('Is_Active')]).toUpperCase() === 'TRUE'
      ) {
        return errorResponse('Cadre "' + cadreName + '" already exists for this department');
      }
    }

    var steps = body.steps || getDefaultDPCSteps_();
    var now = new Date().toISOString();
    var createdIds = [];

    for (var s = 0; s < steps.length; s++) {
      var configId = Utilities.getUuid();
      createdIds.push(configId);
      sheet.appendRow([
        configId,
        deptId,
        cadreName,
        s + 1,
        steps[s],
        'TRUE',
        now
      ]);
    }

    return successResponse({
      cadreName: cadreName,
      stepsCreated: steps.length,
      configIds: createdIds
    }, 'Cadre "' + cadreName + '" added with ' + steps.length + ' steps');
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Delete Cadre ─────────────────────────────────────────────────────

/**
 * Soft-deletes all workflow steps for a cadre (sets Is_Active = FALSE).
 *
 * Body fields: departmentId, cadreName
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function deleteCadre(body, user) {
  requireRole(user, 'Department Admin');

  var deptId = body.departmentId || body.deptId || user.departmentId;
  var cadreName = body.cadreName;
  if (!deptId || !cadreName) return errorResponse('departmentId and cadreName are required');
  requireDepartmentAccess(user, deptId);

  var lock = acquireLock();
  try {
    var sheet = getSheet('Workflow_Config');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var deptCol = headers.indexOf('Department_ID');
    var cadreCol = headers.indexOf('Cadre');
    var activeCol = headers.indexOf('Is_Active');

    var deactivated = 0;
    for (var i = 1; i < data.length; i++) {
      if (
        String(data[i][deptCol]) === deptId &&
        String(data[i][cadreCol]) === cadreName &&
        String(data[i][activeCol]).toUpperCase() === 'TRUE'
      ) {
        sheet.getRange(i + 1, activeCol + 1).setValue('FALSE');
        deactivated++;
      }
    }

    if (deactivated === 0) {
      return errorResponse('No active steps found for cadre "' + cadreName + '"', 404);
    }

    return successResponse({
      cadreName: cadreName,
      stepsDeactivated: deactivated
    }, 'Cadre "' + cadreName + '" deactivated (' + deactivated + ' steps)');
  } finally {
    lock.releaseLock();
  }
}

// ─── Internal: Default DPC Steps ────────────────────────────────────────────

/**
 * Returns the standard 12-step DPC process names.
 * @return {string[]}
 * @private
 */
function getDefaultDPCSteps_() {
  return [
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
}

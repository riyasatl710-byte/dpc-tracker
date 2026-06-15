/**
 * ==========================================================================
 * Code.gs — Main API Router
 * DPC (Departmental Promotion Committee) Promotion Tracker
 * ==========================================================================
 *
 * Entry point for the web app. All HTTP requests (GET/POST) are routed here,
 * authenticated, and dispatched to the appropriate handler module.
 *
 * Deployment: "Execute as: Me" + "Anyone" access.
 * ==========================================================================
 */

/** @const {string} Google Sheet ID backing the application. */
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// ─── Response Helpers ────────────────────────────────────────────────────────

/**
 * Creates a JSON response that is CORS-safe for cross-origin web-app calls.
 * @param {Object} data - The payload to serialise.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Shorthand for a successful response.
 * @param {*} data - Payload (will be nested under `data` key).
 * @param {string} [message='Success'] - Human-readable message.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function successResponse(data, message) {
  return jsonResponse({
    success: true,
    message: message || 'Success',
    data: data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Shorthand for an error response.
 * @param {string} message - Error description.
 * @param {number} [code=400] - Numeric error code (informational only; Apps Script always returns 200).
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function errorResponse(message, code) {
  return jsonResponse({
    success: false,
    error: message,
    code: code || 400,
    timestamp: new Date().toISOString()
  });
}

// ─── GET Router ──────────────────────────────────────────────────────────────

/**
 * Handles all HTTP GET requests.
 * Query-string must include `action` and `token` parameters.
 * @param {Object} e - Apps Script event object.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action;

    if (!action) {
      return errorResponse('Missing required parameter: action', 400);
    }

    // ── Authentication ──
    var authResult = checkAuth(params.token);
    if (!authResult.success) {
      return errorResponse(authResult.error, 401);
    }
    var user = authResult.user; // { email, name, departmentId, role }

    // ── Route Dispatch ──
    switch (action) {

      // Dashboard
      case 'getDashboard':
      case 'getMasterDashboard':
        return getMasterDashboard(params, user);
      case 'getStepLogs':
        return getStepLogs(params, user);

      // Workflow
      case 'getWorkflowConfig':
        return getWorkflowConfig(params, user);
      case 'getCadres':
        return getCadres(params, user);

      // Documents
      case 'listFiles':
      case 'listDocuments':
        return listFiles(params, user);

      // Admin
      case 'getDepartments':
        return getDepartments(params, user);
      case 'getUsers':
        return getUsers(params, user);

      // Health check (no special role needed)
      case 'ping':
        return successResponse({ pong: true, userEmail: user.email }, 'Service is healthy');

      default:
        return errorResponse('Unknown GET action: ' + action, 404);
    }
  } catch (err) {
    Logger.log('doGet ERROR: ' + err.message + '\n' + err.stack);
    return errorResponse('Internal server error: ' + err.message, 500);
  }
}

// ─── POST Router ─────────────────────────────────────────────────────────────

/**
 * Handles all HTTP POST requests.
 * Body must be JSON with at least `action` and `token` fields.
 * @param {Object} e - Apps Script event object.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action;
    if (!action) {
      return errorResponse('Missing required field: action', 400);
    }

    // ── Authentication ──
    var user = null;
    if (action === 'login') {
      // Login does not require checkAuth; it validates credentials directly
      return loginUser(body);
    } else {
      var authResult = checkAuth(body.token);
      if (!authResult.success) {
        return errorResponse(authResult.error, 401);
      }
      user = authResult.user;
    }

    // ── Route Dispatch ──
    switch (action) {

      // Auth Verification
      case 'verifyUser':
        return successResponse({
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          departmentName: user.departmentName
        }, 'Session verified successfully');

      // Dashboard — write operations
      case 'updateVacancies':
        return updateVacancies(body, user);
      case 'updateBaseline':
        return updateBaseline(body, user);
      case 'updateStepStatus':
        return updateStepStatus(body, user);
      case 'initializeYearForCadre':
        return initializeYearForCadre(body, user);

      // Workflow — write operations
      case 'addStep':
        return addStep(body, user);
      case 'deleteStep':
        return deleteStep(body, user);
      case 'reorderSteps':
        return reorderSteps(body, user);
      case 'addCadre':
        return addCadre(body, user);
      case 'deleteCadre':
        return deleteCadre(body, user);

      // Documents — write operations
      case 'uploadFile':
      case 'uploadDocument':
        return uploadFile(body, user);

      // Admin — write operations
      case 'addDepartment':
        return addDepartment(body, user);
      case 'toggleDepartment':
        return toggleDepartment(body, user);
      case 'addUser':
        return addUser(body, user);
      case 'updateUserRole':
        return updateUserRole(body, user);
      case 'removeUser':
        return removeUser(body, user);

      // Setup (Super Admin only)
      case 'initializeSheets':
        return initializeSheets(body, user);

      default:
        return errorResponse('Unknown POST action: ' + action, 404);
    }
  } catch (err) {
    Logger.log('doPost ERROR: ' + err.message + '\n' + err.stack);
    return errorResponse('Internal server error: ' + err.message, 500);
  }
}

// ─── Utility: Get Sheet by Tab Name ──────────────────────────────────────────

/**
 * Opens the backing spreadsheet and returns the requested sheet/tab.
 * @param {string} tabName - The name of the tab to retrieve.
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 * @throws {Error} If the tab does not exist.
 */
function getSheet(tabName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    throw new Error('Sheet tab not found: ' + tabName);
  }
  return sheet;
}

/**
 * Opens the backing spreadsheet object.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ─── Utility: Acquire Script Lock ───────────────────────────────────────────

/**
 * Acquires the script-wide lock for write operations.
 * @param {number} [timeoutMs=10000] - Max milliseconds to wait.
 * @return {GoogleAppsScript.Lock.Lock}
 * @throws {Error} If the lock cannot be acquired.
 */
function acquireLock(timeoutMs) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(timeoutMs || 10000);
  } catch (_) {
    throw new Error('Could not acquire lock. Please try again.');
  }
  return lock;
}

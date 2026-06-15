/**
 * ==========================================================================
 * Documents.gs — Google Drive Document Management
 * ==========================================================================
 *
 * Manages a hierarchical Drive folder structure for each department:
 *   Drive_Root_Folder
 *   └── {Department_Name}
 *       └── {Calendar_Year}
 *           └── {Cadre}
 *               └── uploaded files…
 *
 * Uses the Drive_Root_Folder_ID stored in Departments_Master.
 * ==========================================================================
 */

// ─── Folder Provisioning ────────────────────────────────────────────────────

/**
 * Ensures the root department folder exists in Drive.
 * If Drive_Root_Folder_ID is blank in Departments_Master, creates a new
 * folder in the script owner's root Drive and saves the ID back.
 *
 * @param {string} departmentId - The Department_ID to provision.
 * @return {{ folderId: string, folderName: string }}
 * @throws {Error} If the department is not found.
 */
function ensureDepartmentFolder(departmentId) {
  var sheet = getSheet('Departments_Master');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('Department_ID');
  var nameCol = headers.indexOf('Department_Name');
  var folderCol = headers.indexOf('Drive_Root_Folder_ID');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(departmentId)) {
      var deptName = String(data[i][nameCol]);
      var existingFolderId = String(data[i][folderCol]).trim();

      // If folder ID exists, verify it's still accessible
      if (existingFolderId && existingFolderId !== '') {
        try {
          var existing = DriveApp.getFolderById(existingFolderId);
          return { folderId: existing.getId(), folderName: existing.getName() };
        } catch (_) {
          // Folder was deleted or access lost — recreate
          Logger.log('Existing folder ' + existingFolderId + ' not accessible, recreating.');
        }
      }

      // Create new root folder
      var folderName = 'DPC_Tracker_' + deptName.replace(/[^a-zA-Z0-9 ]/g, '_');
      var newFolder = DriveApp.createFolder(folderName);
      var newFolderId = newFolder.getId();

      // Save back to sheet
      sheet.getRange(i + 1, folderCol + 1).setValue(newFolderId);

      return { folderId: newFolderId, folderName: folderName };
    }
  }

  throw new Error('Department not found: ' + departmentId);
}

/**
 * Ensures a year sub-folder exists within the department's root folder.
 *
 * @param {string} departmentId
 * @param {string|number} calendarYear
 * @return {{ folderId: string }}
 */
function ensureYearFolder(departmentId, calendarYear) {
  var deptFolder = ensureDepartmentFolder(departmentId);
  var parent = DriveApp.getFolderById(deptFolder.folderId);
  var yearStr = String(calendarYear);

  // Check for existing sub-folder
  var folders = parent.getFoldersByName(yearStr);
  if (folders.hasNext()) {
    return { folderId: folders.next().getId() };
  }

  // Create
  var newFolder = parent.createFolder(yearStr);
  return { folderId: newFolder.getId() };
}

/**
 * Ensures a cadre sub-folder exists within the year folder.
 *
 * @param {string} departmentId
 * @param {string|number} calendarYear
 * @param {string} cadre
 * @return {{ folderId: string }}
 */
function ensureCadreFolder(departmentId, calendarYear, cadre) {
  var yearFolder = ensureYearFolder(departmentId, calendarYear);
  var parent = DriveApp.getFolderById(yearFolder.folderId);
  var cadreSafe = cadre.replace(/[^a-zA-Z0-9 .]/g, '_');

  var folders = parent.getFoldersByName(cadreSafe);
  if (folders.hasNext()) {
    return { folderId: folders.next().getId() };
  }

  var newFolder = parent.createFolder(cadreSafe);
  return { folderId: newFolder.getId() };
}

// ─── POST: Upload File ──────────────────────────────────────────────────────

/**
 * Uploads a base64-encoded file to the appropriate cadre folder.
 *
 * Body fields:
 *   - departmentId (required)
 *   - calendarYear (required)
 *   - cadre (required)
 *   - fileName (required) — e.g. "vacancy_list.pdf"
 *   - mimeType (required) — e.g. "application/pdf"
 *   - base64Data (required) — base64-encoded file content
 *   - description (optional)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function uploadFile(body, user) {
  requireRole(user, 'Dealing Assistant');

  var deptId = body.departmentId || body.deptId || user.departmentId;
  var year = body.calendarYear || body.year;
  var cadre = body.cadre;
  var fileName = body.fileName;
  var mimeType = body.mimeType;
  var base64Data = body.base64Data || body.fileData;

  if (!deptId || !year || !cadre) {
    return errorResponse('departmentId, calendarYear/year, and cadre are required');
  }
  if (!fileName || !mimeType || !base64Data) {
    return errorResponse('fileName, mimeType, and base64Data are required');
  }
  requireDepartmentAccess(user, deptId);

  // Strip data URL prefix if present (e.g. "data:application/pdf;base64,")
  if (base64Data.indexOf(';base64,') !== -1) {
    base64Data = base64Data.split(';base64,')[1];
  }

  // Validate file size (base64 ≈ 1.33× raw; limit ~10 MB raw ≈ 13.3 MB base64)
  var MAX_BASE64_LENGTH = 14000000; // ~10 MB
  if (base64Data.length > MAX_BASE64_LENGTH) {
    return errorResponse('File too large. Maximum size is approximately 10 MB.');
  }

  var lock = acquireLock();
  try {
    var cadreFolder = ensureCadreFolder(deptId, year, cadre);
    var folder = DriveApp.getFolderById(cadreFolder.folderId);

    // Decode and create file
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = folder.createFile(blob);

    // Set description if provided
    if (body.description) {
      file.setDescription(String(body.description));
    }

    var driveLink = file.getUrl();

    return successResponse({
      fileId: file.getId(),
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      driveLink: driveLink,
      folderId: cadreFolder.folderId
    }, 'File uploaded successfully');
  } finally {
    lock.releaseLock();
  }
}

// ─── GET: List Files ────────────────────────────────────────────────────────

/**
 * Lists files in the cadre folder for a given department, year, and cadre.
 *
 * Query params:
 *   - departmentId (required)
 *   - calendarYear (required)
 *   - cadre (required)
 *
 * @param {Object} params
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function listFiles(params, user) {
  requireRole(user, 'Read-Only Observer');

  var deptId = params.departmentId || params.deptId || user.departmentId;
  var year = params.calendarYear || params.year;
  var cadre = params.cadre;

  if (!deptId || !year || !cadre) {
    return errorResponse('departmentId, calendarYear/year, and cadre are required');
  }
  requireDepartmentAccess(user, deptId);

  try {
    var cadreFolder = ensureCadreFolder(deptId, year, cadre);
    var folder = DriveApp.getFolderById(cadreFolder.folderId);
    var files = folder.getFiles();
    var result = [];

    while (files.hasNext()) {
      var file = files.next();
      result.push({
        fileId: file.getId(),
        fileName: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        driveLink: file.getUrl(),
        lastUpdated: file.getLastUpdated().toISOString(),
        description: file.getDescription() || ''
      });
    }

    // Sort by last updated descending
    result.sort(function (a, b) {
      return b.lastUpdated.localeCompare(a.lastUpdated);
    });

    return successResponse(result, 'Found ' + result.length + ' file(s)');
  } catch (err) {
    // Folder might not exist yet — that's OK, return empty
    if (err.message && err.message.indexOf('not found') !== -1) {
      return successResponse([], 'No files found (folder not yet created)');
    }
    throw err;
  }
}

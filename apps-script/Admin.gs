/**
 * ==========================================================================
 * Admin.gs — Department & User Administration
 * ==========================================================================
 *
 * CRUD operations for the Departments_Master and Users tabs.
 *
 * Tabs:
 *   Departments_Master: Department_ID | Department_Name | Created_Date |
 *                       Is_Active | Drive_Root_Folder_ID
 *   Users: Email | Name | Department_ID | Role | Created_Date | Is_Active
 * ==========================================================================
 */

// ─── GET: Departments ───────────────────────────────────────────────────────

/**
 * Returns all departments. Non-Super-Admin users only see their own dept.
 *
 * @param {Object} params - Query parameters (none required).
 * @param {Object} user   - Authenticated user.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getDepartments(params, user) {
  requireRole(user, 'Read-Only Observer');

  var sheet = getSheet('Departments_Master');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = mapRowToObject(headers, data[i]);

    // Scope: Super Admins see all; others see only their department
    if (!isSuperAdmin(user) && row['Department_ID'] !== user.departmentId) {
      continue;
    }

    results.push(row);
  }

  return successResponse(results, 'Fetched ' + results.length + ' department(s)');
}

// ─── POST: Add Department ───────────────────────────────────────────────────

/**
 * Creates a new department with default cadres and workflow steps.
 *
 * Body fields:
 *   - departmentName (required)
 *   - cadres (optional, array of cadre name strings)
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function addDepartment(body, user) {
  requireRole(user, 'Super Admin');

  var deptName = body.departmentName;
  if (!deptName || String(deptName).trim() === '') {
    return errorResponse('departmentName is required');
  }
  deptName = String(deptName).trim();

  var lock = acquireLock();
  try {
    var sheet = getSheet('Departments_Master');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var nameCol = headers.indexOf('Department_Name');

    // Duplicate check
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][nameCol]).toLowerCase() === deptName.toLowerCase()) {
        return errorResponse('Department "' + deptName + '" already exists');
      }
    }

    var deptId = Utilities.getUuid();
    var now = new Date().toISOString();

    sheet.appendRow([
      deptId,   // Department_ID
      deptName, // Department_Name
      now,      // Created_Date
      'TRUE',   // Is_Active
      ''        // Drive_Root_Folder_ID (created lazily in Documents.gs)
    ]);

    // Optionally seed cadres with default steps
    var cadres = body.cadres || [];
    var wfSheet = getSheet('Workflow_Config');
    var defaultSteps = getDefaultDPCSteps_();

    for (var c = 0; c < cadres.length; c++) {
      for (var s = 0; s < defaultSteps.length; s++) {
        wfSheet.appendRow([
          Utilities.getUuid(),   // Config_ID
          deptId,                // Department_ID
          cadres[c],             // Cadre
          s + 1,                 // Step_Order_No
          defaultSteps[s],       // Step_Name
          'TRUE',                // Is_Active
          now                    // Created_Date
        ]);
      }
    }

    return successResponse({
      departmentId: deptId,
      departmentName: deptName,
      cadresCreated: cadres.length
    }, 'Department "' + deptName + '" created');
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Toggle Department Active Status ──────────────────────────────────

/**
 * Toggles a department's Is_Active flag.
 *
 * Body fields: departmentId
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function toggleDepartment(body, user) {
  requireRole(user, 'Super Admin');

  var deptId = body.departmentId || body.deptId;
  if (!deptId) return errorResponse('departmentId is required');

  var lock = acquireLock();
  try {
    var sheet = getSheet('Departments_Master');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('Department_ID');
    var activeCol = headers.indexOf('Is_Active');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(deptId)) {
        var current = String(data[i][activeCol]).toUpperCase() === 'TRUE';
        var newVal = current ? 'FALSE' : 'TRUE';
        sheet.getRange(i + 1, activeCol + 1).setValue(newVal);

        return successResponse({
          departmentId: deptId,
          isActive: !current
        }, 'Department ' + (current ? 'deactivated' : 'activated'));
      }
    }

    return errorResponse('Department not found: ' + deptId, 404);
  } finally {
    lock.releaseLock();
  }
}

// ─── GET: Users ─────────────────────────────────────────────────────────────

/**
 * Returns users. Super Admin sees all; Department Admin sees their dept only.
 *
 * Query params: departmentId (optional, for Super Admin filtering)
 *
 * @param {Object} params
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function getUsers(params, user) {
  requireRole(user, 'Department Admin');

  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];
  var filterDeptId = params.departmentId || params.deptId;

  for (var i = 1; i < data.length; i++) {
    var row = mapRowToObject(headers, data[i]);

    // Department scoping
    if (!isSuperAdmin(user) && row['Department_ID'] !== user.departmentId) {
      continue;
    }
    if (filterDeptId && row['Department_ID'] !== filterDeptId) {
      continue;
    }

    // Remove password from results for security
    delete row['Password'];

    results.push(row);
  }

  return successResponse(results, 'Fetched ' + results.length + ' user(s)');
}

// ─── POST: Add User ────────────────────────────────────────────────────────

/**
 * Adds a new user to the system.
 *
 * Body fields:
 *   - email (required)
 *   - name (required)
 *   - departmentId (required)
 *   - role (required) — one of VALID_ROLES
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function addUser(body, user) {
  requireRole(user, 'Department Admin');

  var email = body.email;
  var name = body.name;
  var deptId = body.departmentId || body.deptId || '';
  var role = body.role;
  var password = body.password || 'password123';

  // Validation
  if (!email || !name || !role) {
    return errorResponse('email, name, and role are required');
  }

  email = String(email).toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse('Invalid email format');
  }

  if (VALID_ROLES.indexOf(role) === -1) {
    return errorResponse('Invalid role. Must be one of: ' + VALID_ROLES.join(', '));
  }

  // Only Super Admin can create Super Admin or Department Admin users
  if ((role === 'Super Admin' || role === 'Department Admin') && !isSuperAdmin(user)) {
    return errorResponse('Only Super Admin can create ' + role + ' accounts');
  }

  // Department Admin can only add users to their own department
  if (!isSuperAdmin(user) && deptId !== user.departmentId) {
    return errorResponse('You can only add users to your own department');
  }

  var lock = acquireLock();
  try {
    var sheet = getSheet('Users');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = headers.indexOf('Email');

    // Duplicate check
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).toLowerCase().trim() === email) {
        return errorResponse('User with email "' + email + '" already exists');
      }
    }

    // Verify department exists (if assigned)
    if (deptId) {
      var deptSheet = getSheet('Departments_Master');
      var deptData = deptSheet.getDataRange().getValues();
      var deptHeaders = deptData[0];
      var deptIdCol = deptHeaders.indexOf('Department_ID');
      var deptFound = false;

      for (var d = 1; d < deptData.length; d++) {
        if (String(deptData[d][deptIdCol]) === deptId) {
          deptFound = true;
          break;
        }
      }
      if (!deptFound) {
        return errorResponse('Department not found: ' + deptId, 404);
      }
    }

    var now = new Date().toISOString();

    sheet.appendRow([
      email,      // Email
      name,       // Name
      password,   // Password
      deptId,     // Department_ID
      role,       // Role
      now,        // Created_Date
      'TRUE'      // Is_Active
    ]);

    return successResponse({
      email: email,
      name: name,
      departmentId: deptId,
      role: role
    }, 'User added successfully');
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Update User Role ────────────────────────────────────────────────

/**
 * Changes a user's role.
 *
 * Body fields: email, newRole
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function updateUserRole(body, user) {
  requireRole(user, 'Department Admin');

  var targetEmail = body.email;
  var newRole = body.newRole;

  if (!targetEmail || !newRole) return errorResponse('email and newRole are required');
  targetEmail = String(targetEmail).toLowerCase().trim();

  if (VALID_ROLES.indexOf(newRole) === -1) {
    return errorResponse('Invalid role. Must be one of: ' + VALID_ROLES.join(', '));
  }

  // Only Super Admin can assign Super Admin or Department Admin
  if ((newRole === 'Super Admin' || newRole === 'Department Admin') && !isSuperAdmin(user)) {
    return errorResponse('Only Super Admin can assign the role: ' + newRole);
  }

  // Prevent self-demotion for safety
  if (targetEmail === user.email && getRoleLevel(newRole) < getRoleLevel(user.role)) {
    return errorResponse('You cannot demote yourself');
  }

  var lock = acquireLock();
  try {
    var sheet = getSheet('Users');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = headers.indexOf('Email');
    var roleCol = headers.indexOf('Role');
    var deptCol = headers.indexOf('Department_ID');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).toLowerCase().trim() === targetEmail) {
        // Department Admin can only manage their own department's users
        if (!isSuperAdmin(user) && String(data[i][deptCol]) !== user.departmentId) {
          return errorResponse('You can only manage users in your own department');
        }

        var oldRole = String(data[i][roleCol]);
        sheet.getRange(i + 1, roleCol + 1).setValue(newRole);

        return successResponse({
          email: targetEmail,
          oldRole: oldRole,
          newRole: newRole
        }, 'User role updated');
      }
    }

    return errorResponse('User not found: ' + targetEmail, 404);
  } finally {
    lock.releaseLock();
  }
}

// ─── POST: Remove User ─────────────────────────────────────────────────────

/**
 * Soft-deletes a user by setting Is_Active to FALSE.
 *
 * Body fields: email
 *
 * @param {Object} body
 * @param {Object} user
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function removeUser(body, user) {
  requireRole(user, 'Department Admin');

  var targetEmail = body.email;
  if (!targetEmail) return errorResponse('email is required');
  targetEmail = String(targetEmail).toLowerCase().trim();

  // Cannot remove yourself
  if (targetEmail === user.email) {
    return errorResponse('You cannot remove your own account');
  }

  var lock = acquireLock();
  try {
    var sheet = getSheet('Users');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var emailCol = headers.indexOf('Email');
    var activeCol = headers.indexOf('Is_Active');
    var deptCol = headers.indexOf('Department_ID');
    var roleCol = headers.indexOf('Role');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).toLowerCase().trim() === targetEmail) {
        // Department Admin can only manage their own department's users
        if (!isSuperAdmin(user) && String(data[i][deptCol]) !== user.departmentId) {
          return errorResponse('You can only manage users in your own department');
        }

        // Cannot remove a higher-privileged user
        var targetRole = String(data[i][roleCol]);
        if (getRoleLevel(targetRole) >= getRoleLevel(user.role) && !isSuperAdmin(user)) {
          return errorResponse('Cannot remove a user with equal or higher role');
        }

        sheet.getRange(i + 1, activeCol + 1).setValue('FALSE');
        return successResponse({ email: targetEmail }, 'User deactivated');
      }
    }

    return errorResponse('User not found: ' + targetEmail, 404);
  } finally {
    lock.releaseLock();
  }
}

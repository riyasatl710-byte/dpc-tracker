/**
 * ==========================================================================
 * Auth.gs — Authentication & Authorisation
 * ==========================================================================
 *
 * Verifies Google ID tokens and maps the authenticated email to the
 * internal user record (Users tab). Provides role-checking helpers.
 *
 * Role hierarchy (highest → lowest):
 *   Super Admin  >  Department Admin  >  Dealing Assistant  >  Read-Only Observer
 * ==========================================================================
 */

/**
 * @const {Object.<string, number>} ROLE_LEVELS
 * Numeric weight for each role — higher = more privileges.
 */
var ROLE_LEVELS = {
  'Super Admin': 40,
  'Department Admin': 30,
  'Dealing Assistant': 20,
  'Viewer': 10,
  'Read-Only Observer': 10
};

/**
 * @const {string[]} VALID_ROLES - Allowed role strings.
 */
var VALID_ROLES = Object.keys(ROLE_LEVELS);

// ─── Department Name Lookup Helper ──────────────────────────────────────────

/**
 * Looks up a department name by its ID.
 * @param {string} deptId
 * @return {string}
 */
function getDepartmentName(deptId) {
  if (!deptId) return '';
  try {
    var sheet = getSheet('Departments_Master');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('Department_ID');
    var nameCol = headers.indexOf('Department_Name');
    
    if (idCol === -1 || nameCol === -1) return '';
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(deptId)) {
        return String(data[i][nameCol]);
      }
    }
  } catch (err) {
    Logger.log('getDepartmentName error: ' + err.message);
  }
  return '';
}

// ─── User Lookup ─────────────────────────────────────────────────────────────

/**
 * Looks up a verified email in the Users sheet.
 *
 * @param {string} email - Verified (lowercase) email address.
 * @return {{ found: boolean, user?: { email: string, name: string, password?: string, departmentId: string, departmentName: string, role: string, isActive: boolean } }}
 */
function getUserByEmail(email) {
  try {
    var sheet = getSheet('Users');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var emailCol = headers.indexOf('Email');
    var nameCol = headers.indexOf('Name');
    var passwordCol = headers.indexOf('Password');
    var deptCol = headers.indexOf('Department_ID');
    var roleCol = headers.indexOf('Role');
    var dateCol = headers.indexOf('Created_Date');
    var activeCol = headers.indexOf('Is_Active');

    if (emailCol === -1 || nameCol === -1 || deptCol === -1 || roleCol === -1) {
      throw new Error('Required column headers missing in Users sheet');
    }

    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][emailCol]).toLowerCase().trim();
      if (rowEmail === email) {
        var deptId = String(data[i][deptCol]);
        return {
          found: true,
          user: {
            email: rowEmail,
            name: String(data[i][nameCol]),
            password: passwordCol !== -1 ? String(data[i][passwordCol]) : '',
            departmentId: deptId,
            departmentName: getDepartmentName(deptId),
            role: String(data[i][roleCol]),
            createdDate: dateCol !== -1 ? data[i][dateCol] : new Date(),
            isActive: activeCol !== -1 ? String(data[i][activeCol]).toUpperCase() === 'TRUE' : true
          }
        };
      }
    }

    return { found: false };
  } catch (err) {
    Logger.log('getUserByEmail error: ' + err.message);
    return { found: false };
  }
}

// ─── Credentials Authentication (Login) ──────────────────────────────────────

/**
 * Authenticates user credentials (email & password) and issues a session token.
 *
 * @param {Object} body - Request body containing email and password.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function loginUser(body) {
  var email = body.email;
  var password = body.password;

  if (!email || !password) {
    return errorResponse('Email and Password are required', 400);
  }

  email = String(email).toLowerCase().trim();
  password = String(password);

  var lookup = getUserByEmail(email);
  if (!lookup.found) {
    return errorResponse('Invalid email or password', 401);
  }

  var user = lookup.user;

  if (!user.isActive) {
    return errorResponse('User account has been deactivated', 401);
  }

  // Simple plain-text password match (case-sensitive)
  if (user.password !== password) {
    return errorResponse('Invalid email or password', 401);
  }

  // Generate session token
  var sessionToken = Utilities.getUuid();

  // Construct profile without password
  var clientUser = {
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.departmentName
  };

  // Cache session for 6 hours (21600 seconds)
  var cache = CacheService.getScriptCache();
  cache.put('session_' + sessionToken, JSON.stringify(clientUser), 21600);

  return successResponse({
    token: sessionToken,
    user: clientUser
  }, 'Login successful');
}

// ─── Combined Session Check ──────────────────────────────────────────────────

/**
 * Full session authentication validation.
 * Looks up the token in CacheService, then verifies user isActive in database.
 *
 * @param {string} token - Session UUID token.
 * @return {{ success: boolean, user?: Object, error?: string }}
 */
function checkAuth(token) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { success: false, error: 'Session token is missing or empty' };
  }

  var cache = CacheService.getScriptCache();
  var cachedSession = cache.get('session_' + token.trim());
  if (!cachedSession) {
    return { success: false, error: 'Session expired or invalid session token' };
  }

  var sessionUser = JSON.parse(cachedSession);

  // Look up user in sheet to ensure they are still registered and active
  var lookup = getUserByEmail(sessionUser.email);
  if (!lookup.found) {
    return { success: false, error: 'User is no longer registered: ' + sessionUser.email };
  }

  if (!lookup.user.isActive) {
    return { success: false, error: 'User account has been deactivated: ' + sessionUser.email };
  }

  return { success: true, user: lookup.user };
}

// ─── Role Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the numeric level for a role string.
 * @param {string} role
 * @return {number} Level (0 if unknown).
 */
function getRoleLevel(role) {
  return ROLE_LEVELS[role] || 0;
}

/**
 * Returns the role string for a user object.
 * @param {Object} user - User object from checkAuth.
 * @return {string}
 */
function getUserRole(user) {
  return user && user.role ? user.role : '';
}

/**
 * Checks whether a user meets or exceeds the minimum required role.
 *
 * @param {Object} user - Authenticated user object.
 * @param {string} minimumRole - One of VALID_ROLES.
 * @return {boolean}
 */
function hasMinimumRole(user, minimumRole) {
  return getRoleLevel(getUserRole(user)) >= getRoleLevel(minimumRole);
}

/**
 * Asserts that the user has at least the specified role.
 * Throws an Error if the check fails — the caller should catch and return
 * an errorResponse.
 *
 * @param {Object} user - Authenticated user object.
 * @param {string} minimumRole - Minimum required role.
 * @throws {Error} If the user's role is insufficient.
 */
function requireRole(user, minimumRole) {
  if (!hasMinimumRole(user, minimumRole)) {
    throw new Error(
      'Access denied. Requires role "' + minimumRole + '" or higher. Your role: "' + getUserRole(user) + '".'
    );
  }
}

/**
 * Checks if a user is a Super Admin.
 * @param {Object} user
 * @return {boolean}
 */
function isSuperAdmin(user) {
  return getUserRole(user) === 'Super Admin';
}

/**
 * Checks if a user belongs to a specific department OR is a Super Admin.
 * @param {Object} user
 * @param {string} departmentId
 * @return {boolean}
 */
function canAccessDepartment(user, departmentId) {
  if (isSuperAdmin(user)) return true;
  return user.departmentId === departmentId;
}

/**
 * Asserts department access; throws if denied.
 * @param {Object} user
 * @param {string} departmentId
 * @throws {Error}
 */
function requireDepartmentAccess(user, departmentId) {
  if (!canAccessDepartment(user, departmentId)) {
    throw new Error('Access denied. You do not belong to department: ' + departmentId);
  }
}

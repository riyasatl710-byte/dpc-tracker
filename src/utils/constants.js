/**
 * constants.js — Application-wide constants for DPC Tracker.
 */

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  DEPT_ADMIN: 'Department Admin',
  DEALING_ASSISTANT: 'Dealing Assistant',
  READ_ONLY: 'Read-Only Observer',
  VIEWER: 'Viewer'
};

export const STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

export const DEFAULT_YEAR = new Date().getFullYear();

export const CADRE_DISPLAY_NAMES = {
  'AO_to_ADA': 'Agricultural Officer (AO) to Assistant Director of Agriculture (ADA)',
  'ADA_to_DD': 'Assistant Director (ADA) to Deputy Director (DD)',
  'DD_to_JD': 'Deputy Director (DD) to Joint Director (JD)',
  'JD_to_Addl_Dir': 'Joint Director (JD) to Additional Director (Addl. Dir)'
};

export const STATUS_COLORS = {
  [STATUS.NOT_STARTED]: '#64748b', // Grey
  [STATUS.IN_PROGRESS]: '#f59e0b', // Amber
  [STATUS.COMPLETED]: '#22c55e'    // Green
};

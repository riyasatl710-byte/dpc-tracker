/**
 * UserManager.jsx — User role assignment, department mapping, and access management.
 */
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { fetchUsers, addUser, updateUserRole, removeUser, fetchDepartments } from '../../services/adminService';
import LoadingSpinner from '../common/LoadingSpinner';

export default function UserManager() {
  const { user: currentUser, role: currentRole } = useAuthStore();
  const { showToast } = useUiStore();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New User Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isSuper = currentRole === 'super_admin';

  useEffect(() => {
    if (isSuper) {
      fetchDepartments().then(data => {
        setDepartments(Array.isArray(data) ? data : []);
      }).catch(err => console.error(err));
    }
  }, [isSuper]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // If super admin, query by selected dept filter or empty (loads current dept by default in service if empty)
      const targetDept = isSuper ? filterDept : currentUser?.departmentId;
      const data = await fetchUsers(targetDept);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filterDept]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    const uEmail = email.trim().toLowerCase();
    const uName = name.trim();

    if (!uEmail || !uName || !password.trim()) {
      showToast('error', 'Email, Name, and Password are required.');
      return;
    }

    // Determine department ID for mapping
    const deptId = isSuper ? targetDeptId : currentUser?.departmentId;
    if (!deptId && role !== 'super_admin') {
      showToast('error', 'A department must be assigned.');
      return;
    }

    setIsAdding(true);
    try {
      await addUser(uEmail, uName, role, role === 'super_admin' ? '' : deptId, password.trim());
      showToast('success', 'User added successfully.');
      setEmail('');
      setName('');
      setPassword('');
      setRole('viewer');
      setTargetDeptId('');
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to add user.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (email, newRole) => {
    try {
      await updateUserRole(email, newRole);
      showToast('success', 'User role updated.');
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to update user role.');
    }
  };

  const handleRemoveUser = async (email) => {
    if (email === currentUser?.email) {
      showToast('error', 'You cannot delete your own account.');
      return;
    }

    const confirm = window.confirm(`Are you sure you want to revoke access for ${email}?`);
    if (!confirm) return;

    try {
      await removeUser(email);
      showToast('success', 'User access revoked.');
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to remove user.');
    }
  };

  return (
    <div className="grid grid--2-col" style={{ gap: '2rem', alignItems: 'start' }}>
      {/* Add User form (Left) */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Invite/Add User</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Grant promotion tracking access. Specify user ID/email, name, role, and password.
        </p>

        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label className="form-label" htmlFor="user-email">Email Address / User ID:</label>
            <input
              id="user-email"
              className="input"
              type="email"
              placeholder="user@kerala.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAdding}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-name">Full Name:</label>
            <input
              id="user-name"
              className="input"
              type="text"
              placeholder="Shri Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAdding}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-password">Password:</label>
            <input
              id="user-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAdding}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-role">Assigned Authorization Role:</label>
            <select
              id="user-role"
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isAdding}
            >
              <option value="viewer">Read-Only Observer</option>
              <option value="editor">Dealing Assistant</option>
              <option value="admin">Department Admin</option>
              {isSuper && <option value="super_admin">Super Admin</option>}
            </select>
          </div>

          {/* Department Selection (Super Admin only) */}
          {isSuper && role !== 'super_admin' && (
            <div className="form-group">
              <label className="form-label" htmlFor="user-dept">Assign Department:</label>
              <select
                id="user-dept"
                className="select"
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                disabled={isAdding}
              >
                <option value="">Choose department…</option>
                {departments.map((d) => (
                  <option key={d.Department_ID} value={d.Department_ID}>
                    {d.Department_Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isAdding}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isAdding ? 'Adding user...' : 'Authorize User'}
          </button>
        </form>
      </div>

      {/* User List (Right) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Authorized Personnel</h3>

          {/* Department Filter (Super Admin only) */}
          {isSuper && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filter Dept:</span>
              <select
                className="select select--sm"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.Department_ID} value={d.Department_ID}>
                    {d.Department_Name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner message="Searching records..." />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.Email === currentUser?.email;
                  return (
                    <tr key={u.Email} className="animate-fadeIn">
                      <td>
                        <div style={{ fontWeight: '500' }}>{u.Name} {isSelf && <small style={{ color: '#d4a843' }}>(You)</small>}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.Email}</div>
                      </td>
                      <td>{u.Department_Name || u.Department_ID || 'Global (Super Admin)'}</td>
                      <td>
                        <select
                          className="select select--sm"
                          value={u.Role}
                          disabled={isSelf || (!isSuper && u.Role === 'admin')}
                          onChange={(e) => handleRoleChange(u.Email, e.target.value)}
                          style={{ width: '130px' }}
                        >
                          <option value="viewer">Observer</option>
                          <option value="editor">Assistant</option>
                          <option value="admin">Admin</option>
                          {isSuper && <option value="super_admin">Super Admin</option>}
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={isSelf || (!isSuper && u.Role === 'admin')}
                          onClick={() => handleRemoveUser(u.Email)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No personnel authorized yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * DepartmentPanel.jsx — Super-Admin panel to add and manage government departments.
 */
import React, { useState, useEffect } from 'react';
import { fetchDepartments, addDepartment, toggleDepartment } from '../../services/adminService';
import { useUiStore } from '../../store/useUiStore';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DepartmentPanel() {
  const { showToast } = useUiStore();
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    const name = newDeptName.trim();
    if (!name) {
      showToast('error', 'Department name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDepartment(name);
      showToast('success', `Department "${name}" onboarded successfully.`);
      setNewDeptName('');
      await loadDepartments();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to add department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (deptId) => {
    try {
      await toggleDepartment(deptId);
      showToast('success', 'Department status updated.');
      await loadDepartments();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to update department status.');
    }
  };

  return (
    <div className="grid grid--2-col" style={{ gap: '2rem', alignItems: 'start' }}>
      {/* Onboard form (Left) */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Onboard New Department</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Register a new government department. The system will automatically configure its isolated root storage directory in Google Drive.
        </p>

        <form onSubmit={handleAddDepartment}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">Department Name:</label>
            <input
              id="dept-name"
              className="input"
              type="text"
              placeholder="e.g. Department of Animal Husbandry"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Registering...' : 'Onboard Department'}
          </button>
        </form>
      </div>

      {/* Registry list (Right) */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Department Registry</h3>

        {isLoading ? (
          <LoadingSpinner message="Querying registry..." />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Department ID</th>
                  <th>Department Name</th>
                  <th>Onboard Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.Department_ID} className="animate-fadeIn">
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{dept.Department_ID}</td>
                    <td style={{ fontWeight: '500' }}>{dept.Department_Name}</td>
                    <td>{formatDate(dept.Created_Date)}</td>
                    <td>
                      <span className={`status-badge status-badge--${String(dept.Is_Active).toLowerCase() === 'true' ? 'completed' : 'not-started'}`}>
                        {String(dept.Is_Active).toLowerCase() === 'true' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn ${String(dept.Is_Active).toLowerCase() === 'true' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                        onClick={() => handleToggleStatus(dept.Department_ID)}
                      >
                        {String(dept.Is_Active).toLowerCase() === 'true' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}

                {departments.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No departments registered.
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

/**
 * CadreManager.jsx — Admin tool to create and delete cadre cycles in the department.
 */
import React, { useState } from 'react';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';
import { addCadre, deleteCadre } from '../../services/workflowService';
import { formatCadreName } from '../../utils/formatters';

export default function CadreManager({ onCadreChange }) {
  const { cadres } = useDepartmentStore();
  const { showToast } = useUiStore();

  const [fromRank, setFromRank] = useState('');
  const [toRank, setToRank] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCadre = async (e) => {
    e.preventDefault();
    const fromTrimmed = fromRank.trim();
    const toTrimmed = toRank.trim();

    if (!fromTrimmed || !toTrimmed) {
      showToast('error', 'Both ranks are required.');
      return;
    }

    // Format: FROM_to_TO
    const cadreKey = `${fromTrimmed.replace(/\s+/g, '_')}_to_${toTrimmed.replace(/\s+/g, '_')}`;

    if (cadres.includes(cadreKey)) {
      showToast('error', 'This cadre already exists.');
      return;
    }

    setIsAdding(true);
    try {
      await addCadre(cadreKey);
      showToast('success', `Cadre "${fromTrimmed} → ${toTrimmed}" added successfully.`);
      setFromRank('');
      setToRank('');
      if (onCadreChange) await onCadreChange();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to add cadre.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCadre = async (cadreKey) => {
    const confirm = window.confirm(`Are you sure you want to delete the cadre "${cadreKey.replace(/_/g, ' ')}"? This will delete all workflow configurations and step logs for this cadre!`);
    if (!confirm) return;

    try {
      await deleteCadre(cadreKey);
      showToast('success', `Cadre "${cadreKey.replace(/_/g, ' ')}" deleted.`);
      if (onCadreChange) await onCadreChange();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete cadre.');
    }
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Manage Cadres</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Define the ranks/cadres eligible for promotion within the department.
      </p>

      {/* Cadre List */}
      <div className="cadre-manager-list" style={{ marginBottom: '2rem' }}>
        {cadres.map((cadreKey) => (
          <div key={cadreKey} className="workflow-step-row" style={{ padding: '0.75rem 1rem' }}>
            <span style={{ fontWeight: '500' }}>{formatCadreName(cadreKey)}</span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDeleteCadre(cadreKey)}
            >
              Remove
            </button>
          </div>
        ))}

        {cadres.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
            No cadres registered.
          </p>
        )}
      </div>

      <div className="sidebar__section-divider" style={{ margin: '1.5rem 0' }} />

      {/* Add Cadre Form */}
      <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Create New Cadre Pathway</h4>
      <form onSubmit={handleAddCadre}>
        <div className="form-group">
          <label className="form-label" htmlFor="from-rank">From Rank:</label>
          <input
            id="from-rank"
            className="input"
            type="text"
            placeholder="e.g. Agricultural Officer"
            value={fromRank}
            onChange={(e) => setFromRank(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="to-rank">To Promotion Rank:</label>
          <input
            id="to-rank"
            className="input"
            type="text"
            placeholder="e.g. Assistant Director"
            value={toRank}
            onChange={(e) => setToRank(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={isAdding}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {isAdding ? 'Creating Cadre...' : 'Create Cadre'}
        </button>
      </form>
    </div>
  );
}

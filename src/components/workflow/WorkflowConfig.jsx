/**
 * WorkflowConfig.jsx — Admin panel to add, remove, and re-order promotion steps per cadre.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';
import { fetchWorkflow, addStep, deleteStep, reorderSteps } from '../../services/workflowService';
import { formatCadreName } from '../../utils/formatters';
import StepEditor from './StepEditor';
import CadreManager from './CadreManager';
import LoadingSpinner from '../common/LoadingSpinner';

export default function WorkflowConfig() {
  const { cadres, fetchCadres } = useDepartmentStore();
  const { showToast } = useUiStore();

  const [activeCadre, setActiveCadre] = useState('');
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);

  // Set initial active cadre
  useEffect(() => {
    if (cadres.length > 0 && !activeCadre) {
      setActiveCadre(cadres[0]);
    }
  }, [cadres, activeCadre]);

  const loadWorkflow = useCallback(async () => {
    if (!activeCadre) return;
    setIsLoading(true);
    try {
      const data = await fetchWorkflow(activeCadre);
      if (Array.isArray(data)) {
        // Sort by step order
        const sorted = [...data].sort((a, b) => Number(a.Step_Order_No || 0) - Number(b.Step_Order_No || 0));
        setSteps(sorted);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load workflow steps.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCadre, showToast]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const handleAddStep = () => {
    setEditingStep(null);
    setEditorOpen(true);
  };

  const handleSaveStep = async (stepName) => {
    try {
      // Order number is at the end of list
      const nextOrder = steps.length + 1;
      await addStep(activeCadre, stepName, nextOrder);
      showToast('success', `Step "${stepName}" added successfully.`);
      setEditorOpen(false);
      await loadWorkflow();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to add step.');
    }
  };

  const handleDeleteStep = async (stepName) => {
    const confirm = window.confirm(`Are you sure you want to delete the step "${stepName}"?`);
    if (!confirm) return;

    try {
      await deleteStep(activeCadre, stepName);
      showToast('success', `Step "${stepName}" deleted.`);
      await loadWorkflow();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete step.');
    }
  };

  const handleMoveStep = async (index, direction) => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // Swap
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Get order list
    const stepNamesInOrder = newSteps.map(s => s.Step_Name);

    try {
      await reorderSteps(activeCadre, stepNamesInOrder);
      showToast('success', 'Step order updated.');
      await loadWorkflow();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to update step order.');
    }
  };

  if (cadres.length === 0) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <CadreManager onCadreChange={fetchCadres} />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div className="dashboard__header">
        <h1 className="dashboard__title">
          Workflow <span className="dashboard__title-accent">Configuration</span>
        </h1>
        <p className="dashboard__title-subtitle">Configure the specific promotion steps and cadres for your department</p>
      </div>

      {/* Cadre Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {cadres.map((cadreKey) => (
          <button
            key={cadreKey}
            className={`tab-btn ${activeCadre === cadreKey ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveCadre(cadreKey)}
          >
            {formatCadreName(cadreKey).split(' to ')[0].replace(/.*\(|\)/g, '') || cadreKey}
          </button>
        ))}
      </div>

      <div className="grid grid--2-col" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Step Manager (Left Panel) */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Steps for {formatCadreName(activeCadre).split(' (')[0]}</h3>
            <button className="btn btn-primary btn-sm" onClick={handleAddStep}>
              + Add Step
            </button>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Loading step structure..." />
          ) : (
            <div className="workflow-steps-list">
              {steps.map((step, index) => (
                <div key={step.Step_Name} className="workflow-step-row animate-fadeIn">
                  <div className="workflow-step-row__left">
                    <span className="workflow-step-row__number">{index + 1}</span>
                    <span className="workflow-step-row__name">{step.Step_Name}</span>
                  </div>

                  <div className="workflow-step-row__actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={index === 0}
                      onClick={() => handleMoveStep(index, 'up')}
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={index === steps.length - 1}
                      onClick={() => handleMoveStep(index, 'down')}
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteStep(step.Step_Name)}
                      title="Delete Step"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}

              {steps.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                  No steps configured for this cadre.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cadre Manager (Right Panel) */}
        <CadreManager onCadreChange={fetchCadres} />
      </div>

      <StepEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveStep}
        existingSteps={steps}
      />
    </div>
  );
}

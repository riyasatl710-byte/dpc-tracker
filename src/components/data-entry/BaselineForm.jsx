import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';
import { dashboardService } from '../../services/dashboardService';
import './DataEntry.css';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function BaselineForm() {
  const departmentName = useAuthStore((s) => s.departmentName);
  const cadres = useDepartmentStore((s) => s.cadres);
  const showToast = useUiStore((s) => s.showToast);

  const [cadre, setCadre] = useState('');
  const [year, setYear] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!cadre) next.cadre = 'Please select a cadre';
    if (!year) next.year = 'Please select a year';
    if (!officerName.trim()) next.officerName = 'Officer name is required';
    if (!serialNumber.trim()) next.serialNumber = 'Serial number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await dashboardService.updateBaseline({
        cadre,
        year: Number(year),
        officerName: officerName.trim(),
        employeeId: employeeId.trim(),
        serialNumber: serialNumber.trim(),
      });
      showToast('success', 'Baseline data saved successfully');
      setOfficerName('');
      setEmployeeId('');
      setSerialNumber('');
    } catch (err) {
      showToast('error', err.message || 'Failed to save baseline data');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="data-entry-card" onSubmit={handleSubmit} noValidate>
      <div className="data-entry-card__header">
        <div className="data-entry-card__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3 className="data-entry-card__title">Last Promoted Officer</h3>
      </div>
      <p className="data-entry-card__description">
        Record the details of the last officer promoted in this cadre to set the baseline reference.
      </p>

      {/* Department */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-dept">Department</label>
        <input
          id="bf-dept"
          className="form-group__input form-group__input--disabled"
          type="text"
          value={departmentName || '—'}
          disabled
        />
      </div>

      {/* Cadre */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-cadre">
          Cadre <span className="form-group__required">*</span>
        </label>
        <select
          id="bf-cadre"
          className={`form-group__select ${errors.cadre ? 'form-group__select--error' : ''}`}
          value={cadre}
          onChange={(e) => { setCadre(e.target.value); setErrors((p) => ({ ...p, cadre: '' })); }}
        >
          <option value="">Select cadre…</option>
          {cadres.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' → ')}</option>
          ))}
        </select>
        {errors.cadre && <span className="form-group__error">{errors.cadre}</span>}
      </div>

      {/* Year */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-year">
          Calendar Year <span className="form-group__required">*</span>
        </label>
        <select
          id="bf-year"
          className={`form-group__select ${errors.year ? 'form-group__select--error' : ''}`}
          value={year}
          onChange={(e) => { setYear(e.target.value); setErrors((p) => ({ ...p, year: '' })); }}
        >
          <option value="">Select year…</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {errors.year && <span className="form-group__error">{errors.year}</span>}
      </div>

      {/* Officer Name */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-officer">
          Last Promoted Officer Name <span className="form-group__required">*</span>
        </label>
        <input
          id="bf-officer"
          className={`form-group__input ${errors.officerName ? 'form-group__input--error' : ''}`}
          type="text"
          placeholder="e.g. Shri Rajesh Kumar"
          value={officerName}
          onChange={(e) => { setOfficerName(e.target.value); setErrors((p) => ({ ...p, officerName: '' })); }}
        />
        {errors.officerName && <span className="form-group__error">{errors.officerName}</span>}
      </div>

      {/* Employee ID */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-empid">
          Employee ID (PEN)
        </label>
        <input
          id="bf-empid"
          className="form-group__input"
          type="text"
          placeholder="e.g. EMP-2024-0042 (Optional)"
          value={employeeId}
          onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employeeId: '' })); }}
        />
      </div>

      {/* Serial Number */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="bf-serial">
          Serial Number <span className="form-group__required">*</span>
        </label>
        <input
          id="bf-serial"
          className={`form-group__input ${errors.serialNumber ? 'form-group__input--error' : ''}`}
          type="text"
          placeholder="e.g. 142"
          value={serialNumber}
          onChange={(e) => { setSerialNumber(e.target.value); setErrors((p) => ({ ...p, serialNumber: '' })); }}
        />
        {errors.serialNumber && <span className="form-group__error">{errors.serialNumber}</span>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn btn--primary data-entry-card__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="btn__spinner" />
            Saving…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save Baseline
          </>
        )}
      </button>
    </form>
  );
}

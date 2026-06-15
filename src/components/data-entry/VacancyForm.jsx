import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';
import { dashboardService } from '../../services/dashboardService';
import './DataEntry.css';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function VacancyForm() {
  const departmentName = useAuthStore((s) => s.departmentName);
  const cadres = useDepartmentStore((s) => s.cadres);
  const showToast = useUiStore((s) => s.showToast);

  const [cadre, setCadre] = useState('');
  const [year, setYear] = useState('');
  const [vacancies, setVacancies] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!cadre) next.cadre = 'Please select a cadre';
    if (!year) next.year = 'Please select a year';
    if (!vacancies || vacancies === '') {
      next.vacancies = 'Vacancies is required';
    } else if (!Number.isInteger(Number(vacancies)) || Number(vacancies) < 0) {
      next.vacancies = 'Must be a positive whole number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await dashboardService.updateVacancies({
        cadre,
        year: Number(year),
        vacancies: Number(vacancies),
      });
      showToast('success', 'Estimated vacancies saved successfully');
      setVacancies('');
    } catch (err) {
      showToast('error', err.message || 'Failed to save vacancies');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="data-entry-card" onSubmit={handleSubmit} noValidate>
      <div className="data-entry-card__header">
        <div className="data-entry-card__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <path d="M8 7v10M12 7v10M16 7v10" />
          </svg>
        </div>
        <h3 className="data-entry-card__title">Estimated Vacancies</h3>
      </div>
      <p className="data-entry-card__description">
        Enter the estimated number of vacancies for a cadre in a given promotion year.
      </p>

      {/* Department (auto-filled) */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="vf-dept">Department</label>
        <input
          id="vf-dept"
          className="form-group__input form-group__input--disabled"
          type="text"
          value={departmentName || '—'}
          disabled
        />
      </div>

      {/* Cadre */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="vf-cadre">
          Cadre <span className="form-group__required">*</span>
        </label>
        <select
          id="vf-cadre"
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
        <label className="form-group__label" htmlFor="vf-year">
          Calendar Year <span className="form-group__required">*</span>
        </label>
        <select
          id="vf-year"
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

      {/* Vacancies */}
      <div className="form-group">
        <label className="form-group__label" htmlFor="vf-vacancies">
          Estimated Vacancies <span className="form-group__required">*</span>
        </label>
        <input
          id="vf-vacancies"
          className={`form-group__input ${errors.vacancies ? 'form-group__input--error' : ''}`}
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 15"
          value={vacancies}
          onChange={(e) => { setVacancies(e.target.value); setErrors((p) => ({ ...p, vacancies: '' })); }}
        />
        {errors.vacancies && <span className="form-group__error">{errors.vacancies}</span>}
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
            Save Vacancies
          </>
        )}
      </button>
    </form>
  );
}

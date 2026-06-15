import VacancyForm from './VacancyForm';
import BaselineForm from './BaselineForm';
import './DataEntry.css';

export default function DataEntryPage() {
  return (
    <div className="data-entry-page">
      {/* Page Header */}
      <header className="data-entry-page__header">
        <div className="data-entry-page__title-row">
          <div className="data-entry-page__icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h1 className="data-entry-page__title">Base Data Entry</h1>
            <p className="data-entry-page__subtitle">
              Provide the foundational data required to track DPC promotions — estimated vacancies
              and the last promoted officer baseline for each cadre.
            </p>
          </div>
        </div>
      </header>

      {/* Two-column grid */}
      <div className="data-entry-page__grid">
        <VacancyForm />
        <BaselineForm />
      </div>
    </div>
  );
}

import { CATEGORIES } from '../schemas/listing';

export interface FilterState {
  category: string; // '' = todas
  q: string;
  donation: boolean;
}

// Chips são <button> de verdade com aria-pressed — nunca divs (DESIGN.md).
// onChange recebe um updater (prev => next): cliques em sequência rápida não
// podem se sobrescrever com estado stale do render anterior.
export function CategoryFilter({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (update: (prev: FilterState) => FilterState) => void;
}) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search"
        placeholder="Buscar na vitrine…"
        aria-label="Buscar anúncios"
        value={filters.q}
        onChange={(e) => {
          const q = e.target.value;
          onChange((prev) => ({ ...prev, q }));
        }}
      />

      <div className="filter-chips" role="group" aria-label="Filtrar por categoria">
        <button
          className="chip"
          aria-pressed={filters.category === ''}
          onClick={() => onChange((prev) => ({ ...prev, category: '' }))}
        >
          Todas
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className="chip"
            aria-pressed={filters.category === c}
            onClick={() =>
              onChange((prev) => ({ ...prev, category: prev.category === c ? '' : c }))
            }
          >
            {c}
          </button>
        ))}
        <button
          className="chip chip--doacao"
          aria-pressed={filters.donation}
          onClick={() => onChange((prev) => ({ ...prev, donation: !prev.donation }))}
        >
          Só doações
        </button>
      </div>
    </div>
  );
}

import { CATEGORIES } from "../constants/categories";

export default function SearchFilters({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Category
        </label>
        <select
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white"
          value={filters.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Min $
        </label>
        <input
          type="number"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none"
          placeholder="0"
          value={filters.priceMin}
          onChange={(e) => update("priceMin", e.target.value)}
        />
      </div>
      <div className="w-24">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Max $
        </label>
        <input
          type="number"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none"
          placeholder="∞"
          value={filters.priceMax}
          onChange={(e) => update("priceMax", e.target.value)}
        />
      </div>
      <div className="min-w-[140px]">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Sort
        </label>
        <select
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white"
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
      </div>
    </div>
  );
}

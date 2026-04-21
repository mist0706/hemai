"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, NEIGHBORHOODS, HOUSING_TYPE_LABELS, HOUSING_FORM_LABELS, SORT_OPTIONS } from "@/lib/constants";
import { SearchFilters, HousingType, HousingForm, SortOption } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: SortOption.Newest,
  });
  const [keyword, setKeyword] = useState("");

  const selectedCity = filters.city || "";
  const neighborhoods = selectedCity && NEIGHBORHOODS[selectedCity] ? NEIGHBORHOODS[selectedCity] : [];

  function handleSearch() {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (filters.city) params.set("city", filters.city);
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.minRooms) params.set("minRooms", String(filters.minRooms));
    if (filters.maxRooms) params.set("maxRooms", String(filters.maxRooms));
    if (filters.minSize) params.set("minSize", String(filters.minSize));
    if (filters.maxSize) params.set("maxSize", String(filters.maxSize));
    if (filters.housingType?.length) {
      filters.housingType.forEach(t => params.append("type", t));
    }
    if (filters.housingForm?.length) {
      filters.housingForm.forEach(f => params.append("form", f));
    }
    if (filters.sortBy) params.set("sort", filters.sortBy);

    router.push(`/annonser?${params.toString()}`);
  }

  function toggleHousingType(type: HousingType) {
    const current = filters.housingType || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ ...filters, housingType: next.length ? next : undefined });
  }

  function toggleHousingForm(form: HousingForm) {
    const current = filters.housingForm || [];
    const next = current.includes(form)
      ? current.filter(f => f !== form)
      : [...current, form];
    setFilters({ ...filters, housingForm: next.length ? next : undefined });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Sök bostad</h1>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Sök på adress, område eller nyckelord..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleSearch}
            className="rounded-lg bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700 transition-colors"
          >
            Sök
          </button>
        </div>

        {/* City */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
            <select
              value={selectedCity}
              onChange={e => setFilters({ ...filters, city: e.target.value || undefined })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Alla städer</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min rum</label>
            <input
              type="number"
              min={1}
              max={10}
              value={filters.minRooms || ""}
              onChange={e => setFilters({ ...filters, minRooms: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min pris (kr)</label>
            <input
              type="number"
              min={0}
              step={50000}
              value={filters.minPrice || ""}
              onChange={e => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max pris (kr)</label>
            <input
              type="number"
              min={0}
              step={50000}
              value={filters.maxPrice || ""}
              onChange={e => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ingen gräns"
            />
          </div>
        </div>

        {/* Housing Type Chips */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bostadstyp</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleHousingType(value as HousingType)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.housingType?.includes(value as HousingType)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Housing Form Chips */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upplåtelseform</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(HOUSING_FORM_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleHousingForm(value as HousingForm)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.housingForm?.includes(value as HousingForm)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhood (when city selected) */}
        {neighborhoods.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Område i {selectedCity}</label>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.map(area => (
                <button
                  key={area}
                  onClick={() => {
                    const current = filters.neighborhoods || [];
                    const next = current.includes(area)
                      ? current.filter(a => a !== area)
                      : [...current, area];
                    setFilters({ ...filters, neighborhoods: next.length ? next : undefined });
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.neighborhoods?.includes(area)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sortera</label>
          <select
            value={filters.sortBy || SortOption.Newest}
            onChange={e => setFilters({ ...filters, sortBy: e.target.value as SortOption })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
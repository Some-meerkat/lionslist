import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { SCHOOLS } from "../constants/schools";
import { abbr } from "../utils/helpers";
import MarketplaceCard from "../components/MarketplaceCard";

export default function SearchMarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [marketplaces, setMarketplaces] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [creators, setCreators] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showMarketplaceResults, setShowMarketplaceResults] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    school: "",
    sort: "recent",
  });

  // Fetch all marketplaces + creator profiles once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketplaces")
        .select("*, listings(count)")
        .order("created_at", { ascending: false });

      if (data) {
        const withCount = data.map((m) => ({
          ...m,
          listing_count: m.listings?.[0]?.count ?? 0,
        }));
        setMarketplaces(withCount);

        // Fetch all active listings
        const { data: listings } = await supabase
          .from("listings")
          .select("id, name, price, category, quantity, note, sold, marketplace_id, seller_id, created_at, listing_images(image_url, display_order)")
          .eq("sold", false)
          .order("created_at", { ascending: false });
        setAllListings(listings || []);

        // Fetch creator + seller profiles
        const creatorIds = data.map((m) => m.creator_id);
        const sellerIds = (listings || []).map((l) => l.seller_id);
        const allProfileIds = [...new Set([...creatorIds, ...sellerIds])];
        if (allProfileIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", allProfileIds);
          if (profiles) {
            const map = {};
            profiles.forEach((p) => (map[p.id] = p.full_name));
            setCreators(map);
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Filter + search logic
  const results = useMemo(() => {
    let list = marketplaces.filter((m) => {
      // Hide expired
      if (m.expiry_date && new Date(m.expiry_date) < new Date()) return false;
      // School restriction
      if (m.school_restrictions?.length > 0) {
        if (!m.school_restrictions.includes(profile?.school)) return false;
      }
      return true;
    });

    // Category filter
    if (filters.category) {
      list = list.filter((m) => m.category === filters.category);
    }

    // School filter
    if (filters.school) {
      list = list.filter((m) =>
        m.school_restrictions?.length === 0 ||
        m.school_restrictions?.includes(filters.school)
      );
    }

    // Text search across name, description, creator name, and ID (for links)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => {
        const creatorName = creators[m.creator_id] || "";
        return (
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          creatorName.toLowerCase().includes(q) ||
          (m.code || "").toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    if (filters.sort === "popular") {
      list = [...list].sort((a, b) => (b.listing_count ?? 0) - (a.listing_count ?? 0));
    } else if (filters.sort === "oldest") {
      list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [marketplaces, creators, query, filters, profile]);

  // Marketplace lookup
  const marketplaceMap = useMemo(() => {
    const map = {};
    for (const m of marketplaces) map[m.id] = m;
    return map;
  }, [marketplaces]);

  const isExpired = (m) => m.expiry_date && new Date(m.expiry_date) < new Date();

  // Filtered items — flat sorted list
  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    let matching = allListings.filter((l) => {
      if (!l.name.toLowerCase().includes(q)) return false;
      const m = marketplaceMap[l.marketplace_id];
      if (!m || isExpired(m)) return false;
      if (m.school_restrictions?.length > 0 && !m.school_restrictions.includes(profile?.school)) return false;
      if (filters.category && m.category !== filters.category) return false;
      return true;
    });
    if (filters.sort === "popular") {
      matching = [...matching].sort((a, b) => ((marketplaceMap[b.marketplace_id]?.listing_count || 0) - (marketplaceMap[a.marketplace_id]?.listing_count || 0)));
    } else if (filters.sort === "oldest") {
      matching = [...matching].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      matching = [...matching].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return matching;
  }, [query, allListings, marketplaceMap, filters, profile]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const seen = new Set();
    const mktResults = [];
    const itemResults = [];

    // Match marketplace names
    for (const m of marketplaces) {
      if (isExpired(m)) continue;
      if (m.name.toLowerCase().includes(q) && !seen.has("m:" + m.id)) {
        seen.add("m:" + m.id);
        const catIcon = CATEGORIES.find((c) => c.name === m.category)?.icon;
        mktResults.push({ type: "marketplace", label: m.name, sub: m.category, icon: catIcon, code: m.code || m.id });
      }
    }

    // Match creator names
    for (const [id, name] of Object.entries(creators)) {
      if (name.toLowerCase().includes(q) && !seen.has("c:" + id)) {
        seen.add("c:" + id);
        mktResults.push({ type: "creator", label: name, sub: "Creator" });
      }
    }

    // Match item names
    for (const l of allListings) {
      if (!l.name.toLowerCase().includes(q)) continue;
      const m = marketplaceMap[l.marketplace_id];
      if (!m || isExpired(m)) continue;
      const price = Number(l.price) === 0 ? "FREE" : `$${Number(l.price).toFixed(0)}`;
      itemResults.push({
        type: "item",
        label: l.name,
        sub: `${price} · in ${m.name}`,
        icon: CATEGORIES.find((c) => c.name === l.category)?.icon,
        code: m.code || m.id,
      });
      if (itemResults.length >= 4) break;
    }

    return [...mktResults.slice(0, 3), ...itemResults];
  }, [query, marketplaces, allListings, marketplaceMap, creators]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestionClick = (s) => {
    if (s.type === "marketplace" || s.type === "item") {
      navigate(`/marketplace/${s.code}`);
    } else {
      setQuery(s.label);
      setShowSuggestions(false);
    }
  };

  const activeFilterCount = [filters.category, filters.school].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 bg-transparent border-none cursor-pointer text-gray-600"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setShowMarketplaceResults(false);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter") setShowSuggestions(false); }}
              placeholder="Search by item, marketplace, or creator..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-200 rounded-full text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
              >
                <X size={16} />
              </button>
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (() => {
              const mktSuggestions = suggestions.filter((s) => s.type === "marketplace" || s.type === "creator");
              const itemSuggestions = suggestions.filter((s) => s.type === "item");
              return (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                  {mktSuggestions.length > 0 && (
                    <>
                      <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide m-0">Marketplaces</p>
                      {mktSuggestions.map((s, i) => (
                        <button
                          key={"m" + i}
                          onClick={() => handleSuggestionClick(s)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="text-lg w-6 text-center shrink-0">
                            {s.icon || (s.type === "creator" ? "\uD83D\uDC64" : "\uD83D\uDCE6")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                            <p className="text-xs text-gray-400">{s.sub}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {itemSuggestions.length > 0 && (
                    <>
                      <p className={`px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide m-0 ${mktSuggestions.length > 0 ? "border-t border-gray-100" : ""}`}>Items</p>
                      {itemSuggestions.map((s, i) => (
                        <button
                          key={"i" + i}
                          onClick={() => handleSuggestionClick(s)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="text-lg w-6 text-center shrink-0">{s.icon || "\uD83D\uDCE6"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                            <p className="text-xs text-gray-400">{s.sub}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-full border cursor-pointer transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-[#DCE9F5] border-[#002B5C] text-[#002B5C]"
                : "bg-transparent border-gray-200 text-gray-500"
            }`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#002B5C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.school}
              onChange={(e) => setFilters((f) => ({ ...f, school: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="">All Schools</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {abbr(s)}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="popular">Most Popular</option>
            </select>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ category: "", school: "", sort: "recent" })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 py-4" onClick={() => setShowSuggestions(false)}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#002B5C] rounded-full animate-spin" />
          </div>
        ) : results.length === 0 && filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{query ? "\uD83D\uDD0D" : "\uD83D\uDED2"}</p>
            <p className="text-gray-500 font-medium">
              {query ? `No results found for "${query}"` : "Search for items or marketplaces"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {query ? "Try a different name, creator, or category" : "Type an item name, marketplace, or creator"}
            </p>
          </div>
        ) : (
          <>
            {/* Collapsible marketplace results when user typed text */}
            {query.trim() && results.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowMarketplaceResults((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-transparent border-none cursor-pointer p-0 hover:text-gray-900"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showMarketplaceResults ? "rotate-0" : "-rotate-90"}`}
                  />
                  {results.length} marketplace{results.length !== 1 ? "s" : ""} found
                </button>
                {showMarketplaceResults && (
                  <div className="grid gap-3 mt-3">
                    {results.map((m) => (
                      <MarketplaceCard key={m.id} marketplace={m} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Marketplace results shown expanded when filters only (no text) */}
            {!query.trim() && results.length > 0 && (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  {results.length} marketplace{results.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid gap-3">
                  {results.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              </>
            )}

            {/* Item results */}
            {filteredItems.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-3">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const m = marketplaceMap[item.marketplace_id];
                    const catIcon = CATEGORIES.find((c) => c.name === item.category)?.icon;
                    const imgs = (item.listing_images || []).sort((a, b) => a.display_order - b.display_order);
                    const firstImage = imgs[0]?.image_url;
                    const sellerName = creators[item.seller_id] || "Unknown";
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md"
                      >
                        {firstImage ? (
                          <img src={firstImage} alt={item.name} className="w-full h-[160px] object-cover bg-gray-100" />
                        ) : (
                          <div className="w-full h-[160px] flex items-center justify-center text-4xl text-gray-300 bg-gray-100">
                            {catIcon || "\uD83D\uDCE6"}
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex justify-between items-start">
                            <h3 className="m-0 text-sm font-semibold truncate">{item.name}</h3>
                            <span className="font-bold text-green-600 text-sm shrink-0 ml-2">
                              {Number(item.price) === 0 ? "FREE" : `$${Number(item.price).toFixed(0)}`}
                            </span>
                          </div>
                          <div className="flex gap-1.5 mt-1.5 text-xs text-gray-400 flex-wrap">
                            <span>Qty: {item.quantity}</span>
                            <span>·</span>
                            <span>{catIcon} {item.category}</span>
                            <span>·</span>
                            <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                          {item.note && (
                            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed m-0 line-clamp-2">{item.note}</p>
                          )}
                          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              by <strong>{sellerName}</strong>
                            </span>
                            <button
                              onClick={() => navigate(`/marketplace/${m?.code || m?.id}`)}
                              className="text-xs font-semibold text-[#002B5C] bg-transparent border-none cursor-pointer hover:underline p-0"
                            >
                              View in {m?.name}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        {filters.category && (
          <button
            onClick={() => navigate(`/marketplace/create?category=${encodeURIComponent(filters.category)}`)}
            className="mt-4 w-full py-3 text-sm font-semibold text-[#002B5C] bg-[#DCE9F5] border border-[#002B5C] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
          >
            + Create a new {filters.category} marketplace
          </button>
        )}
      </div>
    </div>
  );
}

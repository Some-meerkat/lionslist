import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import MarketplaceCard from "../components/MarketplaceCard";
import CategoryGrid from "../components/CategoryGrid";

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [marketplaces, setMarketplaces] = useState([]);
  const [search, setSearch] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketplaces();
  }, []);

  async function fetchMarketplaces() {
    const { data } = await supabase
      .from("marketplaces")
      .select("*, listings(count)")
      .order("created_at", { ascending: false });

    const withCounts = (data || []).map((m) => ({
      ...m,
      listing_count: m.listings?.[0]?.count || 0,
    }));
    setMarketplaces(withCounts);
    setLoading(false);
  }

  const visible = marketplaces.filter((m) => {
    if (m.school_restrictions?.length > 0) {
      if (!m.school_restrictions.includes(profile?.school)) return false;
    }
    return true;
  });

  const filtered = search.trim()
    ? visible.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.description?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const isExpired = (m) => m.expiry_date && new Date(m.expiry_date) < new Date();
  const myCreated = marketplaces.filter((m) => m.creator_id === profile?.id);
  const active = visible.filter((m) => !isExpired(m));

  const handleJoin = () => {
    const id = joinLink.trim().split("/").pop().split("?")[0];
    if (id) navigate(`/marketplace/${id}`);
    else alert("Please enter a valid marketplace link or ID.");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-700 to-blue-500 text-white py-16 md:py-24 px-6 md:px-10 text-center">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-40px] w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute bottom-[-30px] right-[-20px] w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute top-10 right-[15%] w-20 h-20 bg-white/5 rounded-full" />

        <h1 className="relative text-3xl md:text-5xl font-extrabold tracking-tight">
          Welcome to LionsList, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="relative text-lg md:text-xl opacity-90 mt-3 font-medium">
          Buy, sell, and trade with fellow Columbia Lions
        </p>
        <div className="relative z-10 flex gap-3 justify-center mt-8 pb-8">
          <Button
            onClick={() => navigate("/marketplace/create")}
            className="!bg-white !text-blue-700 !font-bold !px-5 !py-2.5 !text-sm !shadow-lg !border-2 !border-blue-700 hover:!shadow-xl hover:!-translate-y-0.5 !transition-all"
          >
            + Create Marketplace
          </Button>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full z-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 60V20C240 50 480 0 720 20C960 40 1200 10 1440 30V60H0Z" fill="#F9FAFB" />
          </svg>
        </div>
      </div>

      {/* All content below hero */}
      <div className="max-w-screen-xl mx-auto px-8 py-8 space-y-8">
        {/* Join section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="font-semibold text-gray-700 mb-3">Join a Marketplace via Link</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Paste marketplace link or ID..."
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium cursor-pointer border-none hover:bg-blue-700 transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            className="w-full border border-gray-300 rounded-full pl-10 pr-4 py-3 bg-white shadow-sm text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Search marketplaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Search results */}
        {search.trim() && (
          <div>
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-center py-6">
                No marketplaces found for &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="grid gap-4">
                {filtered.map((m) => (
                  <MarketplaceCard key={m.id} marketplace={m} />
                ))}
              </div>
            )}
          </div>
        )}

        {!search.trim() && (
          <>
            {/* Categories */}
            <div>
              <h2 className="text-lg font-bold mb-5">Browse by Category</h2>
              <CategoryGrid onCategoryClick={setSearch} />
            </div>

            {/* My Created */}
            {myCreated.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-5">My Marketplaces</h2>
                <div className="grid gap-4">
                  {myCreated.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              </div>
            )}

            {/* All Active */}
            <div>
              <h2 className="text-lg font-bold mb-5">All Active Marketplaces</h2>
              {loading ? (
                <p className="text-gray-400 text-center py-8">Loading...</p>
              ) : active.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">🏪</div>
                  <p>No active marketplaces yet. Be the first to create one!</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {active.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

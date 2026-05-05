import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { checkProfanity } from "../utils/profanity";
import Input from "../components/ui/Input";
import TextArea from "../components/ui/TextArea";
import Select from "../components/ui/Select";

const URGENCY_LABELS = { low: "No rush", normal: "Normal", urgent: "ASAP" };
const URGENCY_COLORS = {
  low: { bg: "var(--surface-2)", color: "var(--text-muted)", border: "var(--border)" },
  normal: { bg: "var(--columbia-blue)", color: "var(--columbia-navy)", border: "transparent" },
  urgent: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

export default function LionHuntPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [hunts, setHunts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [responseCounts, setResponseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedHunt, setSelectedHunt] = useState(null);

  useEffect(() => {
    fetchHunts();
  }, []);

  async function fetchHunts() {
    const { data } = await supabase
      .from("lion_hunts")
      .select("*")
      .eq("fulfilled", false)
      .order("created_at", { ascending: false });

    setHunts(data || []);

    // Fetch requester profiles
    const ids = [...new Set((data || []).map((h) => h.requester_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, school")
        .in("id", ids);
      const map = {};
      (profs || []).forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }

    // Fetch response counts
    if (data?.length) {
      const { data: responses } = await supabase
        .from("lion_hunt_responses")
        .select("hunt_id")
        .in("hunt_id", data.map((h) => h.id));
      const counts = {};
      (responses || []).forEach((r) => {
        counts[r.hunt_id] = (counts[r.hunt_id] || 0) + 1;
      });
      setResponseCounts(counts);
    }

    setLoading(false);
  }

  const filtered = filter
    ? hunts.filter((h) => h.category === filter)
    : hunts;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      {/* Header */}
      <div
        className="pt-8 pb-10 px-6 md:px-10 text-center"
        style={{
          background: "linear-gradient(135deg, var(--columbia-navy) 0%, var(--columbia-navy-2) 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(185,217,235,0.12), transparent 50%), radial-gradient(circle at 80% 20%, rgba(108,172,228,0.1), transparent 40%)",
            pointerEvents: "none",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="eyebrow" style={{ color: "var(--columbia-blue)", marginBottom: "8px" }}>
            Item Requests
          </p>
          <h1 className="display-text text-3xl md:text-4xl text-white m-0">
            Lion Hunt
          </h1>
          <p className="text-sm mt-2 mb-6" style={{ color: "var(--columbia-blue)" }}>
            Can't find what you need? Post a request and let sellers come to you.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary-navy"
            style={{ background: "white", color: "var(--columbia-navy)" }}
          >
            + Post a Request
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-8">
        {/* Create form */}
        {showCreate && (
          <CreateHuntForm
            profile={profile}
            onDone={() => {
              setShowCreate(false);
              fetchHunts();
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("")}
            className="chip"
            style={
              !filter
                ? { background: "var(--columbia-navy)", color: "white", border: "1px solid transparent" }
                : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }
            }
          >
            All
          </button>
          {CATEGORIES.slice(0, 9).map((c) => (
            <button
              key={c.name}
              onClick={() => setFilter(filter === c.name ? "" : c.name)}
              className="chip"
              style={
                filter === c.name
                  ? { background: "var(--columbia-navy)", color: "white", border: "1px solid transparent" }
                  : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Hunts list */}
        {loading ? (
          <p style={{ color: "var(--text-subtle)" }} className="text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3" style={{ opacity: 0.5 }}>🦁</div>
            <p style={{ color: "var(--text-muted)" }}>No requests yet{filter ? ` in ${filter}` : ""}. Be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((hunt) => {
              const requester = profiles[hunt.requester_id];
              const catIcon = CATEGORIES.find((c) => c.name === hunt.category)?.icon;
              const count = responseCounts[hunt.id] || 0;
              const urg = URGENCY_COLORS[hunt.urgency];
              const isMine = hunt.requester_id === profile?.id;

              return (
                <div
                  key={hunt.id}
                  className="listing-card"
                  onClick={() => setSelectedHunt(hunt)}
                >
                  {/* Colored top bar instead of image */}
                  <div
                    style={{
                      height: "8px",
                      background: hunt.urgency === "urgent"
                        ? "linear-gradient(90deg, #dc2626, #f87171)"
                        : "linear-gradient(90deg, var(--columbia-navy), var(--columbia-blue-2))",
                    }}
                  />
                  <div className="card-body">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="card-title" style={{ whiteSpace: "normal", WebkitLineClamp: 2 }}>
                        {hunt.title}
                      </h3>
                      {hunt.budget_max && (
                        <span className="card-price">
                          Up to ${Number(hunt.budget_max).toFixed(0)}
                        </span>
                      )}
                    </div>

                    {hunt.description && (
                      <p className="card-blurb">{hunt.description}</p>
                    )}

                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="chip chip-school" style={{ fontSize: "11px" }}>
                        {catIcon} {hunt.category}
                      </span>
                      <span
                        className="chip"
                        style={{
                          background: urg.bg,
                          color: urg.color,
                          border: `1px solid ${urg.border}`,
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {URGENCY_LABELS[hunt.urgency]}
                      </span>
                      {count > 0 && (
                        <span className="chip chip-location" style={{ fontSize: "11px" }}>
                          {count} offer{count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="card-footer">
                      <div className="card-avatar">
                        {(requester?.full_name || "?")[0].toUpperCase()}
                      </div>
                      <span className="card-seller">
                        {isMine ? "You" : requester?.full_name || "Unknown"}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-subtle)" }}>
                        {timeAgo(hunt.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hunt Detail Modal */}
      {selectedHunt && (
        <HuntDetailModal
          hunt={selectedHunt}
          requester={profiles[selectedHunt.requester_id]}
          responseCount={responseCounts[selectedHunt.id] || 0}
          profile={profile}
          onClose={() => setSelectedHunt(null)}
          onResponded={() => {
            fetchHunts();
            setSelectedHunt(null);
          }}
        />
      )}
    </div>
  );
}

function CreateHuntForm({ profile, onDone, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0].name,
    description: "",
    budgetMax: "",
    urgency: "normal",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("Please enter what you're looking for.");
      return;
    }
    const badWord = checkProfanity(form.title, form.description);
    if (badWord) {
      alert("Please remove offensive language.");
      return;
    }

    if (!profile?.id) {
      alert("Please wait — your profile is still loading. Try again in a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("lion_hunts").insert({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        budget_max: form.budgetMax ? Number(form.budgetMax) : null,
        urgency: form.urgency,
        requester_id: profile.id,
      });
      if (error) throw error;
      onDone();
    } catch (err) {
      alert("Failed to post request: " + (err.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mb-8"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "28px",
      }}
    >
      <h3 className="display-text text-lg m-0 mb-1" style={{ color: "var(--text)" }}>
        What are you looking for?
      </h3>
      <p className="text-sm m-0 mb-5" style={{ color: "var(--text-muted)" }}>
        Describe what you need and sellers will reach out to you.
      </p>
      <form onSubmit={submit}>
        <Input
          label="What do you need?"
          placeholder="e.g., 2 Graduation Tickets for Class Day"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Max Budget ($)"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            value={form.budgetMax}
            onChange={(e) => update("budgetMax", e.target.value)}
          />
        </div>

        <TextArea
          label="Details (optional)"
          placeholder="Any specifics — size, condition, timing..."
          value={form.description}
          maxLength={300}
          onChange={(e) => update("description", e.target.value)}
        />

        <div className="mb-4">
          <label
            className="block text-sm font-semibold mb-2"
            style={{ color: "var(--text)" }}
          >
            How urgent?
          </label>
          <div className="flex gap-2">
            {Object.entries(URGENCY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update("urgency", key)}
                className="px-4 py-2 text-sm font-semibold cursor-pointer transition-all"
                style={{
                  borderRadius: "var(--radius)",
                  border: form.urgency === key
                    ? "2px solid var(--columbia-navy)"
                    : "2px solid var(--border)",
                  background: form.urgency === key ? "var(--columbia-blue)" : "var(--surface)",
                  color: form.urgency === key ? "var(--columbia-navy)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary-navy flex-1"
          >
            {submitting ? "Posting..." : "Post Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

function HuntDetailModal({ hunt, requester, responseCount, profile, onClose, onResponded }) {
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const isMine = hunt.requester_id === profile?.id;
  const catIcon = CATEGORIES.find((c) => c.name === hunt.category)?.icon;
  const urg = URGENCY_COLORS[hunt.urgency];

  // Check if already responded
  useEffect(() => {
    if (!profile || isMine) return;
    supabase
      .from("lion_hunt_responses")
      .select("id")
      .eq("hunt_id", hunt.id)
      .eq("responder_id", profile.id)
      .then(({ data }) => {
        if (data?.length) setAlreadyResponded(true);
      });
  }, [hunt.id, profile]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const respond = async () => {
    if (!message.trim() && !price) {
      alert("Please add a message or price.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lion_hunt_responses").insert({
        hunt_id: hunt.id,
        responder_id: profile.id,
        message: message.trim() || null,
        price: price ? Number(price) : null,
      });
      if (error) {
        if (error.code === "23505") {
          alert("You've already responded to this request.");
        } else {
          throw error;
        }
      } else {
        onResponded();
      }
    } catch (err) {
      alert("Failed to respond: " + (err.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]"
        style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div
          style={{
            height: "6px",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            background: hunt.urgency === "urgent"
              ? "linear-gradient(90deg, #dc2626, #f87171)"
              : "linear-gradient(90deg, var(--columbia-navy), var(--columbia-blue-2))",
          }}
        />

        <div className="p-6">
          <p className="eyebrow mb-2" style={{ color: "var(--columbia-blue-2)" }}>Lion Hunt Request</p>
          <h2 className="display-text text-xl m-0" style={{ color: "var(--text)" }}>{hunt.title}</h2>

          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="chip chip-school" style={{ fontSize: "11px" }}>
              {catIcon} {hunt.category}
            </span>
            <span
              className="chip"
              style={{ background: urg.bg, color: urg.color, border: `1px solid ${urg.border}`, fontSize: "11px", fontWeight: 600 }}
            >
              {URGENCY_LABELS[hunt.urgency]}
            </span>
            {hunt.budget_max && (
              <span className="chip chip-default" style={{ fontSize: "11px" }}>
                Budget: up to ${Number(hunt.budget_max).toFixed(0)}
              </span>
            )}
          </div>

          {hunt.description && (
            <div className="mt-5">
              <p className="eyebrow mb-2">Details</p>
              <p className="m-0 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {hunt.description}
              </p>
            </div>
          )}

          {/* Specs */}
          <div className="detail-specs" style={{ marginTop: "20px" }}>
            <div className="detail-spec">
              <div className="spec-label">Category</div>
              <div className="spec-value">{hunt.category}</div>
            </div>
            <div className="detail-spec">
              <div className="spec-label">Posted</div>
              <div className="spec-value">{timeAgo(hunt.created_at)}</div>
            </div>
            <div className="detail-spec">
              <div className="spec-label">Offers</div>
              <div className="spec-value">{responseCount}</div>
            </div>
          </div>

          {/* Requester card */}
          <div className="mt-5">
            <p className="eyebrow mb-2">Requested by</p>
            <div className="seller-card">
              <div className="seller-avatar">
                {(requester?.full_name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="seller-name">{requester?.full_name || "Unknown"}</div>
                <div className="seller-sub">
                  {requester?.school ? `${requester.school} · ` : ""}Columbia University
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Respond section */}
        {!isMine && !alreadyResponded && (
          <div className="action-bar" style={{ flexDirection: "column", gap: "12px", alignItems: "stretch" }}>
            <p className="eyebrow m-0">I can help with this</p>
            <input
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
              }}
              placeholder="Message to requester..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--text-subtle)" }}
                >
                  $
                </span>
                <input
                  className="w-full pl-7 pr-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    color: "var(--text)",
                  }}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Your price (optional)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <button
                onClick={respond}
                disabled={submitting}
                className="btn-primary-navy"
                style={{ whiteSpace: "nowrap" }}
              >
                {submitting ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </div>
        )}
        {alreadyResponded && (
          <div className="action-bar">
            <span className="chip chip-location" style={{ fontWeight: 600 }}>You've already responded</span>
          </div>
        )}
        {isMine && (
          <div className="action-bar">
            <span className="text-sm" style={{ color: "var(--text-subtle)" }}>This is your request</span>
            {responseCount > 0 && (
              <span className="chip chip-location" style={{ marginLeft: "auto", fontWeight: 600 }}>
                {responseCount} offer{responseCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-none cursor-pointer text-lg transition-colors"
          style={{ borderRadius: "var(--radius-pill)", background: "rgba(0,0,0,0.4)", color: "white" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import Button from "./ui/Button";
import MobileMenu from "./MobileMenu";

export default function NavBar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <div className="bg-[#1D4F91] text-white px-4 md:px-6 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div
          className="text-xl md:text-[22px] font-bold tracking-tight cursor-pointer"
          onClick={() => navigate("/home")}
        >
          🦁 LionsList
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <span
            className="text-sm opacity-90 cursor-pointer hover:underline"
            onClick={() => navigate("/profile")}
          >
            {profile?.full_name} · {profile?.school ? abbr(profile.school) : ""}
          </span>
          <Button
            small
            className="!bg-white/15 !text-white !border !border-white/30"
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white text-2xl bg-transparent border-none cursor-pointer"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
      </div>
      {menuOpen && (
        <MobileMenu
          profile={profile}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
          onNavigate={(path) => {
            navigate(path);
            setMenuOpen(false);
          }}
        />
      )}
    </>
  );
}

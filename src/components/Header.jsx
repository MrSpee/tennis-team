import { useEffect, useState } from "react";
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import "./Header.css";

function useHeaderCompact(offset = 50) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let timeoutId = null;
    
    const onScroll = () => {
      // Debounce: Verhindere zu häufige Updates
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        const scrollY = window.scrollY;
        
        // Hysterese: Verwende unterschiedliche Schwellwerte für auf/ab
        // Wenn nicht compact: Wechsle zu compact bei offset
        // Wenn compact: Wechsle zurück zu normal bei offset - 20
        if (!compact && scrollY > offset) {
          setCompact(true);
        } else if (compact && scrollY < offset - 20) {
          setCompact(false);
        }
      }, 10); // 10ms Debounce
    };
    
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [offset, compact]);
  return compact;
}

export default function Header() {
  const compact = useHeaderCompact(50);
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <header className={`app-header${compact ? " is-compact" : ""}`} role="banner">
      <div className="bar">
        <div className="title-block">
          <h1 className="app-title">Platzhirsch</h1>
          <p className="app-sub">Deine Matches, Dein Team, Dein Tennis.</p>
        </div>
        <div className="header-right">
          <div className="brand-avatar" title="Logo">
            <img src="/app-icon.jpg" alt="Logo" />
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Abmelden">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

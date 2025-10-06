import { useEffect, useState } from "react";
import "./Header.css";

function useHeaderCompact(offset = 24) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return compact;
}

export default function Header() {
  const compact = useHeaderCompact(24);
  
  return (
    <header className={`app-header${compact ? " is-compact" : ""}`} role="banner">
      <div className="bar">
        <div className="title-block">
          <h1 className="app-title">Platzhirsch</h1>
          <p className="app-sub">Deine Matches, Dein Team.</p>
        </div>
        <div className="brand-avatar" title="Logo">
          <img src="/app-icon.jpg" alt="Logo" />
        </div>
      </div>
    </header>
  );
}

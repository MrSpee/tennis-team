import './Header.css';

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* Slogan - zentriert */}
        <div className="header-slogan">
          <h1>Platzhirsch</h1>
          <p>Deine Matches, Dein Team.</p>
        </div>
      </div>
    </header>
  );
}

export default Header;

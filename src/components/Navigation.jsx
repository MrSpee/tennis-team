import { NavLink } from 'react-router-dom';
import { Home, Calendar, Trophy, Table, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

function Navigation() {
  const { isCaptain } = useAuth();

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className="nav-item">
        <Home size={24} />
        <span>Start</span>
      </NavLink>
      
      <NavLink to="/matches" className="nav-item">
        <Calendar size={24} />
        <span>Spiele</span>
      </NavLink>
      
      <NavLink to="/rankings" className="nav-item">
        <Trophy size={24} />
        <span>Rangliste</span>
      </NavLink>
      
      <NavLink to="/league" className="nav-item">
        <Table size={24} />
        <span>Tabelle</span>
      </NavLink>
      
      {isCaptain && (
        <NavLink to="/admin" className="nav-item">
          <Settings size={24} />
          <span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

export default Navigation;

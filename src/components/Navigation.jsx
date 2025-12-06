import { NavLink } from 'react-router-dom';
import { Home, Calendar, Trophy, Award, Settings, User, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

function Navigation() {
  const { isCaptain } = useAuth();

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className="nav-item">
        <Home size={24} />
        <span>Übersicht</span>
      </NavLink>
      
      <NavLink to="/matches" className="nav-item">
        <Calendar size={24} />
        <span>Saison</span>
      </NavLink>
      
      <NavLink to="/training" className="nav-item">
        <Dumbbell size={24} />
        <span>Training</span>
      </NavLink>
      
      <NavLink to="/results" className="nav-item">
        <Trophy size={24} />
        <span>Ergebnisse</span>
      </NavLink>
      
      <NavLink to="/rankings" className="nav-item">
        <Award size={24} />
        <span>Kader</span>
      </NavLink>
      
      <NavLink to="/profile" className="nav-item">
        <User size={24} />
        <span>Profil</span>
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

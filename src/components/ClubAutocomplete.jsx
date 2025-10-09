import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, CheckCircle, Plus, MapPin } from 'lucide-react';
import './Dashboard.css';

/**
 * ClubAutocomplete Component
 * 
 * Intelligente Vereinssuche mit:
 * - Fuzzy-Matching (ähnliche Namen finden)
 * - Duplikat-Prävention
 * - Verified Badge für TVM-Vereine
 */

function ClubAutocomplete({ 
  value = [], 
  onChange, 
  placeholder = "Verein suchen...",
  minChars = 0,  // Sofort suchen, keine Mindestlänge
  maxResults = 20,  // Mehr Ergebnisse anzeigen
  allowMultiple = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Initial load: Zeige alle Vereine
  useEffect(() => {
    loadAllClubs();
  }, []);

  // Debounced Search
  useEffect(() => {
    if (searchTerm.length === 0) {
      // Bei leerem Suchfeld: Zeige alle Vereine
      loadAllClubs();
      return;
    }
    
    if (searchTerm.length < minChars) {
      // Zu kurz für Suche
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchClubs(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, minChars]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load all clubs (for initial display)
  const loadAllClubs = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading all clubs...');

      const { data, error } = await supabase
        .from('club_info')
        .select('id, name, city, postal_code, region, federation, is_verified')
        .order('is_verified', { ascending: false })
        .order('name', { ascending: true })
        .limit(maxResults);

      if (error) throw error;

      console.log('✅ All clubs loaded:', data?.length || 0);
      setResults(data || []);
      setShowDropdown(false); // Nicht automatisch öffnen

    } catch (error) {
      console.error('❌ Error loading all clubs:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search clubs with fuzzy matching
  const searchClubs = async (term) => {
    try {
      setLoading(true);
      console.log('🔍 Searching clubs:', term);

      // Use Supabase's find_similar_clubs function (Fuzzy-Matching)
      const { data, error } = await supabase
        .rpc('find_similar_clubs', { 
          search_name: term,
          similarity_threshold: 0.3 // Lower threshold for more results
        });

      if (error) {
        console.error('Fuzzy search failed, falling back to simple search:', error);
        // Fallback: Simple ILIKE search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('club_info')
          .select('id, name, city, postal_code, federation, is_verified')
          .ilike('name', `%${term}%`)
          .order('is_verified', { ascending: false })
          .order('name', { ascending: true })
          .limit(maxResults);

        if (fallbackError) throw fallbackError;
        setResults(fallbackData || []);
      } else {
        console.log('✅ Found clubs:', data);
        setResults(data || []);
      }

      setShowDropdown(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Error searching clubs:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if club is already selected
  const isSelected = (clubName) => {
    return value.includes(clubName);
  };

  // Handle club selection
  const handleSelect = (club) => {
    if (isSelected(club.name)) {
      // Deselect
      onChange(value.filter(c => c !== club.name));
    } else {
      // Select
      if (allowMultiple) {
        onChange([...value, club.name]);
        // Schließe Dropdown nach Auswahl (auch bei Multi-Select)
        setShowDropdown(false);
        setSearchTerm('');
      } else {
        onChange([club.name]);
        setSearchTerm('');
        setShowDropdown(false);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Remove selected club
  const handleRemove = (clubName) => {
    onChange(value.filter(c => c !== clubName));
  };

  return (
    <div className="club-autocomplete" ref={dropdownRef}>
      {/* Search Input */}
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            // Beim Focus: Zeige Dropdown sofort (wenn Ergebnisse vorhanden)
            if (results.length > 0) {
              setShowDropdown(true);
            } else if (searchTerm.length === 0) {
              // Lade alle Clubs wenn noch keine Ergebnisse
              loadAllClubs().then(() => setShowDropdown(true));
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {loading && (
          <span className="search-loading">⏳</span>
        )}
      </div>

      {/* Selected Clubs */}
      {value.length > 0 && (
        <div className="selected-clubs">
          {value.map((clubName, index) => (
            <div key={index} className="selected-club-chip">
              <span>{clubName}</span>
              <button
                type="button"
                onClick={() => handleRemove(clubName)}
                className="remove-club-btn"
                aria-label="Entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="club-dropdown">
          {results.length > 0 ? (
            <>
              {results.map((club, index) => (
                <button
                  key={club.id}
                  type="button"
                  className={`club-dropdown-item ${
                    highlightedIndex === index ? 'highlighted' : ''
                  } ${isSelected(club.name) ? 'selected' : ''}`}
                  onClick={() => handleSelect(club)}
                >
                  <div className="club-item-content">
                    <div className="club-item-name">
                      {club.name}
                      {club.is_verified && (
                        <CheckCircle 
                          size={14} 
                          className="verified-badge" 
                          title="Verifizierter Verein"
                        />
                      )}
                    </div>
                    {club.city && (
                      <div className="club-item-location">
                        <MapPin size={12} />
                        {club.city}
                        {club.federation && ` · ${club.federation}`}
                      </div>
                    )}
                  </div>
                  {isSelected(club.name) && (
                    <CheckCircle size={16} className="selected-icon" />
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="club-dropdown-empty">
              <p>Keine Vereine gefunden</p>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {searchTerm.length > 0 && searchTerm.length < minChars && (
        <p className="search-help-text">
          Mindestens {minChars} Zeichen eingeben
        </p>
      )}
    </div>
  );
}

export default ClubAutocomplete;

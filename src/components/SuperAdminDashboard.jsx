import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateSimilarity, normalizeString } from '../services/matchdayImportService';
import LoggingService from '../services/activityLogger';
import {
  Users,
  Building2,
  Activity,
  CheckCircle,
  Download,
  RefreshCw,
  CalendarDays,
  Trophy,
  Settings
} from 'lucide-react';
import ImportTab from './ImportTab';
import OverviewTab from './superadmin/OverviewTab';
import ClubsTab from './superadmin/ClubsTab';
import PlayersTab from './superadmin/PlayersTab';
import MatchdaysTab from './superadmin/MatchdaysTab';
import ScraperTab from './superadmin/ScraperTab';
import TeamPortraitImportTab from './superadmin/TeamPortraitImportTab';
import ClubRostersTab from './superadmin/ClubRostersTab';
import NuLigaImportTab from './superadmin/NuLigaImportTab';
import GroupsTab from './superadmin/GroupsTab';
import ActivityLogTab from './superadmin/ActivityLogTab';
import { findMatchdaysWithoutResultsAfter4Days, runAutoImport, recordAttempt, checkMatchdayResultsComplete } from '../services/autoMatchResultImportService';
import './Dashboard.css';
import './SuperAdminDashboard.css';

const SCRAPER_STATUS = {
  existing: { icon: '✅', color: '#166534', background: '#bbf7d0', label: 'Im System' },
  new: { icon: '🆕', color: '#1d4ed8', background: '#bfdbfe', label: 'Neu anlegen' },
  missing: { icon: '⚠️', color: '#b91c1c', background: '#fecaca', label: 'Keine Zuordnung' },
  skipped: { icon: '🚫', color: '#92400e', background: '#fde68a', label: 'Import deaktiviert' }
};

const getDefaultBuildInfo = () => {
  try {
    const buildTime = import.meta.env?.VITE_BUILD_TIME || new Date().toISOString();
    const buildDate = new Date(buildTime);
    const commitSha = import.meta.env?.VITE_GIT_SHA || '';
    return {
      buildTime,
      buildTimeFormatted: buildDate.toLocaleString('de-DE'),
      shortCommit: commitSha ? commitSha.slice(0, 7) : 'local'
    };
  } catch (error) {
    const now = new Date();
    return {
      buildTime: now.toISOString(),
      buildTimeFormatted: now.toLocaleString('de-DE'),
      shortCommit: 'local'
    };
  }
};

const splitTeamLabel = (value = '') => {
  // Safeguard against null/undefined values coming from Supabase rows
  const trimmed = typeof value === 'string' ? value.trim() : String(value || '').trim();
  if (!trimmed) return { clubName: '', suffix: null };
  const match = trimmed.match(/^(.*?)(?:\s+([IVXLCM]+|\d+))$/iu);
  if (!match) return { clubName: trimmed, suffix: null };
  return { clubName: (match[1] || '').trim(), suffix: match[2] ? match[2].trim() : null };
};

const buildTeamKeys = (teamName = '', fallbackClub = '', fallbackSuffix = '') => {
  const keys = new Set();
  const base = normalizeString(teamName || '');
  if (base) keys.add(base);
  const { clubName, suffix } = splitTeamLabel(teamName);
  const resolvedClub = fallbackClub || clubName;
  const resolvedSuffix = fallbackSuffix || suffix;
  [
    `${resolvedClub} ${resolvedSuffix || ''}`,
    `${resolvedClub} ${teamName || ''}`,
    resolvedClub,
    resolvedSuffix
  ].forEach((candidate) => {
    const key = normalizeString(candidate || '');
    if (key) keys.add(key);
  });
  return Array.from(keys).filter(Boolean);
};

const inferTeamSize = (label = '') => {
  if (!label) return 4;
  const match = label.match(/(\d+)\s*er/i);
  if (match) {
    const size = parseInt(match[1], 10);
    if (!Number.isNaN(size)) return size;
  }
  return 4;
};

const parseScoreComponent = (raw = '', index = 0) => {
  if (!raw) return null;
  const parts = raw.split(':');
  if (!Array.isArray(parts) || !parts[index]) return null;
  const value = parseInt(parts[index].trim(), 10);
  return Number.isNaN(value) ? null : value;
};

const extractScoreValue = (matchPoints, side) => {
  if (!matchPoints) return null;
  if (typeof matchPoints === 'string') {
    return parseScoreComponent(matchPoints, side === 'home' ? 0 : 1);
  }
  if (typeof matchPoints?.raw === 'string') {
    return parseScoreComponent(matchPoints.raw, side === 'home' ? 0 : 1);
  }
  const value = matchPoints?.[side];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const normalizeStartTime = (value) => {
  if (!value) return null;
  const stringified = value.toString().trim();
  if (!stringified) return null;
  return stringified.length > 5 ? stringified.slice(0, 5) : stringified;
};

const deriveYearLabel = (season, fallbackYear) => {
  if (fallbackYear) return fallbackYear;
  if (!season) return null;
  const seasonMatch = season.match(/\d{4}\/\d{2}/);
  if (seasonMatch) return seasonMatch[0];
  const singleYear = season.match(/\d{4}/g);
  if (singleYear && singleYear.length) return singleYear.pop();
  return null;
};

const toIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildSeasonKey = (teamId, season, league, groupName) => {
  if (!teamId) return null;
  const seasonPart = season || 'unknown';
  const leaguePart = league || 'unknown';
  const groupPart = groupName || 'unknown';
  return `${teamId}::${seasonPart}::${leaguePart}::${groupPart}`;
};

const hasScoreData = (match) => {
  const home = extractScoreValue(match?.matchPoints, 'home');
  const away = extractScoreValue(match?.matchPoints, 'away');
  return home != null && away != null;
};

const formatCourtRange = (start, end) => {
  if (!start) return '–';
  if (end && end !== start) return `${start}–${end}`;
  return `${start}`;
};

const extractMatchNumber = (notes) => {
  if (!notes) return null;
  const match = notes.match(/match\s*#(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};

const extractMeetingMeta = (match) => {
  const meta = {
    meetingId: null,
    meetingUrl: null
  };

  if (!match) return meta;

  if (match.meetingId) {
    meta.meetingId = match.meetingId;
  }
  if (match.meeting_id) {
    meta.meetingId = match.meeting_id;
  }
  if (match.meetingReportUrl) {
    meta.meetingUrl = match.meetingReportUrl;
  }
  if (match.meeting_report_url) {
    meta.meetingUrl = match.meeting_report_url;
  }

  const textSources = [match.notes, match.final_score, match.metadata]
    .filter(Boolean)
    .map((value) => value.toString())
    .join(' ');

  if (!meta.meetingId && textSources) {
    const idMatch = textSources.match(/meeting#(\d+)/i) || textSources.match(/meeting=(\d+)/i);
    if (idMatch) {
      meta.meetingId = idMatch[1];
    }
  }

  if (!meta.meetingUrl && textSources) {
    const urlMatch = textSources.match(/https?:\/\/[^\s]+meeting[^\s"]+/i);
    if (urlMatch) {
      meta.meetingUrl = urlMatch[0];
    }
  }

  return meta;
};

/**
 * Normalisiert Kategorien: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
 * Altersklassen (30+) bleiben unverändert: "Damen 30" → "Damen 30", "Herren 40" → "Herren 40"
 */
const normalizeCategory = (category) => {
  if (!category || typeof category !== 'string') {
    return category;
  }
  
  const trimmed = category.trim();
  
  // Prüfe ob es eine Mannschaftsnummer ist (1, 2, 3) oder eine Altersklasse (30+)
  // Pattern: "Damen 1", "Damen 2", "Damen 3" → "Damen"
  // Pattern: "Herren 1", "Herren 2", "Herren 3" → "Herren"
  // Pattern: "Damen 30", "Herren 40" etc. → unverändert (Altersklassen)
  const match = trimmed.match(/^(Damen|Herren)\s+(\d+)$/i);
  
  if (match) {
    const gender = match[1]; // "Damen" oder "Herren"
    const number = parseInt(match[2], 10);
    
    // Wenn die Zahl 1, 2 oder 3 ist → Mannschaftsnummer, normalisiere zu "Damen" oder "Herren"
    if (number >= 1 && number <= 3) {
      return gender;
    }
    // Wenn die Zahl >= 30 ist → Altersklasse, behalte unverändert
    // (z.B. "Damen 30", "Herren 40", "Herren 50")
  }
  
  // Keine Normalisierung nötig oder Pattern nicht erkannt
  return trimmed;
};

const resolveGroupId = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    const normalized = str.replace(/^0+/, '');
    return normalized || '0';
  }
  const match = str.match(/(\d{1,4})/);
  if (!match) return null;
  const normalized = match[1].replace(/^0+/, '');
  return normalized || '0';
};

const toDateKey = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return null;
  }
};

const buildTeamLabel = (team) => {
  if (!team) return '';
  const club = team.club_name || '';
  const suffix = team.team_name ? ` ${team.team_name}` : '';
  return `${club}${suffix}`.trim();
};

const getMatchNumberFromRecord = (match) => {
  if (!match) return null;
  if (match.match_number) return match.match_number;
  return extractMatchNumber(match.notes);
};

const PLAYER_STATUS_STYLES = {
  app_user: { label: 'App-Nutzer', icon: '📱', color: '#0f766e', background: '#ccfbf1', border: '#99f6e4' },
  external: { label: 'Externer Spieler', icon: '🌐', color: '#1d4ed8', background: '#dbeafe', border: '#bfdbfe' },
  opponent: { label: 'Gegner', icon: '🎾', color: '#92400e', background: '#fef3c7', border: '#fde68a' },
  default: { label: 'Unbekannt', icon: '❔', color: '#475569', background: '#e2e8f0', border: '#cbd5f5' }
};

const resolvePlayerStatus = (player) => {
  if (player?.user_id && player?.is_active !== false) {
    return PLAYER_STATUS_STYLES.app_user;
  }
  const type = player?.player_type;
  if (type && PLAYER_STATUS_STYLES[type]) {
    return PLAYER_STATUS_STYLES[type];
  }
  return PLAYER_STATUS_STYLES.default;
};

const formatDate = (value) => {
  if (!value) return '–';
  try {
    return new Date(value).toLocaleDateString('de-DE');
  } catch (error) {
    return '–';
  }
};

const MATCHDAY_STATUS_STYLES = {
  scheduled: { label: 'Geplant', icon: '🗓️', color: '#1d4ed8', background: '#dbeafe' },
  completed: { label: 'Beendet', icon: '✅', color: '#16a34a', background: '#dcfce7' },
  cancelled: { label: 'Abgesagt', icon: '⛔', color: '#b91c1c', background: '#fee2e2' },
  postponed: { label: 'Verschoben', icon: '🕒', color: '#a16207', background: '#fef3c7' },
  default: { label: 'Unbekannt', icon: 'ℹ️', color: '#334155', background: '#e2e8f0' }
};

const isMatchInPast = (match) => {
  if (!match?.match_date) return false;
  const matchDate = new Date(match.match_date);
  if (Number.isNaN(matchDate.getTime())) return false;

  if (match.start_time && matchDate.getHours() === 0 && matchDate.getMinutes() === 0) {
    const [hoursString, minutesString] = match.start_time.split(':');
    const hours = Number.parseInt(hoursString, 10);
    const minutes = Number.parseInt(minutesString, 10);
    if (!Number.isNaN(hours)) {
      matchDate.setHours(hours);
      matchDate.setMinutes(Number.isNaN(minutes) ? 0 : minutes);
    }
  }

  return matchDate.getTime() < Date.now();
};

const needsResultParser = (match) => {
  if (!match) return false;
  if (['cancelled', 'postponed'].includes(match.status)) return false;

  const hasNumericScore = match.home_score != null && match.away_score != null;
  const finalScore =
    typeof match.final_score === 'string'
      ? match.final_score.trim()
      : match.final_score;
  const hasFinalScore = Boolean(finalScore);

  if (hasNumericScore || hasFinalScore) return false;
  if (match.status === 'completed') return true;

  return match.status === 'scheduled' && isMatchInPast(match);
};

function SuperAdminDashboard() {
  // ---------------------------------------------------------------------------
  // Allgemeine States
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSeasons, setTeamSeasons] = useState([]);
  const [seasonMatchdays, setSeasonMatchdays] = useState([]);
  const [selectedSeasonMatch, setSelectedSeasonMatch] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState({ column: 'name', direction: 'asc' });
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [logsFilter, setLogsFilter] = useState('all');
  const [selectedPlayerRow, setSelectedPlayerRow] = useState(null);

  // ---------------------------------------------------------------------------
  // Scraper States
  // ---------------------------------------------------------------------------
  const [scraperData, setScraperData] = useState(null);
  const [scraperError, setScraperError] = useState('');
  const [scraperSuccess, setScraperSuccess] = useState('');
  const [scraperClubMappings, setScraperClubMappings] = useState({});
  const [scraperMatchSelections, setScraperMatchSelections] = useState({});
  const [scraperSelectedGroupId, setScraperSelectedGroupId] = useState(null);
  const [scraperSelectedMatch, setScraperSelectedMatch] = useState(null);
  const [scraperImportResult, setScraperImportResult] = useState(null);
  const [scraperImporting, setScraperImporting] = useState(false);
  const [matchImporting, setMatchImporting] = useState(false);
  const [matchImportResult, setMatchImportResult] = useState(null);
  const [clubSearchQueries, setClubSearchQueries] = useState({});
  const [clubSearchResults, setClubSearchResults] = useState({});

  const [scraperApiLoading, setScraperApiLoading] = useState(false);
  const [scraperApiGroups, setScraperApiGroups] = useState('');
  const [scraperApiLeagueUrl, setScraperApiLeagueUrl] = useState('');
  const [scraperApiApplyMode, setScraperApiApplyMode] = useState(false);
  const [matchParserStates, setMatchParserStates] = useState({});
  const [parserMessage, setParserMessage] = useState(null);
  const [parserProcessing, setParserProcessing] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({});
  const [creatingPlayerKey, setCreatingPlayerKey] = useState(null);
  const [deletingMatchdayId, setDeletingMatchdayId] = useState(null);
  const [matchResultsData, setMatchResultsData] = useState({});
  const [matchdayDuplicates, setMatchdayDuplicates] = useState([]);
  // ✅ Lade initial aus localStorage, um unnötige DB-Abfragen zu vermeiden
  const [matchdaysWithoutResults, setMatchdaysWithoutResults] = useState(() => {
    try {
      const saved = localStorage.getItem('superAdminMatchdaysWithoutResults');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Prüfe ob Daten nicht älter als 5 Minuten sind
        const now = Date.now();
        const savedTime = parsed.timestamp || 0;
        const fiveMinutes = 5 * 60 * 1000;
        if (now - savedTime < fiveMinutes) {
          return parsed.data || [];
        }
      }
    } catch (e) {
      console.warn('⚠️ Fehler beim Laden der gespeicherten fehlenden Ergebnisse:', e);
    }
    return [];
  });
  const [matchdaysNeedingMeetingIdUpdate, setMatchdaysNeedingMeetingIdUpdate] = useState([]);
  const [updatingMeetingIds, setUpdatingMeetingIds] = useState(false);
  const [meetingIdUpdateResult, setMeetingIdUpdateResult] = useState(null);
  const [autoImportStatus, setAutoImportStatus] = useState({
    lastRun: null,
    isRunning: false,
    lastResult: null
  });
  const [cronJobLogs, setCronJobLogs] = useState([]);
  const [expandedCronLogId, setExpandedCronLogId] = useState(null);

  const buildInfo = useMemo(getDefaultBuildInfo, []);

  useEffect(() => {
    if (!parserMessage) return undefined;
    const timer = setTimeout(() => setParserMessage(null), 7000);
    return () => clearTimeout(timer);
  }, [parserMessage]);

  // ---------------------------------------------------------------------------
  // Grundlagen aus Daten ableiten
  // ---------------------------------------------------------------------------
  const existingClubMap = useMemo(() => {
    const map = new Map();
    (clubs || []).forEach((club) => club?.id && map.set(club.id, club));
    return map;
  }, [clubs]);

  const existingClubsByNormalizedName = useMemo(() => {
    const map = new Map();

    const addClubForKey = (key, club) => {
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(club);
    };

    (clubs || []).forEach((club) => {
      const rawValue = club?.normalized_name || club?.name || '';
      const normalized = normalizeString(rawValue);
      const normalizedCompact = normalized.replace(/\s+/g, '');

      addClubForKey(normalized, club);
      addClubForKey(normalizedCompact, club);

      if (rawValue) {
        const rawCompact = normalizeString(rawValue.replace(/\s+/g, ''));
        addClubForKey(rawCompact, club);
      }
    });
    return map;
  }, [clubs]);

  const teamsByClubId = useMemo(() => {
    const map = new Map();
    (teams || []).forEach((team) => {
      if (!team?.club_id) return;
      if (!map.has(team.club_id)) map.set(team.club_id, []);
      map.get(team.club_id).push(team);
    });
    return map;
  }, [teams]);

  const teamSeasonsByTeamId = useMemo(() => {
    const map = new Map();
    (teamSeasons || []).forEach((ts) => {
      if (!ts?.team_id) return;
      if (!map.has(ts.team_id)) map.set(ts.team_id, []);
      map.get(ts.team_id).push(ts);
    });
    return map;
  }, [teamSeasons]);

  const existingTeamLookup = useMemo(() => {
    const lookup = new Map();
    (teams || []).forEach((team) => {
      if (!team?.id) return;
      // WICHTIG: Kategorie ist Teil des Keys! "VKC 1" (Herren 30) ≠ "VKC 1" (Herren 50)
      const categoryKey = team.category ? `::${normalizeString(team.category)}` : '';
      buildTeamKeys(team.team_name, team.club_name).forEach((key) => {
        const fullKey = `${key}${categoryKey}`;
        if (!lookup.has(fullKey)) lookup.set(fullKey, team.id);
        // Auch ohne Kategorie für Fallback (aber niedrigere Priorität)
        if (!categoryKey && !lookup.has(key)) lookup.set(key, team.id);
      });
    });
    return lookup;
  }, [teams]);

  const teamById = useMemo(() => {
    const map = new Map();
    (teams || []).forEach((team) => {
      if (!team?.id) return;
      map.set(team.id, team);
    });
    return map;
  }, [teams]);

  const existingTeamSeasonLookup = useMemo(() => {
    const lookup = new Map();
    (teamSeasons || []).forEach((season) => {
      if (!season?.team_id) return;
      const key = buildSeasonKey(season.team_id, season.season, season.league, season.group_name);
      if (key) lookup.set(key, season);
    });
    return lookup;
  }, [teamSeasons]);

  const matchesNeedingParser = useMemo(
    () => (seasonMatchdays || []).filter((match) => needsResultParser(match)),
    [seasonMatchdays]
  );

  const parserGroupsNeedingUpdate = useMemo(() => {
    const groups = new Set();
    matchesNeedingParser.forEach((match) => {
      const groupId = resolveGroupId(match?.group_name);
      if (groupId) {
        groups.add(groupId);
      }
    });
    return Array.from(groups).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [matchesNeedingParser]);

  // ---------------------------------------------------------------------------
  // Scraper-Auswertungen
  // ---------------------------------------------------------------------------
  const findExistingClubByName = useCallback(
    (rawName = '') => {
      const trimmed = rawName.trim();
      if (!trimmed) return null;
      const normalized = normalizeString(trimmed);
      if (normalized && existingClubsByNormalizedName.has(normalized)) {
        return {
          match: existingClubsByNormalizedName.get(normalized)[0],
          score: 1,
          reason: 'normalized'
        };
      }
      let best = null;
      (clubs || []).forEach((club) => {
        const candidateName = club?.name || '';
        if (!candidateName) return;
        const score = calculateSimilarity(trimmed, candidateName);
        if (!best || score > best.score) {
          best = { club, score, reason: 'similarity' };
        }
      });
      return best;
    },
    [clubs, existingClubsByNormalizedName]
  );

  const ensureTeamSeason = useCallback(
    async (teamId, season, league, groupName, teamSize = 4) => {
      if (!teamId) return null;
      const key = buildSeasonKey(teamId, season, league, groupName);
      if (key && existingTeamSeasonLookup.has(key)) {
        return existingTeamSeasonLookup.get(key);
      }

      const payload = {
        team_id: teamId,
        season: season || null,
        league: league || null,
        group_name: groupName || null,
        team_size: teamSize || null,
        is_active: true
      };

      const { data, error } = await supabase.from('team_seasons').insert(payload).select().maybeSingle();

      // ✅ 409 Conflict (Duplikat) - Eintrag existiert bereits
      if (error?.code === '23505' || error?.message?.includes('409') || error?.message?.includes('Conflict')) {
        // Versuche den bestehenden Eintrag zu finden
        const { data: existingSeason, error: fetchError } = await supabase
          .from('team_seasons')
          .select('*')
          .eq('team_id', teamId)
          .eq('season', season || null)
          .eq('league', league || null)
          .eq('group_name', groupName || null)
          .maybeSingle();
        
        if (fetchError) {
          // Wenn auch das Abrufen fehlschlägt, logge es, aber wirf keinen Fehler
          console.warn(`⚠️ Konnte bestehende Team-Season nicht abrufen:`, fetchError);
          return null;
        }
        
        if (existingSeason) {
          // Aktualisiere den Lookup-Cache
          const existingKey = buildSeasonKey(teamId, season, league, groupName);
          if (existingKey) {
          setTeamSeasons((prev) => {
            if (prev.some((entry) => entry.id === existingSeason.id)) return prev;
            return [existingSeason, ...prev];
          });
          }
          return existingSeason;
        }
        return null;
      }

      // ✅ Andere Fehler: weiterwerfen
      if (error) throw error;
      if (data) {
        setTeamSeasons((prev) => [data, ...prev]);
      }
      return data;
    },
    [existingTeamSeasonLookup, supabase]
  );

  const scraperClubSummaries = useMemo(() => {
    if (!scraperData?.groups?.length) return [];
    const aggregate = new Map();

    scraperData.groups.forEach((group) => {
      const entries = group.teamsDetailed?.length
        ? group.teamsDetailed
        : group.standings?.length
          ? group.standings
          : [];
      entries.forEach((team) => {
        const teamName = (team.teamName || team.team || '').trim();
        if (!teamName) return;
        const { clubName, suffix } = splitTeamLabel(teamName);
        if (!clubName) return;
        if (!aggregate.has(clubName)) {
          aggregate.set(clubName, {
            clubName,
            categories: new Set(),
            leagues: new Set(),
            groups: new Set(),
            seasons: new Set(),
            teams: []
          });
        }
        const entry = aggregate.get(clubName);
        const normalized = normalizeString(teamName);
        if (!entry.teams.some((t) => t.normalized === normalized)) {
          entry.teams.push({
            original: teamName,
            normalized,
            suffix: suffix || team.teamSuffix || '',
            category: team.category || group.group?.category || '',
            league: team.league || group.group?.league || '',
            groupName: team.groupName || group.group?.groupName || '',
            groupId: team.groupId || group.group?.groupId || '',
            season: team.season || scraperData.season || ''
          });
        }
        if (team.category || group.group?.category) entry.categories.add(team.category || group.group?.category);
        if (team.league || group.group?.league) entry.leagues.add(team.league || group.group?.league);
        if (team.groupName || group.group?.groupName) entry.groups.add(team.groupName || group.group?.groupName);
        if (team.season || scraperData.season) entry.seasons.add(team.season || scraperData.season);
      });
    });

    return Array.from(aggregate.values()).map((entry) => {
      const categories = Array.from(entry.categories);
      const leagues = Array.from(entry.leagues);
      const groups = Array.from(entry.groups);
      const seasons = Array.from(entry.seasons);

      const scored = clubs
        .map((club) => ({ club, score: calculateSimilarity(entry.clubName, club.name || '') }))
        .filter((item) => item.score > 0.5)
        .sort((a, b) => b.score - a.score);

      const normalizedEntry = normalizeString(entry.clubName);
      let matchedClub = null;
      let matchScore = 0;
      let status = 'new';

      if (normalizedEntry && existingClubsByNormalizedName.has(normalizedEntry)) {
        matchedClub = existingClubsByNormalizedName.get(normalizedEntry)[0];
        matchScore = 1;
        status = 'existing';
      } else if (scored.length > 0 && scored[0].score >= 0.90) {
        // Nur als Match akzeptieren wenn Score >= 90%
        matchedClub = scored[0].club;
        matchScore = scored[0].score;
        if (matchScore >= 0.95) status = 'existing';
        else if (matchScore >= 0.90) status = 'fuzzy'; // 90-95% = manuelle Bestätigung
      }

      entry.teams.sort((a, b) => a.original.localeCompare(b.original));

      // Team-Matching für diesen Club
      const teamsWithStatus = entry.teams.map((team) => {
        let teamMatchStatus = 'new';
        let existingTeamId = null;
        let existingTeamSeasonId = null;

        if (matchedClub) {
          // Suche in team_info
          const clubTeams = teamsByClubId.get(matchedClub.id) || [];
          
          // Versuche verschiedene Matching-Strategien
          const matched = clubTeams.find((existing) => {
            // Strategie 1: Nur team_name vergleichen (z.B. "1" === "1")
            const normalizedTeamName = normalizeString(existing.team_name || '');
            const normalizedSuffix = normalizeString(team.suffix || team.original);
            if (normalizedTeamName === normalizedSuffix) return true;
            
            // Strategie 2: Voller Name mit Suffix
            const existingFullName = `${existing.club_name} ${existing.team_name || ''}`.trim();
            const teamFullName = `${entry.clubName} ${team.original}`.trim();
            if (normalizeString(existingFullName) === normalizeString(teamFullName)) return true;
            
            // Strategie 3: Kategorie + Suffix Match
            if (existing.category && team.category) {
              const sameCategory = normalizeString(existing.category) === normalizeString(team.category);
              const sameSuffix = normalizeString(existing.team_name || '') === normalizeString(team.suffix || team.original);
              if (sameCategory && sameSuffix) return true;
            }
            
            return false;
          });

          if (!matched) {
            console.log(`⚠️ Kein Team Match: "${team.original}" (Suffix: "${team.suffix}") für Club "${entry.clubName}". Verfügbare Teams:`, clubTeams.map(t => `${t.team_name} (${t.category})`));
          }

          if (matched) {
            existingTeamId = matched.id;
            teamMatchStatus = 'existing';
            console.log(`✅ Team Match gefunden: "${team.original}" → DB Team-ID ${matched.id} (${matched.club_name} ${matched.team_name})`);

            // Suche in team_seasons für diese Saison
            const teamSeasons = teamSeasonsByTeamId.get(matched.id) || [];
            const matchedSeason = teamSeasons.find((ts) => {
              const sameLeague = !team.league || ts.league === team.league;
              const sameSeason = !team.season || ts.season === team.season;
              const sameGroup = !team.groupName || ts.group_name === team.groupName;
              return sameLeague && sameSeason && sameGroup;
            });

            if (matchedSeason) {
              existingTeamSeasonId = matchedSeason.id;
            }
          }
        }

        return {
          ...team,
          teamMatchStatus,
          existingTeamId,
          existingTeamSeasonId
        };
      });

      return {
        ...entry,
        categories,
        leagues,
        groups,
        seasons,
        matchStatus: status,
        matchScore,
        matchedClub,
        matchAlternatives: scored
          .filter((candidate) => !matchedClub || candidate.club.id !== matchedClub.id)
          .slice(0, 3),
        teams: teamsWithStatus
      };
    }).sort((a, b) => a.clubName.localeCompare(b.clubName));
  }, [scraperData, clubs, existingClubsByNormalizedName, teamsByClubId, teamSeasonsByTeamId]);

  const scraperStats = useMemo(() => {
    const totalClubs = scraperClubSummaries.length;
    const existingClubs = scraperClubSummaries.filter((s) => s.matchStatus === 'existing').length;
    const newClubs = totalClubs - existingClubs;

    const allTeams = scraperClubSummaries.flatMap((s) => s.teams);
    const totalTeams = allTeams.length;
    const existingTeams = allTeams.filter((t) => t.teamMatchStatus === 'existing').length;
    const newTeams = totalTeams - existingTeams;

    const existingSeasons = allTeams.filter((t) => t.existingTeamSeasonId).length;
    const missingSeasons = existingTeams - existingSeasons;

    return {
      totalClubs,
      existingClubs,
      newClubs,
      totalTeams,
      existingTeams,
      newTeams,
      existingSeasons,
      missingSeasons
    };
  }, [scraperClubSummaries]);

  const scraperTeamStatusLookup = useMemo(() => {
    const map = new Map();
    Object.entries(scraperClubMappings).forEach(([clubName, mapping]) => {
      const resolvedClub =
        mapping.mode === 'existing' && mapping.existingClubId && existingClubMap.get(mapping.existingClubId)?.name
          ? existingClubMap.get(mapping.existingClubId).name
          : mapping.newClub?.name || clubName;
      Object.entries(mapping.teams || {}).forEach(([key, team]) => {
        const status = team.import === false ? 'skipped' : team.existingTeamId ? 'existing' : 'new';
        const keys = buildTeamKeys(team.teamName, resolvedClub, team.teamSuffix);
        keys.forEach((lookupKey) => {
          map.set(lookupKey, {
            state: status,
            teamId: team.existingTeamId || null,
            clubName: resolvedClub
          });
        });
      });
    });
    return map;
  }, [scraperClubMappings, existingClubMap]);

  const resolveTeamStatus = useCallback((teamName = '', fallbackClub = '', fallbackSuffix = '') => {
    const keys = buildTeamKeys(teamName, fallbackClub, fallbackSuffix);
    for (const key of keys) {
      if (scraperTeamStatusLookup.has(key)) {
        return scraperTeamStatusLookup.get(key);
      }
    }
    for (const key of keys) {
      if (existingTeamLookup.has(key)) {
        return { state: 'existing', teamId: existingTeamLookup.get(key), clubName: fallbackClub };
      }
    }
    return { state: 'missing', teamId: null, clubName: fallbackClub };
  }, [scraperTeamStatusLookup, existingTeamLookup]);

  const scraperMatchStatus = useCallback((match) => {
    if (!match) return { recommended: false, label: '–' };
    const home = resolveTeamStatus(match.homeTeam);
    const away = resolveTeamStatus(match.awayTeam);
    if (home.state === 'missing' || away.state === 'missing') {
      return { recommended: false, label: '⚠️ Teams nicht erkannt' };
    }
    if (home.state === 'skipped' || away.state === 'skipped') {
      return { recommended: false, label: '🚫 Team-Import deaktiviert' };
    }
    if (home.state === 'new' || away.state === 'new') {
      return { recommended: true, label: '🆕 Team wird angelegt' };
    }
    return { recommended: true, label: '✅ Teams im System' };
  }, [resolveTeamStatus]);

  // ---------------------------------------------------------------------------
  // Daten laden
  // ---------------------------------------------------------------------------
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const dateLowerBound = (() => {
        switch (dateFilter) {
          case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          case 'month':
            return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
          default:
            return new Date(0).toISOString();
        }
      })();

      const [logsRes, clubsRes, playersRes, teamsRes, teamSeasonsRes, matchdaysRes] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('*')
          .gte('created_at', dateLowerBound)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('club_info').select('*').order('name', { ascending: true }),
        supabase
          .from('players_unified')
          .select('*, primary_team:team_info!players_unified_primary_team_id_fkey(id, club_name, team_name, category)')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_info')
          .select('*, club_info(id, name)')
          .order('club_name', { ascending: true }),
        supabase
          .from('team_seasons')
          .select('*, team_info(id, club_name, team_name, category)')
          .order('season', { ascending: true }),
        supabase
          .from('matchdays')
          .select('*, match_results(count)')
          .order('match_date', { ascending: true })
          .order('start_time', { ascending: true })
      ]);

      if (logsRes.error) throw logsRes.error;
      if (clubsRes.error) throw clubsRes.error;
      if (playersRes.error) throw playersRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (teamSeasonsRes.error) throw teamSeasonsRes.error;
      if (matchdaysRes.error) throw matchdaysRes.error;

      setActivityLogs(
        logsFilter === 'all'
          ? logsRes.data || []
          : (logsRes.data || []).filter((log) => log.action === logsFilter)
      );
      setClubs(clubsRes.data || []);
      setPlayers(playersRes.data || []);
      setTeams(teamsRes.data || []);
      setTeamSeasons(teamSeasonsRes.data || []);
      const matchdaysWithCounts = (matchdaysRes.data || []).map((match) => {
        const matchResultsCount =
          Array.isArray(match.match_results) && match.match_results.length
            ? match.match_results[0]?.count || 0
            : 0;
        const { match_results, ...rest } = match;
        return {
          ...rest,
          match_results_count: matchResultsCount
        };
      });
      
      // Prüfe auf Duplikate beim Laden
      const duplicateCheck = new Map();
      matchdaysWithCounts.forEach((match) => {
        const dateOnly = match.match_date ? new Date(match.match_date).toISOString().split('T')[0] : null;
        const key = `${dateOnly}|${match.home_team_id}|${match.away_team_id}`;
        if (!duplicateCheck.has(key)) {
          duplicateCheck.set(key, []);
        }
        duplicateCheck.get(key).push(match);
      });
      
      // Erstelle temporäres teamById Map für Duplikat-Erkennung
      const tempTeamById = new Map();
      (teamsRes.data || []).forEach((team) => {
        if (team?.id) {
          tempTeamById.set(team.id, team);
        }
      });
      
      // Warnung bei Duplikaten
      const duplicates = Array.from(duplicateCheck.values()).filter(matches => matches.length > 1);
      const duplicateInfo = duplicates.length > 0 ? duplicates.map(dup => {
        const first = dup[0];
        const dateStr = first.match_date ? new Date(first.match_date).toLocaleDateString('de-DE') : 'unbekannt';
        const homeTeam = tempTeamById.get(first.home_team_id);
        const awayTeam = tempTeamById.get(first.away_team_id);
        const homeLabel = homeTeam ? `${homeTeam.club_name}${homeTeam.team_name ? ` ${homeTeam.team_name}` : ''}` : 'Unbekannt';
        const awayLabel = awayTeam ? `${awayTeam.club_name}${awayTeam.team_name ? ` ${awayTeam.team_name}` : ''}` : 'Unbekannt';
        return {
          count: dup.length,
          date: dateStr,
          matchDate: first.match_date,
          homeTeam: homeLabel,
          awayTeam: awayLabel,
          ids: dup.map(m => m.id),
          matches: dup
        };
      }) : [];
      
      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLIKATE IN DATENBANK GEFUNDEN:', duplicateInfo);
        const duplicateDetails = duplicateInfo.map(dup => 
          `${dup.count}x am ${dup.date} (${dup.homeTeam} vs ${dup.awayTeam})`
        ).join('; ');
        console.warn(`⚠️ Duplikate: ${duplicateDetails}`);
      }
      
      setSeasonMatchdays(matchdaysWithCounts);
      setMatchdayDuplicates(duplicateInfo);

      const derivedStats = (() => {
        try {
          const totalClubs = clubsRes.data?.length ?? null;
          const totalPlayers = playersRes.data ?? [];
          const totalUsers = totalPlayers.filter((player) => player.user_id).length;
          const nowDate = new Date();
          const newPlayersLast7Days = totalPlayers.filter((player) => {
            if (!player.created_at) return false;
            const created = new Date(player.created_at);
            if (Number.isNaN(created.getTime())) return false;
            const diff = nowDate.getTime() - created.getTime();
            return diff <= 7 * 24 * 60 * 60 * 1000;
          }).length;
          const pendingMatches = matchdaysWithCounts.filter((match) => match.status !== 'completed').length;
          return {
            totalClubs,
            totalUsers,
            newPlayersLast7Days,
            pendingMatches
          };
        } catch (statError) {
          console.warn('⚠️ Dashboard-Statistiken konnten nicht abgeleitet werden:', statError);
          return {};
        }
      })();

      setStats(derivedStats);

      // ✅ LAZY LOADING: Lade Matches ohne Ergebnisse im Hintergrund, blockiert nicht das UI
      const loadMissingResults = async () => {
        try {
          // Prüfe ob wir kürzlich geladen haben (innerhalb der letzten 5 Minuten)
          const saved = localStorage.getItem('superAdminMatchdaysWithoutResults');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const now = Date.now();
              const savedTime = parsed.timestamp || 0;
              const fiveMinutes = 5 * 60 * 1000;
              
              // Wenn Daten weniger als 5 Minuten alt sind, verwende sie
              if (now - savedTime < fiveMinutes && parsed.data) {
                console.log(`[SuperAdminDashboard] 📦 Verwende gespeicherte fehlende Ergebnisse aus localStorage (${parsed.data.length} Matchdays, ${Math.round((now - savedTime) / 1000)}s alt)`);
                setMatchdaysWithoutResults(parsed.data);
                return; // Überspringe DB-Abfrage
              }
            } catch (e) {
              console.warn('⚠️ Fehler beim Parsen der gespeicherten Daten:', e);
            }
          }
          
          // Lade neue Daten aus der DB
          console.log('[SuperAdminDashboard] 🔄 Lade fehlende Ergebnisse aus der Datenbank...');
          const missingResults = await findMatchdaysWithoutResultsAfter4Days(supabase);
          const result = missingResults || [];
          
          // Speichere im localStorage mit Timestamp
          try {
            localStorage.setItem('superAdminMatchdaysWithoutResults', JSON.stringify({
              data: result,
              timestamp: Date.now(),
              count: result.length
            }));
            console.log(`[SuperAdminDashboard] 💾 ${result.length} fehlende Ergebnisse im localStorage gespeichert`);
          } catch (e) {
            console.warn('⚠️ Fehler beim Speichern in localStorage:', e);
          }
          
          setMatchdaysWithoutResults(result);
        } catch (error) {
          console.warn('⚠️ Fehler beim Laden der Matches ohne Ergebnisse:', error);
          setMatchdaysWithoutResults([]);
        }
      };
      
      // ✅ LAZY LOADING: Lade Matchdays ohne meeting_id im Hintergrund
      const loadMatchdaysWithoutMeetingId = async () => {
        try {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const { data: matchdaysWithoutMeetingId } = await supabase
            .from('matchdays')
            .select('id, match_date, meeting_id, source_url, source_type, group_name, match_results(count)')
            .lt('match_date', today.toISOString())
            .order('match_date', { ascending: false })
            .limit(100);
          
          // Filtere nur die ohne Detailsergebnisse
          const withoutResults = (matchdaysWithoutMeetingId || []).filter(md => {
            const resultsCount = Array.isArray(md.match_results) && md.match_results.length 
              ? md.match_results[0]?.count || 0 
              : 0;
            return resultsCount === 0;
          });
          
          // Speichere in State für Update-Funktion (nur IDs und source_url)
          setMatchdaysNeedingMeetingIdUpdate(withoutResults.map(md => ({
            id: md.id,
            match_date: md.match_date,
            meeting_id: md.meeting_id,
            source_url: md.source_url,
            source_type: md.source_type,
            group_name: md.group_name
          })));
        } catch (error) {
          console.warn('⚠️ Fehler beim Laden der Matchdays ohne meeting_id:', error);
          setMatchdaysNeedingMeetingIdUpdate([]);
        }
      };
      
      // ✅ OPTIMIERT: Verwende requestIdleCallback für bessere Performance
      // Falls nicht verfügbar, verwende setTimeout mit 0 (asynchron, blockiert nicht)
      const scheduleBackgroundLoads = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadMissingResults, { timeout: 5000 });
          requestIdleCallback(loadMatchdaysWithoutMeetingId, { timeout: 5000 });
          requestIdleCallback(loadCronJobLogs, { timeout: 5000 });
        } else {
          // Fallback: setTimeout mit 0 - läuft asynchron nach dem ersten Render
          setTimeout(loadMissingResults, 0);
          setTimeout(loadMatchdaysWithoutMeetingId, 0);
          setTimeout(loadCronJobLogs, 0);
        }
      };
      
      // Starte Hintergrund-Ladevorgänge
      scheduleBackgroundLoads();
    } catch (error) {
      console.error('❌ Fehler beim Laden des Dashboards:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, logsFilter, supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ✅ NEU: Automatischer Import-Prozess - prüft max. 1x täglich auf fehlende Ergebnisse
  useEffect(() => {
    if (!supabase) return;
    
    // Prüfe ob heute bereits ein Import durchgeführt wurde (localStorage)
    const today = new Date().toISOString().split('T')[0];
    const lastImportDate = localStorage.getItem('superAdminAutoImportLastRun');
    
    if (lastImportDate === today) {
      console.log('[SuperAdminDashboard] Auto-Import wurde heute bereits durchgeführt');
      // Lade trotzdem den letzten Status, falls vorhanden
      const lastStatus = localStorage.getItem('superAdminAutoImportStatus');
      if (lastStatus) {
        try {
          const status = JSON.parse(lastStatus);
          setAutoImportStatus({
            lastRun: status.lastRun ? new Date(status.lastRun) : null,
            isRunning: false,
            lastResult: status.lastResult || null
          });
        } catch (e) {
          console.warn('[SuperAdminDashboard] Fehler beim Laden des letzten Status:', e);
        }
      }
      return;
    }
    
    // Funktion zum Ausführen des automatischen Imports
    const runAutoImportCheck = async () => {
      if (autoImportStatus.isRunning) {
        console.log('[SuperAdminDashboard] Auto-Import läuft bereits, überspringe...');
        return;
      }
      
      setAutoImportStatus(prev => ({ ...prev, isRunning: true }));
      
      try {
        console.log('[SuperAdminDashboard] 🔄 Starte automatischen Import-Check (max. 1x täglich)...');
        const result = await runAutoImport(supabase, { 
          delayBetweenImports: 12000 // 12 Sekunden Pause zwischen Imports (10-15 Sekunden)
        });
        
        const statusUpdate = {
          lastRun: new Date(),
          isRunning: false,
          lastResult: result
        };
        
        setAutoImportStatus(statusUpdate);
        
        // Speichere Status in localStorage
        localStorage.setItem('superAdminAutoImportLastRun', today);
        localStorage.setItem('superAdminAutoImportStatus', JSON.stringify({
          lastRun: statusUpdate.lastRun.toISOString(),
          lastResult: result
        }));
        
        if (result.success > 0) {
          console.log(`[SuperAdminDashboard] ✅ ${result.success} Spieltage automatisch importiert`);
        } else if (result.total > 0) {
          console.log(`[SuperAdminDashboard] ⏭️ ${result.skipped} übersprungen, ${result.failed} fehlgeschlagen`);
        } else {
          console.log('[SuperAdminDashboard] ℹ️ Keine Spieltage zum Importieren gefunden');
        }
        
        // Lade auch die Liste der fehlenden Ergebnisse neu
        const missingResults = await findMatchdaysWithoutResultsAfter4Days(supabase);
        const missingResultsData = missingResults || [];
        
        // Speichere im localStorage mit Timestamp
        try {
          localStorage.setItem('superAdminMatchdaysWithoutResults', JSON.stringify({
            data: missingResultsData,
            timestamp: Date.now(),
            count: missingResultsData.length
          }));
          console.log(`[SuperAdminDashboard] 💾 ${missingResultsData.length} fehlende Ergebnisse im localStorage gespeichert (nach Auto-Import)`);
        } catch (e) {
          console.warn('⚠️ Fehler beim Speichern in localStorage:', e);
        }
        
        setMatchdaysWithoutResults(missingResultsData);
      } catch (error) {
        console.error('[SuperAdminDashboard] ❌ Fehler beim automatischen Import:', error);
        setAutoImportStatus(prev => ({
          ...prev,
          isRunning: false,
          lastResult: { error: error.message }
        }));
      }
    };
    
    // Führe Check nach kurzer Verzögerung durch (nur wenn heute noch nicht durchgeführt)
    const initialTimeout = setTimeout(() => {
      runAutoImportCheck();
    }, 3000); // 3 Sekunden nach Mount
    
    return () => {
      clearTimeout(initialTimeout);
    };
  }, [supabase]);

  // ---------------------------------------------------------------------------
  // Scraper-Utilities
  // ---------------------------------------------------------------------------
  const resetScraper = useCallback(() => {
    setScraperData(null);
    setScraperError('');
    setScraperSuccess('');
    setScraperClubMappings({});
    setScraperMatchSelections({});
    setScraperSelectedGroupId(null);
    setScraperSelectedMatch(null);
    setScraperImportResult(null);
  }, []);

  const handleScraperApiFetch = useCallback(async () => {
    try {
      setScraperApiLoading(true);
      setScraperError('');
      setScraperSuccess('');
      setScraperImportResult(null);
      setMatchImportResult(null);

      const sanitizedGroups = scraperApiGroups
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .join(',');

      const payload = {
        includeMatches: true
      };

      if (sanitizedGroups) {
        payload.groups = sanitizedGroups;
      }

      // ✅ NEU: Übersichts-URL unterstützen
      if (scraperApiLeagueUrl && scraperApiLeagueUrl.trim()) {
        payload.leagueUrl = scraperApiLeagueUrl.trim();
      }

      if (scraperApiApplyMode) {
        const confirmed = window.confirm(
          'Direktimport aktiv: Ergebnisse werden in Supabase geschrieben. Möchtest du fortfahren?'
        );
        if (!confirmed) {
          setScraperApiLoading(false);
          return;
        }
      }

      const response = await fetch('/api/import/scrape-nuliga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        throw new Error(
          response.ok
            ? 'Antwort des Scraper-Endpunkts konnte nicht gelesen werden.'
            : rawText || response.statusText || 'Fehler beim Abruf des Scraper-Endpunkts.'
        );
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Scraper-Endpunkt antwortete mit Status ${response.status}.`);
      }

      const details = Array.isArray(data.details) ? data.details : [];
      const groupsCount = data.groupsProcessed ?? details.length ?? 0;
      const matchesCount =
        data.totals?.matches ?? details.reduce((sum, entry) => sum + (entry.matches?.length || 0), 0);

      if (details.length > 0) {
        const nextData = {
          groups: details,
          totalGroups: groupsCount,
          totalMatches: matchesCount,
          season: data.season,
          groupsIncluded:
            data.groups?.map((entry) => entry.groupName).filter(Boolean).join(', ') ||
            details.map((entry) => entry.group?.groupName).filter(Boolean).join(', ')
        };
        setScraperData(nextData);
        setScraperClubMappings({});
        setScraperMatchSelections({});
        setScraperSelectedGroupId(null);
        setScraperSelectedMatch(null);
      }

      const summary = `${groupsCount} Gruppe${groupsCount === 1 ? '' : 'n'} · ${matchesCount} Match${
        matchesCount === 1 ? '' : 'es'
      }`;

      setScraperSuccess(
        `✅ nuLiga-Live-Daten geladen (${summary})${
          scraperApiApplyMode ? ' · Ergebnisse wurden direkt in Supabase geschrieben.' : ''
        }`
      );
    } catch (error) {
      console.error('❌ Fehler beim Live-Scrape:', error);
      setScraperError(error.message || 'Unbekannter Fehler beim nuLiga-Scraper-Endpunkt.');
    } finally {
      setScraperApiLoading(false);
    }
  }, [scraperApiApplyMode, scraperApiGroups, scraperApiLeagueUrl]);

  const ensureClubMapping = useCallback((summary) => {
    if (!summary) return null;
    return {
      selected: summary.matchStatus !== 'existing',
      mode: summary.matchStatus === 'existing' && summary.matchedClub ? 'existing' : 'new',
      existingClubId: summary.matchedClub?.id || null,
      newClub: {
        name: summary.clubName,
        city: '',
        region: '',
        federation: '',
        website: '',
        postal_code: '',
        state: '',
        bundesland: '',
        data_source: 'tvm_scraper'
      },
      teams: summary.teams.reduce((acc, team) => {
        acc[team.normalized] = {
          import: team.teamMatchStatus !== 'existing',
          teamName: team.original,
          teamSuffix: team.suffix,
          category: team.category,
          league: team.league,
          groupName: team.groupName,
          groupId: team.groupId,
          season: team.season,
          existingTeamId: team.existingTeamId || null,
          existingTeamSeasonId: team.existingTeamSeasonId || null,
          teamMatchStatus: team.teamMatchStatus || 'new'
        };
        return acc;
      }, {})
    };
  }, []);

  const updateClubMapping = useCallback((clubName, updater) => {
    setScraperClubMappings((prev) => {
      const summary = scraperClubSummaries.find((club) => club.clubName === clubName);
      if (!summary) return prev;
      const base = prev[clubName] || ensureClubMapping(summary);
      const next = typeof updater === 'function' ? updater(base) : { ...base, ...updater };
      return { ...prev, [clubName]: next };
    });
  }, [scraperClubSummaries, ensureClubMapping]);

  const updateTeamMapping = useCallback((clubName, normalizedTeam, updater) => {
    setScraperClubMappings((prev) => {
      const current = prev[clubName];
      if (!current) return prev;
      const team = current.teams?.[normalizedTeam];
      if (!team) return prev;
      const nextTeam = typeof updater === 'function' ? updater(team) : { ...team, ...updater };
      return {
        ...prev,
        [clubName]: {
          ...current,
          teams: {
            ...current.teams,
            [normalizedTeam]: nextTeam
          }
        }
      };
    });
  }, []);

  useEffect(() => {
    if (!scraperData?.groups?.length) {
      setScraperSelectedGroupId(null);
      setScraperSelectedMatch(null);
      setScraperMatchSelections({});
      return;
    }
    const firstGroupId = scraperData.groups[0].group.groupId;
    setScraperSelectedGroupId((current) =>
      scraperData.groups.some((g) => g.group.groupId === current) ? current : firstGroupId
    );
    setScraperMatchSelections((prev) => {
      const next = {};
      scraperData.groups.forEach((group) => {
        const groupId = group.group.groupId;
        const previous = prev[groupId] || {};
        const selections = {};
        (group.matches || []).forEach((match) => {
          const recommendation = scraperMatchStatus(match).recommended;
          selections[match.id] = {
            import: previous[match.id]?.import ?? recommendation,
            recommended: recommendation
          };
        });
        next[groupId] = selections;
      });
      return next;
    });
  }, [scraperData, scraperMatchStatus]);

  const ensureClubRecord = useCallback(
    async (summary) => {
      if (!summary) {
        return { clubId: null, clubRecord: null, reuseInfo: null };
      }

      const mapping = scraperClubMappings[summary.clubName] || ensureClubMapping(summary);
      let clubId = mapping.existingClubId || null;
      let clubRecord = clubId ? existingClubMap.get(clubId) : null;
      let reuseInfo = null;

      if (mapping.mode === 'existing' && clubId && !clubRecord) {
        const { data, error } = await supabase.from('club_info').select('*').eq('id', clubId).maybeSingle();
        if (error) throw error;
        clubRecord = data;
        if (clubRecord) {
          setClubs((prev) => {
            if (prev.some((club) => club.id === clubRecord.id)) return prev;
            return [clubRecord, ...prev];
          });
        }
      }

      if (mapping.mode === 'new' && !clubId) {
        const desiredName = mapping.newClub.name?.trim() || summary.clubName;
        const desiredNormalized = normalizeString(desiredName);
        const desiredNormalizedCompact = desiredNormalized.replace(/\s+/g, '');

        const findExistingByNormalized = (normalizedKey) => {
          if (!normalizedKey) return null;
          if (existingClubsByNormalizedName.has(normalizedKey)) {
            const existingCandidates = existingClubsByNormalizedName.get(normalizedKey);
            if (existingCandidates?.length) return existingCandidates[0];
          }
          return null;
        };

        const directMatch =
          findExistingByNormalized(desiredNormalized) || findExistingByNormalized(desiredNormalizedCompact);

        if (directMatch) {
          clubId = directMatch.id;
          clubRecord = directMatch;
          reuseInfo = {
            reusedExisting: true,
            reuseReason: 'normalized_name',
            similarityScore: '1.00'
          };
        } else {
          const fuzzyMatch = findExistingClubByName(desiredName);

          if (fuzzyMatch?.match && (fuzzyMatch.score >= 0.85 || fuzzyMatch.reason === 'normalized')) {
            clubId = fuzzyMatch.match.id;
            clubRecord = fuzzyMatch.match;
            reuseInfo = {
              reusedExisting: true,
              reuseReason: fuzzyMatch.reason,
              similarityScore: fuzzyMatch.score.toFixed(2)
            };
          } else {
            const payload = {
              name: desiredName,
              normalized_name: desiredNormalized,
              city: mapping.newClub.city?.trim() || null,
              region: mapping.newClub.region?.trim() || null,
              federation: mapping.newClub.federation?.trim() || null,
              website: mapping.newClub.website?.trim() || null,
              postal_code: mapping.newClub.postal_code?.trim() || null,
              state: mapping.newClub.state?.trim() || null,
              bundesland: mapping.newClub.bundesland?.trim() || null,
              data_source: mapping.newClub.data_source?.trim() || 'tvm_scraper',
              is_verified: false
            };

            const { data: createdClub, error: createError } = await supabase
              .from('club_info')
              .insert(payload, { upsert: false })
              .select()
              .maybeSingle();

            if (createError?.code === '23505') {
              const { data: existingByNormalized, error: fetchExistingError } = await supabase
                .from('club_info')
                .select('*')
                .eq('normalized_name', desiredNormalized)
                .maybeSingle();
              if (fetchExistingError) throw fetchExistingError;
              if (existingByNormalized) {
                clubId = existingByNormalized.id;
                clubRecord = existingByNormalized;
                reuseInfo = {
                  reusedExisting: true,
                  reuseReason: 'normalized_conflict',
                  similarityScore: '1.00'
                };
                setClubs((prev) => {
                  if (prev.some((club) => club.id === existingByNormalized.id)) return prev;
                  return [existingByNormalized, ...prev];
                });
              } else {
                throw createError;
              }
            } else if (createError) {
              throw createError;
            } else if (createdClub) {
              clubId = createdClub.id;
              clubRecord = createdClub;
              reuseInfo = { reusedExisting: false, reuseReason: 'created', similarityScore: null };
              setClubs((prev) => [createdClub, ...prev]);
            }
          }
        }
      }

      if (clubId) {
        updateClubMapping(summary.clubName, (current) => ({
          ...current,
          existingClubId: clubId,
          selected: true,
          mode: 'existing'
        }));
      }

      return { clubId, clubRecord, reuseInfo };
    },
    [
      scraperClubMappings,
      ensureClubMapping,
      existingClubMap,
      existingClubsByNormalizedName,
      findExistingClubByName,
      setClubs,
      updateClubMapping,
      supabase
    ]
  );

  const createTeamForSummary = useCallback(
    async (summary, team) => {
      const { clubId, clubRecord } = await ensureClubRecord(summary);
      if (!clubId) {
        throw new Error(`Verein "${summary.clubName}" konnte nicht erstellt oder gefunden werden.`);
      }

      const mapping = scraperClubMappings[summary.clubName] || ensureClubMapping(summary);
      const teamMapping = mapping.teams?.[team.normalized] || {};
      const preferredTeamName = teamMapping.teamName || team.original;
      const preferredSuffix = teamMapping.teamSuffix || team.suffix || '';
      // WICHTIG: Kategorie aus Team, TeamMapping, Summary oder Group-Kontext nehmen
      const category = teamMapping.category || team.category || summary.categories?.[0] || null;
      const region = clubRecord?.region || mapping.newClub?.region || null;

      const teamNamePayload = preferredSuffix || preferredTeamName || team.original;

      // WICHTIG: Prüfe ZUERST ob Team bereits existiert (mit Kategorie-Prüfung!)
      if (category && teamNamePayload) {
        const { data: existingTeam, error: checkError } = await supabase
          .from('team_info')
          .select('id, club_name, team_name, category')
          .eq('club_id', clubId)
          .eq('team_name', teamNamePayload)
          .eq('category', category)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.warn('⚠️ Fehler beim Prüfen auf existierendes Team:', checkError);
        }
        
        if (existingTeam) {
          console.log(`ℹ️ Team existiert bereits (ID: ${existingTeam.id}): ${existingTeam.club_name} ${existingTeam.team_name} (${existingTeam.category})`);
          setTeams((prev) => {
            if (prev.some(t => t.id === existingTeam.id)) return prev;
            return [existingTeam, ...prev];
          });
          updateTeamMapping(summary.clubName, team.normalized, (current) => ({
            ...current,
            existingTeamId: existingTeam.id,
            import: true
          }));
          return existingTeam;
        }
        
        // Prüfe auch ob Team mit gleichem Namen aber ANDERER Kategorie existiert
        const { data: conflictingTeam } = await supabase
          .from('team_info')
          .select('id, club_name, team_name, category')
          .eq('club_id', clubId)
          .eq('team_name', teamNamePayload)
          .neq('category', category)
          .maybeSingle();
        
        if (conflictingTeam) {
          console.warn(`⚠️ Team "${conflictingTeam.club_name} ${conflictingTeam.team_name}" existiert bereits mit Kategorie "${conflictingTeam.category}", aber erwartet wird "${category}". Erstelle neues Team.`);
        }
      }

      const payload = {
        club_id: clubId,
        club_name: clubRecord?.name || summary.clubName,
        team_name: teamNamePayload,
        category,
        region
      };

      const { data: createdTeam, error: teamError } = await supabase.from('team_info').insert(payload).select().single();
      if (teamError) {
        // Wenn Unique Constraint verletzt, versuche das bestehende Team zu finden
        if (teamError.code === '23505' && category && teamNamePayload) {
          const { data: existingTeam } = await supabase
            .from('team_info')
            .select('id, club_name, team_name, category')
            .eq('club_id', clubId)
            .eq('team_name', teamNamePayload)
            .eq('category', category)
            .maybeSingle();
          
          if (existingTeam) {
            console.log(`ℹ️ Team existiert bereits (Unique Constraint): ${existingTeam.club_name} ${existingTeam.team_name} (${existingTeam.category})`);
            setTeams((prev) => {
              if (prev.some(t => t.id === existingTeam.id)) return prev;
              return [existingTeam, ...prev];
            });
            updateTeamMapping(summary.clubName, team.normalized, (current) => ({
              ...current,
              existingTeamId: existingTeam.id,
              import: true
            }));
            return existingTeam;
          }
        }
        throw teamError;
      }

      setTeams((prev) => [createdTeam, ...prev]);
      updateTeamMapping(summary.clubName, team.normalized, (current) => ({
        ...current,
        existingTeamId: createdTeam.id,
        import: true
      }));

      const inferredTeamSize = inferTeamSize(preferredTeamName);

      await ensureTeamSeason(
        createdTeam.id,
        team.season || scraperData?.season || null,
        team.league || summary.leagues?.[0] || null,
        team.groupName || summary.groups?.[0] || null,
        inferredTeamSize
      );

      return createdTeam;
    },
    [
      ensureClubRecord,
      scraperClubMappings,
      ensureClubMapping,
      supabase,
      updateTeamMapping,
      ensureTeamSeason,
      setTeams,
      scraperData
    ]
  );

  const handleScraperImport = useCallback(async () => {
    if (!scraperData) return;

    setScraperImportResult(null);
    setMatchImportResult(null);
    setScraperImporting(true);
    setMatchImporting(true);

    try {
      const teamIdRegistry = new Map();
      const clubIssues = [];
      const matchIssues = [];
      const scoreWithoutResults = [];

      const registerTeamId = (teamName, clubName, suffix, teamId) => {
        if (!teamId) return;
        const keys = buildTeamKeys(teamName, clubName, suffix);
        keys.forEach((key) => {
          if (key) teamIdRegistry.set(key, teamId);
        });
      };

      for (const summary of scraperClubSummaries) {
        const mapping = scraperClubMappings[summary.clubName] || ensureClubMapping(summary);
        if (!mapping) continue;

        // AUTOMATISCHES CLUB-ERSTELLEN: Wenn Club nicht gemappt ist, erstelle ihn automatisch
        let linkedClubId = mapping.existingClubId;
        if (!linkedClubId) {
          console.log(`🔄 Automatisches Erstellen von Club: ${summary.clubName}`);
          try {
            const { clubId } = await ensureClubRecord(summary);
            if (clubId) {
              linkedClubId = clubId;
              console.log(`✅ Club automatisch erstellt: ${summary.clubName} (ID: ${clubId})`);
            } else {
              clubIssues.push({ type: 'club-creation-failed', clubName: summary.clubName });
              console.error(`❌ Fehler beim automatischen Erstellen von Club: ${summary.clubName}`);
              continue;
            }
          } catch (clubError) {
            clubIssues.push({ type: 'club-creation-error', clubName: summary.clubName, error: clubError.message });
            console.error(`❌ Fehler beim automatischen Erstellen von Club: ${summary.clubName}`, clubError);
            continue;
          }
        }

        const resolvedClubName =
          existingClubMap.get(linkedClubId)?.name || mapping.newClub?.name || summary.clubName;

        for (const team of summary.teams) {
          const teamMapping = mapping.teams?.[team.normalized];
          if (teamMapping?.import === false) continue;

          const preferredTeamName = teamMapping?.teamName || team.original;
          const preferredSuffix = teamMapping?.teamSuffix || team.suffix || '';

          let resolvedTeamId = teamMapping?.existingTeamId || null;

          // AUTOMATISCHES TEAM-ERSTELLEN: Wenn Team nicht gefunden wird, erstelle es automatisch
          if (!resolvedTeamId) {
            const statusProbe = resolveTeamStatus(team.original, resolvedClubName, team.suffix);
            if (statusProbe?.teamId) {
              resolvedTeamId = statusProbe.teamId;
              updateTeamMapping(summary.clubName, team.normalized, (current) => ({
                ...current,
                existingTeamId: resolvedTeamId
              }));
            } else {
              const keys = buildTeamKeys(team.original, resolvedClubName, team.suffix);
              let found = false;
              for (const key of keys) {
                if (existingTeamLookup.has(key)) {
                  resolvedTeamId = existingTeamLookup.get(key);
                  updateTeamMapping(summary.clubName, team.normalized, (current) => ({
                    ...current,
                    existingTeamId: resolvedTeamId
                  }));
                  found = true;
                  break;
                }
              }
              
              // Wenn Team nicht gefunden wurde, erstelle es automatisch
              if (!found) {
                console.log(`🔄 Automatisches Erstellen von Team: ${summary.clubName} ${team.original}`);
                try {
                  const createdTeam = await createTeamForSummary(summary, team);
                  if (createdTeam?.id) {
                    resolvedTeamId = createdTeam.id;
                    console.log(`✅ Team automatisch erstellt: ${summary.clubName} ${team.original} (ID: ${resolvedTeamId})`);
                    // Aktualisiere Lookups
                    const keys = buildTeamKeys(team.original, resolvedClubName, team.suffix);
                    keys.forEach((key) => {
                      if (key) existingTeamLookup.set(key, resolvedTeamId);
                    });
                    teamById.set(resolvedTeamId, createdTeam);
                  }
                } catch (teamError) {
                  console.error(`❌ Fehler beim automatischen Erstellen von Team: ${summary.clubName} ${team.original}`, teamError);
                  // Weiter mit nächstem Team, aber markiere als fehlend
                }
              }
            }
          }

          if (resolvedTeamId) {
            registerTeamId(preferredTeamName, resolvedClubName, preferredSuffix, resolvedTeamId);
            
            // Stelle sicher, dass team_season existiert (auch für bestehende Teams)
            if (!teamMapping?.existingTeamSeasonId) {
              try {
                const seasonRecord = await ensureTeamSeason(
                  resolvedTeamId,
                  team.season || scraperData?.season || null,
                  team.league || summary.leagues?.[0] || null,
                  team.groupName || summary.groups?.[0] || null,
                  inferTeamSize(preferredTeamName)
                );
                if (seasonRecord) {
                console.log(`✅ Team-Season erstellt/aktualisiert für Team-ID ${resolvedTeamId}`);
                } else {
                  // Eintrag existiert bereits (409 Conflict wurde abgefangen)
                  console.log(`ℹ️ Team-Season existiert bereits für Team-ID ${resolvedTeamId}`);
                }
              } catch (seasonError) {
                // Ignoriere 409 Conflict Fehler (Duplikat) - das ist kein Problem
                if (seasonError?.code === '23505' || seasonError?.message?.includes('409') || seasonError?.message?.includes('Conflict')) {
                  console.log(`ℹ️ Team-Season existiert bereits für Team-ID ${resolvedTeamId} (409 Conflict - kein Problem)`);
                } else {
                console.warn(`⚠️ Fehler beim Erstellen der Team-Season für Team-ID ${resolvedTeamId}:`, seasonError);
                }
              }
            }
          }
        }
      }

      const getTeamIdForMatch = async (teamName, groupCategory = null) => {
        if (!teamName) return { teamId: null, clubName: '' };
        
        // WICHTIG: Kategorie aus dem Group-Kontext verwenden
        const expectedCategory = groupCategory || group.group?.category || null;
        
        // Strategie 1: Direkter Match im Registry
        const normalizedName = normalizeString(teamName);
        if (teamIdRegistry.has(normalizedName)) {
          return { teamId: teamIdRegistry.get(normalizedName), clubName: '' };
        }

        // Strategie 2: Suche in scraperClubSummaries (mit Kategorie-Prüfung)
        for (const summary of scraperClubSummaries) {
          for (const team of summary.teams) {
            const fullName = `${summary.clubName} ${team.original}`.trim();
            if (normalizeString(fullName) === normalizedName || normalizeString(team.original) === normalizedName) {
              // WICHTIG: Prüfe Kategorie-Übereinstimmung
              const teamCategory = team.category || summary.categories?.[0] || null;
              if (expectedCategory && teamCategory && 
                  normalizeString(teamCategory) !== normalizeString(expectedCategory)) {
                continue; // Kategorie stimmt nicht überein, überspringe
              }
              
              if (team.existingTeamId) {
                console.log(`✅ Match-Import: "${teamName}" → Team-ID ${team.existingTeamId} (Kategorie: ${teamCategory || 'unbekannt'})`);
                teamIdRegistry.set(normalizedName, team.existingTeamId);
                return { teamId: team.existingTeamId, clubName: summary.clubName };
              }
            }
          }
        }

        // Strategie 3: Exakte Suche via splitTeamLabel (mit Team-Nummer + Kategorie)
        const { clubName, suffix } = splitTeamLabel(teamName || '');
        
        // WICHTIG: Suche zuerst nach exaktem Match (Club + Team-Nummer + Kategorie)
        if (clubName && suffix) {
          const exactKey = normalizeString(`${clubName} ${suffix}`);
          const categoryKey = expectedCategory ? `::${normalizeString(expectedCategory)}` : '';
          const fullKey = `${exactKey}${categoryKey}`;
          
          if (existingTeamLookup.has(fullKey)) {
            const teamId = existingTeamLookup.get(fullKey);
            console.log(`✅ Match-Import (Exakt mit Kategorie): "${teamName}" → Team-ID ${teamId} (Kategorie: ${expectedCategory})`);
            teamIdRegistry.set(normalizedName, teamId);
            return { teamId, clubName: clubName || '' };
          }
          
          // Fallback: Ohne Kategorie (nur wenn keine Kategorie erwartet wird)
          if (!expectedCategory && existingTeamLookup.has(exactKey)) {
            const teamId = existingTeamLookup.get(exactKey);
            const matchedTeam = teamById.get(teamId);
            // Prüfe ob das gefundene Team eine Kategorie hat - wenn ja, nicht verwenden
            if (!matchedTeam?.category) {
              console.log(`✅ Match-Import (Exakt ohne Kategorie): "${teamName}" → Team-ID ${teamId}`);
              teamIdRegistry.set(normalizedName, teamId);
              return { teamId, clubName: clubName || '' };
            }
          }
        }
        
        // Strategie 4: Fallback mit allen Keys (nur wenn exakte Suche fehlschlägt)
        const keys = buildTeamKeys(teamName, clubName, suffix);
        // Entferne den Club-only Key, um falsche Matches zu vermeiden
        const filteredKeys = keys.filter(key => {
          const normalizedClub = normalizeString(clubName || '');
          return key !== normalizedClub; // Ignoriere reine Club-Namen
        });

        for (const key of filteredKeys) {
          const categoryKey = expectedCategory ? `::${normalizeString(expectedCategory)}` : '';
          const fullKey = `${key}${categoryKey}`;
          
          if (existingTeamLookup.has(fullKey)) {
            const teamId = existingTeamLookup.get(fullKey);
            const matchedTeam = teamById.get(teamId);
            if (matchedTeam) {
              const matchedClubNormalized = normalizeString(matchedTeam.club_name || '');
              const matchedSuffixNormalized = normalizeString(matchedTeam.team_name || '');
              const matchedCategoryNormalized = normalizeString(matchedTeam.category || '');
              const searchClubNormalized = normalizeString(clubName || '');
              const searchSuffixNormalized = normalizeString(suffix || '');
              const searchCategoryNormalized = expectedCategory ? normalizeString(expectedCategory) : '';
              
              // WICHTIG: Prüfe Club, Team-Nummer UND Kategorie
              const clubMatch = matchedClubNormalized === searchClubNormalized;
              const suffixMatch = searchSuffixNormalized === '' || matchedSuffixNormalized === searchSuffixNormalized;
              const categoryMatch = !searchCategoryNormalized || matchedCategoryNormalized === searchCategoryNormalized;
              
              if (clubMatch && suffixMatch && categoryMatch) {
                console.log(`✅ Match-Import (Fallback validiert): "${teamName}" → Team-ID ${teamId} (Kategorie: ${matchedTeam.category || 'unbekannt'})`);
            teamIdRegistry.set(normalizedName, teamId);
            return { teamId, clubName: clubName || '' };
              }
            }
          }
        }

        // Strategie 5: Direkte Datenbank-Suche (mit Kategorie-Filter)
        if (clubName) {
          try {
            // Suche nach Club-Namen (case-insensitive)
            const { data: clubs, error: clubError } = await supabase
              .from('club_info')
              .select('id, name')
              .ilike('name', `%${clubName}%`)
              .limit(5);
            
            if (!clubError && clubs && clubs.length > 0) {
              // Für jeden gefundenen Club: Suche nach Team (MIT KATEGORIE!)
              for (const club of clubs) {
                let teamsQuery = supabase
                  .from('team_info')
                  .select('id, club_name, team_name, category')
                  .eq('club_id', club.id);
                
                // WICHTIG: Filtere nach Kategorie, wenn erwartet
                if (expectedCategory) {
                  teamsQuery = teamsQuery.eq('category', expectedCategory);
                }
                
                const { data: teams, error: teamError } = await teamsQuery.limit(10);
                
                if (!teamError && teams) {
                  // Prüfe ob Team-Name übereinstimmt
                  for (const team of teams) {
                    const teamLabel = `${team.club_name} ${team.team_name || ''}`.trim();
                    const normalizedTeamLabel = normalizeString(teamLabel);
                    
                    // Prüfe verschiedene Varianten
                    if (normalizedTeamLabel === normalizedName ||
                        normalizeString(`${club.name} ${suffix || ''}`.trim()) === normalizedTeamLabel ||
                        (suffix && normalizeString(team.team_name || '') === normalizeString(suffix))) {
                      // Zusätzliche Kategorie-Prüfung
                      if (expectedCategory && team.category && 
                          normalizeString(team.category) !== normalizeString(expectedCategory)) {
                        continue; // Kategorie stimmt nicht, überspringe
                      }
                      
                      console.log(`✅ Match-Import (DB-Suche mit Kategorie): "${teamName}" → Team-ID ${team.id} (Kategorie: ${team.category || 'unbekannt'})`);
                      teamIdRegistry.set(normalizedName, team.id);
                      return { teamId: team.id, clubName: team.club_name || club.name };
                    }
                  }
                }
              }
            }
          } catch (dbError) {
            console.warn(`⚠️ Fehler bei DB-Suche für "${teamName}":`, dbError);
          }
        }

        console.error(`❌ Match-Import: Kein Team gefunden für "${teamName}" (erwartete Kategorie: ${expectedCategory || 'unbekannt'})`);
        return { teamId: null, clubName: clubName || '' };
      };

      let totalMatchesInserted = 0;
      let totalMatchesUpdated = 0;
      let totalMatchesSkipped = 0;

      for (const group of scraperData.groups || []) {
        const groupId = group.group?.groupId;
        const selections = scraperMatchSelections[groupId] || {};

        for (const match of group.matches || []) {
          const selection = selections[match.id];
          // IMPORTIERE ALLE MATCHES STANDARDMÄSSIG (außer sie wurden explizit deaktiviert)
          const shouldImport =
            selection !== undefined ? selection.import !== false : true;
          if (!shouldImport) continue;

          const matchDateIso = match.matchDateIso ? new Date(match.matchDateIso).toISOString() : null;
          if (!matchDateIso) {
            matchIssues.push({ type: 'missing-date', matchId: match.id });
            totalMatchesSkipped += 1;
            continue;
          }

          const matchSeason = match.season || group.group?.season || scraperData.season || null;
          const matchLeague = match.league || group.group?.league || null;
          const matchGroupName = match.groupName || group.group?.groupName || null;
          const matchNumber = match.matchNumber || match.match_number || null;
          
          // WICHTIG: Prüfe ZUERST ob das Match bereits existiert (z.B. per Match-Nummer)
          // Das verhindert, dass ein neues Placeholder-Match erstellt wird, wenn das Match bereits existiert
          let existingMatchByNumber = null;
          if (matchNumber) {
            const matchDateOnly = matchDateIso ? new Date(matchDateIso).toISOString().split('T')[0] : null;
            const { data: existingByNumber } = await supabase
              .from('matchdays')
              .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_results(count), match_date, notes')
              .eq('match_number', matchNumber)
              .limit(1)
              .maybeSingle();
            
            if (existingByNumber) {
              existingMatchByNumber = existingByNumber;
              console.log(`✅ Bestehendes Match gefunden (Match-Nummer ${matchNumber}): ID ${existingByNumber.id}`);
            }
          }

          // WICHTIG: Kategorie aus Group-Kontext verwenden
          const groupCategory = group.group?.category || match.category || null;
          const homeLookup = await getTeamIdForMatch(match.homeTeam, groupCategory);
          const awayLookup = await getTeamIdForMatch(match.awayTeam, groupCategory);

          // WICHTIG: Wenn Teams fehlen, markiere als "fehlend" aber überspringe NICHT
          // Das Match wird später manuell ergänzt werden können
          // ABER: Wenn das Match bereits existiert, aktualisiere es statt ein neues zu erstellen
          if (!homeLookup.teamId || !awayLookup.teamId) {
            // Wenn Match bereits existiert, aktualisiere es (auch ohne Teams)
            if (existingMatchByNumber) {
              console.log(`⚠️ Match ${matchNumber} existiert bereits, aber Teams fehlen. Wird übersprungen (kann manuell korrigiert werden).`);
            matchIssues.push({
                type: 'missing-team-existing-match',
                matchId: existingMatchByNumber.id,
                matchNumber: matchNumber,
              homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homeTeamFound: !!homeLookup.teamId,
                awayTeamFound: !!awayLookup.teamId
            });
            totalMatchesSkipped += 1;
              continue; // Überspringe, da Match bereits existiert
            }
            matchIssues.push({
              type: 'missing-team',
              matchId: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              homeTeamFound: !!homeLookup.teamId,
              awayTeamFound: !!awayLookup.teamId,
              homeClubName: homeLookup.clubName,
              awayClubName: awayLookup.clubName,
              matchDate: match.matchDateIso,
              matchNumber: match.matchNumber || match.match_number,
              groupName: matchGroupName,
              league: matchLeague,
              season: matchSeason
            });
            // NICHT überspringen - das Match wird als "fehlend" markiert und kann später ergänzt werden
            // totalMatchesSkipped += 1;
            // continue;
            
            // Erstelle einen "virtuellen" Matchday-Eintrag mit NULL-Teams, damit er sichtbar bleibt
            // Dieser kann später manuell korrigiert werden
            console.warn(`⚠️ Match mit fehlenden Teams wird als "fehlend" markiert: ${match.homeTeam} vs ${match.awayTeam}`);
            
            // Versuche trotzdem das Match zu speichern, aber mit NULL-Teams
            // Das ermöglicht es, das Match später zu korrigieren
          const matchDateIso = match.matchDateIso ? new Date(match.matchDateIso).toISOString() : null;
          if (!matchDateIso) {
            matchIssues.push({ type: 'missing-date', matchId: match.id });
            totalMatchesSkipped += 1;
            continue;
          }

            // Speichere Match mit NULL-Teams als "placeholder"
            const placeholderPayload = {
              match_date: matchDateIso,
              start_time: normalizeStartTime(match.startTime),
              match_number: match.matchNumber || match.match_number || null,
              home_team_id: null, // NULL = fehlend
              away_team_id: null, // NULL = fehlend
              venue: match.venue || null,
              court_number: toIntegerOrNull(match.court_number),
              court_number_end: toIntegerOrNull(match.court_number_end),
              location: 'Home',
              season: matchSeason,
              year: deriveYearLabel(matchSeason, match.year),
              league: matchLeague,
              group_name: matchGroupName,
              status: 'scheduled', // Als "scheduled" markieren, da Teams fehlen
              home_score: null,
              away_score: null,
              final_score: null,
              notes: `⚠️ FEHLENDE TEAMS: ${match.homeTeam} vs ${match.awayTeam}. Bitte manuell ergänzen.`
            };
            
            try {
              const { data: placeholderMatch, error: placeholderError } = await supabase
                .from('matchdays')
                .insert(placeholderPayload)
                .select()
                .maybeSingle();
              
              if (placeholderError && placeholderError.code !== '23505') {
                console.error('❌ Fehler beim Erstellen des Placeholder-Matchdays:', placeholderError);
                totalMatchesSkipped += 1;
              } else if (placeholderMatch) {
                console.log(`✅ Placeholder-Matchday erstellt (ID: ${placeholderMatch.id}) für manuelle Korrektur`);
                totalMatchesInserted += 1;
              }
            } catch (placeholderErr) {
              console.error('❌ Fehler beim Erstellen des Placeholder-Matchdays:', placeholderErr);
              totalMatchesSkipped += 1;
            }
            
            continue; // Weiter zum nächsten Match
          }
          const matchStatus =
            match.status === 'completed'
              ? 'completed'
              : match.status === 'cancelled'
                ? 'cancelled'
                : 'scheduled';
          const homeScore = extractScoreValue(match.matchPoints, 'home');
          const awayScore = extractScoreValue(match.matchPoints, 'away');
          const finalScore =
            matchStatus === 'completed'
              ? match.matchPoints?.raw ||
                (homeScore != null && awayScore != null ? `${homeScore}:${awayScore}` : null)
              : null;

          const noteParts = [];
          if (match.notes) noteParts.push(match.notes);
          if (match.meetingId) noteParts.push(`meeting#${match.meetingId}`);
          if (match.meetingReportUrl) noteParts.push(match.meetingReportUrl);

          const matchPayload = {
            match_date: matchDateIso,
            start_time: normalizeStartTime(match.startTime),
          match_number: match.matchNumber || match.match_number || null,
            home_team_id: homeLookup.teamId,
            away_team_id: awayLookup.teamId,
            venue: match.venue || null,
            court_number: toIntegerOrNull(match.court_number),
            court_number_end: toIntegerOrNull(match.court_number_end),
            location: 'Home',
            season: matchSeason,
            year: deriveYearLabel(matchSeason, match.year),
            league: matchLeague,
            group_name: matchGroupName,
            status: matchStatus,
            home_score: matchStatus === 'completed' ? homeScore : null,
            away_score: matchStatus === 'completed' ? awayScore : null,
            final_score: finalScore,
            notes: noteParts.length ? noteParts.join(' · ') : null
          };

        // Verbesserte Duplikat-Prüfung: Normalisiere Datum (nur Tag, ohne Zeit)
        const matchDateOnly = matchPayload.match_date ? new Date(matchPayload.match_date).toISOString().split('T')[0] : null;
        
        // WICHTIG: Prüfe ZUERST nach match_number (Unique Constraint!)
        // Wenn match_number vorhanden ist, muss es eindeutig sein
        let existingMatches = null;
        let fetchExisting = null;
        
        if (matchPayload.match_number) {
          const resultByNumber = await supabase
            .from('matchdays')
            .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_results(count), match_date, notes')
            .eq('match_number', matchPayload.match_number)
            .limit(10);
          
          if (resultByNumber.data && resultByNumber.data.length > 0) {
            existingMatches = resultByNumber.data;
            fetchExisting = resultByNumber.error;
            console.log(`✅ Match mit Nummer ${matchPayload.match_number} bereits gefunden: ${existingMatches.length} Eintrag(e)`);
          }
        }
        
        // Wenn kein Match per match_number gefunden, suche nach Datum + Teams
        if (!existingMatches || existingMatches.length === 0) {
          if (matchPayload.home_team_id && matchPayload.away_team_id) {
            // Normale Suche: Beide Teams vorhanden
            const result = await supabase
              .from('matchdays')
              .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_results(count), match_date')
            .eq('home_team_id', matchPayload.home_team_id)
            .eq('away_team_id', matchPayload.away_team_id)
              .gte('match_date', matchDateOnly ? `${matchDateOnly}T00:00:00` : null)
              .lt('match_date', matchDateOnly ? `${matchDateOnly}T23:59:59` : null);
            existingMatches = result.data;
            fetchExisting = result.error;
          }
        }
        
        // Zusätzlich: Suche nach Placeholder-Matches (NULL-Teams) mit gleichem Datum und Match-Nummer
        if (matchPayload.match_number && (!existingMatches || existingMatches.length === 0)) {
          const resultPlaceholder = await supabase
            .from('matchdays')
            .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_results(count), match_date, notes')
            .is('home_team_id', null)
            .is('away_team_id', null)
            .eq('match_number', matchPayload.match_number)
            .gte('match_date', matchDateOnly ? `${matchDateOnly}T00:00:00` : null)
            .lt('match_date', matchDateOnly ? `${matchDateOnly}T23:59:59` : null);
          if (resultPlaceholder.data && resultPlaceholder.data.length > 0) {
            existingMatches = resultPlaceholder.data;
            fetchExisting = resultPlaceholder.error;
          }
        }

          if (fetchExisting && fetchExisting.code && fetchExisting.code !== 'PGRST116') {
            throw fetchExisting;
          }

          // Prüfe ob es ein Duplikat gibt
          // WICHTIG: Wenn per match_number gefunden, nimm das erste Match
          // Wenn per Teams gefunden, nimm das beste Match (meiste match_results, neuestes Datum)
          let existingMatch = null;
          if (existingMatches && existingMatches.length > 0) {
            if (matchPayload.match_number) {
              // Wenn per match_number gefunden, nimm das erste (sollte nur eins sein)
              existingMatch = existingMatches[0];
            } else {
              // Wenn per Teams gefunden, wähle das beste Match
              existingMatch = existingMatches.sort((a, b) => {
                const aResults = Array.isArray(a.match_results) && a.match_results.length ? a.match_results[0]?.count || 0 : 0;
                const bResults = Array.isArray(b.match_results) && b.match_results.length ? b.match_results[0]?.count || 0 : 0;
                if (bResults !== aResults) return bResults - aResults;
                if (a.match_number && !b.match_number) return -1;
                if (!a.match_number && b.match_number) return 1;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
              })[0];
            }
          }
          
          // Warnung wenn mehrere Matches gefunden wurden (Duplikate!)
          if (existingMatches && existingMatches.length > 1) {
            console.warn(`⚠️ DUPLIKAT ERKANNT: ${existingMatches.length} Matches gefunden für ${match.homeTeam} vs ${match.awayTeam} am ${matchDateOnly} (Match-Nr: ${matchPayload.match_number || 'keine'})`);
            matchIssues.push({
              type: 'duplicate-detected',
              matchId: existingMatches.map(m => m.id).join(', '),
              count: existingMatches.length,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              matchDate: matchDateOnly,
              matchNumber: matchPayload.match_number
            });
          }

        if (existingMatch) {
          const existingHome = existingMatch.home_score;
          const existingAway = existingMatch.away_score;
          
          // Prüfe ob es ein Placeholder-Match ist (NULL-Teams)
          const isPlaceholder = !existingMatch.home_team_id || !existingMatch.away_team_id;
          const hasTeams = matchPayload.home_team_id && matchPayload.away_team_id;

          // WICHTIG: Wenn match_number bereits existiert und das Match NICHT das gleiche ist, überspringe
          // (verhindert Unique Constraint Verletzung)
          if (matchPayload.match_number && 
              existingMatch.match_number && 
              String(matchPayload.match_number) === String(existingMatch.match_number) &&
              existingMatch.id !== match.id) {
            console.log(`ℹ️ Match mit Nummer ${matchPayload.match_number} existiert bereits (ID: ${existingMatch.id}). Überspringe Import.`);
            totalMatchesSkipped += 1;
            continue;
          }

          const hasNewScore =
            matchPayload.home_score != null &&
            matchPayload.away_score != null &&
            (existingHome == null ||
              existingAway == null ||
              existingHome !== matchPayload.home_score ||
              existingAway !== matchPayload.away_score);

          // WICHTIG: Prüfe ob match_number Update sicher ist (nur wenn keine andere match_number existiert)
          let needsMatchNumberUpdate = false;
          if (matchPayload.match_number != null &&
              String(matchPayload.match_number) !== String(existingMatch.match_number ?? '')) {
            // Prüfe ob die neue match_number bereits von einem anderen Match verwendet wird
            const { data: conflictCheck } = await supabase
              .from('matchdays')
              .select('id')
              .eq('match_number', matchPayload.match_number)
              .neq('id', existingMatch.id)
              .limit(1)
              .maybeSingle();
            
            if (conflictCheck) {
              console.log(`⚠️ Match-Nummer ${matchPayload.match_number} wird bereits von Match ${conflictCheck.id} verwendet. Überspringe Update.`);
              needsMatchNumberUpdate = false;
            } else {
              needsMatchNumberUpdate = true;
            }
          }

          // WICHTIG: Wenn Placeholder-Match und Teams jetzt vorhanden sind, aktualisiere die Teams
          const needsTeamUpdate = isPlaceholder && hasTeams && (
            existingMatch.home_team_id !== matchPayload.home_team_id ||
            existingMatch.away_team_id !== matchPayload.away_team_id
          );

          const shouldUpdate = hasNewScore || needsMatchNumberUpdate || needsTeamUpdate;

          if (shouldUpdate) {
            const updatePayload = {
              status: matchPayload.status
            };

            // WICHTIG: Wenn Placeholder-Match, aktualisiere die Teams
            if (needsTeamUpdate) {
              updatePayload.home_team_id = matchPayload.home_team_id;
              updatePayload.away_team_id = matchPayload.away_team_id;
              // Entferne Placeholder-Hinweis aus notes
              if (existingMatch.notes && existingMatch.notes.includes('⚠️ FEHLENDE TEAMS')) {
                updatePayload.notes = matchPayload.notes || existingMatch.notes.replace(/⚠️ FEHLENDE TEAMS:.*?\. Bitte manuell ergänzen\./g, '').trim();
              }
              console.log(`✅ Placeholder-Matchday aktualisiert: Teams zugewiesen (${matchPayload.home_team_id}, ${matchPayload.away_team_id})`);
            }

            if (hasNewScore) {
              updatePayload.home_score = matchPayload.home_score;
              updatePayload.away_score = matchPayload.away_score;
              updatePayload.final_score = matchPayload.final_score;
            }

            if (needsMatchNumberUpdate) {
              updatePayload.match_number = matchPayload.match_number;
            }

            const { error: updateError } = await supabase
              .from('matchdays')
              .update(updatePayload)
              .eq('id', existingMatch.id);

            if (updateError) throw updateError;

            if (hasNewScore) {
              totalMatchesUpdated += 1;

              const { data: resultsData, error: resultsError } = await supabase
                .from('match_results')
                .select('id')
                .eq('matchday_id', existingMatch.id)
                .limit(1);

              if (resultsError) {
                console.warn('⚠️ Fehler beim Prüfen der Match-Results:', resultsError);
              } else if (!resultsData || resultsData.length === 0) {
                // Versuche automatisch match_results zu importieren, wenn meetingId vorhanden ist
                const meetingId = match.meetingId || match.meeting_id || extractMeetingMeta(match).meetingId;
                if (meetingId && matchStatus === 'completed') {
                  try {
                    console.log(`🔄 Automatischer Import der match_results für Matchday ${existingMatch.id} (meetingId: ${meetingId})`);
                    const homeTeamLabel = buildTeamLabel(teamById.get(existingMatch.home_team_id));
                    const awayTeamLabel = buildTeamLabel(teamById.get(existingMatch.away_team_id));
                    
                    const meetingResponse = await fetch('/api/import/meeting-report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        matchdayId: existingMatch.id,
                        meetingId: meetingId,
                        groupId: resolveGroupId(matchGroupName),
                        matchNumber: matchPayload.match_number || existingMatch.match_number,
                        matchDate: matchDateIso,
                        homeTeam: homeTeamLabel,
                        awayTeam: awayTeamLabel,
                        apply: true
                      })
                    });

                    const meetingRaw = await meetingResponse.text();
                    let meetingResult = null;
                    if (meetingRaw) {
                      try {
                        meetingResult = JSON.parse(meetingRaw);
                      } catch (parseError) {
                        console.warn('⚠️ Meeting-Report Antwort konnte nicht geparst werden:', parseError);
                      }
                    }

                    if (meetingResponse.ok && meetingResult?.success) {
                      const insertedCount = meetingResult.applyResult?.inserted?.length || 0;
                      console.log(`✅ match_results importiert: ${insertedCount} Einträge für Matchday ${existingMatch.id}`);
                    } else {
                      const errorMsg = meetingResult?.error || meetingRaw || 'Unbekannter Fehler';
                      console.warn(`⚠️ Automatischer match_results Import fehlgeschlagen für Matchday ${existingMatch.id}:`, errorMsg);
                scoreWithoutResults.push({
                  matchId: existingMatch.id,
                  home: match.homeTeam,
                  away: match.awayTeam,
                  score: matchPayload.final_score || `${matchPayload.home_score}:${matchPayload.away_score}`
                });
                      matchIssues.push({
                        type: 'meeting-import-failed',
                        matchId: existingMatch.id,
                        meetingId: meetingId,
                        error: errorMsg
                      });
                    }
                  } catch (meetingError) {
                    console.warn(`⚠️ Fehler beim automatischen match_results Import für Matchday ${existingMatch.id}:`, meetingError);
                    scoreWithoutResults.push({
                      matchId: existingMatch.id,
                      home: match.homeTeam,
                      away: match.awayTeam,
                      score: matchPayload.final_score || `${matchPayload.home_score}:${matchPayload.away_score}`
                    });
                    matchIssues.push({
                      type: 'meeting-import-error',
                      matchId: existingMatch.id,
                      meetingId: meetingId,
                      error: meetingError.message || 'Unbekannter Fehler'
                    });
                  }
                } else {
                  scoreWithoutResults.push({
                    matchId: existingMatch.id,
                    home: match.homeTeam,
                    away: match.awayTeam,
                    score: matchPayload.final_score || `${matchPayload.home_score}:${matchPayload.away_score}`
                  });
                }
              }
            } else if (needsMatchNumberUpdate) {
              totalMatchesUpdated += 1;
            }
          } else {
            totalMatchesSkipped += 1;
          }
            continue;
          }

          const { data: insertedMatch, error: insertError } = await supabase
            .from('matchdays')
            .insert(matchPayload)
            .select()
            .maybeSingle();

          if (insertError) {
            if (insertError.code === '23505') {
              // Unique Constraint verletzt - versuche das bestehende Match zu finden
              console.warn(`⚠️ Unique Constraint verletzt für Match: ${match.homeTeam} vs ${match.awayTeam} (Match-Nr: ${matchPayload.match_number})`);
              
              // Suche nach bestehendem Match (per match_number oder Datum+Teams)
              let existingMatchByConstraint = null;
              if (matchPayload.match_number) {
                const { data: foundByNumber } = await supabase
                  .from('matchdays')
                  .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_date')
                  .eq('match_number', matchPayload.match_number)
                  .limit(1)
                  .maybeSingle();
                if (foundByNumber) {
                  existingMatchByConstraint = foundByNumber;
                }
              }
              
              if (!existingMatchByConstraint && matchPayload.home_team_id && matchPayload.away_team_id && matchDateOnly) {
                const { data: foundByTeams } = await supabase
                  .from('matchdays')
                  .select('id, home_team_id, away_team_id, home_score, away_score, final_score, status, match_number, match_date')
                  .eq('home_team_id', matchPayload.home_team_id)
                  .eq('away_team_id', matchPayload.away_team_id)
                  .gte('match_date', `${matchDateOnly}T00:00:00`)
                  .lt('match_date', `${matchDateOnly}T23:59:59`)
                  .limit(1)
                  .maybeSingle();
                if (foundByTeams) {
                  existingMatchByConstraint = foundByTeams;
                }
              }
              
              if (existingMatchByConstraint) {
                // Match existiert bereits - behandle wie Update
                console.log(`✅ Bestehendes Match gefunden (Constraint): ID ${existingMatchByConstraint.id}`);
                // Überspringe, da bereits in existingMatch-Logik behandelt
                totalMatchesSkipped += 1;
                continue;
              }
              
              matchIssues.push({
                type: 'duplicate',
                matchId: null,
                payload: matchPayload,
                error: insertError.message
              });
              totalMatchesSkipped += 1;
              continue;
            }
            throw insertError;
          }

          if (insertedMatch) {
            totalMatchesInserted += 1;
            
            // Automatischer Import der match_results, wenn meetingId vorhanden ist
            const meetingId = match.meetingId || match.meeting_id || extractMeetingMeta(match).meetingId;
            if (meetingId && matchStatus === 'completed') {
              try {
                console.log(`🔄 Automatischer Import der match_results für Matchday ${insertedMatch.id} (meetingId: ${meetingId})`);
                const homeTeamLabel = buildTeamLabel(teamById.get(insertedMatch.home_team_id));
                const awayTeamLabel = buildTeamLabel(teamById.get(insertedMatch.away_team_id));
                
                const meetingResponse = await fetch('/api/import/meeting-report', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    matchdayId: insertedMatch.id,
                    meetingId: meetingId,
                    groupId: resolveGroupId(matchGroupName),
                    matchNumber: matchPayload.match_number,
                    matchDate: matchDateIso,
                    homeTeam: homeTeamLabel,
                    awayTeam: awayTeamLabel,
                    apply: true
                  })
                });

                const meetingRaw = await meetingResponse.text();
                let meetingResult = null;
                if (meetingRaw) {
                  try {
                    meetingResult = JSON.parse(meetingRaw);
                  } catch (parseError) {
                    console.warn('⚠️ Meeting-Report Antwort konnte nicht geparst werden:', parseError);
                  }
                }

                if (meetingResponse.ok && meetingResult?.success) {
                  const insertedCount = meetingResult.applyResult?.inserted?.length || 0;
                  console.log(`✅ match_results importiert: ${insertedCount} Einträge für Matchday ${insertedMatch.id}`);
                } else {
                  const errorMsg = meetingResult?.error || meetingRaw || 'Unbekannter Fehler';
                  console.warn(`⚠️ Automatischer match_results Import fehlgeschlagen für Matchday ${insertedMatch.id}:`, errorMsg);
                  // Füge zu matchIssues hinzu, aber stoppe nicht den Import
                  matchIssues.push({
                    type: 'meeting-import-failed',
                    matchId: insertedMatch.id,
                    meetingId: meetingId,
                    error: errorMsg
                  });
                }
              } catch (meetingError) {
                console.warn(`⚠️ Fehler beim automatischen match_results Import für Matchday ${insertedMatch.id}:`, meetingError);
                matchIssues.push({
                  type: 'meeting-import-error',
                  matchId: insertedMatch.id,
                  meetingId: meetingId,
                  error: meetingError.message || 'Unbekannter Fehler'
                });
              }
            } else if (hasScoreData(match)) {
              scoreWithoutResults.push({
                matchId: insertedMatch.id,
                home: match.homeTeam,
                away: match.awayTeam,
                score: matchPayload.final_score || `${matchPayload.home_score}:${matchPayload.away_score}`
              });
            }
          }
        }
      }

      // Prüfe auf Duplikat-Warnungen
      const duplicateWarnings = matchIssues.filter(issue => issue.type === 'duplicate-detected');
      if (duplicateWarnings.length > 0) {
        console.warn('⚠️ DUPLIKATE ERKANNT:', duplicateWarnings);
        const duplicateMessage = duplicateWarnings.map(w => 
          `${w.count}x ${w.homeTeam} vs ${w.awayTeam} am ${w.matchDate}`
        ).join('; ');
        setScraperError(`⚠️ Duplikate erkannt: ${duplicateMessage}. Bitte in der Datenbank prüfen und bereinigen.`);
      }

      if (matchIssues.length || clubIssues.length) {
        console.warn('⚠️ Match-Import Hinweise:', { clubIssues, matchIssues, scoreWithoutResults });
      }

      // Zähle erfolgreiche match_results Imports
      const meetingImportIssues = matchIssues.filter(issue => 
        issue.type === 'meeting-import-failed' || issue.type === 'meeting-import-error'
      );
      const totalMeetingImports = totalMatchesInserted + (totalMatchesUpdated > 0 ? 1 : 0);
      const successfulMeetingImports = totalMeetingImports - meetingImportIssues.length;

      // Zähle Matches mit fehlenden Teams
      const missingTeamMatches = matchIssues.filter(issue => issue.type === 'missing-team');
      const duplicateMatches = matchIssues.filter(issue => issue.type === 'duplicate' || issue.type === 'duplicate-detected');

      const messageParts = [
        `${totalMatchesInserted} neue Matchdays`,
        `${totalMatchesUpdated} aktualisierte Scores`,
        `${totalMatchesSkipped} übersprungen`
      ];

      if (duplicateMatches.length > 0) {
        messageParts.push(`ℹ️ ${duplicateMatches.length} Match${duplicateMatches.length > 1 ? 'es' : ''} bereits vorhanden (nicht erneut importiert)`);
      }

      if (missingTeamMatches.length > 0) {
        messageParts.push(`⚠️ ${missingTeamMatches.length} Match${missingTeamMatches.length > 1 ? 'es' : ''} mit fehlenden Teams (bitte manuell ergänzen)`);
      }

      if (successfulMeetingImports > 0) {
        messageParts.push(`${successfulMeetingImports} Match-Results automatisch importiert`);
      }

      if (scoreWithoutResults.length > 0) {
        messageParts.push(`${scoreWithoutResults.length} Scores ohne Match-Results`);
      }

      if (duplicateWarnings.length > 0) {
        messageParts.push(`⚠️ ${duplicateWarnings.length} Duplikat${duplicateWarnings.length > 1 ? 'e' : ''} erkannt`);
      }

      setMatchImportResult({
        type: matchIssues.length || clubIssues.length ? 'warning' : 'success',
        message: `Matches verarbeitet: ${messageParts.join(' · ')}.`,
        meta: {
          clubIssues,
          matchIssues,
          scoreWithoutResults,
          totalMatchesInserted,
          totalMatchesUpdated,
          totalMatchesSkipped,
          duplicateWarnings
        }
      });
    } catch (error) {
      console.error('❌ Fehler beim Match-Import:', error);
      setMatchImportResult({ type: 'error', message: error.message || 'Unbekannter Fehler beim Match-Import.' });
    } finally {
      setMatchImporting(false);
      setScraperImporting(false);
    }
  }, [
    scraperData,
    scraperClubSummaries,
    scraperClubMappings,
    ensureClubMapping,
    ensureClubRecord,
    createTeamForSummary,
    existingClubMap,
    existingTeamLookup,
    teamById,
    resolveTeamStatus,
    updateTeamMapping,
    scraperMatchSelections,
    scraperMatchStatus,
    supabase,
    ensureTeamSeason,
    inferTeamSize
  ]);

  const handleAdoptExistingClub = useCallback(
    async (summary, clubId) => {
      if (!clubId) return;
      updateClubMapping(summary.clubName, (current) => ({
        ...current,
        existingClubId: clubId,
        mode: 'existing'
      }));
      try {
        await ensureClubRecord(summary);
        setScraperSuccess(`✅ "${summary.clubName}" mit "${summary.matchedClub.name}" verknüpft!`);
      } catch (error) {
        setScraperError(`❌ Fehler: ${error.message}`);
      }
    },
    [ensureClubRecord, updateClubMapping]
  );

  const handleCreateClub = useCallback(
    async (summary) => {
      try {
        const { clubId } = await ensureClubRecord(summary);
        if (!clubId) {
          throw new Error(`Verein "${summary.clubName}" konnte nicht erstellt werden.`);
        }
        setScraperSuccess(`✅ "${summary.clubName}" erfolgreich angelegt!`);
      } catch (error) {
        setScraperError(`❌ Fehler beim Import von "${summary.clubName}": ${error.message}`);
      }
    },
    [ensureClubRecord]
  );

  const handleCreateTeam = useCallback(
    async (summary, team) => {
      try {
        const created = await createTeamForSummary(summary, team);
        setScraperSuccess(`✅ "${team.original}" wurde angelegt.`);
        return created;
      } catch (error) {
        setScraperError(`❌ Fehler beim Import von "${team.original}": ${error.message}`);
        return null;
      }
    },
    [createTeamForSummary]
  );

  const handleEnsureTeamSeason = useCallback(
    async (teamId, summary, team) => {
      if (!teamId) return;
      try {
        const seasonRecord = await ensureTeamSeason(
          teamId,
          team.season || scraperData?.season || null,
          team.league || summary.leagues?.[0] || null,
          team.groupName || summary.groups?.[0] || null,
          inferTeamSize(team.teamName || team.original)
        );
        if (seasonRecord) {
          setScraperSuccess(`✅ Saison-Verknüpfung für "${team.original}" angelegt.`);
        }
      } catch (error) {
        setScraperError(`❌ Fehler beim Import von "${team.original}": ${error.message}`);
      }
    },
    [ensureTeamSeason, scraperData]
  );

  // ---------------------------------------------------------------------------
  // Result Parser
  // ---------------------------------------------------------------------------
  const updateMatchParserState = useCallback((matchId, nextState) => {
    if (!matchId) return;
    setMatchParserStates((prev) => {
      const prevEntry = prev[matchId] || null;
      const resolved = typeof nextState === 'function' ? nextState(prevEntry) : nextState;
      return { ...prev, [matchId]: resolved };
    });
  }, []);

  const fetchGroupSnapshot = useCallback(async (groupId) => {
    const normalizedGroupId = resolveGroupId(groupId);
    if (!normalizedGroupId) {
      throw new Error('Ungültige Gruppen-ID.');
    }
    
    // ✅ NEU: Lade source_url aus team_seasons für diese Gruppe
    let leagueUrl = null;
    let matchdays = null; // Außerhalb des try-Blocks verfügbar machen
    try {
      // Versuche, die source_url aus team_seasons zu laden
      // Dazu müssen wir zuerst die Gruppe finden (group_name, season, league)
      const { data: matchdaysData } = await supabase
        .from('matchdays')
        .select('group_name, season, league')
        .eq('group_name', `Gr. ${normalizedGroupId.padStart(3, '0')}`)
        .limit(1)
        .maybeSingle();
      
      matchdays = matchdaysData; // Speichere für späteren Gebrauch
      
      if (matchdays) {
        const { data: teamSeason } = await supabase
          .from('team_seasons')
          .select('source_url')
          .eq('group_name', matchdays.group_name)
          .eq('season', matchdays.season)
          .eq('league', matchdays.league)
          .not('source_url', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (teamSeason?.source_url) {
          const sourceUrl = teamSeason.source_url;
          
          // ✅ WICHTIG: Prüfe ob source_url eine teamPortrait URL ist
          // teamPortrait URLs müssen zu leaguePage URLs konvertiert werden
          if (sourceUrl.includes('teamPortrait')) {
            try {
              const url = new URL(sourceUrl);
              const championship = url.searchParams.get('championship');
              const group = url.searchParams.get('group');
              
              if (championship) {
                // Konvertiere teamPortrait URL zu leaguePage URL
                // Bestimme tab basierend auf Liga (aus matchdays)
                const league = matchdays.league || '';
                let tab = 2; // Default: Damen/Herren
                
                // Prüfe Liga-Name für Tab-Bestimmung
                if (league.includes('Köln-Leverkusen')) {
                  const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
                  let categoryForTab = categoryMatch ? categoryMatch[1] : '';
                  if (categoryMatch && categoryMatch[2]) {
                    const number = parseInt(categoryMatch[2], 10);
                    if (number >= 30) {
                      categoryForTab = `${categoryMatch[1]} ${number}`;
                    }
                  }
                  
                  if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
                    tab = 3; // Senioren
                  } else {
                    tab = 2; // Offene Herren/Damen
                  }
                } else {
                  // TVM Ligen: Versuche Kategorie aus Team zu holen
                  try {
                    const { data: teamSeasonForCategory } = await supabase
                      .from('team_seasons')
                      .select('team_id')
                      .eq('group_name', matchdays.group_name)
                      .eq('season', matchdays.season)
                      .eq('league', matchdays.league)
                      .limit(1)
                      .maybeSingle();
                    
                    if (teamSeasonForCategory?.team_id) {
                      const { data: teamInfo } = await supabase
                        .from('team_info')
                        .select('category')
                        .eq('id', teamSeasonForCategory.team_id)
                        .maybeSingle();
                      
                      if (teamInfo?.category) {
                        const normalizedCategory = normalizeCategory(teamInfo.category);
                        if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                          tab = 3; // Senioren
                        } else {
                          tab = 2; // Offene Herren/Damen
                        }
                      }
                    }
                  } catch (error) {
                    console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Laden der Kategorie:`, error);
                    tab = 2;
                  }
                }
                
                // Erstelle leaguePage URL
                leagueUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${encodeURIComponent(championship)}&tab=${tab}`;
                console.log(`[fetchGroupSnapshot] ✅ teamPortrait URL konvertiert zu leaguePage: ${leagueUrl} (original: ${sourceUrl})`);
              } else {
                console.warn(`[fetchGroupSnapshot] ⚠️ teamPortrait URL hat keinen championship Parameter: ${sourceUrl}`);
                leagueUrl = null; // Fallback zu normaler Logik
              }
            } catch (urlError) {
              console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Parsen der teamPortrait URL:`, urlError);
              leagueUrl = null; // Fallback zu normaler Logik
            }
          } else {
            // Normale leaguePage URL - verwende direkt
            leagueUrl = sourceUrl;
            console.log(`[fetchGroupSnapshot] ✅ source_url aus team_seasons geladen: ${leagueUrl}`);
          }
        } else {
          // ✅ FALLBACK: Wenn keine source_url vorhanden, versuche basierend auf Liga die richtige Tab-Seite zu finden
          // Prüfe, ob andere Gruppen derselben Liga eine source_url haben
          const { data: otherTeamSeason } = await supabase
            .from('team_seasons')
            .select('source_url')
            .eq('season', matchdays.season)
            .eq('league', matchdays.league)
            .not('source_url', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (otherTeamSeason?.source_url) {
            const sourceUrl = otherTeamSeason.source_url;
            
            // ✅ WICHTIG: Prüfe ob source_url eine teamPortrait URL ist
            if (sourceUrl.includes('teamPortrait')) {
              try {
                const url = new URL(sourceUrl);
                const championship = url.searchParams.get('championship');
                
                if (championship) {
                  // Bestimme tab basierend auf Liga
                  const league = matchdays.league || '';
                  let tab = 2;
                  
                  if (league.includes('Köln-Leverkusen')) {
                    const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
                    let categoryForTab = categoryMatch ? categoryMatch[1] : '';
                    if (categoryMatch && categoryMatch[2]) {
                      const number = parseInt(categoryMatch[2], 10);
                      if (number >= 30) {
                        categoryForTab = `${categoryMatch[1]} ${number}`;
                      }
                    }
                    
                    if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
                      tab = 3;
                    } else {
                      tab = 2;
                    }
                  } else {
                    try {
                      const { data: teamSeasonForCategory } = await supabase
                        .from('team_seasons')
                        .select('team_id')
                        .eq('group_name', matchdays.group_name)
                        .eq('season', matchdays.season)
                        .eq('league', matchdays.league)
                        .limit(1)
                        .maybeSingle();
                      
                      if (teamSeasonForCategory?.team_id) {
                        const { data: teamInfo } = await supabase
                          .from('team_info')
                          .select('category')
                          .eq('id', teamSeasonForCategory.team_id)
                          .maybeSingle();
                        
                        if (teamInfo?.category) {
                          const normalizedCategory = normalizeCategory(teamInfo.category);
                          if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                            tab = 3;
                          } else {
                            tab = 2;
                          }
                        }
                      }
                    } catch (error) {
                      console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Laden der Kategorie:`, error);
                      tab = 2;
                    }
                  }
                  
                  leagueUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${encodeURIComponent(championship)}&tab=${tab}`;
                  console.log(`[fetchGroupSnapshot] ✅ teamPortrait URL (aus anderer Gruppe) konvertiert zu leaguePage: ${leagueUrl}`);
                } else {
                  leagueUrl = null;
                }
              } catch (urlError) {
                console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Parsen der teamPortrait URL:`, urlError);
                leagueUrl = null;
              }
            } else {
              leagueUrl = sourceUrl;
              console.log(`[fetchGroupSnapshot] ✅ source_url aus anderer Gruppe derselben Liga geladen: ${leagueUrl}`);
            }
          } else {
            // ✅ FALLBACK 2: Basierend auf Liga-Name die richtige URL bestimmen
            // WICHTIG: "Köln-Leverkusen" Ligen brauchen einen anderen championship-Parameter!
            const league = matchdays.league || '';
            let baseUrl;
            let tab = 2; // Default: Damen/Herren
            
            // Prüfe Liga-Name für championship-Parameter
            if (league.includes('Köln-Leverkusen')) {
              // Köln-Leverkusen Ligen verwenden championship=Köln-Leverkusen+Winter+2025%2F2026
              baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
              
              // ✅ Normalisiere Liga-Name: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
              // Extrahiere Kategorie aus Liga-Name für Tab-Bestimmung
              const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
              let categoryForTab = categoryMatch ? categoryMatch[1] : '';
              if (categoryMatch && categoryMatch[2]) {
                const number = parseInt(categoryMatch[2], 10);
                // Wenn Zahl >= 30 → Altersklasse, sonst Mannschaftsnummer (1-3)
                if (number >= 30) {
                  categoryForTab = `${categoryMatch[1]} ${number}`;
                }
              }
              
              // Bestimme Tab basierend auf Altersklasse:
              // - "Herren 30/40/50/55/60/65/70" = Senioren (tab=3)
              // - "Herren" (ohne Altersklasse) = Offene Herren (tab=2)
              // - "Herren 1/2/3" = Mannschaftsnummern, KEINE Altersklassen! → "Herren" (tab=2)
              // - "Damen 30/40/50/55/60" = Senioren (tab=3)
              // - "Damen" (ohne Altersklasse) = Offene Damen (tab=2)
              if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
                tab = 3; // Senioren
              } else {
                tab = 2; // Offene Herren/Damen
              }
              
              leagueUrl = `${baseUrl}&tab=${tab}`;
              console.log(`[fetchGroupSnapshot] ⚠️ Keine source_url gefunden, verwende Fallback (Köln-Leverkusen, tab=${tab}) für Liga "${league}": ${leagueUrl}`);
            } else {
              // Andere Ligen (z.B. Verbandsliga, Mittelrheinliga) verwenden championship=TVM+Winter+2025%2F2026
              baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=TVM+Winter+2025%2F2026';
              
              // Versuche Kategorie aus einem Team dieser Gruppe zu holen, um Tab-Seite zu bestimmen
              try {
                const { data: teamSeason } = await supabase
                  .from('team_seasons')
                  .select('team_id')
                  .eq('group_name', matchdays.group_name)
                  .eq('season', matchdays.season)
                  .eq('league', matchdays.league)
                  .limit(1)
                  .maybeSingle();
                
                if (teamSeason?.team_id) {
                  const { data: teamInfo } = await supabase
                    .from('team_info')
                    .select('category')
                    .eq('id', teamSeason.team_id)
                    .maybeSingle();
                  
                  if (teamInfo?.category) {
                    // ✅ Normalisiere Kategorie: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
                    const normalizedCategory = normalizeCategory(teamInfo.category);
                    
                    // Bestimme Tab basierend auf Kategorie: "Herren 30/40/50/etc." = Senioren (tab=3)
                    if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                      tab = 3; // Senioren
                    } else {
                      tab = 2; // Offene Herren/Damen
                    }
                  }
                }
              } catch (error) {
                console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Laden der Kategorie:`, error);
                // Fallback zu tab=2
                tab = 2;
              }
              
              leagueUrl = `${baseUrl}&tab=${tab}`;
              console.log(`[fetchGroupSnapshot] ⚠️ Keine source_url gefunden, verwende Fallback (TVM, tab=${tab}) für Liga "${league}": ${leagueUrl}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Laden der source_url:`, error);
      // Weiter ohne source_url - API wird Default-URL verwenden
    }
    
    // ✅ ROBUST: Wenn keine source_url vorhanden ist, versuche BEIDE Tab-Seiten (tab=2 und tab=3)
    // Das ist notwendig, weil wir nicht sicher wissen können, auf welcher Tab-Seite die Gruppe ist
    let triedUrls = [];
    if (leagueUrl) {
      triedUrls.push(leagueUrl);
    } else if (matchdays) {
      // Bestimme beide Tab-Seiten basierend auf Liga
      const league = matchdays.league || '';
      let championship;
      if (league.includes('Köln-Leverkusen')) {
        championship = 'K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
      } else {
        championship = 'TVM+Winter+2025%2F2026';
      }
      
      const baseUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${championship}`;
      triedUrls = [
        `${baseUrl}&tab=2`, // Damen/Herren (offen)
        `${baseUrl}&tab=3`  // Senioren
      ];
      console.log(`[fetchGroupSnapshot] 🔄 Versuche beide Tab-Seiten für Gruppe ${normalizedGroupId} (tab=2 und tab=3)`);
    }
    
    // Versuche jede URL, bis eine funktioniert
    let lastError = null;
    for (const tryUrl of triedUrls) {
      try {
        const payload = {
          groups: normalizedGroupId,
          includeMatches: true,
          apply: false,
          leagueUrl: tryUrl
        };
        
    const response = await fetch('/api/import/scrape-nuliga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        // ✅ Verbesserte Fehlerbehandlung: Prüfe zuerst, ob Response Text enthält
        const rawText = await response.text();
        let result;
        try {
          result = rawText ? JSON.parse(rawText) : null;
        } catch (parseError) {
          lastError = new Error(
            response.ok
              ? 'Antwort des Scraper-Endpunkts konnte nicht gelesen werden.'
              : rawText || response.statusText || `Fehler beim Abruf des Scraper-Endpunkts (HTTP ${response.status}).`
          );
          continue; // Versuche nächste URL
        }
        
    if (!response.ok || !result?.success) {
          lastError = new Error(result?.error || `Scraper antwortete ohne Erfolg (HTTP ${response.status}).`);
          continue; // Versuche nächste URL
        }
        
        // Prüfe ob Gruppe in den Ergebnissen gefunden wurde
        const details = Array.isArray(result.details) ? result.details : [];
        const foundGroup = details.find(entry => {
          const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
          const normalizedEntryId = entryGroupId ? String(parseInt(entryGroupId, 10)) : null;
          const normalizedSearchId = String(parseInt(normalizedGroupId, 10));
          return normalizedEntryId === normalizedSearchId;
        });
        
        if (foundGroup) {
          // ✅ Speichere die erfolgreiche URL in team_seasons für zukünftige Verwendung
          if (matchdays && (!leagueUrl || triedUrls.length > 1)) {
            try {
              const { error: updateError } = await supabase
                .from('team_seasons')
                .update({ source_url: tryUrl, source_type: 'league_overview' })
                .eq('group_name', matchdays.group_name)
                .eq('season', matchdays.season)
                .eq('league', matchdays.league);
              
              if (!updateError) {
                console.log(`[fetchGroupSnapshot] ✅ source_url für Gruppe ${normalizedGroupId} gespeichert: ${tryUrl}`);
              }
            } catch (saveError) {
              console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Speichern der source_url:`, saveError);
            }
          }
          
          console.log(`[fetchGroupSnapshot] ✅ Gruppe ${normalizedGroupId} gefunden auf ${tryUrl}`);
          return result; // Erfolg! Verlasse die Funktion
        } else {
          // Gruppe nicht auf dieser Tab-Seite gefunden, versuche nächste
          console.log(`[fetchGroupSnapshot] ℹ️ Gruppe ${normalizedGroupId} nicht auf ${tryUrl} gefunden, versuche nächste Tab-Seite...`);
          lastError = new Error(`Gruppe ${normalizedGroupId} nicht auf ${tryUrl} gefunden`);
          continue;
        }
      } catch (tryError) {
        lastError = tryError;
        console.warn(`[fetchGroupSnapshot] ⚠️ Fehler beim Versuch mit ${tryUrl}:`, tryError.message);
        continue; // Versuche nächste URL
      }
    }
    
    // Wenn keine URL funktioniert hat, werfe den letzten Fehler
    throw lastError || new Error(`Konnte Gruppe ${normalizedGroupId} auf keiner Tab-Seite finden (versucht: ${triedUrls.join(', ')})`);
  }, []);

  const findScrapedMatchForLocal = useCallback(
    (localMatch, scrapedMatches = []) => {
      if (!localMatch || !scrapedMatches.length) {
        return { match: null, score: 0 };
      }

      const homeTeam = teamById.get(localMatch.home_team_id);
      const awayTeam = teamById.get(localMatch.away_team_id);

      const homeLabel = buildTeamLabel(homeTeam);
      const awayLabel = buildTeamLabel(awayTeam);

      const localDateKey = toDateKey(localMatch.match_date);
      const localMatchNumber = getMatchNumberFromRecord(localMatch);

      let bestMatch = null;
      let bestScore = 0;

      scrapedMatches.forEach((candidate) => {
        if (!candidate) return;
        const candidateHome = candidate.homeTeam || '';
        const candidateAway = candidate.awayTeam || '';

        let score = 0;

        if (homeLabel) {
          score += calculateSimilarity(homeLabel, candidateHome) * 0.45;
        }
        if (awayLabel) {
          score += calculateSimilarity(awayLabel, candidateAway) * 0.45;
        }

        const candidateDateKey = toDateKey(candidate.matchDateIso);
        if (localDateKey && candidateDateKey) {
          score += localDateKey === candidateDateKey ? 0.08 : -0.12;
        } else {
          score += 0.02;
        }

        const candidateMatchNumber = candidate.matchNumber ? candidate.matchNumber.trim() : null;
        if (localMatchNumber && candidateMatchNumber) {
          const normalizedLocal = normalizeString(String(localMatchNumber));
          const normalizedCandidate = normalizeString(candidateMatchNumber);
          if (normalizedLocal && normalizedLocal === normalizedCandidate) {
            score += 0.12;
          }
        }

        if (candidate.matchPoints?.raw) {
          score += 0.02;
        }

        if (score < 0) {
          score = 0;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
        }
      });

      return { match: bestMatch, score: bestScore };
    },
    [teamById]
  );

  const updateMatchWithScrapedData = useCallback(
    async (matchRecord, scrapedMatch, groupMeta) => {
      if (!matchRecord || !scrapedMatch) return null;

      const payload = {
        status: scrapedMatch.status === 'completed' ? 'completed' : matchRecord.status,
        home_score: scrapedMatch.matchPoints?.home ?? null,
        away_score: scrapedMatch.matchPoints?.away ?? null,
        final_score: scrapedMatch.matchPoints?.raw ?? null,
        updated_at: new Date().toISOString()
      };

      if (!matchRecord.match_number && scrapedMatch.matchNumber) {
        payload.match_number = scrapedMatch.matchNumber;
      }
      if ((!matchRecord.start_time || matchRecord.start_time === '') && scrapedMatch.startTime) {
        payload.start_time = normalizeStartTime(scrapedMatch.startTime);
      }
      if ((!matchRecord.venue || matchRecord.venue === '') && scrapedMatch.venue) {
        payload.venue = scrapedMatch.venue;
      }
      if (matchRecord.court_number == null && scrapedMatch.court_number != null) {
        payload.court_number = scrapedMatch.court_number;
      }
      if (matchRecord.court_number_end == null && scrapedMatch.court_number_end != null) {
        payload.court_number_end = scrapedMatch.court_number_end;
      }
      if ((!matchRecord.season || matchRecord.season === '') && groupMeta?.season) {
        payload.season = groupMeta.season;
      }
      if ((!matchRecord.year || matchRecord.year === '') && groupMeta?.year) {
        payload.year = groupMeta.year;
      }
      if ((!matchRecord.league || matchRecord.league === '') && groupMeta?.league) {
        payload.league = groupMeta.league;
      }
      if ((!matchRecord.group_name || matchRecord.group_name === '') && groupMeta?.groupName) {
        payload.group_name = groupMeta.groupName;
      }
      if ((!matchRecord.notes || matchRecord.notes.trim().length === 0) && scrapedMatch.notes) {
        payload.notes = scrapedMatch.notes;
      }

      const { error } = await supabase.from('matchdays').update(payload).eq('id', matchRecord.id);
      if (error) {
        throw new Error(error.message || 'Supabase-Update fehlgeschlagen.');
      }
      return payload;
    },
    []
  );

  const handleRunResultParser = useCallback(
    async (match) => {
      if (!match || parserProcessing) return;

      const groupId = resolveGroupId(match.group_name);
      if (!groupId) {
        updateMatchParserState(match.id, { status: 'error', message: 'Keine Gruppen-ID gefunden' });
        setParserMessage({
          type: 'error',
          text: 'Für dieses Match ist keine gültige Gruppen-ID hinterlegt.'
        });
        return;
      }

      updateMatchParserState(match.id, { status: 'running', message: `Gruppe ${groupId}` });

      try {
        const snapshot = await fetchGroupSnapshot(groupId);
        const groupDetail = (snapshot?.details || []).find(
          (entry) => resolveGroupId(entry.group?.groupId || entry.group?.groupName) === groupId
        );

        if (!groupDetail) {
          throw new Error(`Keine Parser-Daten für Gruppe ${groupId}.`);
        }

        const { match: scrapedMatch } = findScrapedMatchForLocal(match, groupDetail.matches || []);
        if (!scrapedMatch) {
          throw new Error('Kein passendes Spiel in den nuLiga-Daten gefunden.');
        }

        if (!hasScoreData(scrapedMatch)) {
          throw new Error('nuLiga stellt noch keinen finalen Spielstand bereit.');
        }

        await updateMatchWithScrapedData(match, scrapedMatch, groupDetail.group);

        updateMatchParserState(match.id, {
          status: 'success',
          message: scrapedMatch.matchPoints?.raw ? `Ergebnis ${scrapedMatch.matchPoints.raw}` : 'Aktualisiert'
        });

        setParserMessage({
          type: 'success',
          text: `Ergebnis übernommen: ${scrapedMatch.homeTeam} vs. ${scrapedMatch.awayTeam} (${scrapedMatch.matchPoints?.raw || '–'})`
        });

        await loadDashboardData();
      } catch (error) {
        console.error('❌ Fehler beim Result-Parser:', error);
        updateMatchParserState(match.id, {
          status: 'error',
          message: error.message || 'Parser-Fehler'
        });
        setParserMessage({
          type: 'error',
          text: error.message || 'Parser-Fehler beim Aktualisieren des Match-Ergebnisses.'
        });
      }
    },
    [
      fetchGroupSnapshot,
      findScrapedMatchForLocal,
      updateMatchWithScrapedData,
      loadDashboardData,
      updateMatchParserState,
      parserProcessing
    ]
  );

  const loadMatchResults = useCallback(
    async (matchdayId) => {
      if (!matchdayId) return;
      
      // Prüfe ob bereits geladen (verwende setState mit updater function)
      let shouldLoad = true;
      setMatchResultsData((prev) => {
        if (prev[matchdayId]?.loaded) {
          shouldLoad = false;
          return prev;
        }
        return prev;
      });
      
      if (!shouldLoad) return;

      try {
        const { data: results, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .eq('matchday_id', matchdayId)
          .order('match_number', { ascending: true });

        if (resultsError) throw resultsError;

        if (!results || results.length === 0) {
          setMatchResultsData((prev) => ({ ...prev, [matchdayId]: { singles: [], doubles: [] } }));
          return;
        }

        // Lade Spielernamen
        const playerIds = new Set();
        results.forEach((result) => {
          if (result.home_player_id) playerIds.add(result.home_player_id);
          if (result.guest_player_id) playerIds.add(result.guest_player_id);
          if (result.home_player1_id) playerIds.add(result.home_player1_id);
          if (result.home_player2_id) playerIds.add(result.home_player2_id);
          if (result.guest_player1_id) playerIds.add(result.guest_player1_id);
          if (result.guest_player2_id) playerIds.add(result.guest_player2_id);
        });

        const playerIdArray = Array.from(playerIds);
        const playerMap = new Map();

        if (playerIdArray.length > 0) {
          const { data: playerData, error: playerError } = await supabase
            .from('players_unified')
            .select('id, name, current_lk, user_id, import_source')
            .in('id', playerIdArray);

          if (!playerError && playerData) {
            playerData.forEach((player) => {
              playerMap.set(player.id, player);
            });
          }
        }

        // Trenne Einzel und Doppel
        const singles = [];
        const doubles = [];

        results.forEach((result) => {
          const entry = {
            matchNumber: result.match_number || null,
            homePlayers: [],
            awayPlayers: [],
            setScores: [
              result.set1_home != null && result.set1_guest != null
                ? { raw: `${result.set1_home}:${result.set1_guest}`, home: result.set1_home, away: result.set1_guest }
                : null,
              result.set2_home != null && result.set2_guest != null
                ? { raw: `${result.set2_home}:${result.set2_guest}`, home: result.set2_home, away: result.set2_guest }
                : null,
              result.set3_home != null && result.set3_guest != null
                ? { raw: `${result.set3_home}:${result.set3_guest}`, home: result.set3_home, away: result.set3_guest }
                : null
            ].filter(Boolean),
            matchPoints:
              result.home_score != null && result.away_score != null
                ? { raw: `${result.home_score}:${result.away_score}`, home: result.home_score, away: result.away_score }
                : null,
            sets: null,
            games: null
          };

          const pushPlayer = (collection, playerId) => {
            if (!playerId) return;
            const info = playerMap.get(playerId);
            collection.push({
              id: playerId,
              name: info?.name || 'Unbekannt',
              lk: info?.current_lk || null,
              user_id: info?.user_id || null,
              import_source: info?.import_source || null
            });
          };

          if (result.match_type === 'Einzel') {
            if (result.home_player_id) {
              pushPlayer(entry.homePlayers, result.home_player_id);
            }
            if (result.guest_player_id) {
              pushPlayer(entry.awayPlayers, result.guest_player_id);
            }
            singles.push(entry);
          } else if (result.match_type === 'Doppel') {
            pushPlayer(entry.homePlayers, result.home_player1_id);
            pushPlayer(entry.homePlayers, result.home_player2_id);
            pushPlayer(entry.awayPlayers, result.guest_player1_id);
            pushPlayer(entry.awayPlayers, result.guest_player2_id);
            doubles.push(entry);
          }
        });

        setMatchResultsData((prev) => ({
          ...prev,
          [matchdayId]: { singles, doubles, players: Object.fromEntries(playerMap), loaded: true }
        }));
      } catch (error) {
        console.error('❌ Fehler beim Laden der Match-Results:', error);
        setMatchResultsData((prev) => ({ ...prev, [matchdayId]: { singles: [], doubles: [], error: error.message, loaded: true } }));
      }
    },
    [supabase]
  );

  const handleRunParserForAll = useCallback(async () => {
    if (parserProcessing || matchesNeedingParser.length === 0) return;

    const grouped = new Map();
    matchesNeedingParser.forEach((match) => {
      const groupId = resolveGroupId(match.group_name);
      if (!groupId) return;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId).push(match);
    });

    if (grouped.size === 0) {
      setParserMessage({
        type: 'error',
        text: 'Für die offenen Matches konnte keine gültige Gruppen-ID ermittelt werden.'
      });
      return;
    }

    setParserProcessing(true);
    setParserMessage(null);
    setMatchParserStates((prev) => {
      const next = { ...prev };
      matchesNeedingParser.forEach((match) => {
        const groupId = resolveGroupId(match.group_name) || '?';
        next[match.id] = { status: 'running', message: `Gruppe ${groupId}` };
      });
      return next;
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [groupId, groupMatches] of grouped.entries()) {
      try {
        const snapshot = await fetchGroupSnapshot(groupId);
        const groupDetail = (snapshot?.details || []).find(
          (entry) => resolveGroupId(entry.group?.groupId || entry.group?.groupName) === groupId
        );

        if (!groupDetail) {
          throw new Error(`Keine Parser-Daten für Gruppe ${groupId}.`);
        }

        for (const match of groupMatches) {
          const { match: scrapedMatch } = findScrapedMatchForLocal(match, groupDetail.matches || []);
          if (!scrapedMatch) {
            skipped += 1;
            updateMatchParserState(match.id, {
              status: 'error',
              message: 'Match nicht gefunden'
            });
            continue;
          }
          if (!hasScoreData(scrapedMatch)) {
            skipped += 1;
            updateMatchParserState(match.id, {
              status: 'error',
              message: 'Noch kein Ergebnis'
            });
            continue;
          }

          try {
            await updateMatchWithScrapedData(match, scrapedMatch, groupDetail.group);
            updated += 1;
            updateMatchParserState(match.id, {
              status: 'success',
              message: scrapedMatch.matchPoints?.raw ? `Ergebnis ${scrapedMatch.matchPoints.raw}` : 'Aktualisiert'
            });
          } catch (error) {
            failed += 1;
            console.error('❌ Fehler beim Aktualisieren des Matchdays:', error);
            updateMatchParserState(match.id, {
              status: 'error',
              message: error.message || 'Supabase-Fehler'
            });
          }
        }
      } catch (error) {
        failed += groupMatches.length;
        console.error('❌ Fehler beim Parser für Gruppe', groupId, error);
        groupMatches.forEach((match) => {
          updateMatchParserState(match.id, {
            status: 'error',
            message: error.message || 'Parser-Fehler'
          });
        });
      }
    }

    await loadDashboardData();
    setParserProcessing(false);

    const messageParts = [
      `${updated} aktualisiert`,
      skipped > 0 ? `${skipped} ohne Ergebnis` : null,
      failed > 0 ? `${failed} Fehler` : null
    ].filter(Boolean);

    const hasIssues = failed > 0 || skipped > 0;

    setParserMessage({
      type: hasIssues ? 'warning' : 'success',
      text: `Parser abgeschlossen: ${messageParts.join(' · ')}`
    });
  }, [
    parserProcessing,
    matchesNeedingParser,
    fetchGroupSnapshot,
    findScrapedMatchForLocal,
    updateMatchWithScrapedData,
    updateMatchParserState,
    loadDashboardData
  ]);

  const handleLoadMeetingDetails = useCallback(
    async (match, { homeLabel, awayLabel, applyImport = false } = {}) => {
      if (!match?.id) return;
      const recordId = match.id;
      const existing = meetingDetails[recordId] || {};

      setMeetingDetails((prev) => ({
        ...prev,
        [recordId]: {
          ...prev[recordId],
          loading: true,
          importing: applyImport,
          error: null
        }
      }));

      try {
        // WICHTIG: Lade meeting_id aus der Datenbank (falls vorhanden)
        let dbMeetingId = null;
        let dbMeetingUrl = null;
        try {
          const { data: matchdayData } = await supabase
            .from('matchdays')
            .select('meeting_id, meeting_report_url')
            .eq('id', match.id)
            .maybeSingle();
          
          if (matchdayData) {
            dbMeetingId = matchdayData.meeting_id;
            dbMeetingUrl = matchdayData.meeting_report_url;
          }
        } catch (dbError) {
          console.warn('⚠️ Fehler beim Laden der meeting_id aus DB:', dbError);
        }

        const payload = {
          matchdayId: match.id,
          groupId: resolveGroupId(match.group_name),
          matchNumber: match.match_number || extractMatchNumber(match.notes),
          matchDate: match.match_date || match.matchDateIso || null,
          homeTeam: homeLabel,
          awayTeam: awayLabel,
          apply: applyImport
        };

        // Priorität: DB meeting_id > existing.meetingId > extractMeetingMeta > match.meeting_id
        const meetingMeta = extractMeetingMeta(match);
        if (dbMeetingId) {
          payload.meetingId = dbMeetingId;
          console.log(`[handleLoadMeetingDetails] ✅ meetingId aus DB geladen: ${dbMeetingId}`);
        } else if (existing.meetingId) {
          payload.meetingId = existing.meetingId;
        } else if (meetingMeta.meetingId) {
          payload.meetingId = meetingMeta.meetingId;
        } else if (match.meeting_id) {
          payload.meetingId = match.meeting_id;
        }
        
        if (dbMeetingUrl) {
          payload.meetingUrl = dbMeetingUrl;
        } else if (existing.meetingUrl && !payload.meetingUrl) {
          payload.meetingUrl = existing.meetingUrl;
        } else if (meetingMeta.meetingUrl && !payload.meetingUrl) {
          payload.meetingUrl = meetingMeta.meetingUrl;
        }

        const response = await fetch('/api/import/meeting-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const raw = await response.text();
        let result = null;
        if (raw) {
          try {
            result = JSON.parse(raw);
          } catch (parseError) {
            console.warn('⚠️ Meeting-Report Antwort konnte nicht geparst werden:', parseError);
          }
        }

        if (!response.ok || !result?.success) {
          const message =
            result?.error ||
            (raw && raw.trim().length ? raw : `Serverfehler (${response.status}) beim Laden des Spielberichts.`);
          const errorCode = result?.errorCode || null;

          console.log(`[handleLoadMeetingDetails] ⚠️ API-Fehler für Matchday ${recordId}:`, {
            matchdayId: recordId,
            meetingId: payload.meetingId,
            errorCode,
            message,
            responseStatus: response.status,
            applyImport
          });

          // WICHTIG: MEETING_ID_NOT_AVAILABLE ist kein kritischer Fehler
          // Das Spiel wurde möglicherweise noch nicht gespielt
          if (errorCode === 'MEETING_ID_NOT_AVAILABLE') {
            console.log(`[handleLoadMeetingDetails] ℹ️ Meeting-ID nicht verfügbar für Matchday ${recordId} - Spiel möglicherweise noch nicht gespielt`);
            setMeetingDetails((prev) => ({
              ...prev,
              [recordId]: {
                loading: false,
                importing: false,
                error: message,
                errorCode: errorCode,
                data: null,
                meetingId: null,
                meetingUrl: null,
                lastFetchedAt: new Date().toISOString()
              }
            }));
            setParserMessage({
              type: 'warning',
              text: message
            });
            return; // Beende hier - kein Fehler werfen
          }

          if (
            match.match_results_count > 0 &&
            window.confirm(
              `${message}\n\nSollen die bestehenden Matchday-Daten (inkl. Einzel/Doppel) gelöscht werden?`
            )
          ) {
            try {
              await fetch('/api/import/meeting-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchdayId: match.id, cleanupOnly: true })
              });
              await loadDashboardData();
              setParserMessage({
                type: 'success',
                text: 'Matchday-Daten wurden entfernt. Import bitte erneut versuchen.'
              });
            } catch (cleanupError) {
              console.error('❌ Cleanup fehlgeschlagen:', cleanupError);
              setParserMessage({
                type: 'error',
                text: cleanupError.message || 'Matchday-Daten konnten nicht gelöscht werden.'
              });
            }
            throw new Error(message);
          }

          throw new Error(message);
        }

        const missingPlayers = applyImport
          ? result.applyResult?.missingPlayers || []
          : existing.missingPlayers ||
            existing.data?.applyResult?.missingPlayers ||
            [];

        console.log(`[handleLoadMeetingDetails] ✅ Meeting-Details erfolgreich geladen für Matchday ${recordId}:`, {
          matchdayId: recordId,
          meetingId: result.meetingId,
          applyImport,
          insertedCount: result.applyResult?.inserted?.length || 0,
          missingPlayersCount: missingPlayers.length,
          hasResults: !!result.applyResult
        });

        setMeetingDetails((prev) => ({
          ...prev,
          [recordId]: {
            loading: false,
            importing: false,
            error: null,
            data: result,
            meetingId: result.meetingId,
            meetingUrl: result.meetingUrl,
            matchMeta: result.matchMeta || prev[recordId]?.matchMeta || null,
            lastFetchedAt: new Date().toISOString(),
            lastAppliedAt: applyImport ? new Date().toISOString() : prev[recordId]?.lastAppliedAt || null,
            matchResultsCount: applyImport
              ? result.applyResult?.inserted?.length || prev[recordId]?.matchResultsCount || 0
              : prev[recordId]?.matchResultsCount || 0,
            missingPlayers
          }
        }));
        setCreatingPlayerKey(null);

        if (applyImport) {
          const missingCount = result.applyResult?.missingPlayers?.length || 0;
          const insertedCount = result.applyResult?.inserted?.length ?? 0;
          
          console.log(`[handleLoadMeetingDetails] 📥 Import abgeschlossen für Matchday ${recordId}:`, {
            matchdayId: recordId,
            insertedCount,
            missingPlayersCount: missingCount,
            insertedResults: result.applyResult?.inserted || []
          });
          
          // ✅ WICHTIG: Speichere Import-Versuch in der DB (nicht nur localStorage)
          try {
            const success = insertedCount > 0 && missingCount === 0;
            await recordAttempt(supabase, match.id, success, null, success ? null : `${missingCount} Spieler ohne Zuordnung`);
            console.log(`[handleLoadMeetingDetails] ✅ Import-Versuch in DB gespeichert für Matchday ${match.id} (success: ${success})`);
          } catch (recordError) {
            console.warn(`[handleLoadMeetingDetails] ⚠️ Fehler beim Speichern des Import-Versuchs:`, recordError);
          }
          
          const nextMatchNumber =
            result.matchMeta?.matchNumber ||
            existing.matchMeta?.matchNumber ||
            match.match_number ||
            match.matchNumber ||
            null;
          if (nextMatchNumber) {
            await supabase.from('matchdays').update({ match_number: nextMatchNumber }).eq('id', match.id);
          }
          setSeasonMatchdays((prev) =>
            prev.map((entry) =>
              entry.id === match.id
                ? {
                    ...entry,
                    match_number: nextMatchNumber || entry.match_number,
                    match_results_count: insertedCount
                  }
                : entry
            )
          );
          await loadDashboardData();
          
          // ✅ VERBESSERT: Prüfe explizit, ob die Ergebnisse vollständig sind, bevor wir die Liste aktualisieren
          if (applyImport) {
            try {
              // Warte kurz, damit DB-Transaktionen abgeschlossen sind
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // ✅ NEU: Prüfe explizit, ob dieser Matchday vollständige Ergebnisse hat
              const completenessCheck = await checkMatchdayResultsComplete(supabase, match.id);
              
              if (completenessCheck.complete) {
                console.log(`[handleLoadMeetingDetails] ✅ Matchday ${match.id} hat vollständige Ergebnisse nach Import:`, {
                  matchdayId: match.id,
                  resultsCount: completenessCheck.resultsCount,
                  completeCount: completenessCheck.completeCount,
                  walkoverCount: completenessCheck.walkoverCount
                });
              } else {
                console.log(`[handleLoadMeetingDetails] ⚠️ Matchday ${match.id} hat noch unvollständige Ergebnisse:`, {
                  matchdayId: match.id,
                  reason: completenessCheck.reason,
                  resultsCount: completenessCheck.resultsCount,
                  completeCount: completenessCheck.completeCount,
                  missingPlayersCount: completenessCheck.missingPlayersCount,
                  missingSetsCount: completenessCheck.missingSetsCount
                });
              }
              
              // Lade die aktualisierte Liste der fehlenden Ergebnisse
              const updatedMissingResults = await findMatchdaysWithoutResultsAfter4Days(supabase);
              const result = updatedMissingResults || [];
              localStorage.setItem('superAdminMatchdaysWithoutResults', JSON.stringify({
                data: result,
                timestamp: Date.now(),
                count: result.length
              }));
              setMatchdaysWithoutResults(result);
              console.log(`[SuperAdminDashboard] 💾 ${result.length} fehlende Ergebnisse im localStorage aktualisiert (nach Import)`);
            } catch (e) {
              console.warn('⚠️ Fehler beim Aktualisieren der fehlenden Ergebnisse nach Import:', e);
            }
          }
          
          // Lade Match-Results neu, wenn importiert wurde
          if (applyImport && match.id) {
            setMatchResultsData((prev) => {
              const next = { ...prev };
              delete next[match.id]; // Force reload
              return next;
            });
            setTimeout(() => {
              loadMatchResults(match.id);
            }, 500);
          }
          const successMessage = result.applyResult
            ? `Matchdetails importiert (${result.applyResult.inserted?.length || 0} Einträge)`
            : 'Matchdetails importiert.';
          setParserMessage({
            type: missingCount > 0 ? 'warning' : 'success',
            text:
              missingCount > 0
                ? `${successMessage} · ${missingCount} Spieler ohne Zuordnung`
                : successMessage
          });
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Meeting-Details:', error);
        setMeetingDetails((prev) => ({
          ...prev,
          [recordId]: {
            ...prev[recordId],
            loading: false,
            importing: false,
            error: error.message || 'Spielbericht konnte nicht geladen werden.'
          }
        }));
        setCreatingPlayerKey(null);
        setParserMessage({
          type: 'error',
          text: error.message || 'Spielbericht konnte nicht geladen werden.'
        });
      }
    },
    [meetingDetails, resolveGroupId, setParserMessage, supabase, loadDashboardData, loadMatchResults]
  );

  // ✅ NEU: Lade Details für alle Matches ohne Ergebnisse
  const [loadingDetailsForAll, setLoadingDetailsForAll] = useState(false);
  
  const handleLoadDetailsForAllMatches = useCallback(async () => {
    if (loadingDetailsForAll || matchdaysWithoutResults.length === 0) return;
    
    setLoadingDetailsForAll(true);
    setParserMessage({
      type: 'info',
      text: `Lade Details für ${matchdaysWithoutResults.length} Matches...`
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (let i = 0; i < matchdaysWithoutResults.length; i++) {
        const match = matchdaysWithoutResults[i];
        
        // ✅ Prüfe ob group_name vorhanden ist, sonst lade es aus der DB
        let matchWithGroupName = match;
        if (!match.group_name) {
          try {
            const { data: matchdayData } = await supabase
              .from('matchdays')
              .select('group_name, season, league')
              .eq('id', match.id)
              .maybeSingle();
            
            if (matchdayData && matchdayData.group_name) {
              matchWithGroupName = { ...match, ...matchdayData };
            } else {
              console.warn(`⚠️ Match ${match.id} hat keine group_name, überspringe...`);
              errorCount++;
              continue;
            }
          } catch (dbError) {
            console.warn(`⚠️ Fehler beim Laden der group_name für Match ${match.id}:`, dbError);
            errorCount++;
            continue;
          }
        }
        
        // Prüfe ob groupId ermittelt werden kann
        const groupId = resolveGroupId(matchWithGroupName.group_name);
        if (!groupId && !matchWithGroupName.meeting_id) {
          console.warn(`⚠️ Match ${match.id} hat keine gültige group_name (${matchWithGroupName.group_name}) und keine meeting_id, überspringe...`);
          errorCount++;
          continue;
        }
        
        // Baue Team-Labels
        const homeTeam = match.home_team 
          ? `${match.home_team.club_name}${match.home_team.team_name ? ` ${match.home_team.team_name}` : ''}`
          : 'Unbekannt';
        const awayTeam = match.away_team 
          ? `${match.away_team.club_name}${match.away_team.team_name ? ` ${match.away_team.team_name}` : ''}`
          : 'Unbekannt';
        
        try {
          console.log(`[handleLoadDetailsForAllMatches] 🔄 Lade Details für Match ${match.id} (${i + 1}/${matchdaysWithoutResults.length}): ${homeTeam} vs. ${awayTeam}`, {
            matchdayId: match.id,
            meetingId: matchWithGroupName.meeting_id,
            groupName: matchWithGroupName.group_name,
            daysSinceMatch: match.daysSinceMatch,
            attemptCount: match.attemptCount
          });
          
          // ✅ FIX: Prüfe ob unvollständige Ergebnisse vorhanden sind und lösche sie vor dem Import
          // Unvollständige Ergebnisse haben keine Spieler-IDs oder keine Set-Ergebnisse
          try {
            const { data: existingResults } = await supabase
              .from('match_results')
              .select('id, home_player_id, home_player1_id, set1_home, set1_guest')
              .eq('matchday_id', match.id);
            
            if (existingResults && existingResults.length > 0) {
              const incompleteResults = existingResults.filter(r => {
                const hasPlayers = r.home_player_id || r.home_player1_id;
                const hasSets = r.set1_home !== null && r.set1_guest !== null;
                return !hasPlayers || !hasSets;
              });
              
              if (incompleteResults.length > 0) {
                console.log(`[handleLoadDetailsForAllMatches] 🧹 Lösche ${incompleteResults.length} unvollständige Ergebnisse für Match ${match.id} vor dem Re-Import`);
                await supabase
                  .from('match_results')
                  .delete()
                  .in('id', incompleteResults.map(r => r.id));
              }
            }
          } catch (cleanupError) {
            console.warn(`[handleLoadDetailsForAllMatches] ⚠️ Fehler beim Löschen unvollständiger Ergebnisse:`, cleanupError);
            // Weiter mit Import, auch wenn Cleanup fehlgeschlagen ist
          }
          
          // Lade Details MIT automatischem Import (applyImport = true)
          await handleLoadMeetingDetails(matchWithGroupName, { 
            homeLabel: homeTeam, 
            awayLabel: awayTeam, 
            applyImport: true 
          });
          
          console.log(`[handleLoadDetailsForAllMatches] ✅ Details erfolgreich geladen für Match ${match.id}`);
          successCount++;
          
          // Kurze Pause zwischen den Requests, um Server nicht zu überlasten
          if (i < matchdaysWithoutResults.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`[handleLoadDetailsForAllMatches] ❌ Fehler beim Laden der Details für Match ${match.id}:`, {
            matchdayId: match.id,
            meetingId: matchWithGroupName.meeting_id,
            error: error.message,
            stack: error.stack
          });
          errorCount++;
        }
      }
      
      setParserMessage({
        type: successCount > 0 ? 'success' : 'error',
        text: `Details geladen: ${successCount} erfolgreich, ${errorCount} Fehler`
      });
      
      // Lade Dashboard-Daten neu, um aktualisierte Status anzuzeigen
      await loadDashboardData();
      
          // ✅ Aktualisiere auch die fehlenden Ergebnisse im localStorage (nur wenn erfolgreich importiert wurde)
          if (successCount > 0) {
            try {
              // Warte kurz, damit alle DB-Transaktionen abgeschlossen sind
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // ✅ NEU: Prüfe explizit, ob die importierten Matchdays vollständige Ergebnisse haben
              // Vereinfacht: Prüfe alle Matchdays, die wir gerade importiert haben
              const importedMatchIds = [];
              for (let i = 0; i < Math.min(successCount, matchdaysWithoutResults.length); i++) {
                importedMatchIds.push(matchdaysWithoutResults[i].id);
              }
              
              for (const matchdayId of importedMatchIds) {
                const completenessCheck = await checkMatchdayResultsComplete(supabase, matchdayId);
                if (completenessCheck.complete) {
                  console.log(`[handleLoadDetailsForAllMatches] ✅ Matchday ${matchdayId} hat vollständige Ergebnisse nach Import`);
                } else {
                  console.log(`[handleLoadDetailsForAllMatches] ⚠️ Matchday ${matchdayId} hat noch unvollständige Ergebnisse:`, completenessCheck);
                }
              }
              
              // Lade die aktualisierte Liste der fehlenden Ergebnisse
              const updatedMissingResults = await findMatchdaysWithoutResultsAfter4Days(supabase);
              const result = updatedMissingResults || [];
              localStorage.setItem('superAdminMatchdaysWithoutResults', JSON.stringify({
                data: result,
                timestamp: Date.now(),
                count: result.length
              }));
              setMatchdaysWithoutResults(result);
              console.log(`[SuperAdminDashboard] 💾 ${result.length} fehlende Ergebnisse im localStorage aktualisiert (nach Details-Laden)`);
            } catch (e) {
              console.warn('⚠️ Fehler beim Aktualisieren der fehlenden Ergebnisse:', e);
            }
          }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Details für alle Matches:', error);
      setParserMessage({
        type: 'error',
        text: `Fehler beim Laden der Details: ${error.message}`
      });
    } finally {
      setLoadingDetailsForAll(false);
    }
  }, [matchdaysWithoutResults, handleLoadMeetingDetails, loadDashboardData, loadingDetailsForAll]);
  
  const handleCreateMissingPlayer = useCallback(
    async (match, playerEntry) => {
      if (!match?.id || !playerEntry?.name || !playerEntry?.key) return;
      const entryKey = `${match.id}:${playerEntry.key}`;
      if (creatingPlayerKey && creatingPlayerKey !== entryKey) {
        return;
      }

      setCreatingPlayerKey(entryKey);
      try {
        const firstContext = (playerEntry.contexts || [])[0] || {};
        const teamId =
          firstContext.side === 'home'
            ? match.home_team_id
            : firstContext.side === 'away'
              ? match.away_team_id
              : null;

        const response = await fetch('/api/import/create-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: playerEntry.name,
            lk: playerEntry.lk,
            teamId,
            playerType: 'opponent',
            status: 'pending'
          })
        });

        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Spieler konnte nicht angelegt werden.');
        }

        setParserMessage({
          type: 'success',
          text: `Spieler "${playerEntry.name}" angelegt. Import bitte erneut starten.`
        });

        setMeetingDetails((prev) => {
          const current = prev[match.id];
          if (!current) return prev;

          const currentMissing =
            current.missingPlayers !== undefined
              ? current.missingPlayers
              : current.data?.applyResult?.missingPlayers || [];
          const filteredMissing = currentMissing.filter((item) => item.key !== playerEntry.key);
          const nextData = current.data
            ? {
                ...current.data,
                applyResult: current.data.applyResult
                  ? { ...current.data.applyResult, missingPlayers: filteredMissing }
                  : current.data.applyResult
              }
            : current.data;

          return {
            ...prev,
            [match.id]: {
              ...current,
              missingPlayers: filteredMissing,
              data: nextData
            }
          };
        });
      } catch (error) {
        console.error('❌ Fehler beim Anlegen des Spielers:', error);
        setParserMessage({
          type: 'error',
          text: error.message || `Spieler "${playerEntry.name}" konnte nicht angelegt werden.`
        });
      } finally {
        setCreatingPlayerKey(null);
      }
    },
    [creatingPlayerKey, setParserMessage, setMeetingDetails]
  );

  const handleDeleteMatchday = useCallback(
    async (match) => {
      if (!match?.id) return;
      const confirmMessage = `Soll der Matchday vom ${
        match.match_date ? new Date(match.match_date).toLocaleDateString('de-DE') : 'unbekannten Datum'
      } (${match.league || 'Liga n/a'}) wirklich gelöscht werden?`;
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;

      setDeletingMatchdayId(match.id);
      try {
        const response = await fetch('/api/import/meeting-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchdayId: match.id, cleanupOnly: true })
        });

        const raw = await response.text();
        let result = null;
        if (raw) {
          try {
            result = JSON.parse(raw);
          } catch (parseError) {
            console.warn('⚠️ Cleanup-Antwort konnte nicht geparst werden:', parseError);
          }
        }

        if (!response.ok || !result?.success) {
          const message =
            result?.error || (raw && raw.trim().length ? raw : `Serverfehler (${response.status}) beim Löschen des Matchdays.`);
          throw new Error(message);
        }

        setSeasonMatchdays((prev) => prev.filter((entry) => entry.id !== match.id));
        setMeetingDetails((prev) => {
          if (!prev[match.id]) return prev;
          const next = { ...prev };
          delete next[match.id];
          return next;
        });
        setMatchResultsData((prev) => {
          if (!prev[match.id]) return prev;
          const next = { ...prev };
          delete next[match.id];
          return next;
        });
        setSelectedSeasonMatch((prev) => (prev?.id === match.id ? null : prev));
        setParserMessage({ type: 'success', text: 'Matchday wurde gelöscht.' });
        await loadDashboardData();
      } catch (error) {
        console.error('❌ Matchday löschen fehlgeschlagen:', error);
        setParserMessage({ type: 'error', text: error.message || 'Matchday konnte nicht gelöscht werden.' });
      } finally {
        setDeletingMatchdayId(null);
      }
    },
    [loadDashboardData, setParserMessage, setSeasonMatchdays, setMeetingDetails, setMatchResultsData, setSelectedSeasonMatch]
  );

  const handleReassignMatchTeams = useCallback(
    async (match, nextHomeTeamId, nextAwayTeamId, context = {}) => {
      if (!match?.id) {
        throw new Error('Matchday nicht gefunden.');
      }
      if (!nextHomeTeamId || !nextAwayTeamId) {
        throw new Error('Bitte wähle sowohl Heim- als auch Gastteam aus.');
      }
      if (nextHomeTeamId === nextAwayTeamId) {
        throw new Error('Heim- und Gastteam dürfen nicht identisch sein.');
      }
      if (
        nextHomeTeamId === match.home_team_id &&
        nextAwayTeamId === match.away_team_id
      ) {
        throw new Error('Keine Änderung erkannt. Bitte wähle andere Teams.');
      }

      // Prüfe ob virtuelle Teams erstellt werden müssen
      let resolvedHomeTeamId = nextHomeTeamId;
      let resolvedAwayTeamId = nextAwayTeamId;

      // Erstelle virtuelles Heimteam falls nötig
      if (nextHomeTeamId.startsWith('virtual:')) {
        const nuLigaTeamName = nextHomeTeamId.replace('virtual:', '');
        const { clubName, suffix } = splitTeamLabel(nuLigaTeamName);
        
        // Suche oder erstelle Club
        let clubId = null;
        const existingClub = clubs.find((c) => normalizeString(c.name) === normalizeString(clubName));
        if (existingClub) {
          clubId = existingClub.id;
        } else {
          // Erstelle neuen Club
          const { data: newClub, error: clubError } = await supabase
            .from('club_info')
            .insert({
              name: clubName,
              normalized_name: normalizeString(clubName),
              data_source: 'tvm_scraper',
              is_verified: false
            })
            .select()
            .single();
          if (clubError) throw new Error(`Fehler beim Erstellen des Clubs "${clubName}": ${clubError.message}`);
          clubId = newClub.id;
          setClubs((prev) => [newClub, ...prev]);
        }

      // Erstelle Team
        const { data: newTeam, error: teamError } = await supabase
          .from('team_info')
          .insert({
            club_id: clubId,
            club_name: clubName,
            team_name: suffix || null,
          // Kategorie aus Match-Kontext ableiten: bevorzugt Kategorie des Gegners/anderen Teams
          category: (() => {
            const opponentCategory =
              (match.away_team_id && teamById.get(match.away_team_id)?.category) ||
              (match.home_team_id && teamById.get(match.home_team_id)?.category) ||
              null;
            return opponentCategory || null;
          })(),
            region: null
          })
          .select()
          .single();
        if (teamError) throw new Error(`Fehler beim Erstellen des Teams "${nuLigaTeamName}": ${teamError.message}`);
        resolvedHomeTeamId = newTeam.id;
        setTeams((prev) => [newTeam, ...prev]);
      }

      // Erstelle virtuelles Gastteam falls nötig
      if (nextAwayTeamId.startsWith('virtual:')) {
        const nuLigaTeamName = nextAwayTeamId.replace('virtual:', '');
        const { clubName, suffix } = splitTeamLabel(nuLigaTeamName);
        
        // Suche oder erstelle Club
        let clubId = null;
        const existingClub = clubs.find((c) => normalizeString(c.name) === normalizeString(clubName));
        if (existingClub) {
          clubId = existingClub.id;
        } else {
          // Erstelle neuen Club
          const { data: newClub, error: clubError } = await supabase
            .from('club_info')
            .insert({
              name: clubName,
              normalized_name: normalizeString(clubName),
              data_source: 'tvm_scraper',
              is_verified: false
            })
            .select()
            .single();
          if (clubError) throw new Error(`Fehler beim Erstellen des Clubs "${clubName}": ${clubError.message}`);
          clubId = newClub.id;
          setClubs((prev) => [newClub, ...prev]);
        }

      // Erstelle Team
        const { data: newTeam, error: teamError } = await supabase
          .from('team_info')
          .insert({
            club_id: clubId,
            club_name: clubName,
            team_name: suffix || null,
          // Kategorie aus Match-Kontext ableiten: bevorzugt Kategorie des Gegners/anderen Teams
          category: (() => {
            const opponentCategory =
              (match.home_team_id && teamById.get(match.home_team_id)?.category) ||
              (match.away_team_id && teamById.get(match.away_team_id)?.category) ||
              null;
            return opponentCategory || null;
          })(),
            region: null
          })
          .select()
          .single();
        if (teamError) throw new Error(`Fehler beim Erstellen des Teams "${nuLigaTeamName}": ${teamError.message}`);
        resolvedAwayTeamId = newTeam.id;
        setTeams((prev) => [newTeam, ...prev]);
      }

      const updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from('matchdays')
        .update({
          home_team_id: resolvedHomeTeamId,
          away_team_id: resolvedAwayTeamId,
          updated_at: updatedAt
        })
        .eq('id', match.id);

      if (error) {
        throw error;
      }

      const updatedHomeTeam = teamById.get(resolvedHomeTeamId);
      const updatedAwayTeam = teamById.get(resolvedAwayTeamId);

      setSeasonMatchdays((prev) =>
        prev.map((entry) =>
          entry.id === match.id
            ? {
                ...entry,
                home_team_id: nextHomeTeamId,
                away_team_id: nextAwayTeamId
              }
            : entry
        )
      );

      setMeetingDetails((prev) => {
        const next = { ...prev };
        if (next[match.id]) {
          next[match.id] = {
            ...next[match.id],
            error: null,
            data: null
          };
        }
        return next;
      });

      setSelectedSeasonMatch((prev) => {
        if (!prev || prev.id !== match.id) return prev;
        return {
          ...prev,
          home_team_id: nextHomeTeamId,
          away_team_id: nextAwayTeamId
        };
      });

      try {
        await LoggingService.logActivity('matchday_reassign_teams', 'matchday', match.id, {
          previous_home_team_id: match.home_team_id,
          previous_away_team_id: match.away_team_id,
          new_home_team_id: resolvedHomeTeamId,
          new_away_team_id: resolvedAwayTeamId,
          meeting_home_team: context.meetingHomeTeam || null,
          meeting_away_team: context.meetingAwayTeam || null,
          group_name: match.group_name,
          league: match.league,
          teams_created: nextHomeTeamId.startsWith('virtual:') || nextAwayTeamId.startsWith('virtual:')
        });
      } catch (logError) {
        console.warn('⚠️ Logging failed (non-critical):', logError);
      }

      return {
        homeTeam: updatedHomeTeam,
        awayTeam: updatedAwayTeam
      };
    },
    [supabase, teamById, setSeasonMatchdays, clubs, setClubs, setTeams]
  );

  const handleClubSearch = useCallback(
    async (summary, query) => {
      setClubSearchQueries((prev) => ({ ...prev, [summary.clubName]: query }));
      if (!query || query.trim().length < 2) {
        setClubSearchResults((prev) => ({ ...prev, [summary.clubName]: [] }));
        return;
      }

      try {
        const normalizedQuery = query.trim();
        const { data, error } = await supabase
          .from('club_info')
          .select('id, name, city, region, data_source')
          .ilike('name', `%${normalizedQuery}%`)
          .limit(15);

        if (error) throw error;

        const scored = (data || []).map((club) => ({
          club,
          score: calculateSimilarity(summary.clubName, club.name || '')
        }));

        scored.sort((a, b) => b.score - a.score || (a.club.name || '').localeCompare(b.club.name || ''));

        setClubSearchResults((prev) => ({
          ...prev,
          [summary.clubName]: scored
        }));
      } catch (error) {
        console.error('❌ Fehler bei Club-Suche:', error);
        setClubSearchResults((prev) => ({ ...prev, [summary.clubName]: [] }));
        setScraperError(`❌ Fehler beim Import von "${summary.clubName}": ${error.message}`);
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Rendering-Helfer
  // ---------------------------------------------------------------------------
  const filteredPlayers = useMemo(() => {
    const term = playerSearch.toLowerCase();
    if (!term) return players;
    return players.filter((player) =>
      player.name?.toLowerCase().includes(term) || player.email?.toLowerCase().includes(term)
    );
  }, [players, playerSearch]);

  const sortedPlayers = useMemo(() => {
    const deriveClub = (player) => player?.primary_team?.club_name || '';

    const parseLk = (value) => {
      if (!value) return Number.POSITIVE_INFINITY;
      const normalized = value.toString().replace(',', '.').replace(/[^0-9.]/g, '');
      const parsed = parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    };

    const statusPriority = ['app_user', 'external', 'opponent'];
    const getStatusRank = (player) => {
      if (player?.user_id && player?.is_active !== false) return 0;
      const idx = statusPriority.indexOf(player?.player_type || '');
      return idx === -1 ? statusPriority.length : idx;
    };

    const arr = [...filteredPlayers];
    arr.sort((a, b) => {
      let comparison = 0;
      switch (playerSort.column) {
        case 'lk':
          comparison = parseLk(a.current_lk) - parseLk(b.current_lk);
          break;
        case 'club': {
          const clubA = deriveClub(a).toLowerCase();
          const clubB = deriveClub(b).toLowerCase();
          comparison = clubA.localeCompare(clubB);
          break;
        }
        case 'status':
          comparison = getStatusRank(a) - getStatusRank(b);
          break;
        case 'registered':
          comparison = new Date(a.created_at || 0) - new Date(b.created_at || 0);
          break;
        case 'last_login':
          comparison = new Date(a.last_login_at || 0) - new Date(b.last_login_at || 0);
          break;
        case 'name':
        default:
          comparison = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
          break;
      }

      if (playerSort.direction === 'desc') {
        comparison *= -1;
      }
      return comparison;
    });

    return arr;
  }, [filteredPlayers, playerSort]);

  const handlePlayerSort = useCallback((column) => {
    setPlayerSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  // Funktion zum Aktualisieren der meeting_id für vergangene Spiele ohne Detailsergebnisse
  const handleUpdateMeetingIdsForPastMatches = useCallback(async () => {
    if (updatingMeetingIds) return;
    
    setUpdatingMeetingIds(true);
    setMeetingIdUpdateResult(null);
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Finde alle vergangenen Matchdays ohne Detailsergebnisse
      const { data: matchdays, error: fetchError } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          meeting_id,
          group_name,
          home_team_id,
          away_team_id,
          season,
          league,
          match_results(count)
        `)
        .lt('match_date', today.toISOString())
        .order('match_date', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Filtere nur die ohne Detailsergebnisse
      const matchdaysWithoutResults = (matchdays || []).filter(md => {
        const resultsCount = Array.isArray(md.match_results) && md.match_results.length 
          ? md.match_results[0]?.count || 0 
          : 0;
        return resultsCount === 0;
      });
      
      if (matchdaysWithoutResults.length === 0) {
        setMeetingIdUpdateResult({
          type: 'success',
          message: 'Keine vergangenen Spiele ohne Detailsergebnisse gefunden.'
        });
        setUpdatingMeetingIds(false);
        return;
      }
      
      console.log(`🔍 Aktualisiere meeting_id für ${matchdaysWithoutResults.length} vergangene Spiele ohne Detailsergebnisse...`);
      
      // ✅ NEU: Lade URLs aus team_seasons (nicht aus matchdays)
      // Gruppiere Matchdays nach group_name + season + league
      const groupKeys = new Set();
      matchdaysWithoutResults.forEach(md => {
        if (md.group_name && md.season && md.league) {
          groupKeys.add(`${md.group_name}::${md.season}::${md.league}`);
        }
      });
      
      // Lade source_url für alle Gruppen aus team_seasons
      const { data: teamSeasons, error: teamSeasonsError } = await supabase
        .from('team_seasons')
        .select('group_name, season, league, source_url, source_type')
        .in('group_name', Array.from(new Set(matchdaysWithoutResults.map(md => md.group_name).filter(Boolean))))
        .in('season', Array.from(new Set(matchdaysWithoutResults.map(md => md.season).filter(Boolean))))
        .in('league', Array.from(new Set(matchdaysWithoutResults.map(md => md.league).filter(Boolean))));
      
      if (teamSeasonsError) {
        console.warn('⚠️ Fehler beim Laden der team_seasons:', teamSeasonsError);
      }
      
      // Erstelle Map: group_name::season::league -> source_url
      const urlMap = new Map();
      (teamSeasons || []).forEach(ts => {
        const key = `${ts.group_name}::${ts.season}::${ts.league}`;
        if (ts.source_url && !urlMap.has(key)) {
          urlMap.set(key, ts.source_url);
        }
      });
      
      let updated = 0;
      let failed = 0;
      const errors = [];
      
      // Gruppiere nach source_url (aus team_seasons), um effizienter zu scrapen
      const groupedByUrl = new Map();
      matchdaysWithoutResults.forEach(md => {
        const key = md.group_name && md.season && md.league 
          ? `${md.group_name}::${md.season}::${md.league}` 
          : null;
        const url = key && urlMap.has(key) ? urlMap.get(key) : 'default';
        if (!groupedByUrl.has(url)) {
          groupedByUrl.set(url, []);
        }
        groupedByUrl.get(url).push(md);
      });
      
      // ✅ HELPER: Bestimme die richtige leagueOverviewUrl basierend auf Liga und Kategorie
      const getLeagueOverviewUrl = async (league, groupName, season) => {
        // WICHTIG: "Köln-Leverkusen" Ligen brauchen einen anderen championship-Parameter!
        let baseUrl;
        let tab = 2; // Default: Damen/Herren (offen)
        
        // Prüfe Liga-Name für championship-Parameter
        if (league && league.includes('Köln-Leverkusen')) {
          // Köln-Leverkusen Ligen verwenden championship=Köln-Leverkusen+Winter+2025%2F2026
          baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
          
          // ✅ Normalisiere Liga-Name: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
          // Extrahiere Kategorie aus Liga-Name für Tab-Bestimmung
          const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
          let categoryForTab = categoryMatch ? categoryMatch[1] : '';
          if (categoryMatch && categoryMatch[2]) {
            const number = parseInt(categoryMatch[2], 10);
            // Wenn Zahl >= 30 → Altersklasse, sonst Mannschaftsnummer (1-3)
            if (number >= 30) {
              categoryForTab = `${categoryMatch[1]} ${number}`;
            }
          }
          
          // Bestimme Tab basierend auf Altersklasse:
          // - "Herren 30/40/50/55/60/65/70" = Senioren (tab=3)
          // - "Herren" (ohne Altersklasse) = Offene Herren (tab=2)
          // - "Herren 1/2/3" = Mannschaftsnummern, KEINE Altersklassen! → "Herren" (tab=2)
          // - "Damen 30/40/50/55/60" = Senioren (tab=3)
          // - "Damen" (ohne Altersklasse) = Offene Damen (tab=2)
          if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
            tab = 3; // Senioren
          } else {
            tab = 2; // Offene Herren/Damen
          }
          
          return `${baseUrl}&tab=${tab}`;
        } else {
          // Andere Ligen (z.B. Verbandsliga, Mittelrheinliga) verwenden championship=TVM+Winter+2025%2F2026
          baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=TVM+Winter+2025%2F2026';
          
          // Versuche Kategorie aus einem Team dieser Gruppe zu holen, um Tab-Seite zu bestimmen
          try {
            const { data: teamSeason } = await supabase
              .from('team_seasons')
              .select('team_id')
              .eq('group_name', groupName)
              .eq('season', season)
              .eq('league', league)
              .limit(1)
              .maybeSingle();
            
            if (teamSeason?.team_id) {
              const { data: teamInfo } = await supabase
                .from('team_info')
                .select('category')
                .eq('id', teamSeason.team_id)
                .maybeSingle();
              
              if (teamInfo?.category) {
                // ✅ Normalisiere Kategorie: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
                const normalizedCategory = normalizeCategory(teamInfo.category);
                
                // Bestimme Tab basierend auf Kategorie: "Herren 30/40/50/etc." = Senioren (tab=3)
                if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                  tab = 3; // Senioren
                } else {
                  tab = 2; // Offene Herren/Damen
                }
              }
            }
          } catch (error) {
            console.warn(`[getLeagueOverviewUrl] ⚠️ Fehler beim Laden der Kategorie:`, error);
            // Fallback zu tab=2
            tab = 2;
          }
          
          return `${baseUrl}&tab=${tab}`;
        }
      };
      
      // Verarbeite jede URL-Gruppe
      for (const [sourceUrl, matchdays] of groupedByUrl.entries()) {
        // Prüfe, ob source_url eine Gruppen-URL oder eine Übersichts-URL ist
        let isGroupUrl = false;
        let groupIdFromUrl = null;
        let leagueOverviewUrl = null; // Wird später bestimmt
        
        if (sourceUrl && sourceUrl !== 'default') {
          try {
            const url = new URL(sourceUrl);
            // Prüfe, ob es eine Gruppen-URL ist (enthält groupPage und group= Parameter)
            if (url.pathname.includes('groupPage') && url.searchParams.has('group')) {
              isGroupUrl = true;
              groupIdFromUrl = url.searchParams.get('group');
              // Konvertiere Gruppen-URL zu Übersichts-URL (leaguePage)
              // Extrahiere championship Parameter
              const championship = url.searchParams.get('championship');
              if (championship) {
                // Extrahiere tab aus URL, falls vorhanden, sonst bestimme basierend auf Liga
                const existingTab = url.searchParams.get('tab');
                if (existingTab) {
                  leagueOverviewUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${encodeURIComponent(championship)}&tab=${existingTab}`;
                } else {
                  // Bestimme tab basierend auf Liga (erste Matchday als Referenz)
                  const firstMatchday = matchdays[0];
                  if (firstMatchday) {
                    leagueOverviewUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
                  }
                }
              } else {
                // Falls kein championship Parameter, bestimme basierend auf Liga
                const firstMatchday = matchdays[0];
                if (firstMatchday) {
                  leagueOverviewUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
                }
              }
            } else if (url.pathname.includes('leaguePage')) {
              // Es ist bereits eine Übersichts-URL
              leagueOverviewUrl = sourceUrl;
            } else if (url.pathname.includes('teamPortrait')) {
              // ✅ WICHTIG: teamPortrait URLs müssen zu leaguePage URLs konvertiert werden
              const championship = url.searchParams.get('championship');
              if (championship) {
                // Bestimme tab basierend auf Liga (erste Matchday als Referenz)
                const firstMatchday = matchdays[0];
                if (firstMatchday) {
                  // Bestimme tab basierend auf Liga
                  const league = firstMatchday.league || '';
                  let tab = 2; // Default: Damen/Herren
                  
                  if (league.includes('Köln-Leverkusen')) {
                    const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
                    let categoryForTab = categoryMatch ? categoryMatch[1] : '';
                    if (categoryMatch && categoryMatch[2]) {
                      const number = parseInt(categoryMatch[2], 10);
                      if (number >= 30) {
                        categoryForTab = `${categoryMatch[1]} ${number}`;
                      }
                    }
                    
                    if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
                      tab = 3; // Senioren
                    } else {
                      tab = 2; // Offene Herren/Damen
                    }
                  } else {
                    // TVM Ligen: Versuche Kategorie aus Team zu holen
                    try {
                      const { data: teamSeason } = await supabase
                        .from('team_seasons')
                        .select('team_id')
                        .eq('group_name', firstMatchday.group_name)
                        .eq('season', firstMatchday.season)
                        .eq('league', firstMatchday.league)
                        .limit(1)
                        .maybeSingle();
                      
                      if (teamSeason?.team_id) {
                        const { data: teamInfo } = await supabase
                          .from('team_info')
                          .select('category')
                          .eq('id', teamSeason.team_id)
                          .maybeSingle();
                        
                        if (teamInfo?.category) {
                          const normalizedCategory = normalizeCategory(teamInfo.category);
                          if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                            tab = 3; // Senioren
                          } else {
                            tab = 2; // Offene Herren/Damen
                          }
                        }
                      }
                    } catch (error) {
                      console.warn(`[handleUpdateMeetingIdsForPastMatches] ⚠️ Fehler beim Laden der Kategorie:`, error);
                      tab = 2;
                    }
                  }
                  
                  leagueOverviewUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${encodeURIComponent(championship)}&tab=${tab}`;
                  console.log(`[handleUpdateMeetingIdsForPastMatches] ✅ teamPortrait URL konvertiert zu leaguePage: ${leagueOverviewUrl} (original: ${sourceUrl})`);
                }
              } else {
                // Falls kein championship Parameter, bestimme basierend auf Liga
                const firstMatchday = matchdays[0];
                if (firstMatchday) {
                  leagueOverviewUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
                }
              }
            } else {
              // Unbekannte URL-Struktur, bestimme basierend auf Liga
              const firstMatchday = matchdays[0];
              if (firstMatchday) {
                leagueOverviewUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
              }
            }
          } catch (e) {
            // URL-Parsing fehlgeschlagen, bestimme basierend auf Liga
            console.warn(`⚠️ Konnte URL nicht parsen: ${sourceUrl}, bestimme basierend auf Liga`, e);
            const firstMatchday = matchdays[0];
            if (firstMatchday) {
              leagueOverviewUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
            }
          }
        } else {
          // source_url ist NULL oder 'default' - bestimme basierend auf Liga
          // WICHTIG: Jede Gruppe kann eine andere tab-Seite haben!
          // Daher müssen wir pro Gruppe die URL bestimmen
        }
        
        // Sammle alle eindeutigen Gruppen-IDs für diese URL-Gruppe
        const groupIdToMatchdays = new Map();
        
        matchdays.forEach(md => {
          let groupId = null;
          
          // Priorität 1: groupId aus URL (wenn source_url eine Gruppen-URL ist)
          if (isGroupUrl && groupIdFromUrl) {
            groupId = groupIdFromUrl;
          } else {
            // Priorität 2: Extrahiere groupId aus group_name
            const groupNameMatch = md.group_name?.match(/Gr\.\s*(\d+)/i) || md.group_name?.match(/(\d{3})/);
            if (groupNameMatch) {
              groupId = groupNameMatch[1];
            }
          }
          
          if (groupId) {
            if (!groupIdToMatchdays.has(groupId)) {
              groupIdToMatchdays.set(groupId, []);
            }
            groupIdToMatchdays.get(groupId).push(md);
          }
        });
        
        if (groupIdToMatchdays.size === 0) {
          console.warn(`⚠️ Keine Gruppen-IDs gefunden für URL: ${sourceUrl}`);
          failed += matchdays.length;
          errors.push({ url: sourceUrl, error: 'Keine Gruppen-IDs gefunden' });
          continue;
        }
        
        // Scrape nuLiga für alle Gruppen dieser URL
        for (const [groupId, groupMatchdays] of groupIdToMatchdays.entries()) {
          try {
            // ✅ WICHTIG: Bestimme leagueOverviewUrl für diese spezifische Gruppe
            // (falls noch nicht bestimmt oder source_url NULL ist)
            let groupLeagueUrl = leagueOverviewUrl;
            let triedUrls = [];
            
            if (!groupLeagueUrl) {
              // Bestimme basierend auf der ersten Matchday dieser Gruppe
              const firstMatchday = groupMatchdays[0];
              if (firstMatchday) {
                groupLeagueUrl = await getLeagueOverviewUrl(firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
                triedUrls.push(groupLeagueUrl);
                console.log(`[handleUpdateMeetingIdsForPastMatches] ✅ Bestimme URL für Gruppe ${groupId}: ${groupLeagueUrl} (Liga: ${firstMatchday.league})`);
              }
            } else {
              triedUrls.push(groupLeagueUrl);
            }
            
            // ✅ ROBUST: Wenn source_url NULL ist, versuche BEIDE Tab-Seiten (tab=2 und tab=3)
            // Das ist notwendig, weil wir nicht sicher wissen können, auf welcher Tab-Seite die Gruppe ist
            if (!groupLeagueUrl || sourceUrl === 'default' || !sourceUrl) {
              const firstMatchday = groupMatchdays[0];
              if (firstMatchday && firstMatchday.league) {
                // Bestimme championship-Parameter
                let championship;
                if (firstMatchday.league.includes('Köln-Leverkusen')) {
                  championship = 'K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
                } else {
                  championship = 'TVM+Winter+2025%2F2026';
                }
                
                const baseUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${championship}`;
                triedUrls = [
                  `${baseUrl}&tab=2`, // Damen/Herren (offen)
                  `${baseUrl}&tab=3`  // Senioren
                ];
                console.log(`[handleUpdateMeetingIdsForPastMatches] 🔄 Versuche beide Tab-Seiten für Gruppe ${groupId} (tab=2 und tab=3)`);
              }
            }
            
            if (triedUrls.length === 0) {
              throw new Error(`Konnte keine leagueOverviewUrl für Gruppe ${groupId} bestimmen`);
            }
            
            // Versuche jede URL, bis eine funktioniert
            let groupDetail = null;
            let successfulUrl = null;
            let lastError = null;
            
            for (const tryUrl of triedUrls) {
              try {
                const urlInfo = sourceUrl && sourceUrl !== 'default' 
                  ? ` (source_url: ${sourceUrl}, verwendet: ${tryUrl})`
                  : ` (source_url: NULL, versuche: ${tryUrl})`;
                console.log(`🔍 Scrape nuLiga für Gruppe ${groupId}${urlInfo}...`);
                
                const response = await fetch('/api/import/scrape-nuliga', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    groups: groupId,
                    leagueUrl: tryUrl,
                    includeMatches: true
                  })
                });
                
                const rawText = await response.text();
                let data;
                try {
                  data = rawText ? JSON.parse(rawText) : null;
                } catch (parseError) {
                  lastError = new Error('Antwort konnte nicht geparst werden');
                  continue; // Versuche nächste URL
                }
                
                if (!response.ok || !data?.success) {
                  lastError = new Error(data?.error || `HTTP ${response.status}`);
                  continue; // Versuche nächste URL
                }
                
                // Finde die passende Gruppe in den Ergebnissen
                const details = Array.isArray(data.details) ? data.details : [];
                const foundGroupDetail = details.find(entry => {
                  const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
                  // Normalisiere groupId (entferne führende Nullen)
                  const normalizedEntryId = entryGroupId ? String(parseInt(entryGroupId, 10)) : null;
                  const normalizedSearchId = String(parseInt(groupId, 10));
                  return normalizedEntryId === normalizedSearchId;
                });
                
                if (foundGroupDetail && foundGroupDetail.matches && foundGroupDetail.matches.length > 0) {
                  groupDetail = foundGroupDetail;
                  successfulUrl = tryUrl;
                  console.log(`✅ Gruppe ${groupId} gefunden auf ${tryUrl}`);
                  break; // Erfolg! Verlasse die Schleife
                } else {
                  // Gruppe nicht auf dieser Tab-Seite gefunden, versuche nächste
                  console.log(`ℹ️ Gruppe ${groupId} nicht auf ${tryUrl} gefunden, versuche nächste Tab-Seite...`);
                  continue;
                }
              } catch (tryError) {
                lastError = tryError;
                console.warn(`⚠️ Fehler beim Versuch mit ${tryUrl}:`, tryError.message);
                continue; // Versuche nächste URL
              }
            }
            
            // Prüfe ob Gruppe gefunden wurde
            if (!groupDetail || !groupDetail.matches || groupDetail.matches.length === 0) {
              console.warn(`⚠️ Keine Matches gefunden für Gruppe ${groupId} auf beiden Tab-Seiten`);
              failed += groupMatchdays.length;
              errors.push({ 
                groupId, 
                error: `Keine Matches in nuLiga gefunden (versucht: ${triedUrls.join(', ')})`,
                lastError: lastError?.message
              });
              continue;
            }
            
            // ✅ Speichere die erfolgreiche URL in team_seasons für zukünftige Verwendung
            if (successfulUrl && (sourceUrl === 'default' || !sourceUrl)) {
              const firstMatchday = groupMatchdays[0];
              if (firstMatchday) {
                try {
                  // Aktualisiere source_url in team_seasons für diese Gruppe
                  const { error: updateError } = await supabase
                    .from('team_seasons')
                    .update({ source_url: successfulUrl, source_type: 'league_overview' })
                    .eq('group_name', firstMatchday.group_name)
                    .eq('season', firstMatchday.season)
                    .eq('league', firstMatchday.league);
                  
                  if (!updateError) {
                    console.log(`✅ source_url für Gruppe ${groupId} gespeichert: ${successfulUrl}`);
                  } else {
                    console.warn(`⚠️ Konnte source_url nicht speichern:`, updateError);
                  }
                } catch (saveError) {
                  console.warn(`⚠️ Fehler beim Speichern der source_url:`, saveError);
                }
              }
            }
            
            // Finde passende Matches und aktualisiere meeting_id
            for (const matchday of groupMatchdays) {
              // Lade Team-Informationen
              const homeTeam = teamById.get(matchday.home_team_id);
              const awayTeam = teamById.get(matchday.away_team_id);
              
              if (!homeTeam || !awayTeam) {
                failed++;
                errors.push({ matchdayId: matchday.id, error: 'Teams nicht gefunden' });
                continue;
              }
              
              const homeLabel = buildTeamLabel(homeTeam);
              const awayLabel = buildTeamLabel(awayTeam);
              const matchDateKey = matchday.match_date ? new Date(matchday.match_date).toISOString().split('T')[0] : null;
              
              // VERBESSERT: Finde passendes Match in den gescrapten Daten mit robusterem Matching
              const normalizedHomeLabel = normalizeString(homeLabel);
              const normalizedAwayLabel = normalizeString(awayLabel);
              
              // Sammle alle Kandidaten für besseres Debugging
              const candidates = groupDetail.matches
                .map(m => {
                  const mDate = m.matchDateIso ? new Date(m.matchDateIso).toISOString().split('T')[0] : null;
                  const normalizedMHome = normalizeString(m.homeTeam || '');
                  const normalizedMAway = normalizeString(m.awayTeam || '');
                  
                  // Berechne Similarity für beide Teams
                  const homeSimilarity = calculateSimilarity(normalizedHomeLabel, normalizedMHome);
                  const awaySimilarity = calculateSimilarity(normalizedAwayLabel, normalizedMAway);
                  
                  // Prüfe auch umgekehrte Zuordnung (Heim/Gast vertauscht)
                  const homeSimilarityReversed = calculateSimilarity(normalizedHomeLabel, normalizedMAway);
                  const awaySimilarityReversed = calculateSimilarity(normalizedAwayLabel, normalizedMHome);
                  
                  const dateMatch = mDate === matchDateKey;
                  const hasMeetingId = !!m.meetingId;
                  
                  // ✅ VERBESSERT: Match-Score berechnen
                  // Priorität 1: Exakte Matches (100% Similarity) - auch ohne meeting_id akzeptieren
                  // Priorität 2: Matches mit meeting_id und hoher Similarity (>0.7)
                  const normalScore = (homeSimilarity + awaySimilarity) / 2;
                  const reversedScore = (homeSimilarityReversed + awaySimilarityReversed) / 2;
                  const maxScore = Math.max(normalScore, reversedScore);
                  
                  // Score: Datum muss immer stimmen
                  // Wenn exakt (100% Similarity), akzeptiere auch ohne meeting_id
                  // Sonst nur mit meeting_id
                  const score = dateMatch 
                    ? (maxScore >= 0.99 && !hasMeetingId) 
                      ? maxScore * 0.95 // Exakte Matches ohne meeting_id: leicht reduzierter Score
                      : (hasMeetingId ? maxScore : 0) // Mit meeting_id: normaler Score, ohne: 0 (außer exakt)
                    : 0;
                  
                  return {
                    match: m,
                    dateMatch,
                    hasMeetingId,
                    homeSimilarity,
                    awaySimilarity,
                    homeSimilarityReversed,
                    awaySimilarityReversed,
                    score,
                    date: mDate,
                    scrapedHome: m.homeTeam,
                    scrapedAway: m.awayTeam
                  };
                })
                .filter(c => c.dateMatch) // ✅ Datum muss stimmen, meeting_id ist optional für exakte Matches
                .sort((a, b) => {
                  // Sortiere: Zuerst nach Score, dann bevorzuge Matches mit meeting_id
                  if (Math.abs(a.score - b.score) > 0.01) {
                    return b.score - a.score;
                  }
                  // Bei gleichem Score: bevorzuge Matches mit meeting_id
                  if (a.hasMeetingId !== b.hasMeetingId) {
                    return a.hasMeetingId ? -1 : 1;
                  }
                  return 0;
                });
              
              // ✅ VERBESSERT: Bestes Match finden
              // Akzeptiere exakte Matches (Score >= 0.95) auch ohne meeting_id
              // Oder Matches mit meeting_id und Score > 0.7
              const bestCandidate = candidates.find(c => 
                (c.score >= 0.95) || // Exakte Matches (auch ohne meeting_id)
                (c.hasMeetingId && c.score > 0.7) // Matches mit meeting_id und hoher Similarity
              );
              
              // ✅ VERBESSERT: Akzeptiere auch Matches ohne meeting_id, wenn sie exakt sind
              if (bestCandidate) {
                if (bestCandidate.match.meetingId) {
                  // Match hat meeting_id → aktualisiere direkt
                  const { error: updateError } = await supabase
                    .from('matchdays')
                    .update({ 
                      meeting_id: bestCandidate.match.meetingId,
                      meeting_report_url: bestCandidate.match.meetingReportUrl || null
                    })
                    .eq('id', matchday.id);
                  
                  if (updateError) {
                    failed++;
                    errors.push({ 
                      matchdayId: matchday.id, 
                      error: `DB-Update fehlgeschlagen: ${updateError.message}`,
                      details: { homeLabel, awayLabel, matchDate: matchDateKey }
                    });
                  } else {
                    updated++;
                    console.log(`✅ meeting_id ${bestCandidate.match.meetingId} für Matchday ${matchday.id} aktualisiert (Score: ${(bestCandidate.score * 100).toFixed(1)}%)`);
                  }
                } else if (bestCandidate.score >= 0.95) {
                  // ✅ Match gefunden, aber noch keine meeting_id (exakte Übereinstimmung)
                  // Speichere match_number für spätere Zuordnung
                  const updateData = {};
                  if (bestCandidate.match.matchNumber) {
                    // Speichere match_number in notes oder einem anderen Feld für spätere Zuordnung
                    // Oder wir können es einfach loggen und später manuell aktualisieren
                    console.log(`ℹ️ Match gefunden (Score: ${(bestCandidate.score * 100).toFixed(1)}%), aber noch keine meeting_id. Match Number: ${bestCandidate.match.matchNumber}`);
                    console.log(`   Matchday ID: ${matchday.id}, ${homeLabel} vs. ${awayLabel}, Datum: ${matchDateKey}`);
                  }
                  
                  // Markiere als "gefunden, aber noch ohne meeting_id" - nicht als Fehler
                  // Das Match existiert in nuLiga, hat aber noch keine meeting_id (noch nicht gespielt/Ergebnisse nicht eingetragen)
                  console.log(`✅ Match gefunden für Matchday ${matchday.id}, aber noch keine meeting_id verfügbar (Match existiert in nuLiga, Status: ${bestCandidate.match.status || 'scheduled'})`);
                  
                  // Zähle als "gefunden, aber ohne meeting_id" - nicht als Fehler
                  // Diese Matches können später aktualisiert werden, wenn die meeting_id verfügbar wird
                } else {
                  // Match gefunden, aber Score zu niedrig und keine meeting_id
                  failed++;
                  errors.push({ 
                    matchdayId: matchday.id, 
                    error: `Match gefunden, aber Score zu niedrig (${(bestCandidate.score * 100).toFixed(1)}% < 95%) und keine meeting_id`,
                    details: { 
                      homeLabel, 
                      awayLabel, 
                      matchDate: matchDateKey,
                      foundMatch: `${bestCandidate.scrapedHome} vs. ${bestCandidate.scrapedAway}`,
                      score: bestCandidate.score
                    }
                  });
                }
              } else {
                // VERBESSERT: Detaillierte Fehlermeldung mit allen Kandidaten
                const candidateInfo = candidates.slice(0, 3).map(c => 
                  `"${c.scrapedHome}" vs "${c.scrapedAway}" (Score: ${(c.score * 100).toFixed(1)}%, Datum: ${c.date})`
                ).join('; ');
                
                failed++;
                const errorMsg = `Keine meeting_id gefunden`;
                const errorDetails = {
                  matchdayId: matchday.id,
                  matchDate: matchDateKey,
                  searchedHome: homeLabel,
                  searchedAway: awayLabel,
                  groupId: groupId,
                  totalCandidates: candidates.length,
                  bestCandidates: candidateInfo || 'Keine Kandidaten gefunden',
                  availableMatches: groupDetail.matches.length,
                  availableDates: [...new Set(groupDetail.matches.map(m => m.matchDateIso ? new Date(m.matchDateIso).toISOString().split('T')[0] : null).filter(Boolean))].join(', ')
                };
                
                errors.push({ 
                  matchdayId: matchday.id, 
                  error: errorMsg,
                  details: errorDetails
                });
                
                console.warn(`⚠️ Keine meeting_id gefunden für Matchday ${matchday.id}:`, errorDetails);
              }
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`❌ Fehler beim Scrapen für Gruppe ${groupId}:`, error);
            failed += groupMatchdays.length;
            errors.push({ groupId, error: error.message });
          }
        }
      }
      
      // VERBESSERT: Detaillierte Fehlermeldungen
      const errorSummary = errors.length > 0 ? errors.map((e, idx) => {
        if (e.details) {
          const detailsStr = JSON.stringify(e.details).substring(0, 150);
          return `${idx + 1}. ${e.matchdayId || e.groupId || 'Unbekannt'}: ${e.error}\n   Details: ${detailsStr}`;
        }
        return `${idx + 1}. ${e.matchdayId || e.groupId || 'Unbekannt'}: ${e.error}`;
      }).join('\n') : '';
      
      setMeetingIdUpdateResult({
        type: updated > 0 ? 'success' : 'warning',
        message: `${updated} meeting_id${updated !== 1 ? 's' : ''} aktualisiert, ${failed} fehlgeschlagen.${failed > 0 ? ' Siehe Konsole für Details.' : ''}`,
        updated,
        failed,
        errors: errors.slice(0, 20), // Zeige erste 20 Fehler
        errorSummary: errorSummary.substring(0, 3000) // Erste 3000 Zeichen der Zusammenfassung
      });
      
      // Logge alle Fehler in die Konsole für besseres Debugging
      if (errors.length > 0) {
        console.group(`❌ ${failed} meeting_id Updates fehlgeschlagen:`);
        errors.forEach((e, idx) => {
          console.error(`${idx + 1}. ${e.matchdayId || e.groupId || 'Unbekannt'}:`, e.error);
          if (e.details) {
            console.error('   Details:', e.details);
          }
        });
        console.groupEnd();
      }
      
      // Lade Daten neu
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der meeting_id:', error);
      setMeetingIdUpdateResult({
        type: 'error',
        message: error.message || 'Fehler beim Aktualisieren der meeting_id'
      });
    } finally {
      setUpdatingMeetingIds(false);
    }
  }, [updatingMeetingIds, supabase, teamById, loadDashboardData]);

  const renderOverview = () => (
    <OverviewTab 
      stats={stats} 
      buildInfo={buildInfo} 
      matchdaysWithoutResults={matchdaysWithoutResults}
      matchdaysNeedingMeetingIdUpdate={matchdaysNeedingMeetingIdUpdate}
      updatingMeetingIds={updatingMeetingIds}
      meetingIdUpdateResult={meetingIdUpdateResult}
      onUpdateMeetingIds={handleUpdateMeetingIdsForPastMatches}
      onNavigateToTab={setSelectedTab}
      onLoadDetailsForAllMatches={handleLoadDetailsForAllMatches}
      loadingDetailsForAll={loadingDetailsForAll}
      autoImportStatus={autoImportStatus}
      cronJobLogs={cronJobLogs}
      expandedCronLogId={expandedCronLogId}
      onToggleCronLog={(logId) => setExpandedCronLogId(expandedCronLogId === logId ? null : logId)}
    />
  );

  const renderClubs = () => <ClubsTab clubs={clubs} teams={teams} players={players} />;

  const renderPlayers = () => (
    <PlayersTab
      sortedPlayers={sortedPlayers}
      playerSearch={playerSearch}
      setPlayerSearch={setPlayerSearch}
      playerSort={playerSort}
      handlePlayerSort={handlePlayerSort}
      selectedPlayerRow={selectedPlayerRow}
      setSelectedPlayerRow={setSelectedPlayerRow}
    />
  );

  const renderMatchdays = () => (
    <MatchdaysTab
      seasonMatchdays={seasonMatchdays}
      matchesNeedingParser={matchesNeedingParser}
      parserGroupsNeedingUpdate={parserGroupsNeedingUpdate}
      parserMessage={parserMessage}
      parserProcessing={parserProcessing}
      matchParserStates={matchParserStates}
      meetingDetails={meetingDetails}
      selectedSeasonMatch={selectedSeasonMatch}
      setSelectedSeasonMatch={setSelectedSeasonMatch}
      deletingMatchdayId={deletingMatchdayId}
      teamById={teamById}
      matchResultsData={matchResultsData}
      loadMatchResults={loadMatchResults}
      allTeams={teams}
      handleReassignMatchTeams={handleReassignMatchTeams}
      handleRunParserForAll={handleRunParserForAll}
      handleRunResultParser={handleRunResultParser}
      handleDeleteMatchday={handleDeleteMatchday}
      handleLoadMeetingDetails={handleLoadMeetingDetails}
      handleCreateMissingPlayer={handleCreateMissingPlayer}
      creatingPlayerKey={creatingPlayerKey}
      matchdayDuplicates={matchdayDuplicates}
    />
  );


  const renderScraper = () => (
    <ScraperTab
      scraperApiLoading={scraperApiLoading}
      scraperApiGroups={scraperApiGroups}
      setScraperApiGroups={setScraperApiGroups}
      scraperApiLeagueUrl={scraperApiLeagueUrl}
      setScraperApiLeagueUrl={setScraperApiLeagueUrl}
      scraperApiApplyMode={scraperApiApplyMode}
      setScraperApiApplyMode={setScraperApiApplyMode}
      scraperError={scraperError}
      scraperSuccess={scraperSuccess}
      scraperData={scraperData}
      scraperClubSummaries={scraperClubSummaries}
      scraperStats={scraperStats}
      scraperClubMappings={scraperClubMappings}
      updateClubMapping={updateClubMapping}
      updateTeamMapping={updateTeamMapping}
      clubSearchQueries={clubSearchQueries}
      clubSearchResults={clubSearchResults}
      handleClubSearch={handleClubSearch}
      handleScraperApiFetch={handleScraperApiFetch}
      handleScraperImport={handleScraperImport}
      handleAdoptExistingClub={handleAdoptExistingClub}
      handleCreateClub={handleCreateClub}
      handleCreateTeam={handleCreateTeam}
      handleEnsureTeamSeason={handleEnsureTeamSeason}
      scraperImporting={scraperImporting}
      scraperImportResult={scraperImportResult}
      matchImportResult={matchImportResult}
      scraperMatchSelections={scraperMatchSelections}
      setScraperMatchSelections={setScraperMatchSelections}
      scraperSelectedGroupId={scraperSelectedGroupId}
      setScraperSelectedGroupId={setScraperSelectedGroupId}
      scraperSelectedMatch={scraperSelectedMatch}
      setScraperSelectedMatch={setScraperSelectedMatch}
      scraperMatchStatus={scraperMatchStatus}
      resetScraper={resetScraper}
    />
  );

  const renderGroups = () => (
    <GroupsTab
      teams={teams}
      teamSeasons={teamSeasons}
      matchdays={seasonMatchdays}
      clubs={clubs}
      players={players}
      setTeams={setTeams}
      setClubs={setClubs}
      setTeamSeasons={setTeamSeasons}
      loadDashboardData={loadDashboardData}
      handleLoadMeetingDetails={handleLoadMeetingDetails}
      loadMatchResults={loadMatchResults}
      matchResultsData={matchResultsData}
      handleCreateMissingPlayer={handleCreateMissingPlayer}
      creatingPlayerKey={creatingPlayerKey}
      teamById={teamById}
      handleReassignMatchTeams={handleReassignMatchTeams}
    />
  );

  const renderActivity = () => <ActivityLogTab />;

  // ---------------------------------------------------------------------------
  // Settings Tab - Feature Toggles
  // ---------------------------------------------------------------------------
  const [settings, setSettings] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Lade Settings beim Öffnen des Tabs
  useEffect(() => {
    if (selectedTab === 'settings') {
      loadSettings();
    }
  }, [selectedTab]);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('setting_key');

      if (error) {
        console.error('❌ Fehler beim Laden der Settings:', error);
        return;
      }

      const settingsMap = {};
      (data || []).forEach(setting => {
        settingsMap[setting.setting_key] = setting;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleToggleSetting = async (key, currentValue) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        console.error('❌ Fehler beim Speichern der Einstellung:', error);
        alert('Fehler beim Speichern: ' + error.message);
        return;
      }

      // Aktualisiere lokalen State
      setSettings(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          setting_value: newValue
        }
      }));

      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const renderSettings = () => {
    if (loadingSettings) {
      return <div className="loading-placeholder">Lade Einstellungen…</div>;
    }

    const gamificationBanner = settings['gamification_banner_enabled'];

    return (
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '2rem' }}>⚙️ App-Einstellungen</h2>
        
        {settingsSaved && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #10b981'
          }}>
            ✅ Einstellung erfolgreich gespeichert!
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
            Feature Toggles
          </h3>
          
          {gamificationBanner ? (
            <div style={{
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                  Gamification Banner
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  {gamificationBanner.description || 'Aktiviert/Deaktiviert den "Spielergebnisse eintragen lohnt sich!" Banner auf der Startseite'}
                </p>
              </div>
              <button
                onClick={() => handleToggleSetting('gamification_banner_enabled', gamificationBanner.setting_value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: gamificationBanner.setting_value === 'true' ? '#10b981' : '#6b7280',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {gamificationBanner.setting_value === 'true' ? '✅ Aktiviert' : '❌ Deaktiviert'}
              </button>
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              borderRadius: '0.5rem',
              border: '1px solid #f59e0b'
            }}>
              ⚠️ Einstellung "gamification_banner_enabled" nicht in der Datenbank gefunden. Bitte führe die Migration aus.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // UI Rendering
  // ---------------------------------------------------------------------------
  return (
    <div className="super-admin-dashboard">
      <div className="dashboard-tabs">
        <button className={selectedTab === 'overview' ? 'active' : ''} onClick={() => setSelectedTab('overview')}>
          <CheckCircle size={16} /> Übersicht
        </button>
        <button className={selectedTab === 'clubs' ? 'active' : ''} onClick={() => setSelectedTab('clubs')}>
          <Building2 size={16} /> Vereine
        </button>
        <button className={selectedTab === 'players' ? 'active' : ''} onClick={() => setSelectedTab('players')}>
          <Users size={16} /> Spieler
        </button>
        <button className={selectedTab === 'matchdays' ? 'active' : ''} onClick={() => setSelectedTab('matchdays')} title="Spieltage">
          <CalendarDays size={16} /> Spieltage
        </button>
        <button className={selectedTab === 'scraper' ? 'active' : ''} onClick={() => setSelectedTab('scraper')}>
          <Activity size={16} /> Scraper
        </button>
        <button className={selectedTab === 'import' ? 'active' : ''} onClick={() => setSelectedTab('import')}>
          <Download size={16} /> Import-Tools
        </button>
        <button className={selectedTab === 'nuliga-import' ? 'active' : ''} onClick={() => setSelectedTab('nuliga-import')}>
          <Download size={16} /> nuLiga Import
        </button>
        <button className={selectedTab === 'groups' ? 'active' : ''} onClick={() => setSelectedTab('groups')}>
          <Trophy size={16} /> Gruppen
        </button>
        <button className={selectedTab === 'activity' ? 'active' : ''} onClick={() => setSelectedTab('activity')}>
          <Activity size={16} /> Aktivität
        </button>
        <button className={selectedTab === 'settings' ? 'active' : ''} onClick={() => setSelectedTab('settings')}>
          <Settings size={16} /> Einstellungen
        </button>
      </div>

      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-item">
            <span className="toolbar-label">Zeitraum</span>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="today">Heute</option>
              <option value="week">Letzte Woche</option>
              <option value="month">Letzter Monat</option>
              <option value="all">Alle</option>
            </select>
          </div>
          <div className="toolbar-item">
            <span className="toolbar-label">Log-Filter</span>
            <select value={logsFilter} onChange={(e) => setLogsFilter(e.target.value)}>
              <option value="all">Alle</option>
              <option value="MATCH_IMPORT">Match-Import</option>
              <option value="TEAM_IMPORT">Team-Import</option>
              <option value="LOGIN">Logins</option>
            </select>
          </div>
        </div>
        <button onClick={loadDashboardData} className="btn-modern btn-modern-inactive">
          <RefreshCw size={16} /> Aktualisieren
        </button>
      </div>

      {loading ? (
        <div className="loading-placeholder">Lade Daten…</div>
      ) : (
        <div className="dashboard-content">
          {selectedTab === 'overview' && renderOverview()}
          {selectedTab === 'clubs' && renderClubs()}
          {selectedTab === 'players' && renderPlayers()}
          {selectedTab === 'matchdays' && renderMatchdays()}
          {selectedTab === 'scraper' && renderScraper()}
          {selectedTab === 'import' && <ImportTab />}
          {selectedTab === 'nuliga-import' && <NuLigaImportTab />}
          {selectedTab === 'groups' && renderGroups()}
          {selectedTab === 'activity' && renderActivity()}
          {selectedTab === 'settings' && renderSettings()}
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;

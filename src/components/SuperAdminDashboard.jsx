import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateSimilarity, normalizeString } from '../services/matchdayImportService';
import {
  Users,
  Building2,
  Activity,
  CheckCircle,
  Download,
  RefreshCw,
  CalendarDays
} from 'lucide-react';
import ImportTab from './ImportTab';
import OverviewTab from './superadmin/OverviewTab';
import ClubsTab from './superadmin/ClubsTab';
import PlayersTab from './superadmin/PlayersTab';
import MatchdaysTab from './superadmin/MatchdaysTab';
import ScraperTab from './superadmin/ScraperTab';
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
  const trimmed = value.trim();
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
  const [selectedTab, setSelectedTab] = useState('matchdays');
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
  const [scraperApiApplyMode, setScraperApiApplyMode] = useState(false);
  const [matchParserStates, setMatchParserStates] = useState({});
  const [parserMessage, setParserMessage] = useState(null);
  const [parserProcessing, setParserProcessing] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({});
  const [creatingPlayerKey, setCreatingPlayerKey] = useState(null);
  const [deletingMatchdayId, setDeletingMatchdayId] = useState(null);
  const [matchResultsData, setMatchResultsData] = useState({});

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
      buildTeamKeys(team.team_name, team.club_name).forEach((key) => {
        if (!lookup.has(key)) lookup.set(key, team.id);
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

      if (error?.code === '23505') {
        const { data: existingSeason, error: fetchError } = await supabase
          .from('team_seasons')
          .select('*')
          .eq('team_id', teamId)
          .eq('season', season || null)
          .eq('league', league || null)
          .eq('group_name', groupName || null)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (existingSeason) {
          setTeamSeasons((prev) => {
            if (prev.some((entry) => entry.id === existingSeason.id)) return prev;
            return [existingSeason, ...prev];
          });
          return existingSeason;
        }
        return null;
      }

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
      } else if (scored.length > 0 && scored[0].score >= 0.85) {
        // Nur als Match akzeptieren wenn Score >= 85%
        matchedClub = scored[0].club;
        matchScore = scored[0].score;
        if (matchScore >= 0.95) status = 'existing';
        else if (matchScore >= 0.85) status = 'fuzzy';
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
          .select('*, player_teams:team_memberships!team_memberships_player_id_fkey(team_info(id, club_name, team_name))')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_info')
          .select('*, club_info(id, name)')
          .order('club_name', { ascending: true }),
        supabase
          .from('team_seasons')
          .select('*')
          .order('season', { ascending: true }),
        supabase
          .from('matchdays')
          .select('*, match_results(count)')
          .eq('season', 'Winter 2025/26')
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
      setSeasonMatchdays(matchdaysWithCounts);

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
    } catch (error) {
      console.error('❌ Fehler beim Laden des Dashboards:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, logsFilter, supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
  }, [scraperApiApplyMode, scraperApiGroups]);

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
      const category = teamMapping.category || team.category || null;
      const region = clubRecord?.region || mapping.newClub?.region || null;

      const teamNamePayload = preferredSuffix || preferredTeamName || team.original;

      const payload = {
        club_id: clubId,
        club_name: clubRecord?.name || summary.clubName,
        team_name: teamNamePayload,
        category,
        region
      };

      const { data: createdTeam, error: teamError } = await supabase.from('team_info').insert(payload).select().single();
      if (teamError) throw teamError;

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

        const linkedClubId = mapping.existingClubId;
        if (!linkedClubId) {
          clubIssues.push({ type: 'club-missing', clubName: summary.clubName });
          continue;
        }

        const resolvedClubName =
          existingClubMap.get(linkedClubId)?.name || mapping.newClub?.name || summary.clubName;

        for (const team of summary.teams) {
          const teamMapping = mapping.teams?.[team.normalized];
          if (teamMapping?.import === false) continue;

          const preferredTeamName = teamMapping?.teamName || team.original;
          const preferredSuffix = teamMapping?.teamSuffix || team.suffix || '';

          let resolvedTeamId = teamMapping?.existingTeamId || null;

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
              for (const key of keys) {
                if (existingTeamLookup.has(key)) {
                  resolvedTeamId = existingTeamLookup.get(key);
                  updateTeamMapping(summary.clubName, team.normalized, (current) => ({
                    ...current,
                    existingTeamId: resolvedTeamId
                  }));
                  break;
                }
              }
            }
          }

          if (resolvedTeamId) {
            registerTeamId(preferredTeamName, resolvedClubName, preferredSuffix, resolvedTeamId);
          }
        }
      }

      const getTeamIdForMatch = (teamName) => {
        if (!teamName) return { teamId: null, clubName: '' };
        
        // Strategie 1: Direkter Match im Registry
        const normalizedName = normalizeString(teamName);
        if (teamIdRegistry.has(normalizedName)) {
          return { teamId: teamIdRegistry.get(normalizedName), clubName: '' };
        }

        // Strategie 2: Suche in scraperClubSummaries
        for (const summary of scraperClubSummaries) {
          for (const team of summary.teams) {
            const fullName = `${summary.clubName} ${team.original}`.trim();
            if (normalizeString(fullName) === normalizedName || normalizeString(team.original) === normalizedName) {
              if (team.existingTeamId) {
                console.log(`✅ Match-Import: "${teamName}" → Team-ID ${team.existingTeamId}`);
                teamIdRegistry.set(normalizedName, team.existingTeamId);
                return { teamId: team.existingTeamId, clubName: summary.clubName };
              }
            }
          }
        }

        // Strategie 3: Fallback via splitTeamLabel
        const { clubName, suffix } = splitTeamLabel(teamName || '');
        const keys = buildTeamKeys(teamName, clubName, suffix);

        for (const key of keys) {
          if (existingTeamLookup.has(key)) {
            const teamId = existingTeamLookup.get(key);
            console.log(`✅ Match-Import (Fallback): "${teamName}" → Team-ID ${teamId}`);
            teamIdRegistry.set(normalizedName, teamId);
            return { teamId, clubName: clubName || '' };
          }
        }

        console.error(`❌ Match-Import: Kein Team gefunden für "${teamName}"`);
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
          const shouldImport =
            selection !== undefined ? selection.import !== false : scraperMatchStatus(match).recommended;
          if (!shouldImport) continue;

          const homeLookup = getTeamIdForMatch(match.homeTeam);
          const awayLookup = getTeamIdForMatch(match.awayTeam);

          if (!homeLookup.teamId || !awayLookup.teamId) {
            matchIssues.push({
              type: 'missing-team',
              matchId: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam
            });
            totalMatchesSkipped += 1;
            continue;
          }

          const matchDateIso = match.matchDateIso ? new Date(match.matchDateIso).toISOString() : null;
          if (!matchDateIso) {
            matchIssues.push({ type: 'missing-date', matchId: match.id });
            totalMatchesSkipped += 1;
            continue;
          }

          const matchSeason = match.season || group.group?.season || scraperData.season || null;
          const matchLeague = match.league || group.group?.league || null;
          const matchGroupName = match.groupName || group.group?.groupName || null;
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

        const { data: existingMatch, error: fetchExisting } = await supabase
            .from('matchdays')
          .select('id, home_score, away_score, final_score, status, match_number, match_results(count)')
            .eq('match_date', matchPayload.match_date)
            .eq('home_team_id', matchPayload.home_team_id)
            .eq('away_team_id', matchPayload.away_team_id)
            .maybeSingle();

          if (fetchExisting && fetchExisting.code && fetchExisting.code !== 'PGRST116') {
            throw fetchExisting;
          }

        if (existingMatch) {
          const existingHome = existingMatch.home_score;
          const existingAway = existingMatch.away_score;

          const hasNewScore =
            matchPayload.home_score != null &&
            matchPayload.away_score != null &&
            (existingHome == null ||
              existingAway == null ||
              existingHome !== matchPayload.home_score ||
              existingAway !== matchPayload.away_score);

          const needsMatchNumberUpdate =
            matchPayload.match_number != null &&
            String(matchPayload.match_number) !== String(existingMatch.match_number ?? '');

          const shouldUpdate = hasNewScore || needsMatchNumberUpdate;

          if (shouldUpdate) {
            const updatePayload = {
              status: matchPayload.status
            };

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
                scoreWithoutResults.push({
                  matchId: existingMatch.id,
                  home: match.homeTeam,
                  away: match.awayTeam,
                  score: matchPayload.final_score || `${matchPayload.home_score}:${matchPayload.away_score}`
                });
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
              matchIssues.push({
                type: 'duplicate',
                matchId: null,
                payload: matchPayload
              });
              totalMatchesSkipped += 1;
              continue;
            }
            throw insertError;
          }

          if (insertedMatch) {
            totalMatchesInserted += 1;
            if (hasScoreData(match)) {
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

      if (matchIssues.length || clubIssues.length) {
        console.warn('⚠️ Match-Import Hinweise:', { clubIssues, matchIssues, scoreWithoutResults });
      }

      const messageParts = [
        `${totalMatchesInserted} neue Matchdays`,
        `${totalMatchesUpdated} aktualisierte Scores`,
        `${totalMatchesSkipped} übersprungen`
      ];

      if (scoreWithoutResults.length > 0) {
        messageParts.push(`${scoreWithoutResults.length} Scores ohne Match-Results`);
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
          totalMatchesSkipped
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
    existingClubMap,
    existingTeamLookup,
    resolveTeamStatus,
    updateTeamMapping,
    scraperMatchSelections,
    scraperMatchStatus,
    supabase
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
    const response = await fetch('/api/import/scrape-nuliga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groups: normalizedGroupId,
        includeMatches: true,
        apply: false
      })
    });
    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Scraper antwortete ohne Erfolg.');
    }
    return result;
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
            .select('id, name')
            .in('id', playerIdArray);

          if (!playerError && playerData) {
            playerData.forEach((player) => {
              playerMap.set(player.id, player.name);
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

          if (result.match_type === 'Einzel') {
            if (result.home_player_id) {
              entry.homePlayers.push({ name: playerMap.get(result.home_player_id) || 'Unbekannt' });
            }
            if (result.guest_player_id) {
              entry.awayPlayers.push({ name: playerMap.get(result.guest_player_id) || 'Unbekannt' });
            }
            singles.push(entry);
          } else if (result.match_type === 'Doppel') {
            if (result.home_player1_id) {
              entry.homePlayers.push({ name: playerMap.get(result.home_player1_id) || 'Unbekannt' });
            }
            if (result.home_player2_id) {
              entry.homePlayers.push({ name: playerMap.get(result.home_player2_id) || 'Unbekannt' });
            }
            if (result.guest_player1_id) {
              entry.awayPlayers.push({ name: playerMap.get(result.guest_player1_id) || 'Unbekannt' });
            }
            if (result.guest_player2_id) {
              entry.awayPlayers.push({ name: playerMap.get(result.guest_player2_id) || 'Unbekannt' });
            }
            doubles.push(entry);
          }
        });

        setMatchResultsData((prev) => ({
          ...prev,
          [matchdayId]: { singles, doubles, loaded: true }
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
        const payload = {
          matchdayId: match.id,
          groupId: resolveGroupId(match.group_name),
          matchNumber: match.match_number || extractMatchNumber(match.notes),
          matchDate: match.match_date || match.matchDateIso || null,
          homeTeam: homeLabel,
          awayTeam: awayLabel,
          apply: applyImport
        };

        const meetingMeta = extractMeetingMeta(match);
        if (meetingMeta.meetingId) {
          payload.meetingId = meetingMeta.meetingId;
        }
        if (meetingMeta.meetingUrl) {
          payload.meetingUrl = meetingMeta.meetingUrl;
        }

        if (existing.meetingId) {
          payload.meetingId = existing.meetingId;
        }
        if (existing.meetingUrl && !payload.meetingUrl) {
          payload.meetingUrl = existing.meetingUrl;
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
          const nextMatchNumber =
            result.matchMeta?.matchNumber ||
            existing.matchMeta?.matchNumber ||
            match.match_number ||
            match.matchNumber ||
            null;
          if (nextMatchNumber) {
            await supabase.from('matchdays').update({ match_number: nextMatchNumber }).eq('id', match.id);
          }
          const insertedCount = result.applyResult?.inserted?.length ?? existing.matchResultsCount ?? 0;
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
    const deriveClub = (player) => {
      const team = (player.player_teams || []).find((entry) => entry?.team_info);
      return team?.team_info?.club_name || '';
    };

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

  const renderOverview = () => <OverviewTab stats={stats} buildInfo={buildInfo} />;

  const renderClubs = () => <ClubsTab clubs={clubs} />;

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
      handleRunParserForAll={handleRunParserForAll}
      handleRunResultParser={handleRunResultParser}
      handleDeleteMatchday={handleDeleteMatchday}
      handleLoadMeetingDetails={handleLoadMeetingDetails}
      handleCreateMissingPlayer={handleCreateMissingPlayer}
      creatingPlayerKey={creatingPlayerKey}
    />
  );


  const renderScraper = () => <ScraperTab />;

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
        <button className={selectedTab === 'matchdays' ? 'active' : ''} onClick={() => setSelectedTab('matchdays')}>
          <CalendarDays size={16} /> Matchdays
        </button>
        <button className={selectedTab === 'scraper' ? 'active' : ''} onClick={() => setSelectedTab('scraper')}>
          <Activity size={16} /> Scraper
        </button>
        <button className={selectedTab === 'import' ? 'active' : ''} onClick={() => setSelectedTab('import')}>
          <Download size={16} /> Import-Tools
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
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;

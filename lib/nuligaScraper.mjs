import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { parse } from 'date-fns';
import { de } from 'date-fns/locale';

export const DEFAULT_LEAGUE_URL =
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3';
export const DEFAULT_SEASON_LABEL = 'Winter 2025/26';

const DEFAULT_REQUEST_DELAY_MS = 350;

export async function scrapeNuLiga({
  leagueUrl = DEFAULT_LEAGUE_URL,
  seasonLabel = DEFAULT_SEASON_LABEL,
  groupFilter = null,
  requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
  teamIdMap = {},
  supabaseClient = null,
  applyChanges = false,
  outputDir = null,
  onLog = () => {},
  fetchImpl = globalThis.fetch
} = {}) {
  if (!fetchImpl) {
    throw new Error('Kein fetch-Implementation verfügbar.');
  }

  const results = [];
  const globalUnmappedTeams = new Set();

  const log = (...args) => onLog('[nuliga-scraper]', ...args);

  const teamDirectory = buildTeamDirectory(await fetchExistingTeams(supabaseClient, log), teamIdMap);

  const groupLinks = await fetchGroupLinks({
    leagueUrl,
    groupFilter,
    fetchImpl,
    log
  });

  for (const groupLink of groupLinks) {
    log(`Lade Gruppenseite: ${groupLink.label} (${groupLink.url})`);
    const html = await fetchHtml(groupLink.url, fetchImpl);
    const groupMeta = deriveGroupMeta(html, groupLink, seasonLabel);
    const parsed = parseGroupPage(html, groupMeta);

    const { mapped: teamIdRegistry, unmapped, categoryMismatches } = mapTeamsToIds(
      parsed.teamsDetailed, 
      teamDirectory, 
      groupMeta.category
    );
    unmapped.forEach((name) => globalUnmappedTeams.add(name));
    
    // Warnung bei Kategorie-Mismatches
    if (categoryMismatches.length > 0) {
      log(`⚠️  Kategorie-Mismatches in ${groupMeta.groupName}:`);
      categoryMismatches.forEach(({ teamName, expectedCategory, foundCategory }) => {
        log(`   - ${teamName}: Erwartet ${expectedCategory}, gefunden ${foundCategory}`);
      });
    }

    const groupResult = {
      group: groupMeta,
      matches: parsed.matches,
      standings: parsed.standings,
      teamsDetailed: parsed.teamsDetailed,
      teamCount: parsed.teams.length,
      unmappedTeams: unmapped
    };
    results.push(groupResult);

    if (applyChanges && supabaseClient) {
      if (unmapped.length > 0) {
        throw new Error(`Unbekannte Teams in ${groupMeta.groupName}: ${unmapped.join(', ')}`);
      }
      await upsertTeamSeasons(supabaseClient, Array.from(teamIdRegistry.values()), groupMeta);
      await upsertMatchdays(supabaseClient, parsed.matches, teamIdRegistry, groupMeta);
      log(`✅ Supabase aktualisiert für ${groupMeta.groupName}`);
    } else {
      log(
        `ℹ️  Dry-run für ${groupMeta.groupName}: ${parsed.matches.length} Matches, ${parsed.standings.length} Tabellenzeilen`
      );
    }

    await sleep(requestDelayMs);
  }

  let snapshotPath = null;

  if (!applyChanges && outputDir) {
    const groupIds = results
      .map((r) => r.group?.groupId)
      .filter(Boolean)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const groupNames = results.map((r) => r.group?.groupName).filter(Boolean).join(', ');
    const groupSuffix = groupIds.length > 0 ? `_groups_${groupIds.join('_')}` : '';
    const fileName = `tvm_league_snapshot${groupSuffix || ''}.json`;

    snapshotPath = await writeJsonDump(
      outputDir,
      fileName,
      {
        scrapedAt: new Date().toISOString(),
        leagueUrl,
        season: seasonLabel,
        groupsIncluded: groupNames || 'Alle Gruppen',
        groupIds,
        totalGroups: results.length,
        totalMatches: results.reduce((sum, g) => sum + (g.matches?.length || 0), 0),
        totalTeams: results.reduce((sum, g) => sum + (g.teamsDetailed?.length || 0), 0),
        groups: results
      },
      log
    );

    log(`✅ Snapshot gespeichert: ${fileName}`);
    log(`   📊 ${results.length} Gruppen (${groupNames})`);
    log(`   🎾 ${results.reduce((sum, g) => sum + (g.matches?.length || 0), 0)} Matches`);
  }

  if (globalUnmappedTeams.size > 0) {
    log(
      '⚠️  Unbekannte Teams gefunden. Bitte TEAM_ID_MAP erweitern:',
      Array.from(globalUnmappedTeams).join(', ')
    );
  }

  return {
    results,
    unmappedTeams: Array.from(globalUnmappedTeams),
    snapshotPath
  };
}

export async function fetchGroupLinks({ leagueUrl, groupFilter, fetchImpl, log = () => {} }) {
  log('Lade Ligaübersicht:', leagueUrl);
  const html = await fetchHtml(leagueUrl, fetchImpl);
  const $ = load(html);
  const anchorSelector = 'a[href*="/groupPage"]';
  const groupLinks = [];

  const normalizeGroupId = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return trimmed;
    const withoutLeadingZeros = trimmed.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
  };

  const allowedGroups = groupFilter
    ? groupFilter
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : null;

  const isGroupAllowed = (groupId) => {
    if (!allowedGroups) return true;
    const normalizedGroupId = normalizeGroupId(groupId);
    return allowedGroups.some((candidate) => normalizeGroupId(candidate) === normalizedGroupId);
  };

  $(anchorSelector).each((_, anchor) => {
    const $anchor = $(anchor);
    const href = $anchor.attr('href');
    const text = normaliseText($anchor.text());
    const url = ensureAbsoluteUrl(leagueUrl, href);
    const groupMatch = text.match(/Gr\.\s*(\d+)/i);
    if (!groupMatch || !url) return;
    const rawGroupId = groupMatch[1];
    const normalizedGroupId = normalizeGroupId(rawGroupId);
    let category = '';
    const $groupCell = $anchor.closest('td');
    if ($groupCell.length) {
      const $row = $groupCell.closest('tr');
      if ($row.length) {
        const $cells = $row.find('td');
        if ($cells.length > 0) {
          const firstCell = $cells.first();
          if (firstCell[0] !== $groupCell[0]) {
            category = normaliseText(firstCell.text());
          } else {
            const $prev = $groupCell.prev('td');
            if ($prev.length) {
              category = normaliseText($prev.text());
            }
          }
        }
      }
    }
    if (!category && $groupCell.length) {
      const $prevRow = $groupCell.closest('tr').prev('tr');
      if ($prevRow && $prevRow.length) {
        category = normaliseText($prevRow.find('td').first().text());
      }
    }
    if (category && /gr\.\s*\d+/i.test(category)) {
      category = '';
    }
    if (!isGroupAllowed(normalizedGroupId)) return;
    groupLinks.push({
      url,
      label: text,
      groupId: normalizedGroupId,
      rawGroupId,
      category: category || null
    });
  });

  if (groupLinks.length === 0) {
    throw new Error('Keine Gruppenlinks auf der Ligaübersicht gefunden. Prüfe die URL oder den Gruppenfilter.');
  }

  log(`Gefundene Gruppen-Links: ${groupLinks.map((link) => link.label).join(', ')}`);
  return groupLinks;
}

export function parseGroupPage(html, groupMeta) {
  const $ = load(html);
  const tables = [];
  $('table').each((_, table) => {
    const $table = $(table);
    const headerText = normaliseText($table.find('tr').first().text());
    const type = detectTableType(headerText);
    if (!type) return;
    tables.push({ type, element: table });
  });

  const standings = [];
  const matches = [];
  const teamNames = new Set();
  const teamsDetailed = [];

  for (const { type, element } of tables) {
    const rows = parseTableRows($, element);
    if (type === 'standings') {
      rows.forEach(({ element: rowElement, cells }) => {
        const $row = $(rowElement);
        const teamCell = $row.find('td').eq(2);
        const teamName = normaliseText(teamCell.text());
        if (!teamName) return;

        const rank = parseInteger($row.find('td').eq(1).text());
        const matchesPlayed = parseInteger($row.find('td').eq(3).text());
        const wins = parseInteger($row.find('td').eq(4).text());
        const draws = parseInteger($row.find('td').eq(5).text());
        const losses = parseInteger($row.find('td').eq(6).text());
        const tablePoints = normaliseText($row.find('td').eq(7).text()) || null;
        const matchPoints = normaliseText($row.find('td').eq(8).text()) || null;
        const sets = normaliseText($row.find('td').eq(9).text()) || null;
        const games = normaliseText($row.find('td').eq(10).text()) || null;

        const teamLink = teamCell.find('a').attr('href') || '';
        let teamId = null;
        if (teamLink) {
          try {
            const absolute = new URL(teamLink, 'https://tvm.liga.nu');
            teamId = absolute.searchParams.get('team');
          } catch (_) {
            teamId = null;
          }
        }

        const { clubName, teamSuffix } = splitClubAndTeam(teamName);

        standings.push({
          rank,
          team: teamName,
          teamId,
          clubName,
          teamSuffix,
          matchesPlayed,
          wins,
          draws,
          losses,
          tablePoints,
          matchPoints,
          sets,
          games,
          raw: cells
        });
        teamNames.add(teamName);
        teamsDetailed.push({
          teamName,
          teamId,
          clubName,
          teamSuffix,
          rank,
          matchesPlayed,
          wins,
          draws,
          losses,
          tablePoints,
          matchPoints,
          sets,
          games,
          groupId: groupMeta.groupId,
          groupName: groupMeta.groupName,
          league: groupMeta.league,
          category: groupMeta.category
        });
      });
    }
    if (type === 'matches') {
      rows.forEach(({ cells, element: rowElement }) => {
        const $row = $(rowElement);
        const $cols = $row.find('td');
        if ($cols.length < 11) return;

        const dateCellText = normaliseText($cols.eq(1).text());
        const matchNumberRaw = normaliseText($cols.eq(3).text());
        const venueRaw = normaliseText($cols.eq(4).text());
        const courtRaw = normaliseText($cols.eq(5).text());

        const homeMeta = extractTeamMetaFromCell($cols.eq(6));
        const awayMeta = extractTeamMetaFromCell($cols.eq(7));

        const matchPoints = parseScore(normaliseText($cols.eq(8).text()));
        const setScore = parseScore(normaliseText($cols.eq(9).text()));
        const gameScore = parseScore(normaliseText($cols.eq(10).text()));

        const reportCell = $row.find('td').last();
        const reportText = normaliseText(reportCell.text());
        const reportLink = reportCell.find('a').attr('href') || '';
        const reportLinkText = normaliseText(reportCell.find('a').text());
        let meetingId = null;
        let meetingUrl = null;
        if (reportLink) {
          try {
            const absolute = ensureAbsoluteUrl('https://tvm.liga.nu', reportLink);
            const parsedUrl = new URL(absolute);
            meetingId = parsedUrl.searchParams.get('meeting');
            meetingUrl = absolute;
          } catch (error) {
            meetingId = null;
            meetingUrl = ensureAbsoluteUrl('https://tvm.liga.nu', reportLink);
          }
        }

        const { iso: matchDateIso, time: startTime } = parseDateTime(dateCellText);
        const { start: court_number, end: court_number_end } = parseCourt(courtRaw);

        const status =
          matchPoints || /anzeigen/i.test(reportLinkText)
            ? 'completed'
            : /offen/i.test(reportText)
              ? 'scheduled'
              : 'scheduled';

        const matchId = stableUuid(
          [groupMeta.groupId, matchDateIso || dateCellText, homeMeta.name, awayMeta.name, matchNumberRaw].join('|')
        );

        matches.push({
          id: matchId,
          groupId: groupMeta.groupId,
          groupName: groupMeta.groupName,
          league: groupMeta.league,
          category: groupMeta.category,
          matchDateIso,
          startTime,
          venue: venueRaw || null,
          court_number,
          court_number_end,
          homeTeam: homeMeta.name || null,
          homeTeamId: homeMeta.teamId,
          awayTeam: awayMeta.name || null,
          awayTeamId: awayMeta.teamId,
          matchNumber: matchNumberRaw || null,
          status,
          matchPoints,
          setScore,
          gameScore,
          season: groupMeta.season,
          year: groupMeta.year,
          notes: reportLinkText || reportText || null,
          meetingId: meetingId || null,
          meetingReportUrl: meetingUrl
        });

        if (homeMeta.name) teamNames.add(homeMeta.name);
        if (awayMeta.name) teamNames.add(awayMeta.name);
      });
    }
  }

  return {
    matches,
    standings,
    teams: Array.from(teamNames),
    teamsDetailed
  };
}

export function deriveGroupMeta(groupPageHtml, groupLink, seasonLabel = DEFAULT_SEASON_LABEL) {
  const $ = load(groupPageHtml);
  const headerElement = $('h1').first().length ? $('h1').first() : $('h2').first();
  const headerText = normaliseText(headerElement.text());

  const leagueMatch = headerText.match(/Herren\s+\d+\s+(.*?)\s+Gr\./i);
  const categoryMatch = headerText.match(/^(Herren\s+\d+|Damen\s+\d+)/i);
  const groupLabelMatch = headerText.match(/Gr\.\s*\d+/i);

  const league = leagueMatch ? leagueMatch[1].trim() : 'Unbekannte Liga';
  const category =
    (groupLink.category && groupLink.category.trim()) || (categoryMatch ? categoryMatch[1].trim() : 'Unbekannte Kategorie');
  const groupName = groupLabelMatch ? groupLabelMatch[0].trim() : groupLink.label;

  const seasonFromHeader = extractSeasonFromHeader(headerElement);
  const season = seasonFromHeader || seasonLabel;

  const yearMatch = (season || '').match(/(\d{4})(?:\/(\d{2,4}))?/);
  const year = yearMatch ? `${yearMatch[1]}${yearMatch[2] ? `/${yearMatch[2]}` : ''}` : null;

  return {
    league,
    category,
    groupName,
    groupId: groupLink.groupId,
    season,
    year
  };
}

export async function fetchHtml(url, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'tvm-scraper/1.0 (+https://github.com/jorzig/tennis-team)'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

export function parseDateTime(raw, fallbackTime = '00:00') {
  if (!raw) {
    return { iso: null, time: null };
  }
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/\b(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?/);
  if (!match) {
    return { iso: null, time: null };
  }
  const [, datePart, timePart] = match;
  const timeString = timePart || fallbackTime;
  try {
    const parsed = parse(`${datePart} ${timeString}`, 'dd.MM.yyyy HH:mm', new Date(), { locale: de });
    return { iso: parsed.toISOString(), time: timePart || null };
  } catch (error) {
    return { iso: null, time: timePart || null };
  }
}

export function parseScore(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9:]/g, '').trim();
  if (!cleaned || !cleaned.includes(':')) return null;
  const [home, away] = cleaned.split(':').map((part) => {
    const value = parseInt(part, 10);
    return Number.isNaN(value) ? null : value;
  });
  return {
    home: home ?? null,
    away: away ?? null,
    raw: `${home ?? 0}:${away ?? 0}`
  };
}

export function parseCourt(courtRaw) {
  if (!courtRaw) return { start: null, end: null };
  const cleaned = courtRaw.replace(/\s+/g, '').trim();
  if (!cleaned) return { start: null, end: null };
  const [start, end] = cleaned.split('+').map((value) => parseInt(value, 10));
  return {
    start: Number.isNaN(start) ? null : start,
    end: Number.isNaN(end) ? null : end || null
  };
}

export function splitClubAndTeam(teamName) {
  if (!teamName) {
    return { clubName: '', teamSuffix: null };
  }
  const trimmed = teamName.trim();
  const match = trimmed.match(/^(.*?)(?:\s+([IVXLCM]+|\d+))$/iu);
  if (!match) {
    return { clubName: trimmed, teamSuffix: null };
  }
  const clubName = match[1].trim();
  const teamSuffix = match[2] ? match[2].trim() : null;
  return {
    clubName: clubName || trimmed,
    teamSuffix: teamSuffix || null
  };
}

export function stableUuid(input) {
  const hash = createHash('sha1').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export function normaliseText(value) {
  return value ? value.replace(/\s+/g, ' ').trim() : '';
}

export function parseTableRows($, tableElement) {
  const rows = [];
  $(tableElement)
    .find('tr')
    .each((index, row) => {
      if (index === 0) return;
      const cells = [];
      $(row)
        .find('th, td')
        .each((_, cell) => {
          const cellText = $(cell).text();
          cells.push(normaliseText(cellText));
        });
      rows.push({ cells, element: row });
    });
  return rows;
}

export function detectTableType(headerText) {
  const header = headerText.toLowerCase();
  if (header.includes('mannschaft') && header.includes('tab.punkte')) {
    return 'standings';
  }
  if (header.includes('matchpunkte') && header.includes('spielbericht')) {
    return 'matches';
  }
  return null;
}

export function extractTeamMetaFromCell($cell) {
  if (!$cell || $cell.length === 0) {
    return {
      name: '',
      teamId: null,
      clubName: '',
      teamSuffix: null
    };
  }

  const name = normaliseText($cell.text());
  let teamId = null;
  const link = $cell.find('a').attr('href') || '';
  if (link) {
    try {
      const absolute = new URL(link, 'https://tvm.liga.nu');
      teamId = absolute.searchParams.get('team');
    } catch (_) {
      teamId = null;
    }
  }
  const { clubName, teamSuffix } = splitClubAndTeam(name);
  return {
    name,
    teamId,
    clubName,
    teamSuffix
  };
}

export function parseInteger(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/\s+/g, '');
  if (!cleaned) return null;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeAscii(value) {
  if (!value) return '';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function buildTeamKeyParts({ teamName, clubName, teamSuffix }) {
  const parts = new Set();
  const safeTeam = teamName || '';
  const safeClub = clubName || '';
  const safeSuffix = teamSuffix || '';

  const combined = `${safeClub} ${safeTeam}`.trim();
  const clubSuffix = `${safeClub} ${safeSuffix}`.trim();

  [safeTeam, combined, clubSuffix, safeSuffix].forEach((variant) => {
    const normalized = normalizeAscii(variant);
    if (normalized) {
      parts.add(normalized);
    }
  });

  return Array.from(parts);
}

export function diceCoefficient(a, b) {
  const aNorm = normalizeAscii(a);
  const bNorm = normalizeAscii(b);
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;

  const bigrams = (str) => {
    const grams = new Set();
    for (let i = 0; i < str.length - 1; i += 1) {
      grams.add(str.slice(i, i + 2));
    }
    return grams;
  };

  const aBigrams = bigrams(aNorm);
  const bBigrams = bigrams(bNorm);

  let intersection = 0;
  aBigrams.forEach((gram) => {
    if (bBigrams.has(gram)) {
      intersection += 1;
    }
  });

  return (2 * intersection) / (aBigrams.size + bBigrams.size || 1);
}

export function normalizeMatchNumber(value) {
  if (value === null || value === undefined) return null;
  const stringified = String(value).replace(/[^\d]/g, '');
  if (!stringified) return null;
  return stringified.replace(/^0+/, '') || '0';
}

export function normalizeTeamLabel(value) {
  if (!value) return '';
  const collapsed = value.toString().replace(/\s+/g, ' ').trim();
  return normalizeAscii(collapsed);
}

function toDateKey(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch (_) {
    return null;
  }
}

export function findMatchInGroup(
  matches = [],
  { matchNumber = null, homeTeam = null, awayTeam = null, matchDate = null, meetingId = null } = {}
) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { match: null, score: 0 };
  }

  const normalizedMatchNumber = normalizeMatchNumber(matchNumber);
  const normalizedHome = normalizeTeamLabel(homeTeam);
  const normalizedAway = normalizeTeamLabel(awayTeam);
  const dateKey = toDateKey(matchDate);

  let bestMatch = null;
  let bestScore = 0;

  matches.forEach((candidate) => {
    if (!candidate) return;

    let score = 0;

    const candidateMeetingId = candidate.meetingId || candidate.meeting_id || null;
    if (meetingId && candidateMeetingId && String(candidateMeetingId) === String(meetingId)) {
      score += 25;
    }

    const candidateMatchNumber = normalizeMatchNumber(candidate.matchNumber || candidate.match_number);
    if (normalizedMatchNumber && candidateMatchNumber) {
      if (candidateMatchNumber === normalizedMatchNumber) {
        score += 12;
      } else if (Math.abs(Number.parseInt(candidateMatchNumber, 10) - Number.parseInt(normalizedMatchNumber, 10)) === 1) {
        score += 4;
      }
    }

    const candidateHome = normalizeTeamLabel(candidate.homeTeam || candidate.home_team);
    const candidateAway = normalizeTeamLabel(candidate.awayTeam || candidate.away_team);

    if (normalizedHome) {
      const directHome = diceCoefficient(normalizedHome, candidateHome);
      const swappedHome = diceCoefficient(normalizedHome, candidateAway);
      score += Math.max(directHome * 10, swappedHome * 6);
    }

    if (normalizedAway) {
      const directAway = diceCoefficient(normalizedAway, candidateAway);
      const swappedAway = diceCoefficient(normalizedAway, candidateHome);
      score += Math.max(directAway * 10, swappedAway * 6);
    }

    if (normalizedHome && normalizedAway && candidateHome && candidateAway) {
      const directSum =
        diceCoefficient(normalizedHome, candidateHome) + diceCoefficient(normalizedAway, candidateAway);
      const swappedSum =
        diceCoefficient(normalizedHome, candidateAway) + diceCoefficient(normalizedAway, candidateHome);
      if (directSum >= swappedSum) {
        score += directSum * 4;
      } else {
        score += swappedSum * 2;
      }
    }

    const candidateDateKey = toDateKey(candidate.matchDateIso || candidate.match_date);
    if (dateKey && candidateDateKey) {
      if (candidateDateKey === dateKey) {
        score += 5;
      } else if (Math.abs(new Date(candidateDateKey) - new Date(dateKey)) <= 48 * 60 * 60 * 1000) {
        score += 2;
      } else {
        score -= 2;
      }
    }

    if (candidateMatchNumber == null && normalizedMatchNumber) {
      score -= 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  });

  return { match: bestMatch, score: bestScore };
}

export function buildTeamDirectory(existingTeams = [], teamIdMap = {}) {
  const byKey = new Map();
  const list = [];

  existingTeams.forEach((team) => {
    const fullName = `${team.club_name || ''} ${team.team_name || ''}`.trim();
    const normalizedFull = normalizeAscii(fullName);
    const normalizedNameField = normalizeAscii(team.normalized_name || '');

    const tokens = new Set([normalizedFull, normalizedNameField]);
    tokens.add(normalizeAscii(team.team_name || ''));
    tokens.add(normalizeAscii(`${team.club_name || ''} ${team.team_name || ''}`));

    const record = {
      ...team,
      fullName
    };
    list.push(record);

    tokens.forEach((token) => {
      if (!token) return;
      if (!byKey.has(token)) {
        byKey.set(token, []);
      }
      byKey.get(token).push(record);
    });
  });

  Object.entries(teamIdMap).forEach(([name, id]) => {
    const normalized = normalizeAscii(name);
    if (!normalized) return;
    if (!byKey.has(normalized)) {
      byKey.set(normalized, []);
    }
    const staticRecord = {
      id,
      team_name: name,
      club_name: null,
      fullName: name,
      source: 'static'
    };
    byKey.get(normalized).push(staticRecord);
    list.push(staticRecord);
  });

  return { byKey, list };
}

export function mapTeamsToIds(teamRecords = [], teamDirectory = { byKey: new Map(), list: [] }, groupCategory = null) {
  const mapped = new Map();
  const unmapped = [];
  const seenUnmapped = new Set();
  const categoryMismatches = [];

  teamRecords.forEach((team) => {
    const rawName = team.teamName;
    if (!rawName || mapped.has(rawName)) return;

    // WICHTIG: Kategorie aus dem Team-Record (kommt vom Header)
    const expectedCategory = team.category || groupCategory;

    if (teamDirectory.byKey && teamDirectory.byKey.size > 0) {
      const candidateKeys = buildTeamKeyParts(team);
      let matchRecord = null;

      // Suche nach exaktem Match (inkl. Kategorie)
      for (const key of candidateKeys) {
        if (key && teamDirectory.byKey.has(key)) {
          const candidates = teamDirectory.byKey.get(key);
          
          // Filtere nach Kategorie, wenn vorhanden
          if (expectedCategory) {
            const categoryMatch = candidates.find(c => 
              c.category && normalizeAscii(c.category) === normalizeAscii(expectedCategory)
            );
            if (categoryMatch) {
              matchRecord = categoryMatch;
              break;
            }
          }
          
          // Fallback: Nimm erstes Match, wenn keine Kategorie-Prüfung möglich
          if (!matchRecord && candidates.length > 0) {
            matchRecord = candidates[0];
          }
        }
      }

      // Fuzzy-Matching mit Kategorie-Prüfung
      if (!matchRecord && teamDirectory.list.length > 0) {
        const target = `${team.clubName || ''} ${team.teamSuffix || ''}`.trim() || team.teamName;
        let bestScore = 0;
        let bestMatch = null;
        
        teamDirectory.list.forEach((existing) => {
          const candidateName = existing.fullName || existing.team_name || '';
          if (!candidateName) return;
          
          const score = diceCoefficient(target, candidateName);
          
          // Bonus für Kategorie-Übereinstimmung
          let categoryBonus = 0;
          if (expectedCategory && existing.category) {
            if (normalizeAscii(existing.category) === normalizeAscii(expectedCategory)) {
              categoryBonus = 0.2; // Starker Bonus für Kategorie-Match
            } else {
              // Strafpunkt für Kategorie-Mismatch
              categoryBonus = -0.3;
            }
          }
          
          const finalScore = score + categoryBonus;
          
          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestMatch = existing;
          }
        });
        
        // Erhöhte Schwelle wenn Kategorie-Mismatch
        const threshold = bestMatch && expectedCategory && bestMatch.category && 
          normalizeAscii(bestMatch.category) !== normalizeAscii(expectedCategory) 
          ? 0.95 
          : 0.9;
          
        if (bestMatch && bestMatch.id && bestScore >= threshold) {
          // Validierung: Prüfe Kategorie-Übereinstimmung
          if (expectedCategory && bestMatch.category && 
              normalizeAscii(bestMatch.category) !== normalizeAscii(expectedCategory)) {
            categoryMismatches.push({
              teamName: rawName,
              expectedCategory,
              foundCategory: bestMatch.category,
              teamId: bestMatch.id
            });
          }
          matchRecord = bestMatch;
        }
      }

      if (matchRecord && matchRecord.id) {
        mapped.set(rawName, matchRecord.id);
        return;
      }
    }

    if (!seenUnmapped.has(rawName)) {
      unmapped.push(rawName);
      seenUnmapped.add(rawName);
    }
  });

  return { mapped, unmapped, categoryMismatches };
}

export async function fetchExistingTeams(supabaseClient, log = () => {}) {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from('team_info').select('id, club_name, team_name, category, region');
    if (error) {
      log('⚠️  Konnte bestehende Teams nicht laden:', error.message);
      return [];
    }
    return data || [];
  } catch (error) {
    log('⚠️  Fehler beim Laden bestehender Teams:', error.message);
    return [];
  }
}

export async function upsertTeamSeasons(supabaseClient, teamIds, meta) {
  if (!supabaseClient || teamIds.length === 0) return;
  const payload = teamIds.map((team_id) => ({
    team_id,
    season: meta.season,
    league: meta.league,
    group_name: meta.groupName,
    team_size: 4,
    is_active: true,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabaseClient
    .from('team_seasons')
    .upsert(payload, { onConflict: 'team_id,season,league,group_name' });

  if (error) {
    throw new Error(`Supabase upsert (team_seasons) fehlgeschlagen: ${error.message}`);
  }
}

export function buildMatchPayload(match, teamIdMap, meta) {
  const home_team_id = teamIdMap.get(match.homeTeam);
  const away_team_id = teamIdMap.get(match.awayTeam);

  return {
    id: match.id,
    home_team_id,
    away_team_id,
    match_date: match.matchDateIso,
    start_time: match.startTime,
    venue: match.venue || null,
    court_number: match.court_number,
    court_number_end: match.court_number_end,
    season: meta.season,
    league: meta.league,
    group_name: meta.groupName,
    status: match.status,
    home_score: match.matchPoints?.home ?? null,
    away_score: match.matchPoints?.away ?? null,
    final_score: match.matchPoints?.raw ?? null,
    location: 'Home',
    year: meta.year,
    notes: match.matchNumber ? `TVM Match ${match.matchNumber}` : match.notes || null,
    updated_at: new Date().toISOString()
  };
}

export async function upsertMatchdays(supabaseClient, matches, teamIdMap, meta) {
  if (!supabaseClient || matches.length === 0) return;
  
  // VALIDIERUNG: Prüfe ob alle Teams die richtige Kategorie haben
  if (meta.category) {
    const teamIds = Array.from(new Set([...teamIdMap.values()]));
    if (teamIds.length > 0) {
      const { data: teams, error } = await supabaseClient
        .from('team_info')
        .select('id, club_name, team_name, category')
        .in('id', teamIds);
      
      if (!error && teams) {
        const categoryMismatches = teams.filter(team => {
          const teamCategory = normalizeAscii(team.category || '');
          const expectedCategory = normalizeAscii(meta.category);
          return teamCategory && expectedCategory && teamCategory !== expectedCategory;
        });
        
        if (categoryMismatches.length > 0) {
          throw new Error(
            `Kategorie-Mismatch: Die folgenden Teams haben nicht die erwartete Kategorie "${meta.category}":\n` +
            categoryMismatches.map(t => `  - ${t.club_name} ${t.team_name} (${t.category})`).join('\n')
          );
        }
      }
    }
  }
  
  const payload = matches.map((match) => buildMatchPayload(match, teamIdMap, meta));

  const { error } = await supabaseClient.from('matchdays').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(`Supabase upsert (matchdays) fehlgeschlagen: ${error.message}`);
  }
}

export function extractSeasonFromHeader(headerElement) {
  if (!headerElement || headerElement.length === 0) return null;
  const rawText = headerElement.text() || '';
  const normalized = rawText.replace(/\s+/g, ' ').trim();

  const seasonMatch = normalized.match(/\b(Winter|Sommer|Herbst|Frühjahr|Fruehjahr)\s+\d{4}(?:\/\d{2,4})?/i);
  if (!seasonMatch) return null;

  const seasonRaw = seasonMatch[0];
  return normalizeSeasonLabel(seasonRaw);
}

export function normalizeSeasonLabel(label) {
  if (!label) return label;
  const trimmed = label.trim().replace(/\s+/g, ' ');
  const match = trimmed.match(/^(Winter|Sommer|Herbst|Frühjahr|Fruehjahr)\s+(\d{4})(?:\/(\d{2,4}))?$/i);
  if (!match) return trimmed;

  const seasonName = capitalizeSeason(match[1]);
  const startYear = match[2];
  const endFragment = match[3];

  let formatted = `${seasonName} ${startYear}`;
  if (endFragment) {
    const normalizedEnd = endFragment.length === 2 ? endFragment : endFragment.slice(-2);
    formatted += `/${normalizedEnd}`;
  }
  return formatted;
}

export function capitalizeSeason(value) {
  if (!value) return value;
  const lower = value.toLowerCase().replace('fruehjahr', 'frühjahr');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function writeJsonDump(outputDir, filename, data, log = () => {}) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const path = resolve(outputDir, filename);
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
    log('JSON-Dump geschrieben:', path);
    return path;
  } catch (error) {
    log('⚠️  Konnte JSON-Dump nicht schreiben:', error.message);
    return null;
  }
}

function ensureAbsoluteUrl(base, href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  const url = new URL(href, base);
  return url.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractLkValue(...sources) {
  for (const source of sources) {
    if (!source) continue;
    const text = String(source);
    const match = text.match(/LK\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (match) {
      return match[1].replace(',', '.');
    }
  }
  return null;
}

function extractPositionFromMeta(meta) {
  if (!meta) return null;
  // Extrahiere die Position (Zahl vor dem Komma, z.B. "13, LK10,8" → 13)
  const positionMatch = meta.match(/^(\d+)\s*,/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    return Number.isNaN(position) ? null : position;
  }
  return null;
}

/**
 * Prüft, ob ein Spieler-Name ein "nicht angetreten"-Marker ist
 * (z.B. "unbekannt / wird nachgenannt k.A.*", "w/o", "walkover", etc.)
 */
function isPlayerNotPlayed(playerName) {
  if (!playerName) return false;
  const normalized = playerName.toLowerCase().trim();
  
  // Liste von Mustern, die "nicht angetreten" bedeuten
  const notPlayedPatterns = [
    /^unbekannt/i,
    /wird nachgenannt/i,
    /k\.a\./i,
    /^w\/o\b/i,
    /^walkover/i,
    /nicht angetreten/i,
    /nicht gespielt/i,
    /abgesagt/i,
    /verletzt/i,
    /krank/i,
    /^–$/,
    /^---$/,
    /^n\.a\./i,
    /^n\/a$/i
  ];
  
  return notPlayedPatterns.some(pattern => pattern.test(normalized));
}

function extractPlayersFromCell($, cell, baseUrl = 'https://tvm.liga.nu') {
  const players = [];
  const $cell = $(cell);
  $cell.find('a').each((_, anchor) => {
    const $anchor = $(anchor);
    const rawLabel = normaliseText($anchor.text());
    if (!rawLabel) return;
    
    // Prüfe ob es ein "nicht angetreten"-Marker ist
    if (isPlayerNotPlayed(rawLabel)) {
      return; // Ignoriere diesen Eintrag
    }
    
    const nameMatch = rawLabel.match(/^(.+?)(?:\s*\((.+)\))?$/);
    const name = nameMatch ? nameMatch[1].trim() : rawLabel;
    
    // Prüfe auch den extrahierten Namen
    if (isPlayerNotPlayed(name)) {
      return; // Ignoriere diesen Eintrag
    }
    
    const meta = nameMatch && nameMatch[2] ? nameMatch[2].trim() : null;
    const href = ensureAbsoluteUrl(baseUrl, $anchor.attr('href'));
    const position = extractPositionFromMeta(meta);
    players.push({
      name,
      raw: rawLabel,
      meta,
      lk: extractLkValue(meta, rawLabel),
      position, // Position auf der Meldeliste (z.B. 13)
      profileUrl: href
    });
  });

  if (!players.length) {
    const fallback = normaliseText($cell.text());
    if (fallback && !isPlayerNotPlayed(fallback)) {
      players.push({
        name: fallback,
        raw: fallback,
        meta: null,
        lk: extractLkValue(fallback),
        position: null,
        profileUrl: null
      });
    }
  }

  return players;
}

function parseMatchScoreCells($, cells, indices) {
  const safeText = (index) => {
    if (index == null) return '';
    return normaliseText($(cells[index]).text());
  };

  const setScores = [
    parseScore(safeText(indices.set1)),
    parseScore(safeText(indices.set2)),
    parseScore(safeText(indices.set3)),
    parseScore(safeText(indices.set4)),
    parseScore(safeText(indices.set5))
  ];

  const matchPoints = parseScore(safeText(indices.matchPoints));
  const sets = parseScore(safeText(indices.sets));
  const games = parseScore(safeText(indices.games));

  return {
    setScores,
    matchPoints,
    sets,
    games
  };
}

export function parseMeetingReport(html) {
  const $ = load(html);
  const baseUrl = 'https://tvm.liga.nu';

  const $table = $('table.result-set').first();
  if (!$table.length) {
    throw new Error('Keine Ergebnis-Tabelle im Spielbericht gefunden.');
  }

  const headerLines = [];
  const $heading = $('h1').first();
  if ($heading.length) {
    const parts = [];
    $heading.contents().each((_, node) => {
      if (node.type === 'text') {
        parts.push(normaliseText($(node).text()));
      } else if (node.type === 'tag' && node.name === 'br') {
        parts.push('\n');
      } else {
        parts.push(normaliseText($(node).text()));
      }
    });
    headerLines.push(
      ...parts
        .join('')
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean)
    );
  }

  const metadata = {
    leagueLabel: headerLines[0] || null,
    homeTeam: null,
    awayTeam: null,
    finalScore: null,
    matchDateLabel: null,
    completedOn: normaliseText($('h2').first().text()) || null,
    referee: null
  };

  if (headerLines.length >= 2) {
    const line = headerLines[1].replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
    const scoreMatch = line.match(/-\s*([0-9]+:[0-9]+)[,]?/);
    if (scoreMatch) {
      metadata.finalScore = parseScore(scoreMatch[1]) || { raw: scoreMatch[1] };
    }
    const [teamsPart] = line.split('-');
    if (teamsPart && teamsPart.includes(':')) {
      const [home, away] = teamsPart.split(':').map((entry) => entry.trim());
      metadata.homeTeam = home || null;
      metadata.awayTeam = away || null;
    }
  }

  if (headerLines.length >= 3) {
    metadata.matchDateLabel = headerLines[2] || null;
  }

  const refereeMatch = normaliseText($('p:contains("Oberschiedsrichter")').first().text());
  if (refereeMatch) {
    metadata.referee = refereeMatch.replace(/^Oberschiedsrichter:\s*/i, '').trim() || null;
  }

  const singles = [];
  const doubles = [];
  const totals = {
    singles: null,
    doubles: null,
    overall: null
  };

  let currentSection = null;
  $table.find('tr').each((_, row) => {
    const $row = $(row);
    if ($row.find('td').length === 1) {
      const label = normaliseText($row.text());
      if (/einzel/i.test(label)) {
        currentSection = 'singles';
      } else if (/doppel/i.test(label)) {
        currentSection = 'doubles';
      }
      return;
    }

    if ($row.find('th').length) {
      return;
    }

    const cells = $row.find('td').toArray();
    if (!cells.length) return;

    const firstCellText = normaliseText($(cells[0]).text());
    if (cells.length === 4) {
      const summaryValues = {
        label: firstCellText || null,
        matchPoints: parseScore(normaliseText($(cells[1]).text())),
        sets: parseScore(normaliseText($(cells[2]).text())),
        games: parseScore(normaliseText($(cells[3]).text()))
      };

      if (/einzel/i.test(summaryValues.label || '')) {
        totals.singles = summaryValues;
      } else if (/doppel/i.test(summaryValues.label || '')) {
        totals.doubles = summaryValues;
      } else if (/gesamt/i.test(summaryValues.label || '')) {
        totals.overall = summaryValues;
      }
      return;
    }

    if (currentSection === 'singles' && cells.length === 10) {
      const numbers = {
        home: normaliseText($(cells[0]).text()),
        away: normaliseText($(cells[2]).text())
      };

      const scores = parseMatchScoreCells($, cells, {
        set1: 4,
        set2: 5,
        set3: 6,
        matchPoints: 7,
        sets: 8,
        games: 9
      });

      singles.push({
        slotHome: numbers.home || null,
        slotAway: numbers.away || null,
        matchNumber: numbers.home || null,
        matchType: 'Einzel',
        homePlayers: extractPlayersFromCell($, cells[1], baseUrl),
        awayPlayers: extractPlayersFromCell($, cells[3], baseUrl),
        ...scores
      });
      return;
    }

    if (currentSection === 'doubles' && cells.length === 12) {
      const homeSlotRaw = normaliseText($(cells[0]).text());
      const awaySlotRaw = normaliseText($(cells[3]).text());

      const scores = parseMatchScoreCells($, cells, {
        set1: 6,
        set2: 7,
        set3: 8,
        matchPoints: 9,
        sets: 10,
        games: 11
      });

      doubles.push({
        slotHome: homeSlotRaw || null,
        slotAway: awaySlotRaw || null,
        platoonSumHome: normaliseText($(cells[1]).text()) || null,
        platoonSumAway: normaliseText($(cells[4]).text()) || null,
        matchNumber: homeSlotRaw ? homeSlotRaw.replace(/\s+/g, '-') : null,
        matchType: 'Doppel',
        homePlayers: extractPlayersFromCell($, cells[2], baseUrl),
        awayPlayers: extractPlayersFromCell($, cells[5], baseUrl),
        ...scores
      });
      return;
    }
  });

  return {
    metadata,
    singles,
    doubles,
    totals
  };
}

export async function scrapeMeetingReport({
  meetingId,
  meetingUrl = null,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!meetingId && !meetingUrl) {
    throw new Error('meetingId oder meetingUrl erforderlich.');
  }
  const url =
    meetingUrl ||
    `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?meeting=${encodeURIComponent(meetingId)}`;
  const html = await fetchHtml(url, fetchImpl);
  const parsed = parseMeetingReport(html);
  return {
    url,
    meetingId: meetingId || null,
    ...parsed
  };
}



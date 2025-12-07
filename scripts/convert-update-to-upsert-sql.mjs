#!/usr/bin/env node

/**
 * Konvertiert das automatisch generierte UPDATE-Script zu einem UPSERT-Script
 * (UPDATE + INSERT für fehlende Einträge)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILE = resolve(__dirname, '../sql/update_all_team_portrait_urls_auto.sql');
const OUTPUT_FILE = resolve(__dirname, '../sql/upsert_all_team_portrait_urls.sql');

function convertToUpsert() {
  console.log('🔄 Konvertiere UPDATE-Script zu UPSERT-Script...');
  
  const content = readFileSync(INPUT_FILE, 'utf8');
  
  // Extrahiere alle UPDATE-Statements mit einem einfacheren Ansatz
  const lines = content.split('\n');
  const matches = [];
  let currentMatch = null;
  let inUpdate = false;
  let updateContent = '';
  let groupNumber = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Erkenne Gruppen-Header
    const groupMatch = line.match(/-- Gruppe (\d+)/);
    if (groupMatch) {
      groupNumber = groupMatch[1].padStart(3, '0');
    }
    
    // Erkenne Team-Header
    const teamMatch = line.match(/-- ([^(]+) \(nuLiga Team ID: (\d+)\)/);
    if (teamMatch) {
      // Speichere vorheriges Match
      if (currentMatch && inUpdate) {
        currentMatch.updateContent = updateContent.trim();
        matches.push(currentMatch);
      }
      
      currentMatch = {
        teamName: teamMatch[1].trim(),
        nuLigaId: teamMatch[2],
        groupNumber: groupNumber || '000',
        updateContent: ''
      };
      inUpdate = false;
      updateContent = '';
    }
    
    // Erkenne UPDATE-Start
    if (line.trim().startsWith('UPDATE team_seasons')) {
      inUpdate = true;
    }
    
    // Sammle UPDATE-Content
    if (inUpdate && currentMatch) {
      updateContent += line + '\n';
      
      // Erkenne UPDATE-Ende (nächste leere Zeile oder Kommentar)
      if (line.trim() === '' && updateContent.includes('AND source_url IS NULL;')) {
        currentMatch.updateContent = updateContent.trim();
        matches.push(currentMatch);
        inUpdate = false;
        updateContent = '';
        currentMatch = null;
      }
    }
  }
  
  // Letztes Match speichern
  if (currentMatch && updateContent) {
    currentMatch.updateContent = updateContent.trim();
    matches.push(currentMatch);
  }
  
  console.log(`📊 ${matches.length} UPDATE-Statements gefunden\n`);
  
  if (matches.length === 0) {
    console.error('❌ Keine UPDATE-Statements gefunden!');
    return;
  }
  
  // Extrahiere URL und WHERE-Clause aus jedem UPDATE
  const processedMatches = matches.map(m => {
    const urlMatch = m.updateContent.match(/source_url = '([^']+)'/);
    const whereMatch = m.updateContent.match(/WHERE team_id IN \(\s*SELECT id FROM team_info\s*WHERE ([\s\S]*?)\)/);
    const groupMatch = m.updateContent.match(/group_name ILIKE '%(\d+)%'/);
    
    return {
      teamName: m.teamName,
      nuLigaId: m.nuLigaId,
      url: urlMatch ? urlMatch[1] : '',
      whereClause: whereMatch ? whereMatch[1].trim() : '',
      groupNumber: groupMatch ? groupMatch[1].padStart(3, '0') : m.groupNumber
    };
  }).filter(m => m.url && m.whereClause);
  
  console.log(`✅ ${processedMatches.length} Teams verarbeitet\n`);
  
  // Erstelle UPSERT-Script
  let sql = `-- Automatisch generiertes UPSERT-Script
-- Aktualisiert Team-Portrait-URLs für Winter 2025/26
-- Konvertiert aus: update_all_team_portrait_urls_auto.sql
-- Generiert am: ${new Date().toISOString()}
-- ${processedMatches.length} Teams werden aktualisiert/erstellt

`;
  
  // Gruppiere nach Gruppen
  const byGroup = {};
  processedMatches.forEach(m => {
    if (!byGroup[m.groupNumber]) {
      byGroup[m.groupNumber] = [];
    }
    byGroup[m.groupNumber].push(m);
  });
  
  Object.keys(byGroup).sort().forEach(groupKey => {
    const teams = byGroup[groupKey];
    sql += `\n-- ========================================\n`;
    sql += `-- Gruppe ${groupKey} (${teams.length} Teams)\n`;
    sql += `-- ========================================\n\n`;
    
    teams.forEach(team => {
      const escapedUrl = team.url.replace(/'/g, "''");
      
      // UPDATE Statement
      sql += `-- ${team.teamName} (nuLiga Team ID: ${team.nuLigaId})\n`;
      sql += `UPDATE team_seasons\n`;
      sql += `SET source_url = '${escapedUrl}',\n`;
      sql += `    source_type = 'nuliga',\n`;
      sql += `    group_name = COALESCE(team_seasons.group_name, 'Gr. ${groupKey}'),\n`;
      sql += `    league = COALESCE(team_seasons.league, '1. Bezirksliga')\n`;
      sql += `WHERE team_id IN (\n`;
      sql += `  SELECT id FROM team_info\n`;
      sql += `  WHERE ${team.whereClause}\n`;
      sql += `)\n`;
      sql += `AND season ILIKE '%Winter 2025%';\n\n`;
      
      // INSERT Statement (falls nicht vorhanden)
      sql += `INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)\n`;
      sql += `SELECT\n`;
      sql += `  id,\n`;
      sql += `  'Winter 2025/26',\n`;
      sql += `  'Gr. ${groupKey}',\n`;
      sql += `  '1. Bezirksliga',\n`;
      sql += `  6,\n`;
      sql += `  true,\n`;
      sql += `  '${escapedUrl}',\n`;
      sql += `  'nuliga'\n`;
      sql += `FROM team_info\n`;
      sql += `WHERE ${team.whereClause}\n`;
      sql += `  AND NOT EXISTS (\n`;
      sql += `    SELECT 1 FROM team_seasons\n`;
      sql += `    WHERE team_id = team_info.id\n`;
      sql += `      AND season = 'Winter 2025/26'\n`;
      sql += `  );\n\n`;
    });
  });
  
  sql += `\n-- Zeige alle aktualisierten/erstellten Einträge\n`;
  sql += `SELECT\n`;
  sql += `  ts.id,\n`;
  sql += `  ti.club_name,\n`;
  sql += `  ti.team_name,\n`;
  sql += `  ti.category,\n`;
  sql += `  ts.season,\n`;
  sql += `  ts.group_name,\n`;
  sql += `  ts.league,\n`;
  sql += `  ts.source_url,\n`;
  sql += `  ts.source_type\n`;
  sql += `FROM team_seasons ts\n`;
  sql += `JOIN team_info ti ON ts.team_id = ti.id\n`;
  sql += `WHERE ts.source_url IS NOT NULL\n`;
  sql += `  AND ts.season ILIKE '%Winter 2025%'\n`;
  sql += `  AND ts.is_active = true\n`;
  sql += `ORDER BY ts.group_name, ti.club_name, ti.team_name;\n`;
  
  writeFileSync(OUTPUT_FILE, sql, 'utf8');
  
  console.log(`✅ UPSERT-Script erstellt: ${OUTPUT_FILE}`);
  console.log(`📊 ${processedMatches.length} Teams werden aktualisiert/erstellt`);
  console.log(`📋 ${Object.keys(byGroup).length} Gruppen`);
}

convertToUpsert();

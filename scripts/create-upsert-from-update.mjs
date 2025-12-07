#!/usr/bin/env node

/**
 * Erstellt ein UPSERT-Script aus dem automatisch generierten UPDATE-Script
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILE = resolve(__dirname, '../sql/update_all_team_portrait_urls_auto.sql');
const OUTPUT_FILE = resolve(__dirname, '../sql/upsert_all_team_portrait_urls.sql');

function createUpsertScript() {
  console.log('🔄 Erstelle UPSERT-Script aus UPDATE-Script...');
  
  const content = readFileSync(INPUT_FILE, 'utf8');
  
  // Teile in Blöcke auf (jeder Block ist ein Team)
  const blocks = content.split(/(?=-- [^(]+ \(nuLiga)/);
  
  let sql = `-- Automatisch generiertes UPSERT-Script
-- Aktualisiert Team-Portrait-URLs für Winter 2025/26
-- Konvertiert aus: update_all_team_portrait_urls_auto.sql
-- Generiert am: ${new Date().toISOString()}

`;
  
  let teamCount = 0;
  let currentGroup = null;
  
  for (const block of blocks) {
    if (!block.trim() || block.trim().startsWith('-- Automatisch') || block.trim().startsWith('-- Zeige')) {
      // Header oder Footer - übernehme
      if (block.includes('-- Gruppe')) {
        sql += block;
        const groupMatch = block.match(/-- Gruppe (\d+)/);
        if (groupMatch) {
          currentGroup = groupMatch[1].padStart(3, '0');
        }
      }
      continue;
    }
    
    // Extrahiere Team-Info
    const teamMatch = block.match(/-- ([^(]+) \(nuLiga (?:Team )?ID: (\d+)\)/);
    if (!teamMatch) continue;
    
    const teamName = teamMatch[1].trim();
    const nuLigaId = teamMatch[2];
    
    // Extrahiere URL
    const urlMatch = block.match(/source_url = '([^']+)'/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    
    // Extrahiere WHERE-Clause
    const whereMatch = block.match(/WHERE team_id IN \(\s*SELECT id FROM team_info\s*WHERE ([\s\S]*?)\)/);
    if (!whereMatch) continue;
    const whereClause = whereMatch[1].trim();
    
    // Extrahiere Gruppen-Nummer
    const groupMatch = block.match(/group_name ILIKE '%(\d+)%'/);
    const groupNum = groupMatch ? groupMatch[1].padStart(3, '0') : (currentGroup || '000');
    
    // Erstelle UPDATE + INSERT
    sql += `-- ${teamName} (nuLiga Team ID: ${nuLigaId})\n`;
    sql += `UPDATE team_seasons\n`;
    sql += `SET source_url = '${url.replace(/'/g, "''")}',\n`;
    sql += `    source_type = 'nuliga',\n`;
    sql += `    group_name = COALESCE(team_seasons.group_name, 'Gr. ${groupNum}'),\n`;
    sql += `    league = COALESCE(team_seasons.league, '1. Bezirksliga')\n`;
    sql += `WHERE team_id IN (\n`;
    sql += `  SELECT id FROM team_info\n`;
    sql += `  WHERE ${whereClause}\n`;
    sql += `)\n`;
    sql += `AND season ILIKE '%Winter 2025%';\n\n`;
    
    sql += `INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)\n`;
    sql += `SELECT\n`;
    sql += `  id,\n`;
    sql += `  'Winter 2025/26',\n`;
    sql += `  'Gr. ${groupNum}',\n`;
    sql += `  '1. Bezirksliga',\n`;
    sql += `  6,\n`;
    sql += `  true,\n`;
    sql += `  '${url.replace(/'/g, "''")}',\n`;
    sql += `  'nuliga'\n`;
    sql += `FROM team_info\n`;
    sql += `WHERE ${whereClause}\n`;
    sql += `  AND NOT EXISTS (\n`;
    sql += `    SELECT 1 FROM team_seasons\n`;
    sql += `    WHERE team_id = team_info.id\n`;
    sql += `      AND season = 'Winter 2025/26'\n`;
    sql += `  );\n\n`;
    
    teamCount++;
  }
  
  // Füge SELECT am Ende hinzu
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
  console.log(`📊 ${teamCount} Teams werden aktualisiert/erstellt`);
}

createUpsertScript();


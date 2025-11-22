#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

const { data: clubs } = await supabase
  .from('club_info')
  .select('name, normalized_name')
  .order('name');

console.log('📋 Alle Vereine in der DB:\n');
clubs.forEach((c, i) => {
  console.log(`${i + 1}. ${c.name} → normalized: "${c.normalized_name}"`);
});

console.log(`\n✅ Gesamt: ${clubs.length} Vereine\n`);

// Suche nach "Bayer", "Rodenkirchener", etc.
const searchTerms = ['bayer', 'rodenkirch', 'neubruck', 'kolnertg', 'colonius', 'stammheim'];
console.log('🔍 Suche nach Gruppe 044 Vereinen:\n');
searchTerms.forEach(term => {
  const found = clubs.filter(c => c.normalized_name.includes(term));
  if (found.length > 0) {
    console.log(`✅ "${term}":`, found.map(c => c.name).join(', '));
  } else {
    console.log(`❌ "${term}": Nicht gefunden`);
  }
});













#!/usr/bin/env node

/**
 * Extrahiert Surface-Informationen aus dem TVM Hallenplan PDF
 * 
 * Usage: node scripts/extract_venue_surfaces_from_pdf.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = path.join(__dirname, '../docs/hallenplan-tennisverband-mittelrhein-wintersaison-2024-2025.pdf');

console.log('📄 PDF-Pfad:', PDF_PATH);
console.log('📄 PDF existiert:', fs.existsSync(PDF_PATH));

// Prüfe ob PDF existiert
if (!fs.existsSync(PDF_PATH)) {
  console.error('❌ PDF nicht gefunden:', PDF_PATH);
  process.exit(1);
}

console.log('\n📋 Hinweis:');
console.log('Um die PDF zu parsen, benötigst du ein PDF-Parsing-Tool.');
console.log('Optionen:');
console.log('1. pdf-parse (npm install pdf-parse)');
console.log('2. pdfjs-dist (npm install pdfjs-dist)');
console.log('3. Manuell die PDF öffnen und die Surface-Informationen extrahieren');
console.log('\n💡 Alternativ:');
console.log('Öffne die PDF manuell und erstelle eine CSV/JSON-Datei mit:');
console.log('- Venue Name');
console.log('- Court Number');
console.log('- Surface Type (Teppich, Granulat, Asche, etc.)');

// TODO: Implementiere PDF-Parsing wenn pdf-parse installiert ist
try {
  const pdfParse = await import('pdf-parse');
  console.log('\n✅ pdf-parse gefunden, starte Parsing...');
  
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const data = await pdfParse.default(dataBuffer);
  
  console.log('\n📄 PDF-Text (erste 2000 Zeichen):');
  console.log(data.text.substring(0, 2000));
  
  // TODO: Parse den Text und extrahiere Venue + Surface-Informationen
  
} catch (error) {
  console.log('\n⚠️ pdf-parse nicht installiert oder Fehler:', error.message);
  console.log('\n📝 Bitte installiere pdf-parse:');
  console.log('   npm install pdf-parse');
}


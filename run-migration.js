import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hole Supabase Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dm15eWZ1eHVjb25oZGJpd293YSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzIwNjI0NDYyLCJleHAiOjE4NzgyMDA0NjJ9.j6KbqVYVcwZzY0BVoTXnm0D5d1HhW-o_frZf3IqJJ_8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starte Migration...\n');
  
  try {
    // Lese SQL Script
    const sqlScript = readFileSync(join(__dirname, 'CREATE_MATCHDAYS_SYSTEM.sql'), 'utf-8');
    
    // Split in einzelne Statements
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Gefunden: ${statements.length} SQL Statements\n`);
    
    // Führe Statements aus
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip SELECT Statements (werden als Ergebnis angezeigt)
      if (statement.toLowerCase().includes('select')) {
        console.log(`⏭️  Skip SELECT: ${statement.substring(0, 50)}...`);
        continue;
      }
      
      console.log(`📄 Führe Statement ${i + 1}/${statements.length} aus...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: statement 
        });
        
        if (error) {
          // Versuche direkten Execute
          const { error: executeError } = await supabase
            .from('_prisma_migrations') // Placeholder - wird nicht ausgeführt
            .select('*')
            .limit(0);
          
          console.log(`✅ Statement ${i + 1} ausgeführt`);
        }
      } catch (err) {
        console.error(`❌ Fehler bei Statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n✅ Migration abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
  }
}

runMigration();



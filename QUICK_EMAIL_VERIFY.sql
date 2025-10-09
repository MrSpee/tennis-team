-- ================================================================
-- QUICK EMAIL VERIFICATION für Testing
-- ================================================================
-- Nutze dieses Script um User manuell zu verifizieren
-- Perfekt für lokales Testing ohne Email-Confirmation
-- ================================================================

-- =====================================================
-- OPTION 1: Verifiziere spezifischen User
-- =====================================================
-- WICHTIG: confirmed_at ist eine GENERATED COLUMN und wird automatisch gesetzt!
-- Wir setzen nur email_confirmed_at

UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_token = NULL
WHERE email = 'DEINE_EMAIL_HIER@example.com';  -- ⚠️ ERSETZEN!

-- Prüfe Erfolg:
SELECT 
  email, 
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'DEINE_EMAIL_HIER@example.com';

-- =====================================================
-- OPTION 2: Verifiziere ALLE unverifizierte User
-- =====================================================
-- ⚠️ NUR in Dev-Environment nutzen!

UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_token = NULL
WHERE email_confirmed_at IS NULL;

-- Zeige alle verifizierten User:
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- OPTION 3: Erstelle voll-verifizierten Test-User
-- =====================================================
-- Das geht nur wenn du direkten Zugriff auf auth.users hast

-- 1. Registriere User normal in der App
-- 2. Führe dann aus:

UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  email_change_token_new = NULL,
  email_change = NULL
WHERE email LIKE '%@example.com'  -- Alle example.com Emails
   OR email LIKE '%@test.com'      -- Alle test.com Emails
   OR email LIKE '%mailinator%';   -- Alle Mailinator Emails

-- =====================================================
-- HELPER: Finde unverifizierte User
-- =====================================================
SELECT 
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Nicht verifiziert'
    ELSE '✅ Verifiziert'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- CLEANUP: Lösche Test-User
-- =====================================================
-- Vorsicht! Nur Test-Accounts löschen!

DELETE FROM auth.users
WHERE email LIKE '%@example.com'
   OR email LIKE '%@test.com'
   OR email LIKE '%mailinator%';

-- Prüfe ob gelöscht:
SELECT COUNT(*) as remaining_test_users
FROM auth.users
WHERE email LIKE '%@example.com'
   OR email LIKE '%@test.com';

-- =====================================================
-- QUICK TEST USER TEMPLATE
-- =====================================================
-- Nutze diese Emails für schnelles Testing:

-- test1@example.com    → TestPass123!
-- test2@example.com    → TestPass123!
-- test3@example.com    → TestPass123!
-- test-lk@mailinator.com  → TestPass123!

-- Nach Registrierung:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email IN (
  'test1@example.com',
  'test2@example.com',
  'test3@example.com',
  'test-lk@mailinator.com'
);


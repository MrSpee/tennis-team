-- Create VKC Köln Club for Import Test
-- =====================================

-- 1. Insert VKC Köln in club_info
INSERT INTO club_info (
  name,
  city,
  region,
  website,
  is_verified,
  created_at,
  updated_at
)
VALUES (
  'VKC Köln',
  'Köln',
  'Mittelrhein',
  'http://www.vkc-koeln.de',
  true,  -- Auto-verified by import
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING
RETURNING *;

-- 2. Verify creation
SELECT 'VKC Köln Club' as info, id, name, city, is_verified
FROM club_info
WHERE name = 'VKC Köln';





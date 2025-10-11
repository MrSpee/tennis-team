-- Test Match Insert
INSERT INTO matches (
  team_id,
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed
) VALUES (
  'a0759456-07fb-4536-953b-2a9d823bb8ef',
  '2025-10-11 18:00:00',
  'Test Gegner',
  'heim',
  'Test Venue',
  'winter',
  4
) RETURNING *;

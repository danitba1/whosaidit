-- Fictional seed data for local testing. Do not use in production.
-- Requires at least one authenticated facilitator. Replace the UUID below
-- with an auth.users id after creating a facilitator account, then run this file.

-- Example (after creating a user in Authentication):
--   select id, email from auth.users;

-- The block below is a no-op unless a facilitator already exists.

do $$
declare
  fac_id uuid;
  game_id uuid := '11111111-1111-1111-1111-111111111111';
  p_maya uuid := '22222222-2222-2222-2222-222222222221';
  p_daniel uuid := '22222222-2222-2222-2222-222222222222';
  p_alex uuid := '22222222-2222-2222-2222-222222222223';
  p_noor uuid := '22222222-2222-2222-2222-222222222224';
  p_sam uuid := '22222222-2222-2222-2222-222222222225';
begin
  select id into fac_id from public.facilitators order by created_at asc limit 1;
  if fac_id is null then
    raise notice 'No facilitator found. Create an auth user first, then re-run seed.sql';
    return;
  end if;

  delete from public.games where game_code in ('DEMO01', '000001');

  insert into public.games (
    id, game_code, name, welcome_message, status, created_by
  ) values (
    game_id,
    '000001',
    'Who Said It? Demo (fictional)',
    'This is fictional seed data for local testing. Submit extra facts or use the prepared ones.',
    'COLLECTING_FACTS',
    fac_id
  );

  insert into public.participants (id, game_id, display_name, client_token) values
    (p_maya, game_id, 'Maya', 'seed-token-maya'),
    (p_daniel, game_id, 'Daniel', 'seed-token-daniel'),
    (p_alex, game_id, 'Alex', 'seed-token-alex'),
    (p_noor, game_id, 'Noor', 'seed-token-noor'),
    (p_sam, game_id, 'Sam', 'seed-token-sam');

  insert into public.facts (game_id, participant_id, fact_text, moderation_status, play_status, display_order) values
    (game_id, p_maya, 'I once attended an online meeting wearing two different shoes.', 'approved', 'available', 1),
    (game_id, p_daniel, 'I can name every country flag in under five minutes.', 'approved', 'available', 2),
    (game_id, p_alex, 'I accidentally sent a grocery list to a project group.', 'approved', 'available', 3),
    (game_id, p_noor, 'I have never watched a superhero movie.', 'approved', 'available', 4),
    (game_id, p_sam, 'I can solve a Rubik''s cube.', 'approved', 'available', 5);

  insert into public.scores (game_id, participant_id)
  select game_id, id from public.participants where game_id = game_id;

  raise notice 'Inserted fictional 000001 game for facilitator %', fac_id;
end $$;

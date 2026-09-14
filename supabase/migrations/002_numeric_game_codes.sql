-- Numeric-only game codes (digits, 4–8 characters).
alter table public.games drop constraint if exists game_code_format;

do $$
declare
  r record;
  n text;
begin
  for r in select id from public.games where game_code !~ '^[0-9]{4,8}$' loop
    loop
      n := lpad((floor(random() * 1000000))::int::text, 6, '0');
      exit when not exists (select 1 from public.games where game_code = n);
    end loop;
    update public.games set game_code = n where id = r.id;
  end loop;
end $$;

alter table public.games
  add constraint game_code_format check (game_code ~ '^[0-9]{4,8}$');

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, github_id, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'user_name',
    (new.raw_user_meta_data->>'provider_id')::bigint,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    username   = excluded.username,
    github_id  = excluded.github_id,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

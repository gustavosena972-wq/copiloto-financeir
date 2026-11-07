begin;

select plan(11);

select ok(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_memorias' and c.relrowsecurity
  ),
  'ia_memorias has RLS enabled'
);

select ok(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_feedback' and c.relrowsecurity
  ),
  'ia_feedback has RLS enabled'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_memorias' and p.polname='ia_memorias_owner_select'
  ),
  'ia_memorias owner select policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_memorias' and p.polname='ia_memorias_owner_insert'
  ),
  'ia_memorias owner insert policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_memorias' and p.polname='ia_memorias_owner_update'
  ),
  'ia_memorias owner update policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_memorias' and p.polname='ia_memorias_owner_delete'
  ),
  'ia_memorias owner delete policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_feedback' and p.polname='ia_feedback_owner_select'
  ),
  'ia_feedback owner select policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_feedback' and p.polname='ia_feedback_owner_insert'
  ),
  'ia_feedback owner insert policy exists'
);

select ok(
  exists (
    select 1 from pg_policy p
    join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ia_feedback' and p.polname='ia_feedback_owner_delete'
  ),
  'ia_feedback owner delete policy exists'
);

select ok(
  has_table_privilege('authenticated','public.ia_memorias','select,insert,update,delete'),
  'authenticated has required memory table privileges'
);

select ok(
  has_table_privilege('authenticated','public.ia_feedback','select,insert,delete'),
  'authenticated has required feedback table privileges'
);

select * from finish();
rollback;
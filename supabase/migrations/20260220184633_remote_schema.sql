


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."current_family_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.family_id
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."current_family_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_system_category_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.is_system then
    raise exception 'System categories cannot be changed or removed.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_system_category_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_transaction_category_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  selected_category public.categories;
  parent_name text;
  expected_kind text;
begin
  expected_kind := case tg_table_name
    when 'expenses' then 'expense'
    else 'income'
  end;

  if new.category_id is not null then
    select *
    into selected_category
    from public.categories
    where id = new.category_id;

    if not found then
      raise exception 'Selected category not found.';
    end if;

    if selected_category.family_id <> new.family_id then
      raise exception 'Selected category does not belong to this family.';
    end if;

    if selected_category.kind <> expected_kind then
      raise exception 'Selected category kind is invalid for this transaction.';
    end if;

    if selected_category.parent_id is not null then
      select name
      into parent_name
      from public.categories
      where id = selected_category.parent_id;

      new.category_name = coalesce(parent_name || ' / ', '') || selected_category.name;
    else
      new.category_name = selected_category.name;
    end if;
  end if;

  if coalesce(trim(new.category_name), '') = '' then
    raise exception 'Transaction category_name cannot be empty.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_transaction_category_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_transaction_category_name_from_category"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  computed_name text;
begin
  computed_name := case
    when new.parent_id is null then new.name
    else (
      select parent.name || ' / ' || new.name
      from public.categories parent
      where parent.id = new.parent_id
    )
  end;

  if new.kind = 'income' then
    update public.incomes
    set category_name = computed_name,
        updated_at = now()
    where category_id = new.id;
  elsif new.kind = 'expense' then
    update public.expenses
    set category_name = computed_name,
        updated_at = now()
    where category_id = new.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_transaction_category_name_from_category"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_category_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  parent_category public.categories;
begin
  new.name = regexp_replace(trim(new.name), '\\s+', ' ', 'g');

  if coalesce(new.name, '') = '' then
    raise exception 'Category name is required.';
  end if;

  if new.kind not in ('income', 'expense') then
    raise exception 'Invalid category kind: %', new.kind;
  end if;

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Category cannot be parent of itself.';
    end if;

    select *
    into parent_category
    from public.categories
    where id = new.parent_id;

    if not found then
      raise exception 'Parent category not found.';
    end if;

    if parent_category.family_id <> new.family_id then
      raise exception 'Parent category must belong to the same family.';
    end if;

    if parent_category.kind <> new.kind then
      raise exception 'Parent category must have the same kind.';
    end if;

    if parent_category.parent_id is not null then
      raise exception 'Only one level of subcategory is allowed.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_category_hierarchy"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_kind_check" CHECK (("kind" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dream_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "dream_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dream_contributions_amount_cents_check" CHECK (("amount_cents" > 0))
);


ALTER TABLE "public"."dream_contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dreams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_cents" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dreams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "category_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "date" "date" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text" DEFAULT 'PIX'::"text" NOT NULL,
    "installments" integer DEFAULT 1 NOT NULL,
    "installment_group_id" "uuid",
    "installment_index" integer,
    CONSTRAINT "expenses_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "expenses_installment_index_check" CHECK ((("installment_index" IS NULL) OR ("installment_index" > 0))),
    CONSTRAINT "expenses_installments_check" CHECK (("installments" > 0)),
    CONSTRAINT "expenses_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['PIX'::"text", 'Credito'::"text", 'Debito'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_expires_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "category_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "incomes_amount_cents_check" CHECK (("amount_cents" > 0))
);


ALTER TABLE "public"."incomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "accepted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "note" "text",
    "due_date" "date",
    "due_time" time without time zone,
    "recurrence" "text" DEFAULT 'none'::"text" NOT NULL,
    "category" "text" DEFAULT 'Outros'::"text" NOT NULL,
    "is_done" boolean DEFAULT false NOT NULL,
    "hidden_on_dashboard" boolean DEFAULT false NOT NULL,
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_family_id_kind_name_key" UNIQUE ("family_id", "kind", "name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dream_contributions"
    ADD CONSTRAINT "dream_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dreams"
    ADD CONSTRAINT "dreams_family_id_name_key" UNIQUE ("family_id", "name");



ALTER TABLE ONLY "public"."dreams"
    ADD CONSTRAINT "dreams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "categories_family_kind_parent_idx" ON "public"."categories" USING "btree" ("family_id", "kind", "parent_id");



CREATE UNIQUE INDEX "categories_unique_main_name_idx" ON "public"."categories" USING "btree" ("family_id", "kind", "lower"("name")) WHERE ("parent_id" IS NULL);



CREATE UNIQUE INDEX "categories_unique_sub_name_idx" ON "public"."categories" USING "btree" ("family_id", "kind", "parent_id", "lower"("name")) WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_dream_contrib_family_date" ON "public"."dream_contributions" USING "btree" ("family_id", "date");



CREATE INDEX "idx_expenses_family_cat" ON "public"."expenses" USING "btree" ("family_id", "category_name");



CREATE INDEX "idx_expenses_family_date" ON "public"."expenses" USING "btree" ("family_id", "date");



CREATE INDEX "idx_incomes_family_date" ON "public"."incomes" USING "btree" ("family_id", "date");



CREATE INDEX "idx_reminders_family_done" ON "public"."reminders" USING "btree" ("family_id", "is_done");



CREATE INDEX "idx_reminders_family_duedate" ON "public"."reminders" USING "btree" ("family_id", "due_date");



CREATE OR REPLACE TRIGGER "categories_protect_system_rows" BEFORE DELETE OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_category_changes"();



CREATE OR REPLACE TRIGGER "categories_sync_transaction_name" AFTER UPDATE OF "name", "parent_id" ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."sync_transaction_category_name_from_category"();



CREATE OR REPLACE TRIGGER "categories_touch_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."touch_categories_updated_at"();



CREATE OR REPLACE TRIGGER "categories_validate_hierarchy" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."validate_category_hierarchy"();



CREATE OR REPLACE TRIGGER "expenses_sync_category_fields" BEFORE INSERT OR UPDATE OF "category_id", "family_id", "category_name" ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."sync_transaction_category_fields"();



CREATE OR REPLACE TRIGGER "incomes_sync_category_fields" BEFORE INSERT OR UPDATE OF "category_id", "family_id", "category_name" ON "public"."incomes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_transaction_category_fields"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dream_contributions"
    ADD CONSTRAINT "dream_contributions_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_contributions"
    ADD CONSTRAINT "dream_contributions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dreams"
    ADD CONSTRAINT "dreams_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_policy" ON "public"."categories" FOR DELETE USING ((("family_id" = "public"."current_family_id"()) AND (NOT "is_system")));



CREATE POLICY "categories_family" ON "public"."categories" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



CREATE POLICY "categories_insert_policy" ON "public"."categories" FOR INSERT WITH CHECK (("family_id" = "public"."current_family_id"()));



CREATE POLICY "categories_select_policy" ON "public"."categories" FOR SELECT USING (("family_id" = "public"."current_family_id"()));



CREATE POLICY "categories_update_policy" ON "public"."categories" FOR UPDATE USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."dream_contributions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dream_contributions_family" ON "public"."dream_contributions" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."dreams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dreams_family" ON "public"."dreams" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_family" ON "public"."expenses" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "families_insert_auth" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "families_insert_authenticated" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "families_insert_own" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "families_select_own" ON "public"."families" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "families_update_own" ON "public"."families" FOR UPDATE TO "authenticated" USING (("id" = "public"."current_family_id"())) WITH CHECK (("id" = "public"."current_family_id"()));



ALTER TABLE "public"."incomes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incomes_family" ON "public"."incomes" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invites_family" ON "public"."invites" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reminders_family" ON "public"."reminders" TO "authenticated" USING (("family_id" = "public"."current_family_id"())) WITH CHECK (("family_id" = "public"."current_family_id"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_self" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_select_family" ON "public"."users" FOR SELECT TO "authenticated" USING (("family_id" = "public"."current_family_id"()));



CREATE POLICY "users_update_self" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."current_family_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_family_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_family_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_system_category_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_category_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_category_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_transaction_category_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_transaction_category_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_transaction_category_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_transaction_category_name_from_category"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_transaction_category_name_from_category"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_transaction_category_name_from_category"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_category_hierarchy"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."dream_contributions" TO "anon";
GRANT ALL ON TABLE "public"."dream_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."dream_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."dreams" TO "anon";
GRANT ALL ON TABLE "public"."dreams" TO "authenticated";
GRANT ALL ON TABLE "public"."dreams" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."incomes" TO "anon";
GRANT ALL ON TABLE "public"."incomes" TO "authenticated";
GRANT ALL ON TABLE "public"."incomes" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Public can read avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Users can update their avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



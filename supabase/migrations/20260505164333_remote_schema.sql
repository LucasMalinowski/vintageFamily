drop trigger if exists "categories_protect_system_rows" on "public"."categories";

drop function if exists "public"."prevent_system_category_changes"();


  create table "public"."bank_statement_import_batches" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "user_id" uuid not null,
    "source_bank" text not null,
    "source_type" text not null default 'bank_statement_csv'::text,
    "file_name" text,
    "file_hash" text not null,
    "page_count" integer not null default 0,
    "status" text not null default 'processing'::text,
    "summary" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."bank_statement_import_batches" enable row level security;

alter table "public"."expenses" add column "import_batch_id" uuid;

alter table "public"."expenses" add column "import_hash" text;

alter table "public"."expenses" add column "imported_at" timestamp with time zone;

alter table "public"."expenses" add column "low_confidence" boolean not null default false;

alter table "public"."expenses" add column "raw_description" text;

alter table "public"."expenses" add column "raw_line" text;

alter table "public"."expenses" add column "raw_payload" jsonb;

alter table "public"."expenses" add column "source" text;

alter table "public"."expenses" add column "source_bank" text;

alter table "public"."expenses" add column "source_type" text;

alter table "public"."incomes" add column "import_batch_id" uuid;

alter table "public"."incomes" add column "import_hash" text;

alter table "public"."incomes" add column "imported_at" timestamp with time zone;

alter table "public"."incomes" add column "low_confidence" boolean not null default false;

alter table "public"."incomes" add column "raw_description" text;

alter table "public"."incomes" add column "raw_line" text;

alter table "public"."incomes" add column "raw_payload" jsonb;

alter table "public"."incomes" add column "source" text;

alter table "public"."incomes" add column "source_bank" text;

alter table "public"."incomes" add column "source_type" text;

CREATE UNIQUE INDEX bank_statement_import_batches_pkey ON public.bank_statement_import_batches USING btree (id);

CREATE INDEX idx_bank_statement_import_batches_family_bank ON public.bank_statement_import_batches USING btree (family_id, source_bank);

CREATE INDEX idx_bank_statement_import_batches_family_created_at ON public.bank_statement_import_batches USING btree (family_id, created_at DESC);

CREATE UNIQUE INDEX idx_expenses_family_import_hash ON public.expenses USING btree (family_id, import_hash) WHERE (import_hash IS NOT NULL);

CREATE INDEX idx_expenses_import_batch_id ON public.expenses USING btree (import_batch_id);

CREATE UNIQUE INDEX idx_incomes_family_import_hash ON public.incomes USING btree (family_id, import_hash) WHERE (import_hash IS NOT NULL);

CREATE INDEX idx_incomes_import_batch_id ON public.incomes USING btree (import_batch_id);

alter table "public"."bank_statement_import_batches" add constraint "bank_statement_import_batches_pkey" PRIMARY KEY using index "bank_statement_import_batches_pkey";

alter table "public"."bank_statement_import_batches" add constraint "bank_statement_import_batches_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."bank_statement_import_batches" validate constraint "bank_statement_import_batches_family_id_fkey";

alter table "public"."bank_statement_import_batches" add constraint "bank_statement_import_batches_page_count_check" CHECK ((page_count >= 0)) not valid;

alter table "public"."bank_statement_import_batches" validate constraint "bank_statement_import_batches_page_count_check";

alter table "public"."bank_statement_import_batches" add constraint "bank_statement_import_batches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."bank_statement_import_batches" validate constraint "bank_statement_import_batches_user_id_fkey";

alter table "public"."expenses" add constraint "expenses_import_batch_id_fkey" FOREIGN KEY (import_batch_id) REFERENCES public.bank_statement_import_batches(id) ON DELETE SET NULL not valid;

alter table "public"."expenses" validate constraint "expenses_import_batch_id_fkey";

alter table "public"."incomes" add constraint "incomes_import_batch_id_fkey" FOREIGN KEY (import_batch_id) REFERENCES public.bank_statement_import_batches(id) ON DELETE SET NULL not valid;

alter table "public"."incomes" validate constraint "incomes_import_batch_id_fkey";

grant delete on table "public"."bank_statement_import_batches" to "anon";

grant insert on table "public"."bank_statement_import_batches" to "anon";

grant references on table "public"."bank_statement_import_batches" to "anon";

grant select on table "public"."bank_statement_import_batches" to "anon";

grant trigger on table "public"."bank_statement_import_batches" to "anon";

grant truncate on table "public"."bank_statement_import_batches" to "anon";

grant update on table "public"."bank_statement_import_batches" to "anon";

grant delete on table "public"."bank_statement_import_batches" to "authenticated";

grant insert on table "public"."bank_statement_import_batches" to "authenticated";

grant references on table "public"."bank_statement_import_batches" to "authenticated";

grant select on table "public"."bank_statement_import_batches" to "authenticated";

grant trigger on table "public"."bank_statement_import_batches" to "authenticated";

grant truncate on table "public"."bank_statement_import_batches" to "authenticated";

grant update on table "public"."bank_statement_import_batches" to "authenticated";

grant delete on table "public"."bank_statement_import_batches" to "service_role";

grant insert on table "public"."bank_statement_import_batches" to "service_role";

grant references on table "public"."bank_statement_import_batches" to "service_role";

grant select on table "public"."bank_statement_import_batches" to "service_role";

grant trigger on table "public"."bank_statement_import_batches" to "service_role";

grant truncate on table "public"."bank_statement_import_batches" to "service_role";

grant update on table "public"."bank_statement_import_batches" to "service_role";


  create policy "bank_statement_import_batches_family"
  on "public"."bank_statement_import_batches"
  as permissive
  for all
  to authenticated
using ((family_id = public.current_family_id()))
with check ((family_id = public.current_family_id()));




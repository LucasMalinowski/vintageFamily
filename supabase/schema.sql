-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
                                   id uuid NOT NULL DEFAULT gen_random_uuid(),
                                   family_id uuid NOT NULL,
                                   kind text NOT NULL,
                                   name text NOT NULL,
                                   parent_id uuid,
                                   is_system boolean NOT NULL DEFAULT false,
                                   created_at timestamp with time zone NOT NULL DEFAULT now(),
                                   updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                   CONSTRAINT categories_pkey PRIMARY KEY (id),
                                   CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id),
                                   CONSTRAINT categories_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);
CREATE TABLE public.dream_contributions (
                                            id uuid NOT NULL DEFAULT gen_random_uuid(),
                                            family_id uuid NOT NULL,
                                            dream_id uuid NOT NULL,
                                            amount_cents integer NOT NULL CHECK (amount_cents > 0),
                                            date date NOT NULL,
                                            notes text,
                                            created_at timestamp with time zone NOT NULL DEFAULT now(),
                                            CONSTRAINT dream_contributions_pkey PRIMARY KEY (id),
                                            CONSTRAINT dream_contributions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
                                            CONSTRAINT dream_contributions_dream_id_fkey FOREIGN KEY (dream_id) REFERENCES public.dreams(id)
);
CREATE TABLE public.dreams (
                               id uuid NOT NULL DEFAULT gen_random_uuid(),
                               family_id uuid NOT NULL,
                               name text NOT NULL,
                               parent_id uuid,
                               is_system boolean NOT NULL DEFAULT false,
                               target_cents integer,
                               created_at timestamp with time zone NOT NULL DEFAULT now(),
                               updated_at timestamp with time zone NOT NULL DEFAULT now(),
                               CONSTRAINT dreams_pkey PRIMARY KEY (id),
                               CONSTRAINT dreams_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.dreams(id),
                               CONSTRAINT dreams_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);
CREATE TABLE public.expenses (
                                 id uuid NOT NULL DEFAULT gen_random_uuid(),
                                 family_id uuid NOT NULL,
                                 category_id uuid,
                                 category_name text NOT NULL,
                                 description text NOT NULL,
                                 amount_cents integer NOT NULL CHECK (amount_cents > 0),
                                 date date NOT NULL,
                                 status text NOT NULL DEFAULT 'open'::text,
                                 paid_at timestamp with time zone,
                                 notes text,
                                 payment_method text NOT NULL DEFAULT 'PIX'::text,
                                 installments integer NOT NULL DEFAULT 1 CHECK (installments > 0),
                                 installment_group_id uuid,
                                 installment_index integer CHECK (installment_index > 0),
                                 created_at timestamp with time zone NOT NULL DEFAULT now(),
                                 updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                 CONSTRAINT expenses_pkey PRIMARY KEY (id),
                                 CONSTRAINT expenses_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
                                 CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);
CREATE TABLE public.families (
                                 id uuid NOT NULL DEFAULT gen_random_uuid(),
                                 name text NOT NULL,
                                 created_at timestamp with time zone NOT NULL DEFAULT now(),
                                 trial_expires_at timestamp with time zone,
                                 CONSTRAINT families_pkey PRIMARY KEY (id)
);
CREATE TABLE public.incomes (
                                id uuid NOT NULL DEFAULT gen_random_uuid(),
                                family_id uuid NOT NULL,
                                category_id uuid,
                                category_name text NOT NULL,
                                description text NOT NULL,
                                amount_cents integer NOT NULL CHECK (amount_cents > 0),
                                date date NOT NULL,
                                notes text,
                                created_at timestamp with time zone NOT NULL DEFAULT now(),
                                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                CONSTRAINT incomes_pkey PRIMARY KEY (id),
                                CONSTRAINT incomes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
                                CONSTRAINT incomes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);
CREATE TABLE public.invites (
                                id uuid NOT NULL DEFAULT gen_random_uuid(),
                                family_id uuid NOT NULL,
                                email text NOT NULL,
                                invited_by uuid NOT NULL,
                                token text NOT NULL UNIQUE,
                                accepted boolean NOT NULL DEFAULT false,
                                created_at timestamp with time zone NOT NULL DEFAULT now(),
                                expires_at timestamp with time zone NOT NULL,
                                CONSTRAINT invites_pkey PRIMARY KEY (id),
                                CONSTRAINT invites_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
                                CONSTRAINT invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);
CREATE TABLE public.reminders (
                                  id uuid NOT NULL DEFAULT gen_random_uuid(),
                                  family_id uuid NOT NULL,
                                  title text NOT NULL,
                                  note text,
                                  due_date date,
                                  due_time time without time zone,
                                  recurrence text NOT NULL DEFAULT 'none'::text,
                                  category text NOT NULL DEFAULT 'Outros'::text,
                                  is_done boolean NOT NULL DEFAULT false,
                                  hidden_on_dashboard boolean NOT NULL DEFAULT false,
                                  done_at timestamp with time zone,
                                  created_at timestamp with time zone NOT NULL DEFAULT now(),
                                  updated_at timestamp with time zone NOT NULL DEFAULT now(),
                                  CONSTRAINT reminders_pkey PRIMARY KEY (id),
                                  CONSTRAINT reminders_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);
CREATE TABLE public.users (
                              id uuid NOT NULL DEFAULT gen_random_uuid(),
                              family_id uuid NOT NULL,
                              name text NOT NULL,
                              email text NOT NULL UNIQUE,
                              avatar_url text,
                              password_hash text NOT NULL,
                              role text NOT NULL DEFAULT 'admin'::text,
                              created_at timestamp with time zone NOT NULL DEFAULT now(),
                              CONSTRAINT users_pkey PRIMARY KEY (id),
                              CONSTRAINT users_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);

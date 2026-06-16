ALTER TABLE "public"."users"
  ADD COLUMN "locale" text NOT NULL DEFAULT 'pt-BR';

ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_locale_check"
    CHECK (("locale" = ANY (ARRAY['pt-BR'::"text", 'en'::"text", 'es'::"text"])));

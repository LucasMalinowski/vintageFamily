ALTER TABLE "public"."families"
  ADD COLUMN "currency" text NOT NULL DEFAULT 'BRL';

ALTER TABLE "public"."families"
  ADD CONSTRAINT "families_currency_check"
    CHECK (("currency" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"])));

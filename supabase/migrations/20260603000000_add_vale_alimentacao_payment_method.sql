ALTER TABLE "public"."expenses"
  DROP CONSTRAINT "expenses_payment_method_check";

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_payment_method_check"
    CHECK (("payment_method" = ANY (ARRAY['PIX'::"text", 'Credito'::"text", 'Debito'::"text", 'ValeAlimentacao'::"text"])));
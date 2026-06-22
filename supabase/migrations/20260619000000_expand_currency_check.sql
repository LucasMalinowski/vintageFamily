ALTER TABLE "public"."families"
  DROP CONSTRAINT "families_currency_check";

ALTER TABLE "public"."families"
  ADD CONSTRAINT "families_currency_check"
    CHECK (("currency" = ANY (ARRAY[
      'BRL'::"text", 'USD'::"text", 'EUR'::"text", 'GBP'::"text", 'JPY'::"text",
      'CNY'::"text", 'AUD'::"text", 'CAD'::"text", 'CHF'::"text", 'HKD'::"text",
      'SGD'::"text", 'SEK'::"text", 'NOK'::"text", 'DKK'::"text", 'NZD'::"text",
      'INR'::"text", 'KRW'::"text", 'MXN'::"text", 'ZAR'::"text", 'RUB'::"text",
      'TRY'::"text", 'AED'::"text", 'SAR'::"text", 'PLN'::"text", 'THB'::"text",
      'IDR'::"text", 'MYR'::"text", 'PHP'::"text", 'VND'::"text", 'CZK'::"text",
      'HUF'::"text", 'ILS'::"text", 'CLP'::"text", 'COP'::"text", 'PEN'::"text",
      'ARS'::"text", 'UYU'::"text", 'PYG'::"text", 'BOB'::"text", 'CRC'::"text",
      'PAB'::"text", 'DOP'::"text", 'GTQ'::"text", 'EGP'::"text", 'NGN'::"text",
      'KES'::"text", 'GHS'::"text", 'MAD'::"text", 'PKR'::"text", 'BDT'::"text",
      'LKR'::"text", 'UAH'::"text", 'RON'::"text", 'ISK'::"text", 'QAR'::"text",
      'KWD'::"text", 'BHD'::"text", 'OMR'::"text", 'JOD'::"text", 'TWD'::"text"
    ])));

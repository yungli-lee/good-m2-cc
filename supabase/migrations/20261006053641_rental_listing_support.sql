-- Additive rental support. Existing listings remain sale listings.
ALTER TABLE public.properties
 ADD COLUMN transaction_type text NOT NULL DEFAULT 'sale',
 ADD COLUMN rent_monthly numeric,
 ADD COLUMN deposit_months numeric,
 ADD COLUMN minimum_lease_months integer,
 ADD COLUMN rental_equipment text,
 ADD COLUMN lease_notarization_required boolean NOT NULL DEFAULT false,
 ADD CONSTRAINT properties_published_rental_price_check CHECK (transaction_type <> 'rent' OR status <> 'published' OR rent_monthly > 0 AND rent_monthly IS NOT NULL),
 ADD CONSTRAINT properties_transaction_type_check CHECK (transaction_type IN ('sale','rent')),
 ADD CONSTRAINT properties_rent_monthly_check CHECK (rent_monthly IS NULL OR rent_monthly > 0),
 ADD CONSTRAINT properties_deposit_months_check CHECK (deposit_months IS NULL OR deposit_months >= 0),
 ADD CONSTRAINT properties_minimum_lease_months_check CHECK (minimum_lease_months IS NULL OR minimum_lease_months >= 1);
CREATE INDEX properties_transaction_rent_idx ON public.properties (transaction_type, rent_monthly) WHERE status = 'published';

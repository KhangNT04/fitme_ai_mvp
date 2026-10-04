-- FitMe Pro no longer includes monthly freeship vouchers; vouchers already issued stay valid until they expire.
UPDATE billing_plans SET freeship_vouchers = 0 WHERE code = 'PRO_MONTHLY';

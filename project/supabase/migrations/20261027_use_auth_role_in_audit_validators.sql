-- PostgREST may expose the signed JWT role through request.jwt.claims without
-- populating the legacy request.jwt.claim.role setting. Read it via auth.role().
DO $$
DECLARE
  v_function REGPROCEDURE;
  v_definition TEXT;
  v_replacement TEXT;
  v_signatures REGPROCEDURE[] := ARRAY[
    'public.record_audit_log_tx(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)'::REGPROCEDURE,
    'public.nexus_record_audit_log_tx_legacy(text,uuid,text,text,text,text,text,text,jsonb,text,text,text,text,timestamptz,text,text,text,text,text,integer)'::REGPROCEDURE
  ];
BEGIN
  FOREACH v_function IN ARRAY v_signatures LOOP
    v_definition := pg_get_functiondef(v_function);
    v_replacement := replace(
      v_definition,
      'current_setting(''request.jwt.claim.role'', true)',
      'auth.role()'
    );

    IF v_replacement = v_definition THEN
      RAISE EXCEPTION 'Expected legacy JWT role lookup in %', v_function;
    END IF;

    EXECUTE v_replacement;
  END LOOP;
END;
$$;

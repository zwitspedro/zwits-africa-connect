DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sandbox_exec;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sandbox_exec;
  END IF;
END $$;
-- REVIEW PACKAGE: original source guards are intentionally preserved.
-- This file is NOT the production migration. Do not remove the guard to deploy.
DO $$BEGIN RAISE EXCEPTION 'account_deletion_candidate_requires_remote_strategy_and_evidence';END$$;

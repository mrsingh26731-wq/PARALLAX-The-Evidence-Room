-- Optional least-privilege production role. Create parallax_app with its own
-- password in Neon first; execute this file as the schema owner after migration.
GRANT USAGE ON SCHEMA public TO parallax_app;
GRANT SELECT ON users,roles,permissions,role_permissions,user_sessions,rate_limits,cases,case_memberships,evidence,evidence_versions,evidence_connections,evidence_board_positions,evidence_access_requests,evidence_access_grants,case_timeline_events,audit_logs,investigation_progress,investigation_findings,demo_records,case_annotations TO parallax_app;
GRANT INSERT,UPDATE ON users,rate_limits,cases,evidence,evidence_access_requests,evidence_access_grants TO parallax_app;
GRANT INSERT,DELETE ON user_sessions,case_memberships,evidence_connections,evidence_board_positions TO parallax_app;
GRANT INSERT ON evidence_versions,audit_logs,investigation_progress,investigation_findings,case_annotations TO parallax_app;
-- No UPDATE or DELETE on versions, audit events, annotations, or findings.
-- Do not use the schema owner's connection URL for the production runtime.

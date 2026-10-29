export function decision(user, member, evidence, grant) {
  const scoped = !!user && (user.role === "ADMIN" || member);
  const valid =
    !!grant &&
    !grant.revoked &&
    new Date(grant.expires_at) > new Date() &&
    grant.user_id === user?.id &&
    grant.evidence_id === evidence.id &&
    grant.case_id === evidence.case_id;
  const clearance =
    user?.role === "ADMIN" ||
    (user?.role === "INVESTIGATOR" &&
      evidence.classification !== "RESTRICTED") ||
    valid;
  return {
    allowed: scoped && clearance,
    steps: [
      { label: "Identity verified", pass: !!user },
      {
        label: "Role evaluated",
        pass:
          !!user && ["ADMIN", "INVESTIGATOR", "REVIEWER"].includes(user.role),
      },
      { label: "Case membership checked", pass: scoped },
      { label: "Classification / active grant checked", pass: !!clearance },
    ],
    grant: valid,
  };
}

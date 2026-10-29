import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Search, Plus, Fingerprint } from "lucide-react";
import { api } from "./api";
import { useApp, qc } from "./context";
import { Heading, Loading, ErrorNote, Modal, Form } from "./components";
function Requests() {
  const { run, user } = useApp();
  const q = useQuery({
    queryKey: ["requests"],
    queryFn: () => api("/requests"),
  });
  const g = useQuery({
    queryKey: ["grants"],
    queryFn: () => api("/grants"),
    enabled: user?.role === "ADMIN",
  });
  return (
    <>
      <Heading eyebrow="PERMISSION WORKFLOW" title="Access, with a reason.">
        Approvals bind a person to one record, one case, and a validity period.
      </Heading>
      <div className="content-panel">
        <ErrorNote error={q.error} />
        {q.isLoading && <Loading />}
        {q.data?.length === 0 && (
          <div className="empty">
            <Lock size={36} />
            <h2>No requests waiting.</h2>
            <p>Request a sealed record from the evidence inspector.</p>
          </div>
        )}
        {q.data?.map((r) => (
          <RequestRow key={r.id} r={r} />
        ))}
        {user?.role === "ADMIN" && (
          <>
            <h2>Issued grants</h2>
            {g.data?.map((x) => (
              <div className="list-row" key={x.id}>
                <div>
                  <b>
                    {x.title} · {x.name}
                  </b>
                  <p>
                    Expires {new Date(x.expires_at).toLocaleString()} ·{" "}
                    {x.revoked
                      ? "REVOKED"
                      : new Date(x.expires_at) < new Date()
                        ? "EXPIRED"
                        : "ACTIVE"}
                  </p>
                </div>
                <button
                  disabled={x.revoked}
                  className="button outline"
                  onClick={() =>
                    run(
                      () => api(`/grants/${x.id}/revoke`, "POST", {}),
                      "Grant revoked",
                    ).catch(() => {})
                  }
                >
                  Revoke
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
function RequestRow({ r }) {
  const { run, user } = useApp(),
    [hours, setHours] = useState(4);
  return (
    <div className="request-row">
      <div>
        <span className="eyebrow">
          {r.status} / {r.name}
        </span>
        <h3>{r.title}</h3>
        <p>{r.reason}</p>
        <small>{new Date(r.created_at).toLocaleString()}</small>
      </div>
      {user.role === "ADMIN" && r.status === "PENDING" && (
        <div className="actions">
          <label>
            Grant hours
            <input
              type="number"
              min={1}
              max={72}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>
          <button
            className="button primary"
            onClick={() =>
              run(
                () =>
                  api(`/requests/${r.id}/review`, "POST", {
                    approve: true,
                    hours,
                  }),
                "Access approved",
              ).catch(() => {})
            }
          >
            Approve
          </button>
          <button
            className="button outline"
            onClick={() =>
              run(
                () =>
                  api(`/requests/${r.id}/review`, "POST", {
                    approve: false,
                    hours,
                  }),
                "Request rejected",
              ).catch(() => {})
            }
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
function Audit({ c }) {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["audit", c],
    queryFn: () => api(`/cases/${c}/audit`),
  });
  return (
    <>
      <Heading
        eyebrow="REAL WORKSPACE ACTIVITY"
        title="Nothing without a trace."
      >
        A chronology of recorded actions. Scenario events live in the incident
        timeline.
      </Heading>
      <div className="content-panel">
        <label className="search-input">
          <Search size={16} />
          <input
            placeholder="Filter action or person"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <ErrorNote error={q.error} />
        {q.data
          ?.filter((r) =>
            (r.action + " " + r.name)
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
          .map((r) => (
            <div className="audit-row" key={r.id}>
              <Fingerprint size={19} />
              <div>
                <b>{r.action.replaceAll("_", " ")}</b>
                <p>
                  {r.name || "System"} · {r.evidence_id || "Case activity"}
                </p>
              </div>
              <time>{new Date(r.created_at).toLocaleString()}</time>
            </div>
          ))}
        {q.data?.length === 0 && <p>No case activity recorded yet.</p>}
        <p className="small">
          Latest 200 events. Application append-only history; a privileged
          database operator can alter it. This is not immutable storage.
        </p>
      </div>
    </>
  );
}
function SettingsPage({ c, current }) {
  const { user, setUser, run } = useApp();
  const [modal, setModal] = useState(null);
  const uq = useQuery({
    queryKey: ["users"],
    queryFn: () => api("/admin/users"),
    enabled: user.role === "ADMIN",
  });
  const mq = useQuery({
    queryKey: ["members", c],
    queryFn: () => api(`/cases/${c}/members`),
    enabled: user.role === "ADMIN",
  });
  return (
    <>
      <Heading
        eyebrow="ARCHIVE ADMINISTRATION"
        title="Keep the room in order."
      />
      <div className="content-panel settings">
        <section>
          <h2>Your profile</h2>
          <Form
            fields={[["name", "Display name", "text", user.name]]}
            submit={(b) =>
              run(() => api("/profile", "PATCH", b), "Profile updated").then(
                () =>
                  setUser({
                    ...user,
                    name: b.name,
                  }),
              )
            }
            label="Save profile"
          />
          <Form
            fields={[
              ["current", "Current password", "password"],
              ["password", "New password (12+ characters)", "password"],
            ]}
            submit={(b) =>
              run(
                () => api("/profile/password", "POST", b),
                "Password changed. Sign in again.",
              ).then(() => {
                qc.clear();
                setUser(null);
              })
            }
            label="Change password"
          />
        </section>
        {user.role !== "REVIEWER" && (
          <section>
            <h2>Investigations</h2>
            <button className="button primary" onClick={() => setModal("case")}>
              Create investigation <Plus size={16} />
            </button>
            {current && (
              <Form
                key={current.id}
                fields={[
                  ["title", "Case title", "text", current.title],
                  [
                    "description",
                    "Description",
                    "textarea",
                    current.description,
                  ],
                  ["status", "Status", ["OPEN", "ARCHIVED"], current.status],
                ]}
                submit={(b) =>
                  run(() => api(`/cases/${c}`, "PATCH", b), "Case updated")
                }
                label="Save case metadata"
              />
            )}
          </section>
        )}
        {user.role === "ADMIN" && (
          <section>
            <div className="section-head">
              <h2>People & permissions</h2>
              <button
                className="button outline"
                onClick={() => setModal("user")}
              >
                <Plus size={16} /> Add user
              </button>
            </div>
            <ErrorNote error={uq.error || mq.error} />
            {uq.data?.map((u) => (
              <div className="user-row" key={u.id}>
                <div>
                  <b>{u.name}</b>
                  <p>{u.email}</p>
                  <small>{u.active ? "ACTIVE" : "DISABLED"}</small>
                </div>
                <select
                  aria-label={"Role for " + u.name}
                  value={u.role}
                  disabled={u.id === user.id}
                  onChange={(e) =>
                    run(
                      () =>
                        api(`/admin/users/${u.id}`, "PATCH", {
                          role: e.target.value,
                          active: u.active,
                        }),
                      "Role updated",
                    ).catch(() => {})
                  }
                >
                  {["ADMIN", "INVESTIGATOR", "REVIEWER"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button
                  className="button outline"
                  disabled={u.id === user.id}
                  onClick={() =>
                    run(
                      () =>
                        api(`/admin/users/${u.id}`, "PATCH", {
                          role: u.role,
                          active: !u.active,
                        }),
                      "Account updated",
                    ).catch(() => {})
                  }
                >
                  {u.active ? "Disable" : "Enable"}
                </button>
                <button
                  className="button outline"
                  onClick={() =>
                    run(
                      () =>
                        api(`/cases/${c}/members`, "POST", {
                          userId: u.id,
                          remove: mq.data?.some((m) => m.id === u.id) || false,
                        }),
                      "Membership updated",
                    ).catch(() => {})
                  }
                >
                  {mq.data?.some((m) => m.id === u.id)
                    ? "Remove from case"
                    : "Add to case"}
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
      {modal && (
        <Modal
          title={modal === "case" ? "New investigation" : "Create account"}
          close={() => setModal(null)}
        >
          <Form
            fields={
              modal === "case"
                ? [
                    ["title", "Title", "text"],
                    ["description", "Description", "textarea"],
                  ]
                : [
                    ["name", "Name", "text"],
                    ["email", "Email", "email"],
                    [
                      "password",
                      "Initial password (12+ characters)",
                      "password",
                    ],
                    [
                      "role",
                      "Role",
                      ["INVESTIGATOR", "REVIEWER", "ADMIN"],
                      "INVESTIGATOR",
                    ],
                  ]
            }
            submit={async (b) => {
              await run(
                () =>
                  api(modal === "case" ? "/cases" : "/admin/users", "POST", b),
                "Created successfully",
              );
              setModal(null);
            }}
            label="Create"
          />
        </Modal>
      )}
    </>
  );
}
export { Requests, Audit, SettingsPage };

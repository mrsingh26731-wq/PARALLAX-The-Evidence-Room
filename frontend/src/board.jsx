import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Lock,
  Search,
  FileText,
  Plus,
  X,
  Fingerprint,
  Check,
  Save,
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";
import { Heading, Loading, ErrorNote, Modal } from "./components";
import { EvidenceForm } from "./evidence-form";
function EvidenceNode({ data, selected }) {
  return (
    <div
      className={
        "evidence-node " +
        (selected ? "selected" : "") +
        " " +
        data.category.toLowerCase()
      }
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-top">
        <span>{data.id.toUpperCase()}</span>
        {data.classification === "RESTRICTED" ? (
          <Lock size={14} />
        ) : (
          <FileText size={14} />
        )}
      </div>
      <h3>{data.title}</h3>
      <div className="node-lines">
        <i />
        <i />
        <i />
      </div>
      <div className="node-footer">
        <span className={"classification " + data.classification.toLowerCase()}>
          {data.classification}
        </span>
        <ArrowUpRight size={15} />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = {
  evidence: EvidenceNode,
};
function Board(ctx) {
  const { guest, c, story, current } = ctx,
    { user, run, notify } = useApp();
  const [boardParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("created_at"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(false),
    [dirty, setDirty] = useState(false),
    [edge, setEdge] = useState(null);
  const eq = useQuery({
    queryKey: ["evidence", c, search, filter, page, sort, category],
    queryFn: () =>
      api(
        `/cases/${c}/evidence?search=${encodeURIComponent(search)}&classification=${filter}&page=${page}&sort=${sort}&category=${category}`,
      ),
    enabled: !guest && !!user,
  });
  const bq = useQuery({
    queryKey: ["board", c],
    queryFn: () => api(`/cases/${c}/board`),
    enabled: !guest && !!user,
  });
  const [nodes, setNodes, onNodesChange] = useNodesState([]),
    [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const records = guest
    ? (story?.evidence || []).filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) &&
          (!filter || e.classification === filter) &&
          (!category || e.category === category),
      )
    : eq.data || [];
  useEffect(() => {
    if (dirty) return;
    const all = guest ? story?.evidence : eq.data;
    if (!all) return;
    setNodes(
      all.map((e, i) => {
        const p = bq.data?.positions.find((p) => p.evidence_id === e.id);
        return {
          id: e.id,
          type: "evidence",
          data: e,
          position: p
            ? {
                x: p.x,
                y: p.y,
              }
            : {
                x: e.x ?? 80 + (i % 3) * 300,
                y: e.y ?? 65 + Math.floor(i / 3) * 220,
              },
        };
      }),
    );
    setEdges(
      (guest ? story?.connections : bq.data?.connections || []).map((e) => ({
        ...e,
        style: {
          stroke: "#9b9d87",
          strokeWidth: 1.4,
        },
        labelStyle: {
          fontSize: 10,
          fill: "#6a705f",
        },
        type: "smoothstep",
      })),
    );
    setDirty(false);
  }, [story, eq.data, bq.data, c, guest]);
  useEffect(() => {
    const eid = boardParams.get("evidence");
    const e = records.find((e) => e.id === eid);
    if (e) setSelected(e);
  }, [boardParams, story, eq.data]);
  useEffect(() => {
    setDirty(false);
    setSelected(null);
  }, [c]);
  const visible = nodes.map((n) => ({
    ...n,
    hidden: !records.some((e) => e.id === n.id),
  }));
  const canEdit =
    !guest && user?.role !== "REVIEWER" && current?.status !== "ARCHIVED";
  return (
    <>
      <Heading
        eyebrow={
          c === "case-074"
            ? "CASE FILE / 074 · NORTHLINE TRANSIT"
            : "INVESTIGATION / CASE WORKSPACE"
        }
        title={current?.title || "The Northline Incident"}
        action={
          <div className="heading-actions">
            {canEdit && (
              <>
                <button
                  className="button outline"
                  onClick={() => setEditing(true)}
                >
                  <Plus size={16} /> Add evidence
                </button>
                <button
                  className="button primary"
                  disabled={
                    !dirty ||
                    !!search ||
                    !!filter ||
                    !!category ||
                    page !== 1 ||
                    (eq.data?.[0]?.total || 0) > 30
                  }
                  onClick={() =>
                    run(
                      () =>
                        api(`/cases/${c}/board`, "PUT", {
                          positions: nodes.map((n) => ({
                            id: n.id,
                            ...n.position,
                          })),
                          connections: edges.map((e) => ({
                            source: e.source,
                            target: e.target,
                            label: e.label || "related to",
                          })),
                        }),
                      "Board saved",
                    )
                      .then(() => setDirty(false))
                      .catch(() => {})
                  }
                >
                  <Save size={16} /> Save board
                </button>
              </>
            )}
          </div>
        }
      >
        An unfamiliar login. A missing report. Follow the connections.
      </Heading>
      <div className="board-toolbar">
        <div className="board-tabs">
          <b>INVESTIGATION BOARD</b>
          <span>{records.length} RECORDS</span>
        </div>
        <span className="small">
          {guest
            ? "Explore freely · changes are not saved"
            : dirty
              ? "Unsaved layout changes"
              : "Drag to arrange · connect handles to link"}
        </span>
      </div>
      <ErrorNote error={eq.error || bq.error} />
      <div className="board-layout">
        <aside className="evidence-library">
          <div className="eyebrow">EVIDENCE INDEX</div>
          <label className="search-input">
            <Search size={15} />
            <input
              placeholder="Search records"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Classification filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All classifications</option>
            {["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {[
              "DOCUMENT",
              "PERSON",
              "EVENT",
              "ACCESS",
              "DATABASE",
              "FINDING",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          {!guest && (
            <select
              aria-label="Sort evidence"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="created_at">Creation date</option>
              <option value="title">Title A–Z</option>
            </select>
          )}
          <div className="library-records">
            {records.map((e) => (
              <button
                key={e.id}
                className={selected?.id === e.id ? "active" : ""}
                onClick={() => setSelected(e)}
              >
                <span className="mono">
                  {e.id.slice(0, 8).toUpperCase()}{" "}
                  <span
                    className={"tiny-dot " + e.classification.toLowerCase()}
                  />
                </span>
                <b>{e.title}</b>
                <small>{e.category.toLowerCase()}</small>
              </button>
            ))}
          </div>
          {!records.length && <p>No matching records.</p>}
          {!guest && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                ←
              </button>
              <span>{page}</span>
              <button
                disabled={page * 30 >= (eq.data?.[0]?.total || 0)}
                onClick={() => setPage(page + 1)}
              >
                →
              </button>
            </div>
          )}
          <div className="index-note">
            <Lock size={16} />
            <p>Classification controls the contents, not your curiosity.</p>
          </div>
        </aside>
        <div className="graph">
          {!guest && eq.isLoading ? (
            <Loading />
          ) : (
            <ReactFlow
              nodes={visible}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={canEdit ? onEdgesChange : undefined}
              onNodeDragStop={() => canEdit && setDirty(true)}
              onNodeClick={(_, n) => setSelected(n.data)}
              onEdgeClick={(_, e) => setEdge(e)}
              onConnect={
                canEdit
                  ? (e) => {
                      setEdges((es) =>
                        addEdge(
                          {
                            ...e,
                            label: "related to",
                            type: "smoothstep",
                          },
                          es,
                        ),
                      );
                      setDirty(true);
                    }
                  : undefined
              }
              nodesConnectable={canEdit}
              deleteKeyCode={canEdit ? "Backspace" : null}
              onEdgesDelete={() => setDirty(true)}
              fitView
              minZoom={0.25}
              maxZoom={1.8}
            >
              <Background gap={20} size={1} color="#c9c5b8" />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
          <div className="graph-caption">
            <span className="dot" /> RELATIONSHIPS REVEAL THE STORY
          </div>
        </div>
      </div>
      {selected && (
        <Inspector {...ctx} record={selected} close={() => setSelected(null)} />
      )}
      {editing && <EvidenceForm c={c} close={() => setEditing(false)} />}
      {edge && (
        <Modal title="Evidence relationship" close={() => setEdge(null)}>
          <p className="mono">
            {edge.source} → {edge.target}
          </p>
          <label>
            Relationship
            <input
              value={edge.label || ""}
              disabled={!canEdit}
              onChange={(e) =>
                setEdge({
                  ...edge,
                  label: e.target.value,
                })
              }
            />
          </label>
          {canEdit && (
            <div className="actions">
              <button
                className="button primary"
                onClick={() => {
                  setEdges((es) =>
                    es.map((e) => (e.id === edge.id ? edge : e)),
                  );
                  setDirty(true);
                  setEdge(null);
                }}
              >
                Apply
              </button>
              <button
                className="button outline"
                onClick={() => {
                  setEdges((es) => es.filter((e) => e.id !== edge.id));
                  setDirty(true);
                  setEdge(null);
                }}
              >
                Remove connection
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
function Inspector({ record, guest, close, c }) {
  const { user, run, notify } = useApp(),
    [proof, setProof] = useState(null),
    [history, setHistory] = useState(null),
    [edit, setEdit] = useState(false),
    [reason, setReason] = useState(
      "I need this record to review the case findings.",
    );
  const pq = useQuery({
    queryKey: ["decision", record.id],
    queryFn: () => api(`/evidence/${record.id}/decision`),
    enabled: !guest,
  });
  const allowed = guest ? !record.locked : pq.data?.allowed;
  const rq = useQuery({
    queryKey: ["record", record.id],
    queryFn: () => api(`/evidence/${record.id}`),
    enabled: !guest && !!allowed,
  });
  const r = guest ? record : rq.data;
  return (
    <div className="drawer-overlay" onClick={close}>
      <motion.aside
        initial={{
          x: 60,
          opacity: 0,
        }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        className="drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <span className="eyebrow">EVIDENCE INSPECTION</span>
          <button aria-label="Close evidence" onClick={close}>
            <X />
          </button>
        </header>
        <span
          className={"classification " + record.classification.toLowerCase()}
        >
          {record.classification}
        </span>
        <h2>{record.title}</h2>
        <div className="record-meta">
          <span>{record.id.toUpperCase()}</span>
          <span>VERSION {r?.version || record.version}</span>
        </div>
        <ErrorNote error={pq.error || rq.error} />
        {allowed ? (
          <>
            <article className="document-content">
              {r?.content || "Retrieving authorized content…"}
            </article>
            {!guest && (
              <div className="actions">
                <button
                  className="button outline"
                  onClick={() =>
                    run(() => api(`/evidence/${record.id}/verify`, "POST", {}))
                      .then(setProof)
                      .catch(() => {})
                  }
                >
                  <Fingerprint size={16} /> Verify integrity
                </button>
                <button
                  className="button outline"
                  onClick={() =>
                    run(() => api(`/evidence/${record.id}/history`))
                      .then(setHistory)
                      .catch(() => {})
                  }
                >
                  Version history
                </button>
                {user?.role !== "REVIEWER" && (
                  <button
                    className="button primary"
                    onClick={() => setEdit(true)}
                  >
                    Edit record
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="restricted">
            <Lock size={32} />
            <h3>Some records stay sealed.</h3>
            <p>Your current clearance does not authorize this record.</p>
            {guest ? (
              <Link className="button primary" to="/login">
                Sign in to request access <ArrowUpRight size={16} />
              </Link>
            ) : (
              <>
                <label>
                  Reason for access
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                  />
                </label>
                <button
                  className="button outline"
                  onClick={() =>
                    run(
                      () =>
                        api(`/evidence/${record.id}/requests`, "POST", {
                          reason,
                        }),
                      "Access request submitted",
                    ).catch(() => {})
                  }
                >
                  Request access
                </button>
              </>
            )}
          </div>
        )}
        <div className="xray">
          <span className="eyebrow">
            ACCESS X-RAY {guest ? " / EXHIBIT" : ""}
          </span>
          <h3>Behind the decision.</h3>
          {(guest
            ? [
                {
                  label: "Public demo identity",
                  pass: true,
                },
                {
                  label: "Read-only exhibit",
                  pass: true,
                },
                {
                  label: "Public content only",
                  pass: allowed,
                },
              ]
            : pq.data?.steps || []
          ).map((s, i) => (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: i * 0.12,
              }}
              key={s.label}
            >
              <span className={s.pass ? "step-pass" : "step-denied"}>
                {s.pass ? <Check size={13} /> : <Lock size={12} />}
              </span>
              {s.label}
              <b>{s.pass ? "PASS" : "DENIED"}</b>
            </motion.div>
          ))}
          <p className="small">
            {guest
              ? "Illustrative public-preview policy."
              : "Decision produced by the server for your current identity and record."}
          </p>
        </div>
        {proof && (
          <div className="proof">
            <h3>
              {proof.valid ? "Integrity verified" : "Integrity check failed"}
            </h3>
            <p>{proof.explanation}</p>
            <label>
              Stored SHA-256<code>{proof.storedDigest}</code>
            </label>
            <label>
              Calculated SHA-256
              <code>{proof.calculatedDigest || "Authentication failed"}</code>
            </label>
          </div>
        )}
        {history && (
          <div className="history">
            <h3>Chain of custody</h3>
            {history.map((v) => (
              <article key={v.version}>
                <b>
                  Version {v.version} · {v.author || "Seeded archive"}
                </b>
                <small>{new Date(v.created_at).toLocaleString()}</small>
                <p>{v.content}</p>
                <code>{v.digest}</code>
              </article>
            ))}
          </div>
        )}
        {!guest && allowed && <Annotations eid={record.id} />}
        {edit && r && (
          <EvidenceForm c={c} initial={r} close={() => setEdit(false)} />
        )}
      </motion.aside>
    </div>
  );
}
function Annotations({ eid }) {
  const { run, user } = useApp();
  const [content, setContent] = useState("");
  const q = useQuery({
    queryKey: ["annotations", eid],
    queryFn: () => api(`/evidence/${eid}/annotations`),
  });
  return (
    <section className="history">
      <h3>Investigation notes</h3>
      <ErrorNote error={q.error} />
      {q.data?.map((a) => (
        <article key={a.id}>
          <b>{a.name}</b>
          <small>{new Date(a.created_at).toLocaleString()}</small>
          <p>{a.content}</p>
        </article>
      ))}
      {user.role !== "REVIEWER" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await run(
                () =>
                  api(`/evidence/${eid}/annotations`, "POST", {
                    content,
                  }),
                "Note saved",
              );
              setContent("");
            } catch {}
          }}
        >
          <label>
            Add an encrypted annotation
            <textarea
              required
              value={content}
              maxLength={2000}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <button className="button outline">Add note</button>
        </form>
      )}
    </section>
  );
}
export { Board };

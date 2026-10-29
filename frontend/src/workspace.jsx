import { useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Lock,
  FileText,
  ShieldCheck,
  Network,
  Clock,
  KeyRound,
  LogOut,
  ChevronRight,
  Fingerprint,
  ScanLine,
  Command,
  Menu,
  Settings,
  BookOpen,
} from "lucide-react";
import { api, demo } from "./api";
import { useApp, qc } from "./context";
import { Brand, Loading } from "./components";
import { Board } from "./board";
import { Timeline } from "./timeline";
import { Replay, Cipher } from "./security-exhibits";
import { Missions, Report } from "./guided";
import { Requests, Audit, SettingsPage } from "./management";
const tabs = [
  ["board", "Evidence board", Network],
  ["timeline", "Incident timeline", Clock],
  ["replay", "Breach replay", ScanLine],
  ["cipher", "Cipher room", KeyRound],
  ["missions", "Follow the evidence", BookOpen],
  ["report", "Final verdict", FileText],
  ["requests", "Access requests", Lock],
  ["audit", "Custody & audit", Fingerprint],
  ["settings", "Workspace settings", Settings],
];
function Workspace({ guest = false }) {
  const { user, ready, setUser } = useApp(),
    [params, setParams] = useSearchParams(),
    [mobile, setMobile] = useState(false);
  const c = params.get("case") || "case-074",
    base = guest ? "/demo" : "/workspace",
    nav = useNavigate();
  const dq = useQuery({
    queryKey: ["demo"],
    queryFn: demo,
    enabled: guest,
  });
  const cq = useQuery({
    queryKey: ["cases"],
    queryFn: () => api("/cases"),
    enabled: !guest && !!user,
  });
  const current = guest ? dq.data?.case : cq.data?.find((x) => x.id === c);
  if (!guest && !ready) return <Loading />;
  if (!guest && !user)
    return (
      <div className="center">
        <Brand />
        <h1>Identify yourself.</h1>
        <p>Sign in to access your assigned cases.</p>
        <Link className="button primary" to="/login">
          Sign in <ArrowRight size={18} />
        </Link>
        <Link to="/demo/board">Or explore the fictional demo</Link>
      </div>
    );
  const ctx = {
    guest,
    c,
    base,
    story: dq.data,
    current,
  };
  return (
    <div className="workspace">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Brand />
        <div className="archive-label">
          THE ARCHIVE <span>01</span>
        </div>
        {guest ? (
          <div className="case-selector">
            <span className="dot" /> CASE 074
            <ChevronRight size={15} />
          </div>
        ) : (
          <select
            aria-label="Current case"
            value={c}
            onChange={(e) =>
              setParams({
                case: e.target.value,
              })
            }
          >
            {(cq.data || []).map((x) => (
              <option value={x.id} key={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        )}
        <div className="nav-caption">INVESTIGATION</div>
        <nav>
          {tabs
            .filter(
              (t) =>
                !guest || !["requests", "audit", "settings"].includes(t[0]),
            )
            .map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={`${base}/${path}?case=${c}`}
                onClick={() => setMobile(false)}
              >
                <Icon size={17} />
                {label}
                <span>↗</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="access-badge">
            <ShieldCheck size={18} />
            <span>
              {guest ? "PUBLIC EXPLORER" : user?.role}
              <small>
                {guest ? "Read-only · fictional exhibits" : user?.name}
              </small>
            </span>
          </div>
          {guest ? (
            <Link className="text-link" to="/login">
              Enter secure workspace <ArrowUpRight size={16} />
            </Link>
          ) : (
            <button
              className="text-link"
              onClick={async () => {
                await api("/auth/logout", "POST", {});
                qc.clear();
                setUser(null);
                nav("/");
              }}
            >
              Sign out <LogOut size={16} />
            </button>
          )}
          <span className="shortcut">
            <Command size={12} /> K — QUICK NAVIGATION
          </span>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div>
            <span>ARCHIVE</span>
            <ChevronRight size={14} />
            <span>
              {c === "case-074" ? "CASE 074" : current?.title || "CASE"}
            </span>
          </div>
          <div>
            <span className="dot" />
            {guest ? "FICTIONAL / PUBLIC PREVIEW" : "SECURE WORKSPACE"}
            <span className="avatar">{guest ? "P" : user?.name?.[0]}</span>
          </div>
        </header>
        {guest && (
          <div className="demo-banner">
            You’re exploring a fictional, read-only exhibit.{" "}
            <Link to="/login">
              Sign in to save and investigate <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <Routes>
          <Route path="board" element={<Board key={c} {...ctx} />} />
          <Route path="timeline" element={<Timeline {...ctx} />} />
          <Route path="replay" element={<Replay {...ctx} />} />
          <Route path="cipher" element={<Cipher {...ctx} />} />
          <Route path="missions" element={<Missions {...ctx} />} />
          <Route path="report" element={<Report {...ctx} />} />
          <Route path="requests" element={<Requests {...ctx} />} />
          <Route path="audit" element={<Audit {...ctx} />} />
          <Route path="settings" element={<SettingsPage {...ctx} />} />
          <Route path="*" element={<Board key={c} {...ctx} />} />
        </Routes>
      </div>
    </div>
  );
}
export { Workspace };

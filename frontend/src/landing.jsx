import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, Lock, ScanLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { api } from "./api";
import { useApp, qc } from "./context";
import { Brand } from "./components";
function Home() {
  const nav = useNavigate();
  const [opening, setOpening] = useState(false);
  function openDossier(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setOpening(true);
    setTimeout(
      () => nav("/demo/board"),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380,
    );
  }
  return (
    <div className={"landing " + (opening ? "opening" : "")}>
      <header className="topbar">
        <Brand />
        <nav>
          <a href="#method">The method</a>
          <Link to="/demo/board">Case 074</Link>
          <Link className="outline" to="/login">
            Workspace <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> AN INDEPENDENT LOOK AT THE EVIDENCE
            </div>
            <h1>
              The truth is
              <br />
              in the <em>records.</em>
            </h1>
            <p>
              Every record tells a story.
              <br />
              Not everyone gets to read it.
            </p>
            <div className="hero-actions">
              <Link
                className="button primary"
                to="/demo/board"
                onClick={openDossier}
              >
                Enter the evidence room <ArrowUpRight size={19} />
              </Link>
              <a className="text-link" href="#method">
                Explore the method <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-foot">
              <span>01 / OPEN INVESTIGATION</span>
              <span>BELLWETHER, 2026</span>
            </div>
          </div>
          <Link
            to="/demo/board"
            className="dossier-scene"
            onClick={openDossier}
            aria-label="Open Case 074"
          >
            <div className="cross c1">+</div>
            <div className="cross c2">+</div>
            <span className="vertical-note">
              ARCHIVE COLLECTION / INFORMATION SECURITY
            </span>
            <motion.div
              className="dossier"
              whileHover={{
                rotate: -1,
                y: -8,
              }}
              transition={{
                duration: 0.3,
              }}
            >
              <div className="folder-tab">
                ACTIVE CASE <span>074</span>
              </div>
              <div className="folder-inner">
                <div className="folder-heading">
                  <span>
                    NORTHLINE TRANSIT AUTHORITY
                    <br />
                    OFFICE OF INTERNAL REVIEW
                  </span>
                  <ScanLine size={30} />
                </div>
                <div className="stamp">
                  EVIDENCE
                  <br />
                  PRESERVED
                </div>
                <p className="mono small">INCIDENT FILE / NL–074</p>
                <h2>
                  The Northline
                  <br />
                  Incident
                </h2>
                <div className="redacted">
                  <span /> <span />
                  <i /> <span />
                </div>
                <p className="folder-caption">
                  An unfamiliar login. A missing report.
                  <br />
                  The records tell a different story.
                </p>
                <div className="folder-bottom">
                  <div>
                    <b>08</b>
                    <span>CONNECTED RECORDS</span>
                  </div>
                  <div className="seal">
                    P<br />
                    <small>ARCHIVE</small>
                  </div>
                  <ArrowUpRight size={38} />
                </div>
              </div>
            </motion.div>
            <div className="paper-slip">
              <span className="mono">EXHIBIT 02 / DATABASE ACTIVITY</span>
              <code>search = ' OR '1'='1</code>
              <span className="olive">TREATED AS DATA. NOT A COMMAND.</span>
            </div>
            <div className="scene-label">
              <span className="dot" /> FICTIONAL CASE. REAL SECURITY PRINCIPLES.
            </div>
          </Link>
        </section>
        <div className="ticker">
          <span>FOLLOW THE ACCESS TRAIL</span>
          <span>01 — IDENTITY</span>
          <span>02 — PERMISSION</span>
          <span>03 — INTEGRITY</span>
          <span>NOTHING TAKEN AT FACE VALUE ↗</span>
        </div>
        <section id="method" className="method">
          <div>
            <span className="eyebrow">THE METHOD / THREE LINES OF DEFENSE</span>
            <h2>
              Look closer.
              <br />
              <em>Question access.</em>
            </h2>
            <p>
              Reconstruct an incident from the records left behind. Then step
              inside the mechanisms that keep those records safe.
            </p>
            <Link className="text-link" to="/demo/missions">
              Follow the evidence <ArrowRight size={18} />
            </Link>
          </div>
          <div className="method-list">
            {[
              [
                "01",
                "Who gets to know?",
                "Follow a permission decision from identity to clearance.",
                "board",
              ],
              [
                "02",
                "When data pretends to command.",
                "Replay a malformed query, safely. See why parameters matter.",
                "replay",
              ],
              [
                "03",
                "What remains behind the seal?",
                "Inspect encryption, authenticated recovery, and the limits of integrity.",
                "cipher",
              ],
            ].map(([n, t, d, p]) => (
              <Link to={"/demo/" + p} key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
                <ArrowUpRight />
              </Link>
            ))}
          </div>
        </section>
        <section className="closing">
          <span className="eyebrow">CASE 074 IS WAITING</span>
          <h2>
            Eight records.
            <br />
            One story to reconstruct.
          </h2>
          <Link className="button paper" to="/demo/missions">
            Start your investigation <ArrowRight size={18} />
          </Link>
          <div className="giant-number">074</div>
        </section>
      </main>
      <footer>
        <Brand />
        <p>
          A fictional investigation. An application of real database security.
        </p>
        <span>PARALLAX / 2026</span>
      </footer>
    </div>
  );
}
function Login() {
  const { setUser, notify } = useApp(),
    nav = useNavigate(),
    {
      register,
      handleSubmit,
      formState: { isSubmitting },
    } = useForm();
  return (
    <div className="login-page">
      <Brand />
      <div className="login-layout">
        <div>
          <div className="eyebrow">AUTHORIZED PERSONNEL</div>
          <h1>
            A place for
            <br />
            <em>closer inspection.</em>
          </h1>
          <p>
            The workspace is available to accounts created by your archive
            administrator. Guests can explore the fictional case without signing
            in.
          </p>
          <Link className="text-link" to="/demo/board">
            Explore the public case <ArrowRight size={18} />
          </Link>
        </div>
        <form
          className="login-form"
          onSubmit={handleSubmit(async (b) => {
            try {
              const d = await api("/auth/login", "POST", b);
              qc.clear();
              setUser(d.user);
              nav("/workspace/board");
            } catch (e) {
              notify(e.message);
            }
          })}
        >
          <Lock size={28} />
          <span className="eyebrow">SECURE WORKSPACE</span>
          <h2>Welcome to the archive.</h2>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              {...register("email")}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              {...register("password")}
            />
          </label>
          <button className="button primary" disabled={isSubmitting}>
            {isSubmitting ? "Verifying identity…" : "Sign in"}
            <ArrowRight size={18} />
          </button>
          <p className="small">
            First visit? Your administrator sets up your account and case
            membership. No public administrator registration.
          </p>
        </form>
      </div>
    </div>
  );
}
export { Home, Login };

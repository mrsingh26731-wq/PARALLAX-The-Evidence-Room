import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { X, ArrowUpRight } from "lucide-react";
import { api } from "./api";
import { Context, qc } from "./context";
import { Home, Login } from "./landing";
import { Workspace } from "./workspace";
import { Modal } from "./components";
import "@xyflow/react/dist/style.css";
import "./style.css";
function App() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [command, setCommand] = useState(false);
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (e.key === "Escape") setCommand(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const value = {
    user,
    setUser,
    ready,
    notify: setNotice,
    run: async (fn, msg) => {
      try {
        const r = await fn();
        if (msg) setNotice(msg);
        qc.invalidateQueries();
        return r;
      } catch (e) {
        setNotice(e.message);
        throw e;
      }
    },
  };
  return (
    <Context.Provider value={value}>
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/demo/*" element={<Workspace guest />} />
          <Route path="/workspace/*" element={<Workspace />} />
          <Route
            path="*"
            element={
              <div className="center">
                <h1>That file is not here.</h1>
                <Link to="/">Return to the archive →</Link>
              </div>
            }
          />
        </Routes>
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {command && (
          <Modal title="Go somewhere" close={() => setCommand(false)}>
            <div className="command-list">
              {[
                "board",
                "timeline",
                "replay",
                "cipher",
                "missions",
                "report",
              ].map((x) => (
                <Link
                  onClick={() => setCommand(false)}
                  key={x}
                  to={`${user ? "/workspace" : "/demo"}/${x}`}
                >
                  {x}
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          </Modal>
        )}
      </MotionConfig>
    </Context.Provider>
  );
}
class Boundary extends React.Component {
  state = {
    error: false,
  };
  static getDerivedStateFromError() {
    return {
      error: true,
    };
  }
  render() {
    return this.state.error ? (
      <div className="center">
        <h1>The archive needs a moment.</h1>
        <p>A page could not render. Reload to try again.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </Boundary>,
);

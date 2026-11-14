import React from "react";
import { useGridLock } from "../../context/EngineContext";
import { Page } from "../../types/gridlock";
import {
  LayoutDashboard,
  Warehouse,
  GitGraph,
  Cpu,
  RotateCcw,
  BarChart3,
  Sliders,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface NavItem {
  name: Page;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  badge?: (snapshot: ReturnType<typeof useGridLock>["snapshot"]) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", icon: LayoutDashboard, label: "Overview" },
  { name: "Warehouse", icon: Warehouse, label: "Warehouse Floor" },
  {
    name: "Monitor",
    icon: GitGraph,
    label: "Deadlock Monitor",
    badge: (snapshot) =>
      snapshot?.allocationGraph?.cycle?.length ? (
        <span className="sidebar-badge danger animate-pulse">CYCLE</span>
      ) : null,
  },
  {
    name: "Memory",
    icon: Cpu,
    label: "Deadlock Memory",
    badge: (snapshot) =>
      snapshot?.memory?.activeMatch ? (
        <span className="sidebar-badge success">MATCH</span>
      ) : null,
  },
  {
    name: "Recovery",
    icon: RotateCcw,
    label: "Recovery Center",
    badge: (snapshot) =>
      snapshot?.recovery?.active ? (
        <span className="sidebar-badge warning">ACTIVE</span>
      ) : null,
  },
  { name: "Analytics", icon: BarChart3, label: "Analytics" },
];

export function Sidebar() {
  const {
    page,
    setPage,
    collapsed,
    setCollapsed,
    snapshot,
    connection,
    mode,
    setShowConfigModal,
    setShowProjectModal,
  } = useGridLock();

  const isDeadlocked = Boolean(snapshot?.allocationGraph?.cycle?.length);

  return (
    <aside className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <div className="brand-logo">
            <span className="bar-1" />
            <span className="bar-2" />
            <span className="bar-3" />
          </div>
        </div>
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-title">
              <strong>GRIDLOCK</strong>
              <span className="brand-badge">OS</span>
            </div>
            <span className="brand-sub">Autonomous Logistics</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-group-label">{!collapsed ? "SYSTEM MODULES" : "•"}</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = page === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setPage(item.name)}
              className={`nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <div className="nav-icon-wrap">
                <Icon size={18} className="nav-icon" />
              </div>
              {!collapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && item.badge(snapshot)}
                </>
              )}
              {isActive && <div className="nav-active-pip" />}
            </button>
          );
        })}
      </nav>

      {/* Quick Status Notice if deadlocked */}
      {!collapsed && isDeadlocked && (
        <div className="sidebar-alert-card animate-pulse">
          <div className="alert-head">
            <ShieldAlert size={14} className="text-caput" />
            <strong>Circular Wait Alert</strong>
          </div>
          <p>DFS cycle detected. Thread execution blocked.</p>
          <button
            className="alert-cta"
            onClick={() => setPage("Recovery")}
          >
            Launch Recovery →
          </button>
        </div>
      )}

      {/* Bottom Utility Actions */}
      <div className="sidebar-footer">
        <div className="sidebar-tools">
          <button
            className="tool-btn"
            onClick={() => setShowConfigModal(true)}
            title="Simulation Settings"
          >
            <Sliders size={16} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            className="tool-btn"
            onClick={() => setShowProjectModal(true)}
            title="Project Architecture"
          >
            <Info size={16} />
            {!collapsed && <span>Architecture</span>}
          </button>
        </div>

        {/* Engine status indicator */}
        <div className="sidebar-engine-pill">
          <div className="engine-dot-wrap">
            <span className={`status-indicator-dot ${connection}`} />
          </div>
          {!collapsed && (
            <div className="engine-info">
              <span className="engine-name">
                {mode === "backend" ? "C ENGINE (LIVE)" : "SIMULATOR CORE"}
              </span>
              <span className="engine-tick mono">
                TICK {snapshot?.engine?.tick ?? "—"}
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="collapse-toggle-btn"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="collapse-text">Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
}

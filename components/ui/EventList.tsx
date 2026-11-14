import React, { useState } from "react";
import { EngineEvent } from "../../types/gridlock";
import {
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";

interface EventListProps {
  events?: EngineEvent[];
  maxItems?: number;
  showFilters?: boolean;
}

export function EventList({
  events = [],
  maxItems = 8,
  showFilters = false,
}: EventListProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = events
    .slice()
    .reverse()
    .filter((e) => {
      if (filter === "all") return true;
      if (filter === "deadlock") return e.type === "deadlock" || e.severity === "critical";
      if (filter === "memory") return e.type === "memory_match";
      if (filter === "allocation") return e.type === "allocated" || e.type === "released";
      return true;
    })
    .slice(0, maxItems);

  if (!events.length) {
    return (
      <div className="empty-events-box">
        <Clock size={18} className="empty-clock-icon" />
        <strong>Awaiting Engine Decisions</strong>
        <p>Resource claims, cycle checks, and memory match events stream here in real time.</p>
      </div>
    );
  }

  return (
    <div className="event-list-container">
      {showFilters && (
        <div className="event-filter-bar">
          <button
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({events.length})
          </button>
          <button
            className={`filter-chip ${filter === "deadlock" ? "active" : ""}`}
            onClick={() => setFilter("deadlock")}
          >
            Deadlocks
          </button>
          <button
            className={`filter-chip ${filter === "memory" ? "active" : ""}`}
            onClick={() => setFilter("memory")}
          >
            Memory Matches
          </button>
          <button
            className={`filter-chip ${filter === "allocation" ? "active" : ""}`}
            onClick={() => setFilter("allocation")}
          >
            Allocations
          </button>
        </div>
      )}

      <div className="event-rows-scroll">
        {filtered.map((evt, idx) => {
          const isCritical = evt.type === "deadlock" || evt.severity === "critical";
          const isMemory = evt.type === "memory_match";
          const isRecovery = evt.type?.includes("recovery");
          const isSuccess = evt.severity === "success";

          const timeFormatted =
            typeof evt.timestamp === "number"
              ? new Date(evt.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : evt.timestamp;

          return (
            <div
              key={evt.id || idx}
              className={`engine-event-row ${isCritical ? "critical-event" : ""} ${
                isMemory ? "memory-event" : ""
              }`}
            >
              <div className="event-mark-col">
                {isCritical ? (
                  <ShieldAlert size={14} className="text-caput" />
                ) : isMemory ? (
                  <Cpu size={14} className="text-amber" />
                ) : (
                  <span className={`event-dot ${isSuccess ? "success" : "normal"}`} />
                )}
              </div>

              <div className="event-content-col">
                <div className="event-msg-line">
                  <strong className="event-msg">{evt.message}</strong>
                </div>
                <div className="event-meta-line mono">
                  <span className="event-actor">{evt.robotId || "Kernel"}</span>
                  {evt.resourceId && (
                    <>
                      <span className="meta-sep">•</span>
                      <span className="event-res">Lock: {evt.resourceId}</span>
                    </>
                  )}
                  <span className="meta-sep">•</span>
                  <span className="event-time">{timeFormatted}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

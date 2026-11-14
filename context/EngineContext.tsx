import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Connection,
  Page,
  Robot,
  Snapshot,
  ThemeMode,
} from "../types/gridlock";
import { SimulationEngine } from "../engine/simulation";

interface EngineContextType {
  connection: Connection;
  snapshot: Snapshot | null;
  lastSeen: Date | null;
  page: Page;
  setPage: (p: Page) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  mode: "backend" | "simulated";
  setMode: (m: "backend" | "simulated") => void;
  selectedRobot: Robot | null;
  setSelectedRobot: (r: Robot | null) => void;
  selectedResource: string | null;
  setSelectedResource: (r: string | null) => void;
  command: (name: string, payload?: Record<string, unknown>) => boolean;
  retry: () => void;
  // Direct simulation controls
  isRunning: boolean;
  speed: number;
  togglePlay: () => void;
  stepTick: () => void;
  setSpeed: (s: number) => void;
  addRobot: () => void;
  removeRobot: () => void;
  triggerDeadlock: () => void;
  resolveDeadlock: () => void;
  resetSimulation: () => void;
  showConfigModal: boolean;
  setShowConfigModal: (v: boolean) => void;
  showProjectModal: boolean;
  setShowProjectModal: (v: boolean) => void;
}

const EngineContext = createContext<EngineContextType | null>(null);

function safeSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object") return null;
  const packet = value as Record<string, unknown>;
  const payload = packet.data ?? packet.payload ?? packet.snapshot ?? packet;
  return payload && typeof payload === "object" ? (payload as Snapshot) : null;
}

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mode, setMode] = useState<"backend" | "simulated">("simulated");

  const [connection, setConnection] = useState<Connection>("simulated");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(new Date());
  const [attempt, setAttempt] = useState(0);

  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeedState] = useState(1);

  const simRef = useRef<SimulationEngine | null>(null);
  if (!simRef.current) {
    simRef.current = new SimulationEngine();
  }

  const socket = useRef<WebSocket | null>(null);

  // Sync theme attribute to document body/root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  // WebSocket Connection Handler
  useEffect(() => {
    if (mode !== "backend") {
      setConnection("simulated");
      return;
    }

    let cancelled = false;
    const configured = import.meta.env.VITE_ENGINE_WS_URL as string | undefined;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = configured || `${protocol}//${window.location.host}/engine`;

    setConnection("connecting");
    const ws = new WebSocket(url);
    socket.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      setConnection("connected");
      ws.send(JSON.stringify({ type: "subscribe", channels: ["snapshot", "events", "metrics"] }));
    };

    ws.onmessage = (message) => {
      try {
        const parsed = JSON.parse(String(message.data));
        const next = safeSnapshot(parsed);
        if (!next || cancelled) return;
        setSnapshot(next);
        setLastSeen(new Date());
      } catch {
        // malformed packet ignored
      }
    };

    ws.onerror = () => {
      if (!cancelled) setConnection("disconnected");
    };

    ws.onclose = () => {
      if (!cancelled) setConnection("disconnected");
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [attempt, mode]);

  // Simulation Tick Loop (runs when mode === "simulated")
  useEffect(() => {
    if (mode !== "simulated") return;

    // Initial snapshot
    if (!snapshot && simRef.current) {
      setSnapshot(simRef.current.getSnapshot());
    }

    if (!isRunning) return;

    const intervalMs = Math.max(150, 1000 / speed);
    const interval = setInterval(() => {
      if (simRef.current) {
        const next = simRef.current.stepTick();
        setSnapshot(next);
        setLastSeen(new Date());
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [mode, isRunning, speed, snapshot]);

  // Command dispatcher
  const command = useCallback(
    (name: string, payload?: Record<string, unknown>) => {
      if (mode === "backend") {
        if (socket.current?.readyState !== WebSocket.OPEN) return false;
        socket.current.send(JSON.stringify({ type: "command", command: name, ...payload }));
        return true;
      }

      // Simulation command handling
      if (!simRef.current) return false;
      if (name === "start") {
        simRef.current.setRunning(true);
        setIsRunning(true);
      } else if (name === "pause") {
        simRef.current.setRunning(false);
        setIsRunning(false);
      } else if (name === "set_speed") {
        const s = Number(payload?.speed) || 1;
        simRef.current.setSpeed(s);
        setSpeedState(s);
      } else if (name === "add_robot") {
        setSnapshot(simRef.current.addRobot());
      } else if (name === "load_deadlock_scenario") {
        setSnapshot(simRef.current.triggerDeadlockScenario());
      } else if (name === "resolve_deadlock") {
        setSnapshot(simRef.current.resolveDeadlock());
      } else if (name === "reset") {
        setSnapshot(simRef.current.resetSimulation());
      }
      return true;
    },
    [mode],
  );

  const togglePlay = useCallback(() => {
    if (isRunning) {
      command("pause");
    } else {
      command("start");
    }
  }, [isRunning, command]);

  const stepTick = useCallback(() => {
    if (simRef.current) {
      setSnapshot(simRef.current.stepTick());
      setLastSeen(new Date());
    }
  }, []);

  const setSpeed = useCallback(
    (s: number) => {
      command("set_speed", { speed: s });
    },
    [command],
  );

  const addRobot = useCallback(() => {
    command("add_robot");
  }, [command]);

  const removeRobot = useCallback(() => {
    if (simRef.current) {
      setSnapshot(simRef.current.removeRobot());
    }
  }, []);

  const triggerDeadlock = useCallback(() => {
    command("load_deadlock_scenario");
  }, [command]);

  const resolveDeadlock = useCallback(() => {
    command("resolve_deadlock");
  }, [command]);

  const resetSimulation = useCallback(() => {
    command("reset");
  }, [command]);

  const retry = useCallback(() => {
    setAttempt((v) => v + 1);
  }, []);

  return (
    <EngineContext.Provider
      value={{
        connection,
        snapshot,
        lastSeen,
        page,
        setPage,
        collapsed,
        setCollapsed,
        theme,
        toggleTheme,
        mode,
        setMode,
        selectedRobot,
        setSelectedRobot,
        selectedResource,
        setSelectedResource,
        command,
        retry,
        isRunning,
        speed,
        togglePlay,
        stepTick,
        setSpeed,
        addRobot,
        removeRobot,
        triggerDeadlock,
        resolveDeadlock,
        resetSimulation,
        showConfigModal,
        setShowConfigModal,
        showProjectModal,
        setShowProjectModal,
      }}
    >
      {children}
    </EngineContext.Provider>
  );
}

export function useGridLock() {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error("useGridLock must be used within an EngineProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  AppUser,
  ChildUser,
  DailyLog,
  FamilyDefaults,
  HomeworkTask,
  PauseRule,
  SharerUser,
  TaskPriority,
  TaskType,
  TaskUnit,
} from "./types";
import { buildSeedData } from "./seed";
import { emptyPauseRule } from "./allocation";
import { addDays, todayISO } from "./date";

function defaultFamilyDefaults(): FamilyDefaults {
  return {
    startDate: todayISO(),
    endDate: addDays(todayISO(), 13),
    pauseRule: emptyPauseRule(),
    priority: "mid",
  };
}

const DATA_KEY = "yattane:data";
const SESSION_KEY = "yattane:session";

function loadData(): AppData {
  if (typeof window === "undefined") return buildSeedData();
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return buildSeedData();
    const parsed = JSON.parse(raw) as AppData;
    // 旧バージョンのlocalStorageデータにはfamilyDefaultsが無いため補完する
    return { ...parsed, familyDefaults: parsed.familyDefaults ?? {} };
  } catch {
    return buildSeedData();
  }
}

function loadSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

interface StoreContextValue {
  data: AppData;
  hydrated: boolean;
  currentUser: AppUser | null;
  currentUserId: string | null;
  login: (userId: string) => void;
  // 権限モデル（セクション2）
  updateAdmin: (adminId: string, name: string) => void;
  addChild: (name: string) => ChildUser;
  updateChild: (childId: string, name: string) => void;
  removeChild: (childId: string) => void;
  addSharer: (childId: string, name: string, addedBy: "admin" | "owner") => SharerUser;
  removeSharer: (sharerId: string) => void;
  // 課題・目標管理（セクション3）
  addTask: (input: {
    childId: string;
    name: string;
    totalAmount: number;
    unit: TaskUnit;
    priority: TaskPriority;
    type: TaskType;
    startDate: string;
    endDate: string;
    pauseRule: PauseRule;
  }) => HomeworkTask;
  updateTask: (taskId: string, patch: Partial<HomeworkTask>) => void;
  deleteTask: (taskId: string) => void;
  reportLog: (taskId: string, date: string, doneAmount: number) => void;
  // 設定の継承（共通デフォルト＋個別上書き）
  updateFamilyDefaults: (adminId: string, patch: Partial<FamilyDefaults>) => void;
  // ヘルパー
  getChildrenOfAdmin: (adminId: string) => ChildUser[];
  getSharersOfChild: (childId: string) => SharerUser[];
  getTasksOfChild: (childId: string) => HomeworkTask[];
  getLogsOfTask: (taskId: string) => DailyLog[];
  getFamilyDefaults: (adminId: string) => FamilyDefaults;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => buildSeedData());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // 初回マウント時に一度だけ localStorage（外部ストア）から状態を読み込む。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setCurrentUserId(loadSession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (currentUserId) window.localStorage.setItem(SESSION_KEY, currentUserId);
    else window.localStorage.removeItem(SESSION_KEY);
  }, [currentUserId, hydrated]);

  const currentUser: AppUser | null = useMemo(() => {
    if (!currentUserId) return null;
    return (
      data.admins.find((a) => a.id === currentUserId) ??
      data.children.find((c) => c.id === currentUserId) ??
      data.sharers.find((s) => s.id === currentUserId) ??
      null
    );
  }, [currentUserId, data]);

  const login = useCallback((userId: string) => setCurrentUserId(userId), []);

  const updateAdmin = useCallback((adminId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      admins: prev.admins.map((a) => (a.id === adminId ? { ...a, name } : a)),
    }));
  }, []);

  const addChild = useCallback((name: string): ChildUser => {
    let created: ChildUser | null = null;
    setData((prev) => {
      const admin = prev.admins[0];
      created = {
        id: crypto.randomUUID(),
        role: "owner",
        name,
        adminId: admin.id,
      };
      return { ...prev, children: [...prev.children, created] };
    });
    return created as unknown as ChildUser;
  }, []);

  const updateChild = useCallback((childId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      children: prev.children.map((c) => (c.id === childId ? { ...c, name } : c)),
    }));
  }, []);

  const removeChild = useCallback((childId: string) => {
    setData((prev) => {
      const taskIds = prev.tasks.filter((t) => t.childId === childId).map((t) => t.id);
      return {
        ...prev,
        children: prev.children.filter((c) => c.id !== childId),
        sharers: prev.sharers.filter((s) => s.childId !== childId),
        tasks: prev.tasks.filter((t) => t.childId !== childId),
        logs: prev.logs.filter((l) => !taskIds.includes(l.taskId)),
      };
    });
  }, []);

  const addSharer = useCallback(
    (childId: string, name: string, addedBy: "admin" | "owner"): SharerUser => {
      let created: SharerUser | null = null;
      setData((prev) => {
        created = {
          id: crypto.randomUUID(),
          role: "viewer",
          name,
          childId,
          addedBy,
        };
        return { ...prev, sharers: [...prev.sharers, created] };
      });
      return created as unknown as SharerUser;
    },
    []
  );

  const removeSharer = useCallback((sharerId: string) => {
    setData((prev) => ({
      ...prev,
      sharers: prev.sharers.filter((s) => s.id !== sharerId),
    }));
  }, []);

  const addTask = useCallback(
    (input: {
      childId: string;
      name: string;
      totalAmount: number;
      unit: TaskUnit;
      priority: TaskPriority;
      type: TaskType;
      startDate: string;
      endDate: string;
      pauseRule: PauseRule;
    }): HomeworkTask => {
      let created: HomeworkTask | null = null;
      setData((prev) => {
        created = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...input,
        };
        return { ...prev, tasks: [...prev.tasks, created] };
      });
      return created as unknown as HomeworkTask;
    },
    []
  );

  const updateTask = useCallback((taskId: string, patch: Partial<HomeworkTask>) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
      logs: prev.logs.filter((l) => l.taskId !== taskId),
    }));
  }, []);

  const reportLog = useCallback((taskId: string, date: string, doneAmount: number) => {
    setData((prev) => {
      const existing = prev.logs.find((l) => l.taskId === taskId && l.date === date);
      if (existing) {
        return {
          ...prev,
          logs: prev.logs.map((l) =>
            l.id === existing.id
              ? { ...l, doneAmount, reportedAt: new Date().toISOString() }
              : l
          ),
        };
      }
      const newLog: DailyLog = {
        id: crypto.randomUUID(),
        taskId,
        date,
        doneAmount,
        reportedAt: new Date().toISOString(),
      };
      return { ...prev, logs: [...prev.logs, newLog] };
    });
  }, []);

  const updateFamilyDefaults = useCallback((adminId: string, patch: Partial<FamilyDefaults>) => {
    setData((prev) => {
      const base = prev.familyDefaults[adminId] ?? defaultFamilyDefaults();
      return {
        ...prev,
        familyDefaults: { ...prev.familyDefaults, [adminId]: { ...base, ...patch } },
      };
    });
  }, []);

  const getFamilyDefaults = useCallback(
    (adminId: string) => data.familyDefaults[adminId] ?? defaultFamilyDefaults(),
    [data]
  );

  const getChildrenOfAdmin = useCallback(
    (adminId: string) => data.children.filter((c) => c.adminId === adminId),
    [data]
  );
  const getSharersOfChild = useCallback(
    (childId: string) => data.sharers.filter((s) => s.childId === childId),
    [data]
  );
  const getTasksOfChild = useCallback(
    (childId: string) => data.tasks.filter((t) => t.childId === childId),
    [data]
  );
  const getLogsOfTask = useCallback(
    (taskId: string) => data.logs.filter((l) => l.taskId === taskId),
    [data]
  );

  const value: StoreContextValue = {
    data,
    hydrated,
    currentUser,
    currentUserId,
    login,
    updateAdmin,
    addChild,
    updateChild,
    removeChild,
    addSharer,
    removeSharer,
    addTask,
    updateTask,
    deleteTask,
    reportLog,
    updateFamilyDefaults,
    getChildrenOfAdmin,
    getSharersOfChild,
    getTasksOfChild,
    getLogsOfTask,
    getFamilyDefaults,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

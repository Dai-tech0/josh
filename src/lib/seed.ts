import type { AppData } from "./types";
import { addDays, todayISO } from "./date";
import { emptyPauseRule } from "./allocation";

const today = todayISO();

export function buildSeedData(): AppData {
  const adminId = "admin-1";
  const child1Id = "child-1";
  const child2Id = "child-2";
  const sharerId = "sharer-1";
  const task1Id = "task-1";
  const task2Id = "task-2";

  return {
    admins: [{ id: adminId, role: "admin", name: "山田 花子（親）" }],
    children: [
      { id: child1Id, role: "owner", name: "山田 太郎", adminId },
      { id: child2Id, role: "owner", name: "山田 次郎", adminId },
    ],
    sharers: [
      {
        id: sharerId,
        role: "viewer",
        name: "山田 おばあちゃん",
        childId: child1Id,
        addedBy: "admin",
      },
    ],
    tasks: [
      {
        id: task1Id,
        childId: child1Id,
        name: "算数ドリル",
        totalAmount: 50,
        unit: "ページ",
        priority: "high",
        type: "amount",
        startDate: today,
        endDate: addDays(today, 13),
        pauseRule: { weeklyDays: [0], customRanges: [] },
        createdAt: new Date().toISOString(),
      },
      {
        id: task2Id,
        childId: child1Id,
        name: "読書感想文",
        totalAmount: 2,
        unit: "個",
        priority: "mid",
        type: "count",
        startDate: today,
        endDate: addDays(today, 13),
        pauseRule: emptyPauseRule(),
        createdAt: new Date().toISOString(),
      },
    ],
    logs: [],
    familyDefaults: {
      [adminId]: {
        startDate: today,
        endDate: addDays(today, 13),
        pauseRule: { weeklyDays: [0], customRanges: [] },
        priority: "mid",
      },
    },
  };
}

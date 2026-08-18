// 権限モデル（セクション2）

export type Role = "admin" | "owner" | "viewer";
// admin  = 管理者（親）
// owner  = オーナー（子供）
// viewer = 共有者（評価者）

export interface AdminUser {
  id: string;
  role: "admin";
  name: string;
}

export interface ChildUser {
  id: string; // Firebase Auth UID
  role: "owner";
  name: string;
  adminId: string; // 紐づく親アカウント（= 家族ID = 親のUID）
  loginCode: string; // ログイン用コード（パスワード代わり）
}

export interface SharerUser {
  id: string; // Firebase Auth UID
  role: "viewer";
  name: string;
  childId: string; // どの子供の報告を見られるか
  addedBy: "admin" | "owner"; // 追加した人（親からも子供からも追加可能）
  loginCode: string; // ログイン用コード（パスワード代わり）
}

export type AppUser = AdminUser | ChildUser | SharerUser;

// 課題・目標管理（セクション3）

// プリセット単位に加え、「自由入力」課題では任意の文字列を許容する
export type TaskUnit = "ページ" | "問" | "個" | "分" | "回" | "冊" | (string & {});

export type TaskPriority = "high" | "mid" | "low";

export type TaskType = "amount" | "count";
// amount = 総量を稼働日で割る通常課題（例: 算数ドリル50ページ）
// count  = 個数課題、週単位で割り当てる（例: 読書感想文5個）

export interface CustomPauseRange {
  id: string;
  label: string; // 例: 旅行期間
  start: string; // ISO date (yyyy-mm-dd)
  end: string; // ISO date (yyyy-mm-dd)
}

export interface PauseRule {
  weeklyDays: number[]; // 0=日, 1=月, ... 6=土。毎週の休止曜日
  customRanges: CustomPauseRange[]; // 個別期間指定の休止日
}

export interface HomeworkTask {
  id: string;
  childId: string;
  name: string; // 課題名
  totalAmount: number; // 総量
  unit: TaskUnit;
  priority: TaskPriority;
  type: TaskType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  pauseRule: PauseRule;
  createdAt: string; // ISO datetime
  // 親のリカバリー操作の履歴を軽く残す（セクション4関連の下地。今回は編集値のみ利用）
  extendedEndDate?: string;
}

export interface DailyLog {
  id: string;
  taskId: string;
  date: string; // ISO date。この日に対する報告
  doneAmount: number; // その日実施した量（count課題は0/1想定だが数値で許容）
  reportedAt: string; // ISO datetime
}

// 家族共通のデフォルト設定（新規課題作成時の初期値。課題ごとに上書き可能）
export interface FamilyDefaults {
  startDate: string;
  endDate: string;
  pauseRule: PauseRule;
  priority: TaskPriority;
}

export interface AppData {
  admins: AdminUser[];
  children: ChildUser[];
  sharers: SharerUser[];
  tasks: HomeworkTask[];
  logs: DailyLog[];
  familyDefaults: Record<string, FamilyDefaults>; // key: adminId
}

// 全ユーザー共通の掲示板（テスト運用中のフィードバック収集用）
export interface FeedbackPost {
  id: string;
  authorName: string;
  authorRole: Role | "developer";
  message: string;
  createdAt: string; // ISO datetime
}

// 日次報告の自動評価（3段階シール）
export type AchievementTier = "exceeded" | "met" | "missed";
// exceeded = ノルマ以上達成 →「大変よくできました」
// met      = ノルマちょうど達成 →「よくできました」
// missed   = 未達成 →「もっと頑張りましょう」

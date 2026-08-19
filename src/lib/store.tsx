"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import type {
  AdminUser,
  AppData,
  AppUser,
  ChildUser,
  DailyLog,
  FamilyDefaults,
  FeedbackPost,
  HomeworkTask,
  PauseRule,
  Role,
  SharerUser,
  TaskPriority,
  TaskType,
  TaskUnit,
} from "./types";
import { emptyPauseRule } from "./allocation";
import { addDays, todayISO } from "./date";

// メールリンク(パスワードレス)ログイン: 送信時にメールアドレスを覚えておき、
// リンクから戻ってきたときに signInWithEmailLink へ渡す（同一端末での折り返しを想定）
const EMAIL_LINK_STORAGE_KEY = "yattane:emailForSignIn";

// このデバイスで使ったことのあるログインコードを覚えておき、再入力なしで切り替えられるようにする
const KNOWN_CODES_KEY = "yattane:knownCodeAccounts";

export interface KnownCodeAccount {
  code: string;
  name: string;
  role: "owner" | "viewer";
}

function loadKnownCodeAccounts(): KnownCodeAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_CODES_KEY);
    return raw ? (JSON.parse(raw) as KnownCodeAccount[]) : [];
  } catch {
    return [];
  }
}

function saveKnownCodeAccount(account: KnownCodeAccount) {
  if (typeof window === "undefined") return;
  const list = loadKnownCodeAccounts().filter((a) => a.code !== account.code);
  list.unshift(account);
  window.localStorage.setItem(KNOWN_CODES_KEY, JSON.stringify(list.slice(0, 10)));
}

function removeKnownCodeAccount(code: string) {
  if (typeof window === "undefined") return;
  const list = loadKnownCodeAccounts().filter((a) => a.code !== code);
  window.localStorage.setItem(KNOWN_CODES_KEY, JSON.stringify(list));
}

function defaultFamilyDefaults(): FamilyDefaults {
  return {
    startDate: todayISO(),
    endDate: addDays(todayISO(), 13),
    pauseRule: emptyPauseRule(),
    priority: "mid",
  };
}

// 子供・共有者はメール不要でログインできるよう、ログインコードをパスワード代わりにした
// 合成メールアドレスでFirebase Authアカウントを作る（Cloud Functions/Blazeプラン不要）
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 0/O, 1/I/L のような紛らわしい文字は除外
function generateLoginCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}
function codeToEmail(code: string): string {
  return `${code.toLowerCase()}@yattane-family.internal`;
}

// 管理者(親)のログインセッションを維持したまま、子供/共有者用の新しいアカウントを作成するため
// 一時的なセカンダリFirebaseアプリを使う（メインのauthでcreateUserすると親がサインアウトしてしまうため）
async function createMemberAuthAccount(code: string): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, codeToEmail(code), code);
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

async function createUniqueMemberAccount(): Promise<{ uid: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLoginCode();
    try {
      const uid = await createMemberAuthAccount(code);
      return { uid, code };
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "auth/email-already-in-use") continue;
      throw e;
    }
  }
  throw new Error("ログインコードの生成に失敗しました。もう一度お試しください。");
}

function translateAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "このメールアドレスは既に使われています。";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください。";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "メールアドレスまたはパスワードが正しくありません。";
    default:
      return "エラーが発生しました。もう一度お試しください。";
  }
}

// Firestoreのフィールド値にundefinedは使えないため、undefinedはフィールド削除に変換する
function sanitizeForFirestore(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v === undefined ? deleteField() : v;
  }
  return out;
}

interface MemberDoc {
  role: "owner" | "viewer" | "device";
  name: string;
  loginCode: string;
  childId?: string;
  addedBy?: "admin" | "owner";
  age?: number;
}

// 1台の端末を複数の子供で共有するための「共通コード」。ログイン後、選んだ子供として振る舞う
const SELECTED_CHILD_KEY = "yattane:selectedChildId";

function loadSelectedChildId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_CHILD_KEY);
}

function saveSelectedChildId(childId: string | null) {
  if (typeof window === "undefined") return;
  if (childId) window.localStorage.setItem(SELECTED_CHILD_KEY, childId);
  else window.localStorage.removeItem(SELECTED_CHILD_KEY);
}

interface StoreContextValue {
  data: AppData;
  hydrated: boolean;
  currentUser: AppUser | null;
  currentUserId: string | null;
  authError: string | null;
  isDeveloper: boolean;
  needsAdminProfile: boolean;
  // 共通コード（1台の端末を複数の子供で共有）
  isSharedDevice: boolean;
  needsChildSelection: boolean;
  selectedChildId: string | null;
  selectChild: (childId: string | null) => void;
  sharedDeviceCode: string | null;
  getOrCreateSharedCode: () => Promise<string>;
  // 認証
  signUpAdmin: (email: string, password: string, name: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  sendLoginLink: (email: string) => Promise<void>;
  finishAdminProfile: (name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  // このデバイスで使ったログインコードのクイック切替
  knownCodeAccounts: KnownCodeAccount[];
  forgetCodeAccount: (code: string) => void;
  // 権限モデル（セクション2）
  updateAdmin: (adminId: string, name: string) => Promise<void>;
  addChild: (name: string) => Promise<ChildUser>;
  updateChild: (childId: string, name: string) => Promise<void>;
  updateChildAge: (childId: string, age: number | undefined) => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
  addSharer: (childId: string, name: string, addedBy: "admin" | "owner") => Promise<SharerUser>;
  removeSharer: (sharerId: string) => Promise<void>;
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
  }) => Promise<HomeworkTask>;
  updateTask: (taskId: string, patch: Partial<HomeworkTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reportLog: (taskId: string, date: string, doneAmount: number) => Promise<void>;
  // 設定の継承（共通デフォルト＋個別上書き）
  updateFamilyDefaults: (adminId: string, patch: Partial<FamilyDefaults>) => Promise<void>;
  // 全ユーザー共通のフィードバック掲示板
  feedbackPosts: FeedbackPost[];
  postFeedback: (message: string) => Promise<void>;
  // ヘルパー
  getChildrenOfAdmin: (adminId: string) => ChildUser[];
  getSharersOfChild: (childId: string) => SharerUser[];
  getTasksOfChild: (childId: string) => HomeworkTask[];
  getLogsOfTask: (taskId: string) => DailyLog[];
  getFamilyDefaults: (adminId: string) => FamilyDefaults;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role | "device" | null>(null);
  const [resolvingFamily, setResolvingFamily] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);

  // 共通コード（1台の端末を複数の子供で共有）でログインしたとき、現在誰として操作しているか
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const [adminName, setAdminName] = useState("");
  const [familyDefaultsDoc, setFamilyDefaultsDoc] = useState<FamilyDefaults | null>(null);
  const [members, setMembers] = useState<Array<{ id: string } & MemberDoc>>([]);
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);

  const [knownCodeAccounts, setKnownCodeAccounts] = useState<KnownCodeAccount[]>([]);
  const pendingCodeRef = useRef<string | null>(null);

  const [feedbackPosts, setFeedbackPosts] = useState<FeedbackPost[]>([]);

  useEffect(() => {
    // 初回マウント時に一度だけ localStorage（外部ストア）から読み込む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnownCodeAccounts(loadKnownCodeAccounts());
    setSelectedChildId(loadSelectedChildId());
  }, []);

  // 1. Firebase Authのログイン状態を監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthResolved(true);
    });
    return unsub;
  }, []);

  // 1b. メールのログインリンクをクリックして戻ってきた場合、ログインを完了させる
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let email = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
    if (!email) {
      email = window.prompt("確認のため、ログインリンクを送ったメールアドレスを入力してください");
    }
    if (!email) return;
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch((e: { code?: string }) => {
        setAuthError(translateAuthError(e?.code));
      });
  }, []);

  // 2. ログインユーザーがどの家族に属するか(familyId・role)を解決
  // サインアップ直後は「ログイン検知」と「家族データ(memberIndex)の作成」が並行して走るため、
  // 一度きりのgetDocだと書き込み前に読んでしまい停止することがある。
  // onSnapshotで購読し続けることで、後から作成されても自動的に解決されるようにする。
  useEffect(() => {
    if (!firebaseUser) {
      // Firebase Auth（外部ストア）のログアウトに合わせて内部状態をリセットする
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFamilyId(null);
      setMyRole(null);
      return;
    }
    setResolvingFamily(true);
    const unsub = onSnapshot(
      doc(db, "memberIndex", firebaseUser.uid),
      (idxSnap) => {
        if (idxSnap.exists()) {
          const idx = idxSnap.data() as { familyId: string; role: Role | "device" };
          setFamilyId(idx.familyId);
          setMyRole(idx.role);
        } else {
          setFamilyId(null);
          setMyRole(null);
        }
        setResolvingFamily(false);
      },
      () => {
        setFamilyId(null);
        setMyRole(null);
        setResolvingFamily(false);
      }
    );
    return () => {
      unsub();
    };
  }, [firebaseUser]);

  // 2b. 運営（開発者）フラグの確認（家族の有無とは独立）
  useEffect(() => {
    if (!firebaseUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDeveloper(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, "developers", firebaseUser.uid));
      if (!cancelled) setIsDeveloper(snap.exists());
    })();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  // 2c. 全ユーザー共通のフィードバック掲示板を購読（家族の垣根を越えて共有）
  useEffect(() => {
    if (!firebaseUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeedbackPosts([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, "feedback"), orderBy("createdAt", "desc")),
      (snap) => {
        setFeedbackPosts(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              authorName: data.authorName as string,
              authorRole: data.authorRole as FeedbackPost["authorRole"],
              message: data.message as string,
              createdAt: data.createdAt as string,
            };
          })
        );
      }
    );
    return unsub;
  }, [firebaseUser]);

  // 3. familyIdが分かったら家族データをリアルタイム購読
  useEffect(() => {
    if (!familyId) {
      // familyId（外部ストアの解決結果）が無くなったのに合わせて内部状態をリセットする
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdminName("");
      setFamilyDefaultsDoc(null);
      setMembers([]);
      setTasks([]);
      setLogs([]);
      return;
    }
    const unsubFamily = onSnapshot(doc(db, "families", familyId), (snap) => {
      const d = snap.data();
      if (d) {
        setAdminName((d.adminName as string) ?? "");
        setFamilyDefaultsDoc((d.familyDefaults as FamilyDefaults) ?? null);
      }
    });
    const unsubMembers = onSnapshot(collection(db, "families", familyId, "members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MemberDoc) })));
    });
    const unsubTasks = onSnapshot(collection(db, "families", familyId, "tasks"), (snap) => {
      setTasks(snap.docs.map((d) => d.data() as HomeworkTask));
    });
    const unsubLogs = onSnapshot(collection(db, "families", familyId, "logs"), (snap) => {
      setLogs(snap.docs.map((d) => d.data() as DailyLog));
    });
    return () => {
      unsubFamily();
      unsubMembers();
      unsubTasks();
      unsubLogs();
    };
  }, [familyId]);

  const data: AppData = useMemo(() => {
    const admins: AdminUser[] = familyId ? [{ id: familyId, role: "admin", name: adminName }] : [];
    const childrenList: ChildUser[] = members
      .filter((m) => m.role === "owner")
      .map((m) => ({
        id: m.id,
        role: "owner",
        name: m.name,
        adminId: familyId!,
        loginCode: m.loginCode,
        age: m.age,
      }));
    const sharersList: SharerUser[] = members
      .filter((m) => m.role === "viewer")
      .map((m) => ({
        id: m.id,
        role: "viewer",
        name: m.name,
        childId: m.childId!,
        addedBy: m.addedBy ?? "admin",
        loginCode: m.loginCode,
      }));
    return {
      admins,
      children: childrenList,
      sharers: sharersList,
      tasks,
      logs,
      familyDefaults: familyId && familyDefaultsDoc ? { [familyId]: familyDefaultsDoc } : {},
    };
  }, [familyId, adminName, members, tasks, logs, familyDefaultsDoc]);

  const currentUser: AppUser | null = useMemo(() => {
    if (!firebaseUser || !familyId || !myRole) return null;
    if (myRole === "admin") return data.admins[0] ?? null;
    if (myRole === "owner") return data.children.find((c) => c.id === firebaseUser.uid) ?? null;
    if (myRole === "viewer") return data.sharers.find((s) => s.id === firebaseUser.uid) ?? null;
    if (myRole === "device") {
      // 共通コードでは、選んだ子供として振る舞う（実際の認証UIDとは別に、当人のオーナー情報を返す）
      if (!selectedChildId) return null;
      return data.children.find((c) => c.id === selectedChildId) ?? null;
    }
    return null;
  }, [firebaseUser, familyId, myRole, data, selectedChildId]);

  const isSharedDevice = myRole === "device";

  const hydrated = authResolved && !resolvingFamily;

  const needsChildSelection = hydrated && isSharedDevice && !selectedChildId;

  const sharedDeviceCode = useMemo(
    () => members.find((m) => m.role === "device")?.loginCode ?? null,
    [members]
  );

  // メールリンクでログインしたが、まだ家族(admin)アカウントとして登録されていない状態か
  // （子供・共有者は合成メールで判別し、除外する）
  const needsAdminProfile =
    hydrated &&
    !!firebaseUser &&
    !familyId &&
    !isDeveloper &&
    !!firebaseUser.email &&
    !firebaseUser.email.endsWith("@yattane-family.internal");

  // コードでログインした直後、本人の名前が解決できたタイミングで「このデバイスで使ったコード」として記憶する
  useEffect(() => {
    if (!pendingCodeRef.current || !currentUser) return;
    if (currentUser.role !== "owner" && currentUser.role !== "viewer") return;
    const account: KnownCodeAccount = {
      code: pendingCodeRef.current,
      name: currentUser.name,
      role: currentUser.role,
    };
    saveKnownCodeAccount(account);
    // localStorage（外部ストア）への書き込みを状態に反映する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnownCodeAccounts(loadKnownCodeAccounts());
    pendingCodeRef.current = null;
  }, [currentUser]);

  const signUpAdmin = useCallback(async (email: string, password: string, name: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "families", uid), {
        adminName: name,
        adminEmail: email,
        familyDefaults: defaultFamilyDefaults(),
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "memberIndex", uid), { familyId: uid, role: "admin" });
    } catch (e) {
      setAuthError(translateAuthError((e as { code?: string })?.code));
      throw e;
    }
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setAuthError(translateAuthError((e as { code?: string })?.code));
      throw e;
    }
  }, []);

  const loginWithCode = useCallback(async (code: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, codeToEmail(code), code);
      pendingCodeRef.current = code;
    } catch {
      setAuthError("コードが正しくありません。もう一度確認してください。");
      throw new Error("invalid code");
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      setAuthError(translateAuthError((e as { code?: string })?.code));
      throw e;
    }
  }, []);

  const sendLoginLink = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: typeof window !== "undefined" ? window.location.origin : "",
        handleCodeInApp: true,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
      }
    } catch (e) {
      setAuthError(translateAuthError((e as { code?: string })?.code));
      throw e;
    }
  }, []);

  const finishAdminProfile = useCallback(async (name: string) => {
    if (!firebaseUser) throw new Error("認証されていません");
    const uid = firebaseUser.uid;
    await setDoc(doc(db, "families", uid), {
      adminName: name,
      adminEmail: firebaseUser.email ?? "",
      familyDefaults: defaultFamilyDefaults(),
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "memberIndex", uid), { familyId: uid, role: "admin" });
  }, [firebaseUser]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const forgetCodeAccount = useCallback((code: string) => {
    removeKnownCodeAccount(code);
    setKnownCodeAccounts(loadKnownCodeAccounts());
  }, []);

  const selectChild = useCallback((childId: string | null) => {
    saveSelectedChildId(childId);
    setSelectedChildId(childId);
  }, []);

  const getOrCreateSharedCode = useCallback(async (): Promise<string> => {
    if (!familyId) throw new Error("認証されていません");
    const existing = members.find((m) => m.role === "device");
    if (existing) return existing.loginCode;
    const { uid, code } = await createUniqueMemberAccount();
    await setDoc(doc(db, "families", familyId, "members", uid), {
      role: "device",
      name: "共通アカウント",
      loginCode: code,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "memberIndex", uid), { familyId, role: "device" });
    return code;
  }, [familyId, members]);

  const updateAdmin = useCallback(async (adminId: string, name: string) => {
    await updateDoc(doc(db, "families", adminId), { adminName: name });
  }, []);

  const addChild = useCallback(
    async (name: string): Promise<ChildUser> => {
      if (!familyId) throw new Error("認証されていません");
      const { uid, code } = await createUniqueMemberAccount();
      await setDoc(doc(db, "families", familyId, "members", uid), {
        role: "owner",
        name,
        loginCode: code,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "memberIndex", uid), { familyId, role: "owner" });
      return { id: uid, role: "owner", name, adminId: familyId, loginCode: code };
    },
    [familyId]
  );

  const updateChild = useCallback(
    async (childId: string, name: string) => {
      if (!familyId) return;
      await updateDoc(doc(db, "families", familyId, "members", childId), { name });
    },
    [familyId]
  );

  const updateChildAge = useCallback(
    async (childId: string, age: number | undefined) => {
      if (!familyId) return;
      await updateDoc(
        doc(db, "families", familyId, "members", childId),
        sanitizeForFirestore({ age })
      );
    },
    [familyId]
  );

  const removeChild = useCallback(
    async (childId: string) => {
      if (!familyId) return;
      const batch = writeBatch(db);
      const tasksSnap = await getDocs(
        query(collection(db, "families", familyId, "tasks"), where("childId", "==", childId))
      );
      const taskIds: string[] = [];
      tasksSnap.forEach((d) => {
        taskIds.push(d.id);
        batch.delete(d.ref);
      });
      for (let i = 0; i < taskIds.length; i += 25) {
        const chunk = taskIds.slice(i, i + 25);
        const logsSnap = await getDocs(
          query(collection(db, "families", familyId, "logs"), where("taskId", "in", chunk))
        );
        logsSnap.forEach((d) => batch.delete(d.ref));
      }
      const sharersSnap = await getDocs(
        query(collection(db, "families", familyId, "members"), where("childId", "==", childId))
      );
      sharersSnap.forEach((d) => {
        batch.delete(d.ref);
        batch.delete(doc(db, "memberIndex", d.id));
      });
      batch.delete(doc(db, "families", familyId, "members", childId));
      batch.delete(doc(db, "memberIndex", childId));
      await batch.commit();
    },
    [familyId]
  );

  const addSharer = useCallback(
    async (childId: string, name: string, addedBy: "admin" | "owner"): Promise<SharerUser> => {
      if (!familyId) throw new Error("認証されていません");
      const { uid, code } = await createUniqueMemberAccount();
      await setDoc(doc(db, "families", familyId, "members", uid), {
        role: "viewer",
        name,
        childId,
        addedBy,
        loginCode: code,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "memberIndex", uid), { familyId, role: "viewer" });
      return { id: uid, role: "viewer", name, childId, addedBy, loginCode: code };
    },
    [familyId]
  );

  const removeSharer = useCallback(
    async (sharerId: string) => {
      if (!familyId) return;
      const batch = writeBatch(db);
      batch.delete(doc(db, "families", familyId, "members", sharerId));
      batch.delete(doc(db, "memberIndex", sharerId));
      await batch.commit();
    },
    [familyId]
  );

  const addTask = useCallback(
    async (input: {
      childId: string;
      name: string;
      totalAmount: number;
      unit: TaskUnit;
      priority: TaskPriority;
      type: TaskType;
      startDate: string;
      endDate: string;
      pauseRule: PauseRule;
    }): Promise<HomeworkTask> => {
      if (!familyId) throw new Error("認証されていません");
      const ref = doc(collection(db, "families", familyId, "tasks"));
      const created: HomeworkTask = { id: ref.id, createdAt: new Date().toISOString(), ...input };
      await setDoc(ref, created);
      return created;
    },
    [familyId]
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<HomeworkTask>) => {
      if (!familyId) return;
      await updateDoc(doc(db, "families", familyId, "tasks", taskId), sanitizeForFirestore(patch));
    },
    [familyId]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!familyId) return;
      const batch = writeBatch(db);
      batch.delete(doc(db, "families", familyId, "tasks", taskId));
      const logsSnap = await getDocs(
        query(collection(db, "families", familyId, "logs"), where("taskId", "==", taskId))
      );
      logsSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
    [familyId]
  );

  const reportLog = useCallback(
    async (taskId: string, date: string, doneAmount: number) => {
      if (!familyId) return;
      const existing = logs.find((l) => l.taskId === taskId && l.date === date);
      if (existing) {
        await updateDoc(doc(db, "families", familyId, "logs", existing.id), {
          doneAmount,
          reportedAt: new Date().toISOString(),
        });
      } else {
        const ref = doc(collection(db, "families", familyId, "logs"));
        const newLog: DailyLog = {
          id: ref.id,
          taskId,
          date,
          doneAmount,
          reportedAt: new Date().toISOString(),
        };
        await setDoc(ref, newLog);
      }
    },
    [familyId, logs]
  );

  const updateFamilyDefaults = useCallback(
    async (adminId: string, patch: Partial<FamilyDefaults>) => {
      const base = familyDefaultsDoc ?? defaultFamilyDefaults();
      await updateDoc(doc(db, "families", adminId), { familyDefaults: { ...base, ...patch } });
    },
    [familyDefaultsDoc]
  );

  const postFeedback = useCallback(
    async (message: string) => {
      if (!firebaseUser) throw new Error("認証されていません");
      const trimmed = message.trim();
      if (!trimmed) return;
      const authorName = currentUser?.name ?? (isDeveloper ? "開発者" : firebaseUser.email ?? "匿名");
      const authorRole: FeedbackPost["authorRole"] = currentUser?.role ?? "developer";
      const ref = doc(collection(db, "feedback"));
      await setDoc(ref, {
        authorId: firebaseUser.uid,
        authorName,
        authorRole,
        message: trimmed,
        createdAt: new Date().toISOString(),
      });
    },
    [firebaseUser, currentUser, isDeveloper]
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
  const getFamilyDefaults = useCallback(
    (adminId: string) => data.familyDefaults[adminId] ?? defaultFamilyDefaults(),
    [data]
  );

  const value: StoreContextValue = {
    data,
    hydrated,
    currentUser,
    currentUserId: firebaseUser?.uid ?? null,
    isDeveloper,
    needsAdminProfile,
    isSharedDevice,
    needsChildSelection,
    selectedChildId,
    selectChild,
    sharedDeviceCode,
    getOrCreateSharedCode,
    authError,
    signUpAdmin,
    loginAdmin,
    loginWithCode,
    sendLoginLink,
    finishAdminProfile,
    resetPassword,
    logout,
    knownCodeAccounts,
    forgetCodeAccount,
    updateAdmin,
    addChild,
    updateChild,
    updateChildAge,
    removeChild,
    addSharer,
    removeSharer,
    addTask,
    updateTask,
    deleteTask,
    reportLog,
    updateFamilyDefaults,
    feedbackPosts,
    postFeedback,
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

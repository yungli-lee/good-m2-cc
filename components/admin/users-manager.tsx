"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminRole } from "@/lib/auth";
import {
  createUserAction,
  updateUserRoleAction,
  disableUserAction,
  restoreUserAction,
  updateDisplayNameAction,
  sendPasswordResetEmailAction
} from "@/app/admin/users/actions";

export type AdminUserListItem = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: AdminRole;
  created_at: string | null;
  deleted_at: string | null;
  last_login_at: string | null;
  last_login_device: string | null;
};

type PendingConfirmation =
  | { type: "role"; user: AdminUserListItem; nextRole: "viewer" | "editor" | "admin" }
  | { type: "disable"; user: AdminUserListItem }
  | { type: "restore"; user: AdminUserListItem }
  | { type: "reset-password"; user: AdminUserListItem };

const pageSize = 10;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(new Date(value));
}

function roleOptions(actorRole: AdminRole) {
  return actorRole === "owner" ? ["viewer", "editor", "admin"] as const : ["viewer", "editor"] as const;
}

function CreateUserModal({ actorRole, onClose }: { actorRole: AdminRole; onClose: () => void }) {
  const options = roleOptions(actorRole);

  return (
    <div className="admin-users-modal-backdrop" role="presentation">
      <div className="admin-users-modal" role="dialog" aria-modal="true" aria-labelledby="admin-users-create-title">
        <h2 id="admin-users-create-title">新增使用者</h2>
        <form action={createUserAction} className="admin-users-create-form">
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Display Name</span>
            <input className="input" name="display_name" maxLength={120} autoComplete="name" />
          </label>
          <label className="field">
            <span>Role</span>
            <select className="select" name="role" defaultValue="viewer">
              {options.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" name="password" type="password" minLength={12} autoComplete="new-password" required />
          </label>
          <label className="admin-users-checkbox">
            <input name="auto_confirm" type="checkbox" />
            <span>Auto confirm</span>
          </label>
          <div className="actions">
            <button className="button" type="submit">建立使用者</button>
            <button className="button ghost" type="button" onClick={onClose}>取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function needsCurrentRoleOption(options: readonly string[], role: AdminRole) {
  return !options.includes(role);
}

function canEditUser(actorRole: AdminRole, user: AdminUserListItem) {
  if (actorRole === "owner") return user.role !== "owner";
  if (actorRole === "admin") return user.role === "viewer" || user.role === "editor";
  return false;
}

function canSendPasswordReset(actorRole: AdminRole, user: AdminUserListItem) {
  return actorRole === "owner" && Boolean(user.email) && !user.deleted_at;
}

function statusLabel(user: AdminUserListItem) {
  return user.deleted_at ? "Disabled" : "Active";
}

function statusClass(user: AdminUserListItem) {
  return user.deleted_at ? "admin-users-badge is-disabled" : "admin-users-badge is-active";
}

function LastLogin({ user }: { user: AdminUserListItem }) {
  if (!user.last_login_at) return <span className="muted">尚未登入</span>;

  return (
    <span className="admin-users-last-login">
      <span>{formatDateTime(user.last_login_at)}</span>
      <span className="muted">{user.last_login_device || "Unknown device"}</span>
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
          <td><span className="admin-users-skeleton" /></td>
        </tr>
      ))}
    </>
  );
}

function ConfirmationModal({ confirmation, onClose }: { confirmation: PendingConfirmation; onClose: () => void }) {
  const userLabel = confirmation.user.email || confirmation.user.id;
  const isRole = confirmation.type === "role";
  const action = confirmation.type === "disable"
    ? disableUserAction.bind(null, confirmation.user.id)
    : confirmation.type === "restore"
      ? restoreUserAction.bind(null, confirmation.user.id)
      : confirmation.type === "reset-password"
        ? sendPasswordResetEmailAction.bind(null, confirmation.user.id)
        : updateUserRoleAction.bind(null, confirmation.user.id);
  const title = confirmation.type === "disable"
    ? "停用使用者"
    : confirmation.type === "restore"
      ? "還原使用者"
      : confirmation.type === "reset-password"
        ? "寄送密碼重設 Email"
        : "變更角色";
  const body = confirmation.type === "disable"
    ? `確定要停用 ${userLabel}？停用後此帳號不得進入後台。`
    : confirmation.type === "restore"
      ? `確定要還原 ${userLabel}？還原後會依目前 role 恢復權限。`
      : confirmation.type === "reset-password"
        ? `確定要寄送密碼重設 Email 給 ${userLabel}？`
        : `確定要將 ${userLabel} 的角色從 ${confirmation.user.role} 改為 ${confirmation.nextRole}？`;

  return (
    <div className="admin-users-modal-backdrop" role="presentation">
      <div className="admin-users-modal" role="dialog" aria-modal="true" aria-labelledby="admin-users-confirm-title">
        <h2 id="admin-users-confirm-title">{title}</h2>
        <p>{body}</p>
        <form action={action} className="actions">
          {isRole ? <input type="hidden" name="role" value={confirmation.nextRole} /> : null}
          <button className={confirmation.type === "disable" ? "button danger" : "button"} type="submit">
            確認
          </button>
          <button className="button ghost" type="button" onClick={onClose}>
            取消
          </button>
        </form>
      </div>
    </div>
  );
}

export function UsersManager({
  users,
  actorRole,
  loadError
}: {
  users: AdminUserListItem[];
  actorRole: AdminRole;
  loadError: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const emailMatches = !normalizedQuery || (user.email || "").toLowerCase().includes(normalizedQuery);
      const roleMatches = roleFilter === "all" || user.role === roleFilter;
      const statusMatches = statusFilter === "all" || (statusFilter === "active" ? !user.deleted_at : Boolean(user.deleted_at));
      return emailMatches && roleMatches && statusMatches;
    });
  }, [query, roleFilter, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const options = roleOptions(actorRole);

  return (
    <div className="admin-users-shell">
      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button className="button" type="button" onClick={() => setShowCreate(true)}>
          新增使用者
        </button>
      </div>

      <div className="admin-users-toolbar" aria-label="使用者篩選">
        <label className="field">
          <span>Email 搜尋</span>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="name@example.com"
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">全部</option>
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>

      {loadError ? <div className="notice">使用者資料讀取失敗。</div> : null}

      <div className="admin-users-table table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>建立時間</th>
              <th>最後登入</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? <SkeletonRows /> : null}
            {ready && visibleUsers.map((user) => {
              const editable = canEditUser(actorRole, user);
              const canResetPassword = canSendPasswordReset(actorRole, user);
              return (
                <tr key={user.id}>
                  <td>{user.email || "-"}</td>
                  <td>
                    <form action={updateDisplayNameAction.bind(null, user.id)} className="admin-users-inline-form">
                      <input className="input" name="display_name" defaultValue={user.display_name || ""} disabled={!editable} aria-label="Display name" />
                      <button className="button ghost" type="submit" disabled={!editable}>儲存</button>
                    </form>
                  </td>
                  <td>
                    <select
                      className="select"
                      value={user.role}
                      disabled={!editable || Boolean(user.deleted_at)}
                      aria-label="Role"
                      onChange={(event) => setConfirmation({
                        type: "role",
                        user,
                        nextRole: event.target.value as "viewer" | "editor" | "admin"
                      })}
                    >
                      {needsCurrentRoleOption(options, user.role) ? <option value={user.role}>{user.role}</option> : null}
                      {options.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td><span className={statusClass(user)}>{statusLabel(user)}</span></td>
                  <td>{formatDateTime(user.created_at)}</td>
                  <td><LastLogin user={user} /></td>
                  <td>
                    <div className="actions">
                      {user.deleted_at ? (
                        <button className="button" type="button" disabled={!editable} onClick={() => setConfirmation({ type: "restore", user })}>
                          還原
                        </button>
                      ) : (
                        <button className="button danger" type="button" disabled={!editable} onClick={() => setConfirmation({ type: "disable", user })}>
                          停用
                        </button>
                      )}
                      <button className="button ghost" type="button" disabled={!canResetPassword} onClick={() => setConfirmation({ type: "reset-password", user })}>
                        重設密碼 Email
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {ready && !loadError && !visibleUsers.length ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-users-empty">
                    <strong>沒有符合條件的使用者</strong>
                    <p className="muted">請調整 Email 搜尋、Role 或 Status 篩選。</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-users-cards">
        {!ready ? (
          Array.from({ length: 3 }).map((_, index) => (
            <article className="card" key={index}>
              <div className="card-body">
                <span className="admin-users-skeleton" />
                <span className="admin-users-skeleton" />
                <span className="admin-users-skeleton" />
              </div>
            </article>
          ))
        ) : null}
        {ready && visibleUsers.map((user) => {
          const editable = canEditUser(actorRole, user);
          const canResetPassword = canSendPasswordReset(actorRole, user);
          return (
            <article className="card" key={user.id}>
              <div className="card-body admin-users-card-body">
                <div>
                  <div className="muted">Email</div>
                  <strong>{user.email || "-"}</strong>
                </div>
                <form action={updateDisplayNameAction.bind(null, user.id)} className="field">
                  <span className="muted">Display Name</span>
                  <input className="input" name="display_name" defaultValue={user.display_name || ""} disabled={!editable} />
                  <button className="button ghost" type="submit" disabled={!editable}>儲存</button>
                </form>
                <label className="field">
                  <span className="muted">Role</span>
                  <select
                    className="select"
                    value={user.role}
                    disabled={!editable || Boolean(user.deleted_at)}
                    onChange={(event) => setConfirmation({
                      type: "role",
                      user,
                      nextRole: event.target.value as "viewer" | "editor" | "admin"
                    })}
                  >
                    {needsCurrentRoleOption(options, user.role) ? <option value={user.role}>{user.role}</option> : null}
                    {options.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <div className="muted">Status</div>
                  <span className={statusClass(user)}>{statusLabel(user)}</span>
                </div>
                <div>
                  <div className="muted">建立時間</div>
                  <span>{formatDateTime(user.created_at)}</span>
                </div>
                <div>
                  <div className="muted">最後登入</div>
                  {user.last_login_at ? <span>{formatDateTime(user.last_login_at)}</span> : <span>尚未登入</span>}
                </div>
                <div>
                  <div className="muted">設備</div>
                  <span>{user.last_login_at ? user.last_login_device || "Unknown device" : "-"}</span>
                </div>
                {user.deleted_at ? (
                  <button className="button" type="button" disabled={!editable} onClick={() => setConfirmation({ type: "restore", user })}>
                    還原
                  </button>
                ) : (
                  <button className="button danger" type="button" disabled={!editable} onClick={() => setConfirmation({ type: "disable", user })}>
                    停用
                  </button>
                )}
                <button className="button ghost" type="button" disabled={!canResetPassword} onClick={() => setConfirmation({ type: "reset-password", user })}>
                  重設密碼 Email
                </button>
              </div>
            </article>
          );
        })}
        {ready && !loadError && !visibleUsers.length ? (
          <div className="notice">沒有符合條件的使用者。</div>
        ) : null}
      </div>

      <div className="admin-users-pagination" aria-label="分頁">
        <button className="button ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          上一頁
        </button>
        <span>第 {currentPage} / {totalPages} 頁，共 {filteredUsers.length} 筆</span>
        <button className="button ghost" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
          下一頁
        </button>
      </div>

      {confirmation ? <ConfirmationModal confirmation={confirmation} onClose={() => setConfirmation(null)} /> : null}
      {showCreate ? <CreateUserModal actorRole={actorRole} onClose={() => setShowCreate(false)} /> : null}
    </div>
  );
}

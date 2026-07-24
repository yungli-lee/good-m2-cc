"use client";

export function DeleteNavigationItemForm({ action, label }: { action: () => void; label: string }) {
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(`確定刪除「${label}」？`)) event.preventDefault();
    }}>
      <button className="button ghost" type="submit">刪除</button>
    </form>
  );
}

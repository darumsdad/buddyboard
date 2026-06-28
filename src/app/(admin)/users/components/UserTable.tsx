"use client";

import { displayRole } from "@/lib/role-display";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ResetPasswordForm } from "./ResetPasswordForm";

type User = {
  id: string;
  username: string | null;
  name: string;
  role: string | null;
  createdAt: Date;
};

export function UserTable({ users }: { users: User[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Username
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Role
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Created
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {users.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <p className="text-base text-slate-500 px-4 py-8 text-center">
                  No users yet. Create the first account to allow staff to log
                  in.
                </p>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td className="text-base text-slate-900 px-4 py-3">
                  {user.username ?? user.name}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  {displayRole(user.role)}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ResetPasswordForm userId={user.id} />
                    <DeleteConfirmDialog
                      userId={user.id}
                      username={user.username ?? user.name}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

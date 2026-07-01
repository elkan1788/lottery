"use client";

import { useActionState } from "react";

import { loginAdminAction } from "@/app/admin/actions";

const initialState = {
  message: "",
};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdminAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm text-white/70">账号</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          placeholder="请输入管理员账号"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">密码</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          placeholder="请输入管理员密码"
        />
      </label>

      {state.message ? <p className="text-sm text-amber-200">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[linear-gradient(135deg,rgba(255,215,106,0.95),rgba(255,77,184,0.95))] px-4 py-3 text-sm font-semibold text-[#1f0721] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "登录中..." : "登录"}
      </button>
    </form>
  );
}

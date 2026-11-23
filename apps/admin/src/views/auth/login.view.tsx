"use client";

import { FormEvent, useState } from "react";
import { login, TOKEN_KEY } from "@/src/lib/api-client";

export function LoginView() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const result = await login(
        String(form.get("email")),
        String(form.get("password")),
      );
      sessionStorage.setItem(TOKEN_KEY, result.accessToken);
      setStatus("success");
      window.location.assign("/dashboard");
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra");
    }
  }

  return (
    <main className="page-shell">
      <section className="panel" aria-labelledby="login-title">
        <h1 id="login-title">Access Control</h1>
        <p className="muted">Đăng nhập trang quản trị hệ thống cửa.</p>
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              placeholder="admin@example.com"
              required
            />
          </label>
          <label className="field">
            Mật khẩu
            <input name="password" type="password" minLength={8} required />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {status === "success" ? (
            <p className="success">Đăng nhập thành công.</p>
          ) : null}
          <button
            className="primary"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

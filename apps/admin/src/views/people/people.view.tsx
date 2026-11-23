"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { PageHeader, StatePanel, Status } from "../../components/ui";
import { api } from "../../lib/api-client";
import type { Page, Person } from "../../lib/types";
import { useApi } from "../../lib/use-api";

export function PeopleView() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const path = `/people?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data, error, loading, reload } = useApi<Page<Person>>(path);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/people", {
        method: "POST",
        body: JSON.stringify({
          code: form.get("code"),
          fullName: form.get("fullName"),
        }),
      });
      setShowCreate(false);
      await reload();
    } catch (caught) {
      setMutationError(
        caught instanceof Error ? caught.message : "Không thể tạo Person",
      );
    }
  }
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="IDENTITY / PEOPLE"
          title="Con người & danh tính"
          description="Quản lý Person, thẻ RFID, mẫu khuôn mặt và quyền truy cập tại một nơi."
          action={
            <button
              className="button primary"
              onClick={() => setShowCreate(true)}
            >
              + Tạo Person
            </button>
          }
        />
        <div className="toolbar">
          <label className="search-field">
            <span>Tìm kiếm</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc họ tên…"
            />
          </label>
          <span className="record-count">{data?.total ?? 0} bản ghi</span>
        </div>
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && !error && data?.items.length === 0}
          onRetry={reload}
        />
        {data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MÃ</th>
                  <th>HỌ VÀ TÊN</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((person) => (
                  <tr key={person.id}>
                    <td className="mono">{person.code}</td>
                    <td>
                      <strong>{person.fullName}</strong>
                    </td>
                    <td>
                      <Status value={person.status} />
                    </td>
                    <td>
                      <Link className="text-link" href={`/people/${person.id}`}>
                        Mở hồ sơ →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {showCreate ? (
          <div className="modal-backdrop" role="presentation">
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-person-title"
            >
              <span className="eyebrow">NEW IDENTITY</span>
              <h2 id="create-person-title">Tạo Person</h2>
              <form className="form" onSubmit={create}>
                <label className="field">
                  Mã định danh
                  <input
                    name="code"
                    pattern="[A-Za-z0-9_-]+"
                    required
                    autoFocus
                  />
                </label>
                <label className="field">
                  Họ và tên
                  <input name="fullName" required />
                </label>
                {mutationError ? (
                  <p className="error" role="alert">
                    {mutationError}
                  </p>
                ) : null}
                <div className="modal-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setShowCreate(false)}
                  >
                    Hủy
                  </button>
                  <button className="button primary">Tạo hồ sơ</button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </main>
    </AdminShell>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { PageHeader, StatePanel } from "../../components/ui";
import { api } from "../../lib/api-client";
import type { AccessPoint } from "../../lib/types";
import { useApi } from "../../lib/use-api";

export function AccessPointsView() {
  const { data, error, loading, reload } =
    useApi<AccessPoint[]>("/access-points");
  const [mutationError, setMutationError] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/access-points", {
        method: "POST",
        body: JSON.stringify({
          code: form.get("code"),
          name: form.get("name"),
          location: form.get("location") || undefined,
          timezone: "Asia/Ho_Chi_Minh",
        }),
      });
      event.currentTarget.reset();
      await reload();
    } catch (caught) {
      setMutationError(
        caught instanceof Error
          ? caught.message
          : "Không thể tạo điểm kiểm soát",
      );
    }
  }
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="PHYSICAL / ACCESS POINTS"
          title="Điểm kiểm soát"
          description="Danh mục cửa vật lý. GPIO và actuator thuộc cấu hình thiết bị, không nằm tại đây."
        />
        <section className="section-block">
          <form className="create-strip" onSubmit={create}>
            <label className="field">
              Mã cửa
              <input name="code" required placeholder="DOOR_01" />
            </label>
            <label className="field">
              Tên hiển thị
              <input name="name" required placeholder="Cửa phòng Lab" />
            </label>
            <label className="field">
              Vị trí
              <input name="location" placeholder="Tầng 2" />
            </label>
            <button className="button primary">+ Tạo điểm</button>
          </form>
          {mutationError ? (
            <p className="notice error">{mutationError}</p>
          ) : null}
        </section>
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && data?.length === 0}
          onRetry={reload}
        />
        {data?.length ? (
          <div className="point-grid">
            {data.map((point, index) => (
              <article className="point-card" key={point.id}>
                <span className="point-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="eyebrow">{point.code}</span>
                <h2>{point.name}</h2>
                <p>{point.location ?? "Chưa đặt vị trí"}</p>
                <small>{point.timezone}</small>
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </AdminShell>
  );
}

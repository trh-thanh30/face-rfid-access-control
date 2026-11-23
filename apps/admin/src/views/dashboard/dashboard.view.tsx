"use client";

import Link from "next/link";
import { AdminShell } from "../../components/admin-shell";
import {
  formatDate,
  PageHeader,
  StatePanel,
  Status,
} from "../../components/ui";
import type { AccessEvent } from "../../lib/types";
import { useApi } from "../../lib/use-api";

type Dashboard = {
  activePeople: number;
  onlineDevices: number;
  offlineDevices: number;
  allowedToday: number;
  deniedToday: number;
  recentEvents: AccessEvent[];
  generatedAt: string;
};

export function DashboardView() {
  const { data, error, loading, reload } =
    useApi<Dashboard>("/admin/dashboard");
  const cards = data
    ? ([
        ["NGƯỜI HOẠT ĐỘNG", data.activePeople, "neutral"],
        ["THIẾT BỊ ONLINE", data.onlineDevices, "good"],
        ["CHO PHÉP HÔM NAY", data.allowedToday, "good"],
        ["TỪ CHỐI HÔM NAY", data.deniedToday, "warn"],
        ["THIẾT BỊ OFFLINE", data.offlineDevices, "bad"],
      ] as const)
    : [];
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="OPERATIONS / LIVE"
          title="Tổng quan kiểm soát"
          description="Một màn hình để nhận biết cửa, thiết bị và quyết định đang vận hành ra sao."
          action={
            <button className="button ghost" onClick={reload}>
              Làm mới dữ liệu
            </button>
          }
        />
        <StatePanel loading={loading} error={error} onRetry={reload} />
        {data ? (
          <>
            <section className="metric-grid" aria-label="Chỉ số tổng quan">
              {cards.map(([label, value, tone]) => (
                <article className={`metric metric-${tone}`} key={label}>
                  <span>{label}</span>
                  <strong>{value.toString().padStart(2, "0")}</strong>
                  <small>Cập nhật {formatDate(data.generatedAt)}</small>
                </article>
              ))}
            </section>
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">STREAM / 08 LATEST</span>
                  <h2>Sự kiện gần nhất</h2>
                </div>
                <Link className="text-link" href="/access-events">
                  Xem toàn bộ →
                </Link>
              </div>
              {data.recentEvents.length ? (
                <div className="event-list">
                  {data.recentEvents.map((event) => (
                    <Link
                      href={`/access-events?sessionId=${event.sessionId}`}
                      className="event-row"
                      key={event.id}
                    >
                      <time>{formatDate(event.occurredAt)}</time>
                      <strong>
                        {event.person?.fullName ?? "Thẻ chưa xác định"}
                      </strong>
                      <span>{event.device.deviceCode}</span>
                      <Status value={event.result} />
                    </Link>
                  ))}
                </div>
              ) : (
                <StatePanel empty />
              )}
            </section>
          </>
        ) : null}
      </main>
    </AdminShell>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import {
  formatDate,
  PageHeader,
  StatePanel,
  Status,
} from "../../components/ui";
import { api, reasonMessage } from "../../lib/api-client";
import type { AccessEvent, Page } from "../../lib/types";
import { useApi } from "../../lib/use-api";

type Timeline = {
  id: string;
  correlationId: string;
  status: string;
  reasonCode: string | null;
  createdAt: string;
  completedAt: string | null;
  person: { fullName: string; code: string } | null;
  device: { deviceCode: string };
  command: {
    executionStatus: string;
    errorCode: string | null;
    acknowledgedAt: string | null;
  } | null;
  events: AccessEvent[];
};

export function AccessEventsView() {
  const search = useSearchParams();
  const [result, setResult] = useState("");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [detailError, setDetailError] = useState("");
  const path = `/access-events?page=1&pageSize=50${result ? `&result=${result}` : ""}`;
  const { data, error, loading, reload } = useApi<Page<AccessEvent>>(path);
  const open = useCallback(async (sessionId: string) => {
    setDetailError("");
    try {
      setTimeline(await api<Timeline>(`/access-events/sessions/${sessionId}`));
    } catch (caught) {
      setDetailError(
        caught instanceof Error ? caught.message : "Không thể tải timeline",
      );
    }
  }, []);
  const requested = search.get("sessionId");
  useEffect(() => {
    if (requested) void open(requested);
  }, [requested, open]);
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="AUDIT / EVENTS"
          title="Nhật ký truy cập"
          description="Decision và Actuation là hai sự kiện riêng; correlation ID nối toàn bộ hành trình."
        />
        <div className="toolbar">
          <label className="field compact">
            Kết quả
            <select
              value={result}
              onChange={(event) => setResult(event.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="ALLOWED">ALLOWED</option>
              <option value="DENIED">DENIED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
          <button className="button ghost" onClick={reload}>
            Làm mới
          </button>
        </div>
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && data?.items.length === 0}
          onRetry={reload}
        />
        {data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>THỜI GIAN</th>
                  <th>LOẠI</th>
                  <th>PERSON</th>
                  <th>THIẾT BỊ</th>
                  <th>KẾT QUẢ</th>
                  <th>REASON</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((event) => (
                  <tr
                    className="clickable"
                    onClick={() => open(event.sessionId)}
                    key={event.id}
                  >
                    <td>{formatDate(event.occurredAt)}</td>
                    <td>
                      <span className="tag">{event.eventType}</span>
                    </td>
                    <td>{event.person?.fullName ?? "Không xác định"}</td>
                    <td className="mono">{event.device.deviceCode}</td>
                    <td>
                      <Status value={event.result} />
                    </td>
                    <td title={event.reasonCode ?? ""}>
                      {event.reasonCode ? reasonMessage(event.reasonCode) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {timeline ? (
          <div className="drawer-backdrop" onClick={() => setTimeline(null)}>
            <aside
              className="drawer"
              onClick={(event) => event.stopPropagation()}
              aria-label="Chi tiết session"
            >
              <button
                className="drawer-close"
                onClick={() => setTimeline(null)}
                aria-label="Đóng"
              >
                ×
              </button>
              <span className="eyebrow">SESSION TIMELINE</span>
              <h2>{timeline.person?.fullName ?? "Không xác định"}</h2>
              <p className="mono">{timeline.correlationId}</p>
              <div className="timeline">
                {timeline.events.map((event, index) => (
                  <div className="timeline-item" key={event.id}>
                    <span className="timeline-node">{index + 1}</span>
                    <div>
                      <time>{formatDate(event.occurredAt)}</time>
                      <h3>{event.eventType}</h3>
                      <Status value={event.result} />
                      {event.reasonCode ? (
                        <p>
                          {reasonMessage(event.reasonCode)}{" "}
                          <code>{event.reasonCode}</code>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {timeline.command ? (
                <div className="command-box">
                  <span>ACTUATION COMMAND</span>
                  <strong>{timeline.command.executionStatus}</strong>
                  <small>
                    Ack: {formatDate(timeline.command.acknowledgedAt)}
                  </small>
                </div>
              ) : (
                <p className="empty-copy">
                  Không có lệnh mở cửa — hệ thống đã fail closed.
                </p>
              )}
            </aside>
          </div>
        ) : null}
        {detailError ? <p className="notice error">{detailError}</p> : null}
      </main>
    </AdminShell>
  );
}

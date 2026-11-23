"use client";

import { AdminShell } from "../../components/admin-shell";
import {
  formatDate,
  PageHeader,
  StatePanel,
  Status,
} from "../../components/ui";
import type { Device, Page } from "../../lib/types";
import { useApi } from "../../lib/use-api";

export function DevicesView() {
  const { data, error, loading, reload } = useApi<Page<Device>>(
    "/devices?page=1&pageSize=100",
  );
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="FLEET / DEVICE HEALTH"
          title="Thiết bị"
          description="Online/offline do server tính từ heartbeat; giao diện không tự suy diễn trạng thái."
          action={
            <button className="button ghost" onClick={reload}>
              Làm mới heartbeat
            </button>
          }
        />
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && data?.items.length === 0}
          onRetry={reload}
        />
        {data?.items.length ? (
          <div className="device-grid">
            {data.items.map((device) => (
              <article
                className={
                  device.online ? "device-card online" : "device-card offline"
                }
                key={device.id}
              >
                <div className="device-head">
                  <div>
                    <span className="eyebrow">
                      {device.accessPointCode ?? "NO POINT"}
                    </span>
                    <h2>{device.deviceCode}</h2>
                  </div>
                  <Status value={device.online ? "ONLINE" : "OFFLINE"} />
                </div>
                <dl className="data-list">
                  <div>
                    <dt>Firmware</dt>
                    <dd>{device.firmwareVersion ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>RSSI</dt>
                    <dd>{device.rssi === null ? "—" : `${device.rssi} dBm`}</dd>
                  </div>
                  <div>
                    <dt>Heartbeat cuối</dt>
                    <dd>{formatDate(device.lastSeenAt)}</dd>
                  </div>
                  <div>
                    <dt>Reset gần nhất</dt>
                    <dd>{device.resetReason ?? "—"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </AdminShell>
  );
}

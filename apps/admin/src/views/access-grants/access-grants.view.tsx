"use client";

import { AdminShell } from "../../components/admin-shell";
import { PageHeader, StatePanel, Status } from "../../components/ui";
import type { Grant, Page } from "../../lib/types";
import { useApi } from "../../lib/use-api";

export function AccessGrantsView() {
  const { data, error, loading, reload } = useApi<Page<Grant>>(
    "/access-grants?page=1&pageSize=100",
  );
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="POLICY / ACCESS WINDOWS"
          title="Quyền truy cập"
          description="Các cửa và khung thời gian mà từng Person được phép sử dụng. Thu hồi được thực hiện từ hồ sơ Person."
        />
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
                  <th>PERSON ID</th>
                  <th>ACCESS POINT</th>
                  <th>NGÀY HIỆU LỰC</th>
                  <th>KHUNG GIỜ</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((grant) => (
                  <tr key={grant.id}>
                    <td className="mono">
                      <a href={`/people/${grant.personId}`}>
                        {grant.personId.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="mono">{grant.accessPointId.slice(0, 8)}…</td>
                    <td>
                      {grant.validFrom} → {grant.validUntil}
                    </td>
                    <td>
                      {grant.timeFrom.slice(0, 5)}–{grant.timeUntil.slice(0, 5)}{" "}
                      {grant.timeFrom > grant.timeUntil ? (
                        <small className="tag">QUA ĐÊM</small>
                      ) : null}
                    </td>
                    <td>
                      <Status value={grant.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </AdminShell>
  );
}

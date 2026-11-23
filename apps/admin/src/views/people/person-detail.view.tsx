"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import {
  formatDate,
  PageHeader,
  StatePanel,
  Status,
} from "../../components/ui";
import { api } from "../../lib/api-client";
import type {
  AccessPoint,
  Credential,
  Grant,
  Page,
  Person,
} from "../../lib/types";
import { useApi } from "../../lib/use-api";

type FaceSummary = {
  activeTemplateCount: number;
  modelVersion: string | null;
  meanQualityScore: number | null;
  lastEnrolledAt: string | null;
};

export function PersonDetailView({ personId }: { personId: string }) {
  const person = useApi<Person>(`/people/${personId}`);
  const credentials = useApi<Credential[]>(
    `/people/${personId}/rfid-credentials`,
  );
  const grants = useApi<Page<Grant>>(
    `/access-grants?personId=${personId}&page=1&pageSize=50`,
  );
  const points = useApi<AccessPoint[]>("/access-points");
  const face = useApi<FaceSummary>(`/people/${personId}/face-enrollments`);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function attachRfid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (!confirm("Gắn thẻ mới sẽ thay thế thẻ đang active. Tiếp tục?")) return;
    try {
      await api(`/people/${personId}/rfid-credentials`, {
        method: "POST",
        body: JSON.stringify({ uid: form.get("uid"), replaceExisting: true }),
      });
      setMessage("Đã gắn thẻ RFID.");
      await credentials.reload();
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gắn thẻ");
    }
  }
  async function createGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/access-grants", {
        method: "POST",
        body: JSON.stringify({
          personId,
          accessPointId: form.get("accessPointId"),
          validFrom: form.get("validFrom"),
          validUntil: form.get("validUntil"),
          timeFrom: form.get("timeFrom"),
          timeUntil: form.get("timeUntil"),
          timezone: "Asia/Ho_Chi_Minh",
        }),
      });
      setMessage("Đã cấp quyền truy cập.");
      await grants.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể cấp quyền",
      );
    }
  }
  async function disablePerson() {
    if (
      !confirm(
        `Vô hiệu hóa ${person.data?.fullName}? Người này sẽ không thể qua cửa.`,
      )
    )
      return;
    setError("");
    try {
      await api(`/people/${personId}/disable`, { method: "PATCH" });
      setMessage("Đã vô hiệu hóa Person.");
      await person.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể vô hiệu hóa",
      );
    }
  }
  async function revokeCredential(id: string) {
    if (
      !confirm("Thu hồi thẻ RFID này? Thao tác không được cập nhật lạc quan.")
    )
      return;
    try {
      await api(`/rfid-credentials/${id}/revoke`, { method: "PATCH" });
      await credentials.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể thu hồi thẻ",
      );
    }
  }
  async function revokeGrant(id: string) {
    if (!confirm("Thu hồi quyền truy cập này?")) return;
    try {
      await api(`/access-grants/${id}/revoke`, { method: "PATCH" });
      await grants.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể thu hồi quyền",
      );
    }
  }
  if (person.loading || person.error || !person.data)
    return (
      <AdminShell>
        <main className="content">
          <StatePanel
            loading={person.loading}
            error={person.error}
            onRetry={person.reload}
          />
        </main>
      </AdminShell>
    );
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow={`PERSON / ${person.data.code}`}
          title={person.data.fullName}
          description="Hồ sơ thiết lập đầy đủ: RFID, khuôn mặt và cửa được phép."
          action={
            <div className="header-actions">
              <Status value={person.data.status} />
              {person.data.status === "ACTIVE" ? (
                <button className="button danger" onClick={disablePerson}>
                  Vô hiệu hóa
                </button>
              ) : null}
            </div>
          }
        />
        {message ? (
          <p className="notice success" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        <section className="profile-grid">
          <article className="section-block">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FACTOR 01</span>
                <h2>Thẻ RFID</h2>
              </div>
            </div>
            <form className="inline-form" onSubmit={attachRfid}>
              <label className="field">
                <span>UID thẻ mới</span>
                <input
                  name="uid"
                  minLength={4}
                  placeholder="A1B2C3D4"
                  required
                />
              </label>
              <button className="button secondary">Gắn / thay thẻ</button>
            </form>
            {credentials.data?.length ? (
              <div className="compact-list">
                {credentials.data.map((item) => (
                  <div key={item.id}>
                    <div>
                      <strong>{item.displayHint ?? "RFID"}</strong>
                      <small>Cấp {formatDate(item.issuedAt)}</small>
                    </div>
                    <div className="row-actions">
                      <Status value={item.status} />
                      {item.status === "ACTIVE" ? (
                        <button
                          className="mini-action"
                          onClick={() => revokeCredential(item.id)}
                        >
                          Thu hồi
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">Chưa có thẻ RFID.</p>
            )}
          </article>
          <article className="section-block biometric">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FACTOR 02</span>
                <h2>Khuôn mặt</h2>
              </div>
              <Link
                className="button secondary"
                href={`/people/${personId}/face-enrollment`}
              >
                {face.data?.activeTemplateCount ? "Đăng ký lại" : "Bắt đầu"}
              </Link>
            </div>
            <div className="face-readout">
              <strong>
                {face.data?.activeTemplateCount ?? 0}
                <span>/10</span>
              </strong>
              <p>mẫu đang hoạt động</p>
            </div>
            <dl className="data-list">
              <div>
                <dt>Model</dt>
                <dd>{face.data?.modelVersion ?? "Chưa đăng ký"}</dd>
              </div>
              <div>
                <dt>Chất lượng TB</dt>
                <dd>
                  {face.data?.meanQualityScore
                    ? `${Math.round(face.data.meanQualityScore * 100)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Lần cuối</dt>
                <dd>{formatDate(face.data?.lastEnrolledAt ?? null)}</dd>
              </div>
            </dl>
          </article>
        </section>
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACCESS WINDOWS</span>
              <h2>Quyền truy cập</h2>
            </div>
          </div>
          <form className="grant-form" onSubmit={createGrant}>
            <label className="field">
              Điểm kiểm soát
              <select name="accessPointId" required>
                <option value="">Chọn cửa…</option>
                {points.data?.map((point) => (
                  <option value={point.id} key={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Từ ngày
              <input name="validFrom" type="date" required />
            </label>
            <label className="field">
              Đến ngày
              <input name="validUntil" type="date" required />
            </label>
            <label className="field">
              Từ giờ
              <input name="timeFrom" type="time" required />
            </label>
            <label className="field">
              Đến giờ
              <input name="timeUntil" type="time" required />
            </label>
            <button className="button primary">Cấp quyền</button>
          </form>
          {grants.data?.items.length ? (
            <div className="compact-list">
              {grants.data.items.map((grant) => (
                <div key={grant.id}>
                  <div>
                    <strong>
                      {points.data?.find(
                        (point) => point.id === grant.accessPointId,
                      )?.name ?? grant.accessPointId}
                    </strong>
                    <small>
                      {grant.validFrom} → {grant.validUntil} ·{" "}
                      {grant.timeFrom.slice(0, 5)}–{grant.timeUntil.slice(0, 5)}{" "}
                      {grant.timeFrom > grant.timeUntil ? "(qua đêm)" : ""}
                    </small>
                  </div>
                  <div className="row-actions">
                    <Status value={grant.status} />
                    {grant.status === "ACTIVE" ? (
                      <button
                        className="mini-action"
                        onClick={() => revokeGrant(grant.id)}
                      >
                        Thu hồi
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">Chưa có quyền truy cập.</p>
          )}
        </section>
      </main>
    </AdminShell>
  );
}

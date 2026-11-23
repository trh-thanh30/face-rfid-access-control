"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { PageHeader } from "../../components/ui";
import { api } from "../../lib/api-client";

type Result = {
  templateCount: number;
  modelVersion: string;
  quality: Record<string, number>;
};

export function FaceEnrollmentView({ personId }: { personId: string }) {
  const [state, setState] = useState<
    "ready" | "capturing" | "success" | "error"
  >("ready");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  async function start() {
    if (
      !confirm(
        "Đăng ký lại sẽ vô hiệu hóa các mẫu khuôn mặt cũ sau khi phiên mới thành công. Tiếp tục?",
      )
    )
      return;
    setState("capturing");
    setError("");
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const data = await api<Result>(`/people/${personId}/face-enrollments`, {
        method: "POST",
        body: JSON.stringify({ sampleCount: 5 }),
        signal: controller.signal,
      });
      setResult(data);
      setState("success");
    } catch (caught) {
      if (controller.signal.aborted) {
        setState("ready");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Enrollment thất bại",
      );
      setState("error");
    } finally {
      activeRequest.current = null;
    }
  }
  function cancel() {
    activeRequest.current?.abort();
  }
  return (
    <AdminShell>
      <main className="content">
        <PageHeader
          eyebrow="BIOMETRIC / ENROLLMENT"
          title="Đăng ký khuôn mặt"
          description="Thu 5 mẫu độc lập; ảnh gốc không được lưu và embedding không hiển thị trên trình duyệt."
        />
        <div className="enrollment-layout">
          <section className={`camera-stage state-${state}`}>
            <div className="face-guide">
              <span />
              <span />
              <span />
              <span />
              <div className="face-oval" />
            </div>
            {state === "capturing" ? <div className="scan-line" /> : null}
            <div className="camera-copy">
              <strong>
                {state === "ready"
                  ? "Sẵn sàng kiểm tra camera"
                  : state === "capturing"
                    ? "Đang thu mẫu — giữ yên"
                    : state === "success"
                      ? "Đăng ký hoàn tất"
                      : "Không thể hoàn tất"}
              </strong>
              <span>
                {state === "capturing"
                  ? "Không đóng trang trong khi camera đang hoạt động."
                  : "Đứng cách camera 50–80 cm, nhìn thẳng và thay đổi nhẹ góc mặt."}
              </span>
            </div>
          </section>
          <aside className="enrollment-steps">
            <span className="eyebrow">QUALITY CHECKLIST</span>
            <ol>
              <li>
                <strong>01 / Ánh sáng</strong>
                <span>Không ngược sáng, khuôn mặt sáng đều.</span>
              </li>
              <li>
                <strong>02 / Một người</strong>
                <span>Không có người khác trong khung hình.</span>
              </li>
              <li>
                <strong>03 / Góc mặt</strong>
                <span>Nhìn thẳng, sau đó xoay nhẹ trái/phải.</span>
              </li>
              <li>
                <strong>04 / Giữ yên</strong>
                <span>Tránh rung và chuyển động nhanh.</span>
              </li>
            </ol>
            {error ? (
              <p className="notice error" role="alert">
                {error}
              </p>
            ) : null}
            {result ? (
              <div className="result-box">
                <strong>{result.templateCount} mẫu hợp lệ</strong>
                <span>Model: {result.modelVersion}</span>
                <span>
                  Chất lượng:{" "}
                  {Math.round((result.quality.meanScore ?? 0) * 100)}%
                </span>
              </div>
            ) : null}
            <button
              className="button primary full"
              onClick={start}
              disabled={state === "capturing"}
            >
              {state === "capturing"
                ? "Đang xử lý…"
                : state === "error"
                  ? "Thử lại"
                  : "Bắt đầu thu 5 mẫu"}
            </button>
            {state === "capturing" ? (
              <button className="button danger full" onClick={cancel}>
                Hủy phiên
              </button>
            ) : null}
            <Link className="button ghost full" href={`/people/${personId}`}>
              Quay lại hồ sơ
            </Link>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}

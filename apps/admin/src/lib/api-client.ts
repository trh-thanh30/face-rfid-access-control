const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export const TOKEN_KEY = "access-control-token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string) {
  return request<{
    accessToken: string;
    account: { id: string; email: string; fullName: string; role: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    authenticated: false,
  });
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, "headers"> & { headers?: HeadersInit } = {},
): Promise<T> {
  return request<T>(path, { ...options, authenticated: true });
}

async function request<T>(
  path: string,
  options: Omit<RequestInit, "headers"> & {
    headers?: HeadersInit;
    authenticated: boolean;
  },
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (options.authenticated && typeof window !== "undefined") {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("admin-session-expired"));
    }
    const raw = (payload as { message?: string | string[] }).message;
    const code = Array.isArray(raw) ? raw.join(", ") : (raw ?? "UNKNOWN_ERROR");
    throw new ApiError(reasonMessage(code), response.status, code);
  }
  return payload as T;
}

const reasons: Record<string, string> = {
  PERSON_NOT_FOUND: "Không tìm thấy người dùng.",
  PERSON_DISABLED: "Người dùng đã bị vô hiệu hóa.",
  RFID_UID_ALREADY_ACTIVE: "Thẻ RFID này đang được sử dụng.",
  CAMERA_BUSY: "Camera đang phục vụ một phiên khác. Hãy thử lại.",
  NO_FACE: "Không phát hiện khuôn mặt. Hãy đứng chính diện camera.",
  MULTIPLE_FACES:
    "Camera thấy nhiều khuôn mặt. Chỉ một người được đứng trong khung.",
  LOW_QUALITY: "Ảnh chưa đạt chất lượng. Hãy cải thiện ánh sáng và giữ yên.",
  VISION_SERVICE_UNAVAILABLE: "Dịch vụ camera/AI chưa sẵn sàng.",
  ADMIN_AUTHENTICATION_REQUIRED: "Phiên đăng nhập đã hết hạn.",
};

export function reasonMessage(code: string): string {
  return reasons[code] ?? code.replaceAll("_", " ").toLowerCase();
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.assign("/login");
}

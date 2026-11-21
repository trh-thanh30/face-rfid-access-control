const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await response.json()) as {
    accessToken?: string;
    message?: string | string[];
  };

  if (!response.ok || !payload.accessToken) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message;
    throw new Error(message ?? "Đăng nhập không thành công");
  }

  return payload;
}

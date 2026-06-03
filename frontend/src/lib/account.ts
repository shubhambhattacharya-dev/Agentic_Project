// frontend/src/lib/account.ts
const API_BASE = "/api";

export type AccountData = {
  id: string;
  clerkId: string | null;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  orders: unknown[];
};

export async function getAccount(token: string): Promise<AccountData> {
  const res = await fetch(`${API_BASE}/account/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch account");
  const data = await res.json();
  return data.data;
}

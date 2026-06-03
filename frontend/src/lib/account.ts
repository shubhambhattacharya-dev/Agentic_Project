import { apiRequest } from "@/lib/api";

export type AccountData = {
  id: string;
  clerkId: string | null;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  orders: unknown[];
};

export async function getAccount(token: string): Promise<AccountData> {
  const data = await apiRequest<{ data: AccountData }>("/api/account/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiX, FiUsers, FiDollarSign, FiClock, FiPackage, FiCpu } from "react-icons/fi";

const API_BASE = "/api";

async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminDashboard() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"refunds" | "metrics" | "customers">("refunds");

  // Fetch pending refunds
  const refunds = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetchWithAuth("/admin/refunds/pending", token!);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch metrics
  const metrics = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetchWithAuth("/admin/metrics", token!);
      return res.data;
    },
  });

  // Fetch customers
  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetchWithAuth("/admin/customers", token!);
      return res.data;
    },
  });

  // Approve refund mutation
  const approveRefund = useMutation({
    mutationFn: async (refundId: string) => {
      const token = await getToken();
      return fetchWithAuth(`/admin/refunds/${refundId}/approve`, token!, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  // Reject refund mutation
  const rejectRefund = useMutation({
    mutationFn: async (refundId: string) => {
      const token = await getToken();
      return fetchWithAuth(`/admin/refunds/${refundId}/reject`, token!, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  return (
    <div className="admin-dashboard">
      <h2>GIGI Admin Dashboard</h2>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={activeTab === "refunds" ? "active" : ""}
          onClick={() => setActiveTab("refunds")}
        >
          <FiClock /> Pending Refunds ({refunds.data?.length ?? 0})
        </button>
        <button
          className={activeTab === "metrics" ? "active" : ""}
          onClick={() => setActiveTab("metrics")}
        >
          <FiDollarSign /> LLMOps Metrics
        </button>
        <button
          className={activeTab === "customers" ? "active" : ""}
          onClick={() => setActiveTab("customers")}
        >
          <FiUsers /> Customers
        </button>
      </div>

      {/* Pending Refunds Tab */}
      {activeTab === "refunds" && (
        <div className="admin-section">
          {refunds.isLoading && <p>Loading refunds...</p>}
          {refunds.isError && <p style={{ color: "#ff5050" }}>Failed to load refunds. Please try again.</p>}
          {!refunds.isLoading && !refunds.isError && refunds.data?.length === 0 && (
            <p style={{ color: "#999" }}>No pending refunds.</p>
          )}
          {refunds.data?.map((refund: Record<string, unknown>) => {
            const order = refund.order as Record<string, unknown>;
            const customer = order?.customer as Record<string, unknown>;
            return (
              <div key={refund.id as string} className="refund-card">
                <div className="refund-info">
                  <strong>Refund #{(refund.id as string).slice(0, 8)}</strong>
                  <span>Order: {order?.id as string}</span>
                  <span>Customer: {(customer?.name as string) ?? "Unknown"}</span>
                  <span>Amount: Rs. {String(refund.amount)}</span>
                  <span>Reason: {refund.reason as string}</span>
                  <span>Damage Claim: {refund.damageClaim ? "Yes" : "No"}</span>
                  <span>Requested: {formatDate(refund.createdAt as string)}</span>
                </div>
                <div className="refund-actions">
                  <button
                    className="btn-approve"
                    onClick={() => approveRefund.mutate(refund.id as string)}
                    disabled={approveRefund.isPending}
                  >
                    <FiCheck /> Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => rejectRefund.mutate(refund.id as string)}
                    disabled={rejectRefund.isPending}
                  >
                    <FiX /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="admin-section">
          {metrics.isLoading && <p>Loading metrics...</p>}
          {metrics.isError && <p style={{ color: "#ff5050" }}>Failed to load metrics. Please try again.</p>}
          {metrics.data && (
            <div className="metrics-grid">
              <div className="metric-card">
                <FiPackage />
                <span className="metric-value">{metrics.data.summary.totalRequests}</span>
                <span className="metric-label">Total Requests</span>
              </div>
              <div className="metric-card">
                <FiDollarSign />
                <span className="metric-value">${metrics.data.summary.totalCostUSD}</span>
                <span className="metric-label">Total Cost (USD)</span>
              </div>
              <div className="metric-card">
                <FiDollarSign />
                <span className="metric-value">Rs. {metrics.data.summary.totalCostINR}</span>
                <span className="metric-label">Total Cost (INR)</span>
              </div>
              <div className="metric-card">
                <FiClock />
                <span className="metric-value">{metrics.data.summary.avgLatencyMs}ms</span>
                <span className="metric-label">Avg Latency</span>
              </div>
              <div className="metric-card">
                <FiCpu />
                <span className="metric-value">{metrics.data.summary.totalTokens?.toLocaleString() ?? "N/A"}</span>
                <span className="metric-label">Total Tokens</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <div className="admin-section">
          {customers.isLoading && <p>Loading customers...</p>}
          {customers.isError && <p style={{ color: "#ff5050" }}>Failed to load customers. Please try again.</p>}
          {!customers.isLoading && !customers.isError && customers.data?.length === 0 && (
            <p style={{ color: "#999" }}>No customers found.</p>
          )}
          {customers.data?.map((customer: Record<string, unknown>) => (
            <div key={customer.id as string} className="customer-card">
              <div>
                <strong>{customer.name as string}</strong>
                <span>{customer.email as string}</span>
                <span style={{ fontSize: "12px", color: "#666" }}>
                  Joined: {formatDate(customer.createdAt as string)}
                </span>
              </div>
              <span className={`role-badge ${(customer.role as string).toLowerCase()}`}>
                {customer.role as string}
              </span>
              <span>{(customer._count as { orders: number })?.orders ?? 0} orders</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

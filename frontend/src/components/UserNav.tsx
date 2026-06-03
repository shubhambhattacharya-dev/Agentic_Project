import { useAuth, UserButton } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { FiShield } from "react-icons/fi";
import { getAccount } from "@/lib/account";

export function UserNav({ onAdminToggle }: { onAdminToggle: (show: boolean) => void }) {
  const { getToken, isSignedIn } = useAuth();

  const account = useQuery({
    queryKey: ["user-account"],
    queryFn: async () => {
      const token = await getToken();
      return getAccount(token!);
    },
    enabled: !!isSignedIn,
  });

  const isAdmin = account.data?.role === "ADMIN";

  return (
    <div className="user-nav">
      {isAdmin && (
        <button
          className="admin-toggle-btn"
          onClick={() => onAdminToggle(true)}
          title="Open Admin Dashboard"
        >
          <FiShield /> Admin
        </button>
      )}
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}

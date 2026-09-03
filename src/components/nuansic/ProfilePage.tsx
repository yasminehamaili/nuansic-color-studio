import { useRequireAuth } from "@/lib/useRequireAuth";
import { useUserProfile } from "@/lib/useUserProfile";
import { usernameFromId, avatarUrlFromId } from "@/lib/username";

export function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.id);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="font-display text-[14px]" style={{ color: "#6B6863" }}>
          Loading...
        </p>
      </div>
    );
  }

  const username = usernameFromId(user.id);
  const avatarUrl = avatarUrlFromId(user.id);

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] px-6 py-16">
      <div className="mx-auto max-w-[480px]">
        <p className="font-display text-[24px] font-bold" style={{ color: "#0B0B0B" }}>
          User Profile
        </p>

        <div className="mt-6 flex items-center gap-4 rounded-[16px] bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <img src={avatarUrl} alt={username} className="h-[64px] w-[64px] rounded-full" />
          <div>
            <p className="font-display text-[17px] font-bold" style={{ color: "#0B0B0B" }}>
              {username}
            </p>
            <p className="font-display text-[13px]" style={{ color: "#6B6863" }}>
              {user.email}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-[16px] bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p className="font-display text-[12px] uppercase tracking-wide" style={{ color: "#6B6863" }}>
              AI Credits
            </p>
            <p className="mt-1 font-display text-[22px] font-bold" style={{ color: "#0B0B0B" }}>
              {profileLoading ? "..." : (profile?.ai_credits ?? "—")}
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p className="font-display text-[12px] uppercase tracking-wide" style={{ color: "#6B6863" }}>
              Member since
            </p>
            <p className="mt-1 font-display text-[15px] font-bold" style={{ color: "#0B0B0B" }}>
              {profileLoading || !profile
                ? "..."
                : new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

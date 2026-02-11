import React from "react";
import RoleDashboardSwitcher from "./RoleDashboardSwitcher";
import { useAuth } from "../auth/useAuth.js";
import { useQuery } from "@tanstack/react-query";
import { getMyMedia } from "../library/dashboardApi.js";

// Fallback avatar image (provided by user).
const FALLBACK_AVATAR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAIAAAAP3aGbAAABrklEQVR4nO3RMQEAIAzAMMC/5yFjRxMFfXpnqO0B6DgF8gQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAIF/ATQXATp3hSYvAAAAAElFTkSuQmCC";

export default function DcTopBar({ subtitle }) {
  const { token, user } = useAuth();

  // Load media so we can show profile photo in the bar.
  const mediaQuery = useQuery({
    queryKey: ["my-media"],
    queryFn: () => getMyMedia({ token }),
    enabled: Boolean(token),
  });

  const media = mediaQuery.data ?? null;
  const avatarUrl =
    media?.profile_photo?.secure_url || media?.profile_photo?.url || null;

  const displayName = user?.user_name ?? user?.name ?? user?.email ?? "";

  return (
    <div className="dc-topbar" role="banner">
      <div className="dc-topbar__left">
        <div className="dc-avatar" aria-hidden={Boolean(avatarUrl)}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <img
              src={FALLBACK_AVATAR}
              alt="Profile placeholder"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
        </div>

        <div className="dc-topbar__title">
          <strong>
            Welcome back{displayName ? "," : ""} {displayName}
          </strong>
          <span className="dc-muted">{subtitle || ""}</span>
        </div>
      </div>

      <div className="dc-topbar__actions">
        <RoleDashboardSwitcher label="Switch Role" />
      </div>
    </div>
  );
}

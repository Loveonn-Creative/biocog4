import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { peekAuthLinkSnapshot } from "@/lib/authLinkSnapshot";

/**
 * Email links sent before the redirect moved to /auth land on the home page
 * (or wherever the Site URL points). Anything an auth link left in the address
 * is handed to /auth, which explains it and offers the fix; /reset-password
 * handles its own links.
 */
export function AuthLinkRouter() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    const snap = peekAuthLinkSnapshot();
    if (!snap || pathname === "/auth" || pathname === "/reset-password") return;
    navigate({ pathname: "/auth", search: snap.search, hash: snap.hash }, { replace: true });
    // Only the first page load can carry a link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

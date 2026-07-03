import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import FeedApp from "../components/Feed";

export default function FeedPage() {
  const [user, setUser] = useState(undefined);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        router.replace("/");
      }
    });
  }, [router]);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>載入中...</div>
      </div>
    );
  }

  return <FeedApp user={user} />;
}

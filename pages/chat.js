// pages/chat.js
// 聊天室是在登入後由首頁（pages/index.js）內嵌渲染，這裡只做導向，避免出現孤立的假頁面。
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}

import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "./firebaseAdmin";

export function getAdminUids() {
  return (process.env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function verifyAdminRequest(req) {
  getAdminDb();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!getAdminUids().includes(decoded.uid)) return null;
    return decoded;
  } catch {
    return null;
  }
}

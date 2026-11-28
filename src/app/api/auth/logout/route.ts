import { SESSION_COOKIE } from "@/lib/auth";
import { seeOther } from "@/lib/redirect";

export async function POST() {
  const response = seeOther("/login");
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

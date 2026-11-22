import { SESSION_COOKIE } from "@/lib/auth";
import { seeOther } from "@/lib/redirect";

export async function POST(request: Request) {
  const response = seeOther("/login");
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

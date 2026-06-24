import { createHmac, timingSafeEqual } from "node:crypto";

export type StaffSession = {
  userId: string;
  email: string;
  role: "seller" | "technician" | "admin";
};

const COOKIE_NAME = "staff_session";

export function createStaffSessionCookie(session: StaffSession) {
  const encodedPayload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload);
  return `${COOKIE_NAME}=${encodedPayload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`;
}

export function readStaffSession(request: Request): StaffSession | null {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(`${COOKIE_NAME}=`.length);

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !verify(encodedPayload, signature)) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as StaffSession;
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function verify(value: string, signature: string) {
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function getSecret() {
  return process.env.AUTH_SECRET ?? "development-only-secret";
}

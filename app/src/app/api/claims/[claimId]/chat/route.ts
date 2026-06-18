import { apiError } from "@/lib/http/api-response";
import { startRejectedClaimChat, statusForError } from "@/lib/claims/service";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { claimId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await startRejectedClaimChat(claimId, String(body.message ?? ""));

  if (!result.success) {
    return apiError(statusForError(result.error), result.error);
  }

  return new Response(result.data.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

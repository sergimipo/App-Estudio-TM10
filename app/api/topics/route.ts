import { listTopics } from "@/lib/topics";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ topics: await listTopics() });
}

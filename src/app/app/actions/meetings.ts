"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeContext, check } from "@/lib/action-context";
import { zonedToUtc } from "@/lib/meetings";
import { num, str } from "@/lib/utils";

export async function createMeeting(fd: FormData) {
  const ws = await writeContext("meetings");
  const title = str(fd, "title");
  const date = str(fd, "date");
  const time = str(fd, "time") ?? "10:00";
  if (!title || !date) return;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const at = zonedToUtc(y!, m! - 1, d!, hh ?? 10, mm ?? 0, ws.blueprint.company.timezone || "Europe/Amsterdam");
  const row = check(
    await ws.supabase
      .from("meetings")
      .insert({
        organization_id: ws.org.id,
        title,
        series: title,
        meeting_type: str(fd, "meeting_type") ?? "other",
        starts_at: at.toISOString(),
        duration_minutes: num(fd, "duration_minutes") ?? 60,
      })
      .select("id")
      .single(),
  );
  redirect(`/app/meetings/${row.id}`);
}

export async function saveMeetingNotes(fd: FormData) {
  const ws = await writeContext("meetings");
  const id = str(fd, "id")!;
  check(
    await ws.supabase
      .from("meetings")
      .update({ agenda: str(fd, "agenda"), minutes: str(fd, "minutes"), chair: str(fd, "chair"), attendees: str(fd, "attendees") })
      .eq("id", id)
      .eq("organization_id", ws.org.id),
  );
  revalidatePath(`/app/meetings/${id}`);
}

export async function deleteMeeting(fd: FormData) {
  const ws = await writeContext("meetings");
  check(await ws.supabase.from("meetings").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  redirect("/app/meetings");
}

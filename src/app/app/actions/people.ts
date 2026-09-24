"use server";

import { revalidatePath } from "next/cache";
import { writeContext, check } from "@/lib/action-context";
import { bool, num, str } from "@/lib/utils";

const TYPES = ["fte", "contractor", "backfill", "pool"];

export async function createPerson(fd: FormData) {
  const ws = await writeContext("resources");
  const name = str(fd, "name");
  if (!name) return;
  const type = str(fd, "employment_type");
  const discipline = str(fd, "discipline");
  check(
    await ws.supabase.from("people").insert({
      organization_id: ws.org.id,
      name,
      email: str(fd, "email"),
      discipline,
      role_title: ws.blueprint.disciplines.find((d) => d.key === discipline)?.label ?? null,
      employment_type: type && TYPES.includes(type) ? type : "fte",
      capacity_hours_per_quarter: num(fd, "capacity") ?? ws.blueprint.capacityPerQuarter,
    }),
  );
  revalidatePath("/app/capacity");
}

export async function updatePerson(fd: FormData) {
  const ws = await writeContext("resources");
  const discipline = str(fd, "discipline");
  const type = str(fd, "employment_type");
  check(
    await ws.supabase
      .from("people")
      .update({
        name: str(fd, "name") ?? undefined,
        discipline,
        role_title: ws.blueprint.disciplines.find((d) => d.key === discipline)?.label ?? null,
        employment_type: type && TYPES.includes(type) ? type : "fte",
        capacity_hours_per_quarter: num(fd, "capacity") ?? ws.blueprint.capacityPerQuarter,
        active: bool(fd, "active"),
      })
      .eq("id", str(fd, "id")!)
      .eq("organization_id", ws.org.id),
  );
  revalidatePath("/app/capacity");
}

export async function deletePerson(fd: FormData) {
  const ws = await writeContext("resources");
  check(await ws.supabase.from("people").delete().eq("id", str(fd, "id")!).eq("organization_id", ws.org.id));
  revalidatePath("/app/capacity");
}

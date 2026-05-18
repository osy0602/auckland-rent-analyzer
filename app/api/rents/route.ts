import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("rent_snapshots")
    .select("*")
    .order("suburb_slug", { ascending: true });

  if (error) {
    return Response.json(
      { message: "Failed to fetch rent snapshots", error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data);
}
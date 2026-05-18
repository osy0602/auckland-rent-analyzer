import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("suburbs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return Response.json(
      { message: "Failed to fetch suburbs", error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data);
}
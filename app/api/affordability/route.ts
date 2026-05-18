import { supabase } from "@/lib/supabase";

type RentSnapshot = {
  id: number;
  suburb_slug: string;
  rental_type: string;
  bedrooms: number;
  median_weekly_rent: number;
  listing_count: number;
  source: string;
  collected_at: string;
};

type Suburb = {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  area: string;
};

function getAffordabilityStatus(ratio: number) {
  if (ratio <= 0.3) return "affordable";
  if (ratio <= 0.4) return "moderate";
  return "expensive";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const monthlyIncome = Number(searchParams.get("monthlyIncome"));
  const rentalType = searchParams.get("rentalType") ?? "flat_room";

  if (!monthlyIncome || monthlyIncome <= 0) {
    return Response.json(
      { message: "monthlyIncome is required and must be greater than 0" },
      { status: 400 }
    );
  }

  const { data: rents, error: rentError } = await supabase
    .from("rent_snapshots")
    .select("*")
    .eq("rental_type", rentalType)
    .order("median_weekly_rent", { ascending: true });

  if (rentError) {
    return Response.json(
      { message: "Failed to fetch rent data", error: rentError.message },
      { status: 500 }
    );
  }

  const { data: suburbs, error: suburbError } = await supabase
    .from("suburbs")
    .select("*");

  if (suburbError) {
    return Response.json(
      { message: "Failed to fetch suburb data", error: suburbError.message },
      { status: 500 }
    );
  }

  const suburbMap = new Map(
    (suburbs as Suburb[]).map((suburb) => [suburb.slug, suburb])
  );

  const results = (rents as RentSnapshot[]).map((rent) => {
    const suburb = suburbMap.get(rent.suburb_slug);

    const monthlyRent = rent.median_weekly_rent * 4.33;
    const rentToIncomeRatio = monthlyRent / monthlyIncome;
    const rentToIncomePercentage = rentToIncomeRatio * 100;

    return {
      suburbName: suburb?.name ?? rent.suburb_slug,
      suburbSlug: rent.suburb_slug,
      area: suburb?.area ?? null,
      latitude: suburb?.latitude ?? null,
      longitude: suburb?.longitude ?? null,

      rentalType: rent.rental_type,
      bedrooms: rent.bedrooms,
      weeklyRent: rent.median_weekly_rent,
      monthlyRent: Math.round(monthlyRent),

      monthlyIncome,
      rentToIncomeRatio: Number(rentToIncomeRatio.toFixed(3)),
      rentToIncomePercentage: Number(rentToIncomePercentage.toFixed(1)),
      status: getAffordabilityStatus(rentToIncomeRatio),

      listingCount: rent.listing_count,
      source: rent.source,
      collectedAt: rent.collected_at,
    };
  });

  const sortedResults = results.sort(
    (a, b) => a.rentToIncomePercentage - b.rentToIncomePercentage
  );

  return Response.json({
    monthlyIncome,
    rentalType,
    count: sortedResults.length,
    results: sortedResults,
  });
}
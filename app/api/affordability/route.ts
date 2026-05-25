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

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const toRadians = (degree: number) => degree * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const monthlyIncome = Number(searchParams.get("monthlyIncome"));
  const rentalType = searchParams.get("rentalType") ?? "flat_room";
  const workplaceSlug = searchParams.get("workplaceSlug") ?? "auckland-cbd";

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

  const suburbList = suburbs as Suburb[];

  const suburbMap = new Map(
    suburbList.map((suburb) => [suburb.slug, suburb])
  );

  const workplace = suburbMap.get(workplaceSlug);

  if (!workplace) {
    return Response.json(
      { message: "Invalid workplaceSlug" },
      { status: 400 }
    );
  }

  const results = (rents as RentSnapshot[]).map((rent) => {
    const suburb = suburbMap.get(rent.suburb_slug);

    const monthlyRent = rent.median_weekly_rent * 4.33;
    const rentToIncomeRatio = monthlyRent / monthlyIncome;
    const rentToIncomePercentage = rentToIncomeRatio * 100;

    const distanceToWorkKm = suburb
      ? calculateDistanceKm(
          Number(suburb.latitude),
          Number(suburb.longitude),
          Number(workplace.latitude),
          Number(workplace.longitude)
        )
      : null;

    /**
     * 추천 점수
     * - rentToIncomePercentage: 월수입 대비 렌트 부담률
     * - distanceToWorkKm * 1.2: 출근지와의 직선거리 가중치
     *
     * 점수가 낮을수록 추천 순위가 높음.
     */
    const recommendationScore =
      rentToIncomePercentage + (distanceToWorkKm ?? 0) * 1.2;

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

      workplaceSlug,
      workplaceName: workplace.name,
      distanceToWorkKm:
        distanceToWorkKm !== null ? Number(distanceToWorkKm.toFixed(1)) : null,
      recommendationScore: Number(recommendationScore.toFixed(1)),

      listingCount: rent.listing_count,
      source: rent.source,
      collectedAt: rent.collected_at,
    };
  });

  const sortedResults = results.sort(
    (a, b) => a.recommendationScore - b.recommendationScore
  );

  return Response.json({
    monthlyIncome,
    rentalType,
    workplaceSlug,
    workplaceName: workplace.name,
    count: sortedResults.length,
    results: sortedResults,
  });
}
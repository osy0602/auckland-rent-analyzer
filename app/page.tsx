"use client";

import { useRef, useState } from "react";
import RentMap from "@/components/RentMap";

type RentalType =
  | "flat_room"
  | "one_bedroom"
  | "two_bedroom"
  | "three_bedroom";

type StatusFilter = "all" | "affordable" | "moderate" | "expensive";

type SortOption =
  | "best_match"
  | "cheapest_rent"
  | "closest_to_work"
  | "lowest_income_ratio";

type AffordabilityResult = {
  suburbName: string;
  suburbSlug: string;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  rentalType: RentalType;
  bedrooms: number;
  weeklyRent: number;
  monthlyRent: number;
  monthlyIncome: number;
  rentToIncomeRatio: number;
  rentToIncomePercentage: number;
  status: "affordable" | "moderate" | "expensive";
  workplaceSlug: string;
  workplaceName: string;
  distanceToWorkKm: number | null;
  recommendationScore: number;
  listingCount: number;
  source: string;
  collectedAt: string;
};

type ApiResponse = {
  monthlyIncome: number;
  rentalType: RentalType;
  count: number;
  results: AffordabilityResult[];
};

const rentalTypeOptions = [
  { label: "Flat room", value: "flat_room" },
  { label: "1 Bedroom", value: "one_bedroom" },
  { label: "2 Bedrooms", value: "two_bedroom" },
  { label: "3 Bedrooms", value: "three_bedroom" },
] as const;

const workplaceOptions = [
  { label: "Auckland CBD", value: "auckland-cbd" },
  { label: "Newmarket", value: "newmarket" },
  { label: "Ponsonby", value: "ponsonby" },
  { label: "Parnell", value: "parnell" },
  { label: "Takapuna", value: "takapuna" },
  { label: "Albany", value: "albany" },
  { label: "Henderson", value: "henderson" },
  { label: "Manukau", value: "manukau" },
  { label: "Botany Downs", value: "botany-downs" },
] as const;

const statusFilterOptions = [
  { label: "All", value: "all" },
  { label: "Affordable", value: "affordable" },
  { label: "Tight", value: "moderate" },
  { label: "Expensive", value: "expensive" },
] as const;

const sortOptions = [
  { label: "Best match", value: "best_match" },
  { label: "Cheapest rent", value: "cheapest_rent" },
  { label: "Closest to work", value: "closest_to_work" },
  { label: "Lowest income ratio", value: "lowest_income_ratio" },
] as const;

function getStatusLabel(status: AffordabilityResult["status"]) {
  if (status === "affordable") return "Affordable";
  if (status === "moderate") return "Tight";
  return "Expensive";
}

function getStatusClass(status: AffordabilityResult["status"]) {
  if (status === "affordable") {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (status === "moderate") {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return "bg-red-100 text-red-700 border-red-200";
}

export default function Home() {
  const [monthlyIncome, setMonthlyIncome] = useState("4500");
  const [rentalType, setRentalType] = useState<RentalType>("flat_room");
  const [workplaceSlug, setWorkplaceSlug] = useState("auckland-cbd");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("best_match");
  const [results, setResults] = useState<AffordabilityResult[]>([]);
  const [hoveredSuburbSlug, setHoveredSuburbSlug] = useState<string | null>(
    null
  );
  const [selectedSuburbSlug, setSelectedSuburbSlug] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const affordableCount = results.filter(
    (item) => item.status === "affordable"
  ).length;

  const moderateCount = results.filter(
    (item) => item.status === "moderate"
  ).length;

  const expensiveCount = results.filter(
    (item) => item.status === "expensive"
  ).length;

  const cheapestSuburb = results[0];

  const averageRentRatio =
    results.length > 0
      ? results.reduce((sum, item) => sum + item.rentToIncomePercentage, 0) /
        results.length
      : 0;

  const filteredResults =
    statusFilter === "all"
      ? results
      : results.filter((item) => item.status === statusFilter);

  const sortedFilteredResults = [...filteredResults].sort((a, b) => {
  if (sortOption === "cheapest_rent") {
    return a.weeklyRent - b.weeklyRent;
  }
  

  if (sortOption === "closest_to_work") {
    return (a.distanceToWorkKm ?? 999) - (b.distanceToWorkKm ?? 999);
  }

  if (sortOption === "lowest_income_ratio") {
    return a.rentToIncomePercentage - b.rentToIncomePercentage;
  }

  return a.recommendationScore - b.recommendationScore;
  });

  const bestMatch = results.length > 0
  ? [...results].sort((a, b) => a.recommendationScore - b.recommendationScore)[0]
  : null;

  const cheapestRent = results.length > 0
    ? [...results].sort((a, b) => a.weeklyRent - b.weeklyRent)[0]
    : null;

  const closestToWork = results.length > 0
    ? [...results].sort(
        (a, b) => (a.distanceToWorkKm ?? 999) - (b.distanceToWorkKm ?? 999)
      )[0]
    : null;

  const mostAffordable = results.length > 0
    ? [...results].sort(
        (a, b) => a.rentToIncomePercentage - b.rentToIncomePercentage
      )[0]
    : null;

  function handleSelectSuburb(suburbSlug: string) {
    setSelectedSuburbSlug(suburbSlug);

    const targetCard = cardRefs.current[suburbSlug];

    if (targetCard) {
      targetCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  async function handleSearch() {
    const income = Number(monthlyIncome);

    if (!income || income <= 0) {
      setErrorMessage("Please enter a valid monthly income.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/affordability?monthlyIncome=${income}&rentalType=${rentalType}&workplaceSlug=${workplaceSlug}`
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch affordability data.");
      }

      setResults(data.results);
      setSelectedSuburbSlug(null);
      setHoveredSuburbSlug(null);
      setStatusFilter("all");
      setSortOption("best_match");
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Auckland Rent Analyzer
          </p>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Find Auckland suburbs that fit your income.
          </h1>

          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Compare weekly rent with your monthly income and check which suburbs
            feel affordable, tight, or expensive.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Your situation</h2>

            <p className="mt-2 text-sm text-slate-500">
              Start with your monthly income after tax.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Monthly income
                </label>

                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <span className="text-slate-500">$</span>

                  <input
                    value={monthlyIncome}
                    onChange={(event) => setMonthlyIncome(event.target.value)}
                    type="number"
                    step="100"
                    min="0"
                    className="w-full bg-transparent px-2 py-3 outline-none"
                    placeholder="4500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Housing type
                </label>

                <select
                  value={rentalType}
                  onChange={(event) =>
                    setRentalType(event.target.value as RentalType)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  {rentalTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Workplace
                </label>

                <select
                  value={workplaceSlug}
                  onChange={(event) => setWorkplaceSlug(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  {workplaceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Calculating..." : "Find suburbs"}
              </button>

              {errorMessage && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errorMessage}
                </p>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">How ranking works</p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Suburbs are ranked using rent burden and distance to your selected
                  workplace.
                </p>

                <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Rent burden</span> =
                    monthly rent ÷ monthly income
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-800">Score</span> = rent
                    burden percentage + distance × 1.2
                  </p>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Lower score means a better match. Distance is based on straight-line
                  distance, not actual public transport time.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Data note</p>
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Current rent values are mock seed data for development. They will be
                  replaced with manually verified or scraped market rent data in a future
                  version.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Recommended suburbs</h2>

                <p className="mt-2 text-sm text-slate-500">
                  Sorted by rent burden and distance to your selected workplace.
                </p>
              </div>

              {results.length > 0 && (
                <p className="text-sm text-slate-500">
                  {filteredResults.length} of {results.length} suburbs
                </p>
              )}
            </div>

            {results.length > 0 && (
              <div className="mb-6 grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-medium text-green-700">
                    Affordable
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-800">
                    {affordableCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-xs font-medium text-yellow-700">Tight</p>
                  <p className="mt-1 text-2xl font-bold text-yellow-800">
                    {moderateCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-700">Expensive</p>
                  <p className="mt-1 text-2xl font-bold text-red-800">
                    {expensiveCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Cheapest
                  </p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900">
                    {cheapestSuburb?.suburbName}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Avg. ratio
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {averageRentRatio.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Best match</p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900">
                    {bestMatch?.suburbName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Score {bestMatch?.recommendationScore}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Cheapest rent</p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900">
                    {cheapestRent?.suburbName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ${cheapestRent?.weeklyRent}/week
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Closest to work</p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900">
                    {closestToWork?.suburbName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {closestToWork?.distanceToWorkKm} km
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">Most affordable</p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900">
                    {mostAffordable?.suburbName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {mostAffordable?.rentToIncomePercentage}% of income
                  </p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      statusFilter === option.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {results.length > 0 && (
  <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div>
      <p className="text-sm font-semibold text-slate-800">Sort results</p>
      <p className="mt-1 text-xs text-slate-500">
        Change how suburb recommendations are ranked.
      </p>
    </div>

    <select
      value={sortOption}
      onChange={(event) => setSortOption(event.target.value as SortOption)}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
    >
      {sortOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)}

            <div className="mb-6">
              {results.length === 0 ? (
                <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <div>
                    <p className="font-medium text-slate-700">Map preview</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Search first to show suburb markers.
                    </p>
                  </div>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <div>
                    <p className="font-medium text-slate-700">
                      No matching suburbs.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try another filter or adjust your income.
                    </p>
                  </div>
                </div>
              ) : (
                <RentMap
                  results={sortedFilteredResults}
                  hoveredSuburbSlug={hoveredSuburbSlug}
                  selectedSuburbSlug={selectedSuburbSlug}
                  onSelectSuburb={handleSelectSuburb}
                />
              )}
            </div>

            {results.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <p className="font-medium text-slate-700">No results yet.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Enter your income and click Find suburbs.
                  </p>
                </div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <p className="font-medium text-slate-700">
                    No matching suburbs.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another filter or adjust your income.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedFilteredResults.map((item) => (
                  <article
                    key={`${item.suburbSlug}-${item.rentalType}`}
                    ref={(element) => {
                      cardRefs.current[item.suburbSlug] = element;
                    }}
                    onMouseEnter={() => setHoveredSuburbSlug(item.suburbSlug)}
                    onMouseLeave={() => setHoveredSuburbSlug(null)}
                    className={`rounded-3xl border bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md ${
                      selectedSuburbSlug === item.suburbSlug
                        ? "border-slate-900 ring-4 ring-slate-900/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {item.suburbName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.area}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs text-slate-500">Weekly rent</p>
                        <p className="mt-1 text-lg font-bold">
                          ${item.weeklyRent}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs text-slate-500">Monthly rent</p>
                        <p className="mt-1 text-lg font-bold">
                          ${item.monthlyRent}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs text-slate-500">Income ratio</p>
                        <p className="mt-1 text-lg font-bold">
                          {item.rentToIncomePercentage}%
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs text-slate-500">Distance</p>
                        <p className="mt-1 text-lg font-bold">
                          {item.distanceToWorkKm !== null
                            ? `${item.distanceToWorkKm} km`
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-400">
                      Source: {item.source} · {item.listingCount} listings ·
                      Collected: {item.collectedAt}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
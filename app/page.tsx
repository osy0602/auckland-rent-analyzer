"use client";
import { useState } from "react";
import RentMap from "@/components/RentMap";
type RentalType =
  | "flat_room"
  | "one_bedroom"
  | "two_bedroom"
  | "three_bedroom";

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
  const [results, setResults] = useState<AffordabilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        `/api/affordability?monthlyIncome=${income}&rentalType=${rentalType}`
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch affordability data.");
      }

      setResults(data.results);
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
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-end justify-between gap-4">
  <div>
    <h2 className="text-xl font-semibold">Recommended suburbs</h2>
    <p className="mt-2 text-sm text-slate-500">
      Sorted by rent-to-income ratio, from lowest to highest.
    </p>
  </div>
  {results.length > 0 && (
    <p className="text-sm text-slate-500">{results.length} suburbs</p>
  )}
</div>

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
  ) : (
    <RentMap results={results} />
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
) : (
  <div className="grid gap-4 md:grid-cols-2">
    {results.map((item) => (
      <article
        key={`${item.suburbSlug}-${item.rentalType}`}
        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{item.suburbName}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.area}</p>
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
            <p className="mt-1 text-lg font-bold">${item.weeklyRent}</p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-slate-500">Monthly rent</p>
            <p className="mt-1 text-lg font-bold">${item.monthlyRent}</p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-slate-500">Income ratio</p>
            <p className="mt-1 text-lg font-bold">
              {item.rentToIncomePercentage}%
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-slate-500">Listings</p>
            <p className="mt-1 text-lg font-bold">{item.listingCount}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Source: {item.source} · Collected: {item.collectedAt}
        </p>
      </article>
    ))}
  </div>
)}

            {results.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <p className="font-medium text-slate-700">
                    No results yet.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Enter your income and click Find suburbs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {results.map((item) => (
                  <article
                    key={`${item.suburbSlug}-${item.rentalType}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
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
                        <p className="text-xs text-slate-500">
                          Income ratio
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {item.rentToIncomePercentage}%
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs text-slate-500">Listings</p>
                        <p className="mt-1 text-lg font-bold">
                          {item.listingCount}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-400">
                      Source: {item.source} · Collected: {item.collectedAt}
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
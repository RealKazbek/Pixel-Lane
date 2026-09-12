import type { CitySummary } from "../../types/city";

interface CityListProps {
  cities: CitySummary[];
  selectedCityId: string | null;
  onSelectCity: (cityId: string) => void;
}

export function CityList({
  cities,
  selectedCityId,
  onSelectCity,
}: CityListProps) {
  if (cities.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">
          No cities yet.
        </p>
        <p className="mt-1">
          Create one through the API or load the example fixture.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {cities.map((city) => {
        const isSelected = city.id === selectedCityId;
        return (
          <li key={city.id}>
            <button
              type="button"
              onClick={() => onSelectCity(city.id)}
              className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="block truncate font-medium">{city.name}</span>
              <span
                className={`block truncate text-xs ${isSelected ? "text-blue-100" : "text-zinc-400"}`}
              >
                {city.coordinate_system}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

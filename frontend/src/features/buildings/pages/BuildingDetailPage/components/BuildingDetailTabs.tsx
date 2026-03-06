// # Filename: src/features/buildings/pages/BuildingDetailPage/components/BuildingDetailTabs.tsx


type BuildingDetailTabKey = "units" | "leases";

type Props = {
  activeTab: BuildingDetailTabKey;
  onChange: (tab: BuildingDetailTabKey) => void;
  unitsCount?: number;
  leasesCount?: number;
};

/**
 * BuildingDetailTabs
 *
 * Local page-level navigation for the Building Detail workspace.
 *
 * Why this exists:
 * - DashboardNav handles app-level navigation.
 * - This component handles building-level navigation inside a single building.
 *
 * Mobile-first behavior:
 * - Full-width segmented layout
 * - Large touch targets
 * - Horizontal layout that works well on narrow screens
 *
 * Current tabs:
 * - Units
 * - Leases
 */
export default function BuildingDetailTabs({
  activeTab,
  onChange,
  unitsCount,
  leasesCount,
}: Props) {
  const tabs: Array<{
    key: BuildingDetailTabKey;
    label: string;
    count?: number;
  }> = [
    {
      key: "units",
      label: "Units",
      count: unitsCount,
    },
    {
      key: "leases",
      label: "Leases",
      count: leasesCount,
    },
  ];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-1">
      <div
        className="grid grid-cols-2 gap-1"
        role="tablist"
        aria-label="Building detail sections"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`building-detail-panel-${tab.key}`}
              id={`building-detail-tab-${tab.key}`}
              onClick={() => onChange(tab.key)}
              className={[
                "flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-0",
                isActive
                  ? "bg-white text-black"
                  : "bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white",
              ].join(" ")}
            >
              <span>{tab.label}</span>

              {typeof tab.count === "number" ? (
                <span
                  className={[
                    "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs",
                    isActive
                      ? "bg-black/10 text-black"
                      : "bg-neutral-800 text-neutral-300",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { BuildingDetailTabKey };
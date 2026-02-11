"use client";

import dynamic from "next/dynamic";

import type { Location } from "@/lib/db/definitions";

import { Skeleton } from "./ui/skeleton";

const DynamicMap = dynamic(async () => await import("./map"), {
  loading: () => <Skeleton className="size-full" />,
  ssr: false,
});

export function MapWrapper({ locations }: { locations: Location[] }) {
  return (
    <div className="flex w-full">
      <DynamicMap locations={locations} />
    </div>
  );
}

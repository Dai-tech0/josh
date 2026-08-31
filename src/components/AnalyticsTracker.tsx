"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

function TrackPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    getFirebaseAnalytics().then((analytics) => {
      if (analytics) logEvent(analytics, "page_view", { page_path: url });
    });
  }, [pathname, searchParams]);

  return null;
}

/** SPA遷移（クライアント側ルーティング）でもページビューが記録されるようにする */
export default function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackPageView />
    </Suspense>
  );
}

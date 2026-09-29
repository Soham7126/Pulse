import { useEffect, useState } from 'react';

// The headless task writes from another JS context, so screens re-read the DB on a tick instead of subscribing.
const TICK_MS = 1000;

/** Current time, updated every second. Screens read SQLite during render keyed off this tick. */
export function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../services/api';

// Runs `fn` on mount and whenever `deps` change. Ignores stale responses so fast filter changes can't race.
export default function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const run = useRef(0);

  const load = useCallback(async () => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (id === run.current) setData(result);
    } catch (e) {
      if (id === run.current) setError(errMsg(e));
    } finally {
      if (id === run.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (enabled) load(); }, [load, enabled]);
  return { data, loading, error, reload: load, setData };
}

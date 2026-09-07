import { useRef, useState, useEffect } from 'react';

// Tracks an element's content-box size via ResizeObserver. Returns [ref, {width, height}];
// attach `ref` to the element you want measured. width/height are 0 until the first
// observation fires — callers that need concrete pixels (e.g. a treemap layout) should
// wait for a nonzero size before computing.
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

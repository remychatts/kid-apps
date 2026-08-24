/** Measures a responsive component container with ResizeObserver. */
import { useState, useEffect, useCallback, RefCallback } from "react";

interface Size {
  width: number;
  height: number;
}

/**
 * Hook to measure a container's dimensions using ResizeObserver.
 * Returns a callback ref to attach to the container and the current size.
 */
export function useContainerSize(): [RefCallback<HTMLDivElement>, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Get initial size
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      resizeObserver.disconnect();
    };
  }, [element]);

  return [ref, size];
}

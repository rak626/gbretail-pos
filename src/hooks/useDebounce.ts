"use client";
import { useEffect, useState, useCallback, useRef } from "react";

export function useDebounce<T>(value: T, delay = 280): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay = 280): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return debounced;
}

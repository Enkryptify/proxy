import { useEffect, useState } from "react";

const STORAGE_KEY = "proxy-admin:selected-workspace";

function read(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function useSelectedWorkspace(): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setValue(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = (next: string) => {
    setValue(next);
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return [value, set];
}

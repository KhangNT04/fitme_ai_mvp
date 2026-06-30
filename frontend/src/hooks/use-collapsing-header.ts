"use client";

import { createContext, useContext } from "react";

interface CollapsingHeaderContextValue {
  scrollCompact: boolean;
}

export const CollapsingHeaderContext = createContext<CollapsingHeaderContextValue>({
  scrollCompact: false,
});

export function useCollapsingHeader() {
  return useContext(CollapsingHeaderContext);
}

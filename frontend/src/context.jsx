import { createContext, useContext } from "react";
import { QueryClient } from "@tanstack/react-query";
export const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
export const Context = createContext(null);
export const useApp = () => useContext(Context);

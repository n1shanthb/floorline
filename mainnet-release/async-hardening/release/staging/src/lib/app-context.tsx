import { createContext, useContext } from "react";
import type { ActionRequest } from "./wallet";
import type { Position, Snapshot } from "./rpc";
export interface AppState {
  snapshot: Snapshot | null;
  error: string;
  loading: boolean;
  account: string;
  position: Position | null;
  walletError: string;
  refresh: () => Promise<void>;
  openWallet: () => void;
  review: (r: ActionRequest) => void;
  notify: (message: string) => void;
  trackId: (kind: "loans" | "claims", id: string) => void;
  tracked: { loans: string[]; claims: string[] };
}
export const AppContext = createContext<AppState | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Missing app provider");
  return value;
}

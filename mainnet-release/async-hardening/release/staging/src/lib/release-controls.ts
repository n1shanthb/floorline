import { view } from "./rpc";
import { CONTRACT } from "./config";
export const pilotStatus = (block: string) => view<{stopped: boolean; gross: string; limits: {max_action: string; max_gross: string; max_storage: string}}>("pilot_status", {}, CONTRACT, block);
export const admissionStatus = (block: string) => view<{occupied: number; capacity: number}>("admission_status", {}, CONTRACT, block);

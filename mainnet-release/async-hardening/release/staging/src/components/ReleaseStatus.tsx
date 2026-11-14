import { useEffect, useState } from "react";
import { STAGING_CONFIGURED } from "../lib/config";
import { view } from "../lib/rpc";
import { exact } from "../lib/math";
export function ReleaseStatus() {
  const [message, setMessage] = useState("Reading release controls…");
  useEffect(() => {
    if (!STAGING_CONFIGURED) return;
    let active = true;
    const read = async () => {
      try {
        const [a, p] = await Promise.all([
          view<{occupied: number; capacity: number}>("admission_status"),
          view<{stopped: boolean; gross: string; limits: {max_gross: string; max_action: string}}>("pilot_status"),
        ]);
        if (active) setMessage(`${a.occupied}/${a.capacity} funded admission slots occupied · ${p.stopped ? "New risk stopped" : BigInt(p.limits.max_action)>0n && BigInt(p.limits.max_gross)>BigInt(p.gross) ? "New risk enabled within immutable limits" : "New exposure disabled or exhausted"} · Gross ${exact(p.gross)} / ${exact(p.limits.max_gross)} NEAR`);
      } catch { if (active) setMessage("Release controls unavailable. Refresh before signing."); }
    };
    void read(); const timer = setInterval(() => void read(), 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <aside className="notice" aria-live="polite"><p>RC1 staging — {STAGING_CONFIGURED ? message : "fresh deployment account not configured"}</p><p>Unknown payouts remain quarantined. Never resend after an RPC timeout.</p></aside>;
}

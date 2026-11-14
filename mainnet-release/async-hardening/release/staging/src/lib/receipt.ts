import type { RpcOutcome } from "./rpc";
import type { ActionRequest } from "./wallet";
import { receiverFor } from "./wallet";
export const decodeJson = (encoded: string): unknown =>
  JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
    ),
  );
function canonical(v: unknown): string {
  const sorted = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(sorted)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.entries(x)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, sorted(v)]),
          )
        : x;
  return JSON.stringify(sorted(v));
}
export function verifyIntent(
  result: RpcOutcome,
  pending: { hash?: string; signer: string; request: ActionRequest },
) {
  const tx = result.transaction,
    call = tx?.actions?.[0]?.FunctionCall;
  if (
    tx?.hash !== pending.hash ||
    tx?.signer_id !== pending.signer ||
    tx?.receiver_id !== receiverFor(pending.request)
  )
    throw new Error(
      "Returned transaction identity does not match the reviewed signer and contract.",
    );
  if (
    tx.actions?.length !== 1 ||
    !call ||
    call.method_name !== pending.request.method ||
    call.deposit !== pending.request.deposit ||
    String(call.gas) !== pending.request.gas ||
    canonical(decodeJson(call.args)) !== canonical(pending.request.args)
  )
    throw new Error(
      "Transaction action does not match the reviewed method, arguments, gas and deposit. No success is assumed.",
    );
}

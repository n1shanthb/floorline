import type { DaoPolicy } from "./rpc";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function policiesEqual(actual: DaoPolicy, expected: DaoPolicy) {
  const normalize = (p: DaoPolicy) => ({
    ...p,
    roles: p.roles
      .map((r) => ({
        ...r,
        permissions: [...r.permissions].sort(),
        kind:
          typeof r.kind === "object" && Array.isArray(r.kind.Group)
            ? { ...r.kind, Group: [...r.kind.Group].sort() }
            : r.kind,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
  return (
    JSON.stringify(canonical(normalize(actual))) ===
    JSON.stringify(canonical(normalize(expected)))
  );
}

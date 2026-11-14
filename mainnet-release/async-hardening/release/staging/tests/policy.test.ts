import { describe, expect, it } from "vitest";
import { policiesEqual } from "../src/lib/policy";
import evidence from "../src/data/evidence.json";
describe("full DAO policy equality, not threshold-only claims", () => {
  it("ignores set ordering but checks every policy parameter", () => {
    const reordered = structuredClone(evidence.policy);
    reordered.roles.reverse();
    for (const r of reordered.roles) {
      r.permissions.reverse();
      if (typeof r.kind !== "string" && "Group" in r.kind)
        r.kind.Group.reverse();
    }
    expect(policiesEqual(reordered, evidence.policy)).toBe(true);
  });
  it("rejects changed quorum, permissions and per-role policies", () => {
    const quorum = structuredClone(evidence.policy);
    quorum.default_vote_policy.quorum = "3";
    expect(policiesEqual(quorum, evidence.policy)).toBe(false);
    const permission = structuredClone(evidence.policy);
    permission.roles[0].permissions.push("*:VoteApprove");
    expect(policiesEqual(permission, evidence.policy)).toBe(false);
    const override = structuredClone(evidence.policy);
    override.roles[1].vote_policy = {
      transfer: { weight_kind: "RoleWeight", threshold: "1" },
    };
    expect(policiesEqual(override, evidence.policy)).toBe(false);
  });
});

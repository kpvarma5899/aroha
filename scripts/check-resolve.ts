import { resolveOfficials } from "../lib/geo/resolve";
import type { CategoryId } from "../lib/types";

const pins: [string, number, number, CategoryId][] = [
  ["Charminar", 17.3616, 78.4747, "garbage"],
  ["Hitech City", 17.4483, 78.3811, "roads"],
  ["Khairatabad", 17.4116, 78.4603, "water"],
  ["Outside", 15.0, 78.0, "roads"],
];

async function main() {
  for (const [label, lat, lng, cat] of pins) {
    const result = await resolveOfficials(lat, lng, cat);
    console.log("\n==", label, result.inCoverage, result.message || "");
    console.log(
      "jurisdictions",
      result.jurisdictions.map((j) => `${j.type}:${j.name}`).join(" | "),
    );
    console.log("contacts", result.contacts.map((c) => `${c.role}:${c.name}`).join(" | "));
  }
}

main().finally(() => process.exit(0));

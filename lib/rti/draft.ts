import { getCategoryLabel } from "@/lib/categories";
import { rtiPolicy } from "@/lib/policy";

export function draftRti(input: {
  category: string;
  description: string;
  displayAddress: string;
  caseNumber: string;
  daysOpen: number;
  agencyName?: string;
}): { body: string; portals: typeof rtiPolicy.portals } {
  const authority =
    input.agencyName ||
    (input.category === "water" || input.category === "sewer"
      ? "Hyderabad Metropolitan Water Supply and Sewerage Board"
      : input.category === "electricity"
        ? "Southern Power Distribution Company of Telangana Limited"
        : "Greater Hyderabad Municipal Corporation");

  const body = `To
The Public Information Officer
${authority}

Subject: RTI application under the Right to Information Act, 2005 — civic case ${input.caseNumber}

Respected Sir/Madam,

Please provide the following information relating to ${getCategoryLabel(input.category)} at ${input.displayAddress}. This issue has been on the public record as Aroha case ${input.caseNumber} for ${input.daysOpen} days.

1. The name and designation of the officer currently responsible for inspecting and fixing this location.
2. Whether a complaint or work order exists for this location; if yes, the ticket/work-order number and date.
3. The contractor or departmental unit assigned, if any, and the promised date of completion.
4. Inspection notes or photographs on file.
5. Reasons for delay, if work has not been completed.

I am an Indian citizen. I request the information within the time prescribed under the Act. Please inform me of the fee payable, if any.

Details of the problem:
${input.description}

This draft does not name a PIO because a sourced PIO directory is not on file. File it on the Telangana RTI portal naming the public authority above.

Thank you.
`;

  return { body, portals: rtiPolicy.portals };
}

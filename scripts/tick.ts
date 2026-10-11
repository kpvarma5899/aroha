import { runDailyJobs } from "../lib/jobs/tick";

async function main() {
  const result = await runDailyJobs();
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

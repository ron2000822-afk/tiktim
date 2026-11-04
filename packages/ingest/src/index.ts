import "./load-env";
import { connectors, getConnector } from "./connectors/registry";
import { declassifyGenericImages, markPastEvents, runPipeline } from "./pipeline";

function parseArgs(argv: string[]) {
  const args: { source?: string; dryRun: boolean; limit?: number } = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--source=")) args.source = arg.slice("--source=".length);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length));
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = args.source ? [getConnector(args.source)].filter((c) => c !== undefined) : connectors;

  if (args.source && targets.length === 0) {
    console.error(`Unknown source: ${args.source}. Known sources: ${connectors.map((c) => c.slug).join(", ")}`);
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("No connectors registered yet.");
    return;
  }

  let hadFailure = false;

  for (const connector of targets) {
    try {
      const report = await runPipeline(connector, { dryRun: args.dryRun, limit: args.limit });
      console.log(`[${connector.slug}]`, JSON.stringify(report, null, 2));
    } catch (error) {
      // A connector-level failure (e.g. a missing API key, or its fetch()
      // throwing before yielding anything) must not stop other connectors
      // or markPastEvents from running in a scheduled, unattended job.
      hadFailure = true;
      console.error(`[${connector.slug}] failed:`, error);
    }
  }

  if (!args.dryRun) {
    const pastCount = await markPastEvents();
    console.log(`Marked ${pastCount} event(s) as past.`);
    const declassifiedCount = await declassifyGenericImages();
    console.log(`Cleared ${declassifiedCount} generic/shared event image(s).`);
  }

  if (hadFailure) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    // The shared postgres connection pool stays open (by design, for the
    // long-lived Next.js server) and would otherwise keep this one-shot
    // CLI process alive forever.
    process.exit(process.exitCode ?? 0);
  });

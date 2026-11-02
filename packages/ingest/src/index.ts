import "./load-env";
import { connectors, getConnector } from "./connectors/registry";
import { runPipeline } from "./pipeline";

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

  for (const connector of targets) {
    const report = await runPipeline(connector, { dryRun: args.dryRun, limit: args.limit });
    console.log(`[${connector.slug}]`, JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

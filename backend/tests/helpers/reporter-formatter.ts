export type ValidationStatus = "OPERATIONAL" | "DEGRADED" | "BROKEN" | "SKIPPED";

export interface FallbackAttempt {
  selector: string;
  passed: boolean;
  durationMs: number;
}

export interface LocatorValidationResult {
  locatorId: string;
  locatorName: string;
  status: ValidationStatus;
  workingSelector: string | null;
  primaryPassed: boolean;
  testedFallbacks: FallbackAttempt[];
  executionTimeMs: number;
  error?: string;
}

export interface ValidationRunSummary {
  suite: "auth" | "chat" | "channel" | "all";
  timestamp: string;
  totalLocators: number;
  operationalCount: number;
  degradedCount: number;
  brokenCount: number;
  skippedCount: number;
  results: LocatorValidationResult[];
}

/**
 * Formats and prints a structured diagnostic locator health summary to stdout.
 */
export function printDiagnosticReport(
  suiteName: "auth" | "chat" | "channel" | "all",
  results: LocatorValidationResult[],
  targetSessionPath = "backend/.whatsapp_session"
): ValidationRunSummary {
  const operationalCount = results.filter((r) => r.status === "OPERATIONAL").length;
  const degradedCount = results.filter((r) => r.status === "DEGRADED").length;
  const brokenCount = results.filter((r) => r.status === "BROKEN").length;
  const skippedCount = results.filter((r) => r.status === "SKIPPED").length;
  const total = results.length;

  const pad = (str: string, len: number) => (str.length > len ? str.slice(0, len - 3) + "..." : str.padEnd(len));

  console.log("\n" + "=".repeat(88));
  console.log("           WHATSAPP WEB LOCATOR HEALTH DIAGNOSTIC REPORT");
  console.log("=".repeat(88));
  console.log(`Timestamp:      ${new Date().toISOString()}`);
  console.log(`Suite:          ${suiteName}-locators`);
  console.log(`Target Session: ${targetSessionPath}\n`);

  console.log(
    `${pad("LOCATOR ID", 24)} ${pad("NAME", 28)} ${pad("STATUS", 14)} ${pad("ACTIVE SELECTOR", 20)}`
  );
  console.log("-".repeat(88));

  for (const r of results) {
    const statusLabel = `[${r.status}]`;

    const activeSel = r.workingSelector || "(none)";
    console.log(
      `${pad(r.locatorId, 24)} ${pad(r.locatorName, 28)} ${pad(statusLabel, 14)} ${activeSel}`
    );
  }

  console.log("-".repeat(88));
  console.log(
    `Summary: ${total} Total | ${operationalCount} Operational | ${degradedCount} Degraded (Fallback Active) | ${brokenCount} Broken | ${skippedCount} Skipped`
  );

  const functionalRate = total > 0 ? (((operationalCount + degradedCount) / (total - skippedCount || 1)) * 100).toFixed(1) : "100";
  const primaryRate = total > 0 ? ((operationalCount / (total - skippedCount || 1)) * 100).toFixed(1) : "100";

  console.log(`Health:  ${functionalRate}% Functional (${primaryRate}% via Primary Selectors)`);
  console.log("=".repeat(88) + "\n");

  return {
    suite: suiteName,
    timestamp: new Date().toISOString(),
    totalLocators: total,
    operationalCount,
    degradedCount,
    brokenCount,
    skippedCount,
    results,
  };
}

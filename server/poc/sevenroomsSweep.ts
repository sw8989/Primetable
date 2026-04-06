import { spawn } from "child_process";
import { listSevenRoomsFixtures } from "./sevenroomsFixtures";

type SweepOutcome = {
  error?: string;
  fixture: string;
  openedTimeSlot?: string | null;
  pageTitle?: string;
  primaryReason?: string;
  restaurantName: string;
  status: string;
  url: string;
  visibleTimes?: string[];
};

async function runFixture(fixture: string): Promise<SweepOutcome> {
  const restaurant = listSevenRoomsFixtures().find((entry) => entry.key === fixture)?.restaurant;
  if (!restaurant) {
    throw new Error(`Unknown fixture ${fixture}`);
  }

  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["tsx", "server/poc/sevenroomsPoc.ts", "--fixture", fixture, "--party-size", "2", "--no-ai"],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      const payload = stdout.trim();

      if (!payload) {
        resolve({
          error: stderr.trim() || "No JSON payload received from SevenRooms probe.",
          fixture,
          restaurantName: restaurant.name,
          status: "error",
          url: restaurant.bookingUrl,
        });
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        resolve({
          fixture,
          openedTimeSlot: parsed.openedTimeSlot,
          pageTitle: parsed.pageTitle,
          primaryReason: parsed.analysis?.primaryReason,
          restaurantName: parsed.restaurant?.name ?? restaurant.name,
          status: parsed.status ?? "unknown",
          url: parsed.restaurant?.bookingUrl ?? restaurant.bookingUrl,
          visibleTimes: parsed.analysis?.availableTimes ?? [],
        });
      } catch (error) {
        resolve({
          error: stderr.trim() || (error instanceof Error ? error.message : String(error)),
          fixture,
          restaurantName: restaurant.name,
          status: "error",
          url: restaurant.bookingUrl,
        });
      }
    });
  });
}

async function main(): Promise<void> {
  const fixtures = listSevenRoomsFixtures();
  const results: SweepOutcome[] = [];

  for (const fixture of fixtures) {
    results.push(await runFixture(fixture.key));
  }

  const summary = results.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(
    JSON.stringify(
      {
        fixtureCount: fixtures.length,
        results,
        summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

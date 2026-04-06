import fs from "fs/promises";
import path from "path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import OpenAI from "openai";
import {
  analyzeSevenRoomsSnapshot,
  type SevenRoomsControl,
  type SevenRoomsField,
  type SevenRoomsSnapshot,
  type SevenRoomsStatus,
} from "./sevenroomsProbe";
import { getSevenRoomsFixture, type SevenRoomsRestaurantFixture } from "./sevenroomsFixtures";

type Args = {
  date?: string;
  email?: string;
  fillForm: boolean;
  fixture?: string;
  headless: boolean;
  name?: string;
  outputDir: string;
  partySize: number;
  phone?: string;
  time?: string;
  url: string;
  useAi: boolean;
};

type ArtifactSet = {
  finalHtmlPath: string;
  finalScreenshotPath: string;
  initialScreenshotPath: string;
};

type AiAssessment = {
  model: string;
  raw: string;
  status: SevenRoomsStatus;
};

const DEFAULT_OUTPUT_DIR = path.resolve("output", "playwright", "sevenrooms");

function parseArgs(argv: string[]): Args {
  const values: Partial<Args> = {
    fillForm: false,
    headless: true,
    outputDir: DEFAULT_OUTPUT_DIR,
    partySize: 2,
    useAi: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];

    switch (key) {
      case "url":
        values.url = nextValue;
        index += 1;
        break;
      case "fixture":
        values.fixture = nextValue;
        index += 1;
        break;
      case "date":
        values.date = nextValue;
        index += 1;
        break;
      case "time":
        values.time = nextValue;
        index += 1;
        break;
      case "party-size":
        values.partySize = Number.parseInt(nextValue, 10);
        index += 1;
        break;
      case "name":
        values.name = nextValue;
        index += 1;
        break;
      case "email":
        values.email = nextValue;
        index += 1;
        break;
      case "phone":
        values.phone = nextValue;
        index += 1;
        break;
      case "output-dir":
        values.outputDir = path.resolve(nextValue);
        index += 1;
        break;
      case "fill-form":
        values.fillForm = true;
        break;
      case "headed":
        values.headless = false;
        break;
      case "no-ai":
        values.useAi = false;
        break;
      default:
        throw new Error(`Unknown argument: --${key}`);
    }
  }

  if (!values.url && !values.fixture) {
    throw new Error("Missing required argument: --url or --fixture");
  }

  if (!values.partySize || Number.isNaN(values.partySize) || values.partySize < 1) {
    throw new Error("Invalid --party-size value");
  }

  return values as Args;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function ensureSearchDrawerOpen(page: Page): Promise<void> {
  await page.waitForSelector("button", { timeout: 20_000 });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const state = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({
        ariaLabel: button.getAttribute("aria-label"),
        text: (button.textContent ?? "").replace(/\s+/g, " ").trim(),
      }));
      const texts = buttons.map((button) => button.text);

      return {
        hasExpandedSearch:
          texts.some((text) => text.startsWith("Guests")) &&
          texts.some((text) => text.startsWith("Date")) &&
          texts.some((text) => text.startsWith("Time")),
        hasSearchDrawerTrigger: buttons.some(
          (button) => button.ariaLabel === "Search for a Reservation",
        ),
      };
    });

    if (state.hasExpandedSearch) {
      return;
    }

    if (state.hasSearchDrawerTrigger) {
      const openButton = await page.$('button[aria-label="Search for a Reservation"]');
      if (openButton) {
        await openButton.click();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("SevenRooms search drawer trigger did not expose the search controls.");
}

async function selectGuests(page: Page, partySize: number): Promise<void> {
  const expectedLabel = partySize === 1 ? "1 Guest" : `${partySize} Guests`;

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      (candidate.textContent ?? "").replace(/\s+/g, " ").trim().startsWith("Guests"),
    );
    button?.click();
  });

  await page.waitForFunction(
    (label) =>
      Array.from(document.querySelectorAll('li[role="option"]')).some(
        (option) => option.textContent?.replace(/\s+/g, " ").trim() === label,
      ),
    {},
    expectedLabel,
  );

  await page.evaluate((label) => {
    const option = Array.from(document.querySelectorAll('li[role="option"]')).find(
      (candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() === label,
    );

    if (!(option instanceof HTMLElement)) {
      throw new Error(`Guest option not found: ${label}`);
    }

    option.click();
  }, expectedLabel);
}

async function selectDate(page: Page, date: Date): Promise<void> {
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      (candidate.textContent ?? "").replace(/\s+/g, " ").trim().startsWith("Date"),
    );
    button?.click();
  });

  await page.waitForSelector("button[aria-label='Go to next month']", { timeout: 15_000 });

  const targetMonth = formatMonthLabel(date);
  const targetDay = formatDay(date);

  for (let attempts = 0; attempts < 18; attempts += 1) {
    const currentMonth = await page.$eval(".rdp-caption_label", (element) =>
      element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    );

    if (currentMonth === targetMonth) {
      break;
    }

    const nextButton =
      currentMonth.localeCompare(targetMonth, "en-GB") < 0
        ? await page.$("button[aria-label='Go to next month']")
        : await page.$("button[aria-label='Go to previous month']");

    if (!nextButton) {
      throw new Error(`Could not navigate calendar toward ${targetMonth}`);
    }

    await nextButton.click();
    await page.waitForFunction(
      (monthText) =>
        (document.querySelector(".rdp-caption_label")?.textContent ?? "").replace(/\s+/g, " ").trim() !== monthText,
      {},
      currentMonth,
    );
  }

  const clicked = await page.evaluate((dayText) => {
    const dayButtons = Array.from(document.querySelectorAll('button[role="gridcell"]'));
    const match = dayButtons.find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim();
      const className = button.getAttribute("class") ?? "";
      return (
        text === dayText &&
        !className.includes("rdp-day_outside") &&
        !className.includes("rdp-day_disabled")
      );
    });

    if (!(match instanceof HTMLElement)) {
      return false;
    }

    match.click();
    return true;
  }, targetDay);

  if (!clicked) {
    throw new Error(`Could not select date ${date.toISOString().slice(0, 10)}`);
  }
}

async function selectTime(page: Page, time: string): Promise<void> {
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      (candidate.textContent ?? "").replace(/\s+/g, " ").trim().startsWith("Time"),
    );
    button?.click();
  });

  await page.waitForFunction(
    (targetTime) =>
      Array.from(document.querySelectorAll('li[role="option"]')).some(
        (option) => option.textContent?.replace(/\s+/g, " ").trim() === targetTime,
      ),
    {},
    time,
  );

  await page.evaluate((targetTime) => {
    const option = Array.from(document.querySelectorAll('li[role="option"]')).find(
      (candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() === targetTime,
    );

    if (!(option instanceof HTMLElement)) {
      throw new Error(`Time option not found: ${targetTime}`);
    }

    option.click();
  }, time);
}

async function submitSearch(page: Page): Promise<void> {
  const searchButton = await page.$('button[aria-label="Search"]');
  if (searchButton) {
    await searchButton.click();
  }

  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

async function captureSnapshot(page: Page): Promise<SevenRoomsSnapshot> {
  return page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll("button, a, li, input, textarea"))
      .map((element) => ({
        ariaLabel: element.getAttribute("aria-label"),
        className: element.getAttribute("class") ?? "",
        dataTest: element.getAttribute("data-test"),
        role: element.getAttribute("role"),
        tagName: element.tagName,
        text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
      }))
      .filter((control) => control.text || control.ariaLabel || control.dataTest);

    const fields = Array.from(document.querySelectorAll("input, textarea, select")).map((field) => ({
      name: field.getAttribute("name"),
      placeholder: field.getAttribute("placeholder"),
      type: field.getAttribute("type"),
    }));

    return {
      bodyText: (document.body.innerText ?? "").replace(/\s+/g, " ").trim(),
      controls,
      currentUrl: window.location.href,
      fields,
      pageTitle: document.title,
    };
  });
}

async function writeArtifacts(
  page: Page,
  outputDir: string,
  prefix: string,
): Promise<ArtifactSet> {
  await fs.mkdir(outputDir, { recursive: true });

  const initialScreenshotPath = path.join(outputDir, `${prefix}-initial.png`);
  const finalScreenshotPath = path.join(outputDir, `${prefix}-final.png`);
  const finalHtmlPath = path.join(outputDir, `${prefix}-final.html`);

  await page.screenshot({ fullPage: true, path: initialScreenshotPath });
  await fs.writeFile(finalHtmlPath, await page.content(), "utf8");
  await page.screenshot({ fullPage: true, path: finalScreenshotPath });

  return {
    finalHtmlPath,
    finalScreenshotPath,
    initialScreenshotPath,
  };
}

async function clickVisibleTimeSlot(
  page: Page,
  controls: SevenRoomsControl[],
  targetTime?: string,
): Promise<string | null> {
  const candidates = controls
    .map((control) => control.text)
    .filter((text) => /^\d{1,2}:\d{2}$/.test(text));
  const selectedTime = targetTime && candidates.includes(targetTime) ? targetTime : candidates[0] ?? null;

  if (!selectedTime) {
    return null;
  }

  const clicked = await page.evaluate((timeValue) => {
    const element = Array.from(document.querySelectorAll("button, a")).find(
      (candidate) => candidate.textContent?.replace(/\s+/g, " ").trim() === timeValue,
    );

    if (!(element instanceof HTMLElement)) {
      return false;
    }

    element.click();
    return true;
  }, selectedTime);

  if (!clicked) {
    return null;
  }

  await new Promise((resolve) => setTimeout(resolve, 3_000));
  return selectedTime;
}

async function maybeFillReservationForm(page: Page, args: Args): Promise<SevenRoomsField[]> {
  if (!args.fillForm) {
    return [];
  }

  const fieldValues: Array<{ matchers: string[]; value?: string }> = [
    { matchers: ["email"], value: args.email },
    { matchers: ["first name", "firstname", "first_name"], value: args.name?.split(" ")[0] },
    {
      matchers: ["last name", "lastname", "last_name"],
      value: args.name?.split(" ").slice(1).join(" ") || args.name,
    },
    { matchers: ["phone", "mobile"], value: args.phone },
  ];

  for (const { matchers, value } of fieldValues) {
    if (!value) {
      continue;
    }

    const selector = await page.evaluate((terms) => {
      const candidates = Array.from(document.querySelectorAll("input, textarea"));
      const match = candidates.find((candidate) => {
        const haystack = [
          candidate.getAttribute("name"),
          candidate.getAttribute("placeholder"),
          candidate.getAttribute("aria-label"),
          candidate.getAttribute("type"),
        ]
          .join(" ")
          .toLowerCase();

        return terms.some((term) => haystack.includes(term));
      });

      if (!(match instanceof HTMLInputElement || match instanceof HTMLTextAreaElement)) {
        return null;
      }

      const id = match.getAttribute("id");
      if (id) {
        return `#${CSS.escape(id)}`;
      }

      const name = match.getAttribute("name");
      if (name) {
        return `${match.tagName.toLowerCase()}[name="${name}"]`;
      }

      return null;
    }, matchers);

    if (!selector) {
      continue;
    }

    await page.locator(selector).fill(value);
  }

  const snapshot = await captureSnapshot(page);
  return snapshot.fields;
}

async function maybeClassifyWithAi(
  snapshot: SevenRoomsSnapshot,
  status: SevenRoomsStatus,
  reasons: string[],
): Promise<AiAssessment | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const controlSummary = snapshot.controls
    .slice(0, 25)
    .map((control) => ({
      ariaLabel: control.ariaLabel,
      dataTest: control.dataTest,
      role: control.role,
      tagName: control.tagName,
      text: control.text,
    }));

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You classify SevenRooms reservation widget states. Return exactly one word from this list: available, unavailable, manual_review.",
      },
      {
        role: "user",
        content: JSON.stringify({
          currentStatus: status,
          reasons,
          controls: controlSummary,
          fields: snapshot.fields,
          url: snapshot.currentUrl,
        }),
      },
    ],
    max_tokens: 10,
  });

  const raw = normalizeText(completion.choices[0]?.message?.content);
  const normalized =
    raw === "available" || raw === "unavailable" || raw === "manual_review" ? raw : status;

  return {
    model,
    raw,
    status: normalized,
  };
}

function resolveRestaurantInput(args: Args): {
  restaurant: SevenRoomsRestaurantFixture | null;
  url: string;
} {
  if (args.fixture) {
    const restaurant = getSevenRoomsFixture(args.fixture);
    return {
      restaurant,
      url: restaurant.bookingUrl,
    };
  }

  if (!args.url) {
    throw new Error("A SevenRooms URL could not be resolved.");
  }

  return {
    restaurant: null,
    url: args.url,
  };
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resolvedInput = resolveRestaurantInput(args);
  const browser: Browser = await puppeteer.launch({
    headless: args.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const steps: string[] = [];
  let currentStep = "initializing browser";

  try {
    try {
      currentStep = "setting viewport";
      await page.setViewport({ width: 1440, height: 1400 });

      currentStep = `loading ${resolvedInput.url}`;
      await page.goto(resolvedInput.url, { waitUntil: "networkidle2", timeout: 60_000 });
      steps.push(`Loaded ${resolvedInput.url}`);

      currentStep = "opening SevenRooms search drawer";
      await ensureSearchDrawerOpen(page);
      steps.push("Opened SevenRooms search drawer");

      currentStep = `selecting party size ${args.partySize}`;
      await selectGuests(page, args.partySize);
      steps.push(`Selected party size ${args.partySize}`);

      if (args.date) {
        const parsedDate = new Date(`${args.date}T12:00:00Z`);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date argument: ${args.date}`);
        }

        currentStep = `selecting date ${args.date}`;
        await selectDate(page, parsedDate);
        steps.push(`Selected date ${args.date}`);
      }

      if (args.time) {
        currentStep = `selecting time ${args.time}`;
        await selectTime(page, args.time);
        steps.push(`Selected time ${args.time}`);
      }

      currentStep = "submitting SevenRooms search";
      await submitSearch(page);
      steps.push("Submitted SevenRooms search");

      currentStep = "capturing initial SevenRooms snapshot";
      const initialSnapshot = await captureSnapshot(page);
      const initialAnalysis = analyzeSevenRoomsSnapshot(initialSnapshot, args.time);

      let clickedTime: string | null = null;
      let formFields: SevenRoomsField[] = [];

      if (initialAnalysis.status === "available") {
        currentStep = "opening a visible reservation slot";
        clickedTime = await clickVisibleTimeSlot(page, initialSnapshot.controls, args.time);

        if (clickedTime) {
          steps.push(`Opened visible slot ${clickedTime}`);
          currentStep = "filling the reservation form without submitting";
          formFields = await maybeFillReservationForm(page, args);
          if (formFields.length > 0) {
            steps.push("Filled any matching reservation form fields without submitting");
          }
        }
      }

      currentStep = "capturing final SevenRooms snapshot";
      const finalSnapshot = await captureSnapshot(page);
      const finalAnalysis = analyzeSevenRoomsSnapshot(finalSnapshot, args.time);

      currentStep = "running optional AI classification";
      const aiAssessment = args.useAi
        ? await maybeClassifyWithAi(finalSnapshot, finalAnalysis.status, finalAnalysis.reasons)
        : null;

      currentStep = "writing artifacts";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const artifacts = await writeArtifacts(page, args.outputDir, timestamp);

      const result = {
        ai: aiAssessment,
        analysis: finalAnalysis,
        artifacts,
        currentUrl: finalSnapshot.currentUrl,
        date: args.date,
        fieldsDetected: finalSnapshot.fields,
        fillForm: args.fillForm,
        fixture: args.fixture ?? null,
        openedTimeSlot: clickedTime,
        pageTitle: finalSnapshot.pageTitle,
        partySize: args.partySize,
        requestedTime: args.time,
        restaurant: resolvedInput.restaurant,
        status: aiAssessment?.status ?? finalAnalysis.status,
        steps,
        usedHeuristicStatus: finalAnalysis.status,
      };

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${currentStep}: ${message}`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
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

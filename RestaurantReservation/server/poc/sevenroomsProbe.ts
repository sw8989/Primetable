export interface SevenRoomsControl {
  ariaLabel: string | null;
  className: string;
  dataTest: string | null;
  role: string | null;
  tagName: string;
  text: string;
}

export interface SevenRoomsField {
  name: string | null;
  placeholder: string | null;
  type: string | null;
}

export interface SevenRoomsSnapshot {
  bodyText: string;
  controls: SevenRoomsControl[];
  currentUrl: string;
  fields: SevenRoomsField[];
  pageTitle: string;
}

export type SevenRoomsStatus = "available" | "manual_review" | "unavailable";

export interface SevenRoomsAnalysis {
  availableTimes: string[];
  formFieldCount: number;
  primaryReason: string;
  reasons: string[];
  status: SevenRoomsStatus;
  targetTimeAvailable: boolean;
}

const TIME_PATTERN = /\b\d{1,2}:\d{2}\b/g;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right, "en-GB", { numeric: true }),
  );
}

export function extractTimesFromText(value: string): string[] {
  return uniqueSorted(Array.from(value.match(TIME_PATTERN) ?? []));
}

export function analyzeSevenRoomsSnapshot(
  snapshot: SevenRoomsSnapshot,
  targetTime?: string,
): SevenRoomsAnalysis {
  const controls = snapshot.controls.map((control) => ({
    ...control,
    ariaLabel: normalizeText(control.ariaLabel),
    className: normalizeText(control.className),
    dataTest: normalizeText(control.dataTest),
    role: normalizeText(control.role),
    text: normalizeText(control.text),
  }));

  const bodyText = normalizeText(snapshot.bodyText);
  const allText = controls
    .flatMap((control) => [control.text, control.ariaLabel])
    .concat(bodyText)
    .filter(Boolean)
    .join(" ");

  const availableTimes = uniqueSorted(
    controls
      .flatMap((control) => extractTimesFromText(control.text))
      .filter((time) => !time.includes("23:59")),
  );
  const targetTimeAvailable = targetTime ? availableTimes.includes(targetTime) : false;

  const hasAlertMe = controls.some(
    (control) =>
      control.dataTest === "alert-me-button" ||
      control.text.toLowerCase() === "alert me",
  );
  const hasWaitlist = /join waitlist|notify me|waitlist/i.test(allText);
  const hasBookableSlot = availableTimes.length > 0;
  const hasFormFields = snapshot.fields.length >= 2;
  const hasSearchControls = controls.some(
    (control) =>
      control.ariaLabel === "Search" ||
      control.ariaLabel === "Search for a Reservation" ||
      control.dataTest === "search-pill-mobile-search",
  );

  if (hasFormFields) {
    return {
      availableTimes,
      formFieldCount: snapshot.fields.length,
      primaryReason: "Reservation form fields were detected after slot selection.",
      reasons: ["Form fields suggest the flow reached the reservation details step."],
      status: "available",
      targetTimeAvailable: true,
    };
  }

  if (hasBookableSlot) {
    return {
      availableTimes,
      formFieldCount: snapshot.fields.length,
      primaryReason: targetTimeAvailable
        ? `Found the requested slot at ${targetTime}.`
        : "Found one or more visible reservation time slots.",
      reasons: [
        `Visible time slots: ${availableTimes.join(", ")}`,
        ...(targetTime && !targetTimeAvailable
          ? [`Requested time ${targetTime} was not present in the visible slots.`]
          : []),
      ],
      status: "available",
      targetTimeAvailable,
    };
  }

  if (hasAlertMe || hasWaitlist) {
    return {
      availableTimes,
      formFieldCount: snapshot.fields.length,
      primaryReason: hasAlertMe
        ? "The page offered an Alert Me state instead of reservation times."
        : "The page exposed a waitlist/notify state instead of reservation times.",
      reasons: [
        hasAlertMe ? "Alert Me button detected." : "Waitlist/notify language detected.",
        hasSearchControls ? "Search controls are still present, so the widget remained interactive." : "",
      ].filter(Boolean),
      status: "unavailable",
      targetTimeAvailable: false,
    };
  }

  return {
    availableTimes,
    formFieldCount: snapshot.fields.length,
    primaryReason: "The widget rendered, but the page state did not clearly indicate bookable slots or a waitlist state.",
    reasons: [
      hasSearchControls
        ? "Search controls are present but no reservation state was identified."
        : "No recognizable SevenRooms search controls were found in the current state.",
    ],
    status: "manual_review",
    targetTimeAvailable: false,
  };
}

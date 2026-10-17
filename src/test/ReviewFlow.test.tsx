import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewFlow } from "@/components/review/ReviewFlow";
import type { PublicBusiness } from "@/types/business";

const GOOGLE_URL = "https://g.page/r/test-business/review";

const business: PublicBusiness = {
  name: "Test Studio",
  slug: "test-studio",
  category: "whatever-business-I-want",
  logo: "/brand/logo.svg",
  googleReviewUrl: GOOGLE_URL,
  positiveCategories: ["Service", "Staff", "Result"],
  negativeCategories: ["Service", "Waiting Time"],
  offerGoogleReviewAfterPrivateFeedback: false,
};

type Handler = (body: Record<string, unknown>) => { status?: number; json: unknown };
let generateHandler: Handler;
const fetchMock = vi.fn();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function callsTo(path: string) {
  return fetchMock.mock.calls
    .filter(([url]) => url === path)
    .map(([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>);
}

beforeEach(() => {
  sessionStorage.clear();
  let n = 0;
  generateHandler = () => ({ json: { review: `Draft ${++n}: friendly staff and great service.`, remaining: 5 - n } });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    if (url === "/api/session") return json(200, body.action === "start" ? { sessionId: "s-1", resumed: false } : { ok: true });
    if (url === "/api/generate-review") {
      const r = generateHandler(body);
      return json(r.status ?? 200, r.json);
    }
    return json(200, { ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);
});

function setup() {
  const user = userEvent.setup();
  render(<ReviewFlow business={business} />);
  return user;
}

describe("rating selection", () => {
  it("shows five accessible star buttons and starts a session", async () => {
    setup();
    expect(screen.getByRole("heading", { name: "How was your experience?" })).toBeInTheDocument();
    for (const label of ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    await waitFor(() => expect(callsTo("/api/session")[0]).toMatchObject({ action: "start", slug: "test-studio" }));
  });

  it("tracks the selected rating", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "4 stars" }));
    await waitFor(() => expect(callsTo("/api/session")).toContainEqual(expect.objectContaining({ action: "rating", rating: 4 })));
  });
});

describe("positive flow (4–5 stars)", () => {
  it("goes from categories to review to Google", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "5 stars" }));
    expect(screen.getByRole("heading", { name: "What did you like?" })).toBeInTheDocument();

    const create = screen.getByRole("button", { name: /pick at least one/i });
    expect(create).toBeDisabled();

    // Category selection toggles on and off.
    const staff = screen.getByRole("button", { name: "Staff" });
    await user.click(staff);
    expect(staff).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Service" }));
    await user.click(screen.getByRole("button", { name: "Service" }));
    expect(screen.getByRole("button", { name: "Service" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Create my review" }));
    expect(await screen.findByRole("heading", { name: "Here’s your review" })).toBeInTheDocument();
    expect(screen.getByText(/Draft 1/)).toBeInTheDocument();
    expect(callsTo("/api/generate-review")[0]).toMatchObject({ rating: 5, categories: ["Staff"], customerInput: "" });

    await user.click(screen.getByRole("button", { name: "Looks Good" }));
    expect(await screen.findByRole("heading", { name: "Ready to share your experience?" })).toBeInTheDocument();
    expect(callsTo("/api/review")).toContainEqual(expect.objectContaining({ action: "approve" }));

    const google = screen.getByRole("link", { name: /post on google/i });
    expect(google).toHaveAttribute("href", GOOGLE_URL);
    expect(google).toHaveAttribute("target", "_blank");
    expect(google).toHaveAttribute("rel", expect.stringContaining("noopener"));

    await user.click(google);
    await waitFor(() => expect(callsTo("/api/review")).toContainEqual(expect.objectContaining({ action: "google_click" })));
    // The review is copied so the customer can paste it on Google.
    await waitFor(async () => expect(await navigator.clipboard.readText()).toContain("Draft 1"));
    // We never claim the review was posted.
    expect(screen.queryByText(/review (was )?posted/i)).not.toBeInTheDocument();
  });

  it("sends optional customer text", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "4 stars" }));
    await user.click(screen.getByRole("button", { name: "Result" }));
    await user.click(screen.getByRole("button", { name: /want to add something/i }));
    await user.type(screen.getByLabelText(/want to add something/i), "Loved the new look");
    await user.click(screen.getByRole("button", { name: "Create my review" }));
    await screen.findByRole("heading", { name: "Here’s your review" });
    expect(callsTo("/api/generate-review")[0]).toMatchObject({ customerInput: "Loved the new look" });
  });

  it("edits the review (save and cancel)", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: "Staff" }));
    await user.click(screen.getByRole("button", { name: "Create my review" }));
    await screen.findByRole("heading", { name: "Here’s your review" });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByRole("textbox", { name: "Your review" });
    await user.clear(box);
    await user.type(box, "Throwaway text");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/Draft 1/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByRole("textbox", { name: "Your review" }));
    await user.type(screen.getByRole("textbox", { name: "Your review" }), "Staff were lovely.");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Staff were lovely.")).toBeInTheDocument();
    await waitFor(() =>
      expect(callsTo("/api/review")).toContainEqual(expect.objectContaining({ action: "edit", review: "Staff were lovely." })),
    );
  });

  it("regenerates with the same inputs and respects the limit", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: "Staff" }));
    await user.click(screen.getByRole("button", { name: "Create my review" }));
    await screen.findByText(/Draft 1/);

    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText(/Draft 2/)).toBeInTheDocument();
    const [first, second] = callsTo("/api/generate-review");
    expect(second).toEqual(first);

    generateHandler = () => ({ status: 429, json: { error: "limit", code: "limit_reached" } });
    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText(/used all the new versions/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft 2/)).toBeInTheDocument(); // the existing review is kept
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
  });

  it("keeps the customer's choices when AI fails and retries", async () => {
    generateHandler = () => ({ status: 502, json: { error: "x", code: "ai_failed" } });
    const user = setup();
    await user.click(screen.getByRole("button", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: "Service" }));
    await user.click(screen.getByRole("button", { name: "Create my review" }));
    expect(await screen.findByText("We couldn't create your review right now.")).toBeInTheDocument();

    generateHandler = () => ({ json: { review: "Great service.", remaining: 3 } });
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByText("Great service.")).toBeInTheDocument();
    const calls = callsTo("/api/generate-review");
    expect(calls[1]).toMatchObject({ rating: 5, categories: ["Service"] });
  });
});

describe("private feedback flow (1–3 stars)", () => {
  it("never shows a Google button and submits privately", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "2 stars" }));
    expect(screen.getByRole("heading", { name: /sorry your experience/i })).toBeInTheDocument();
    expect(screen.getByText("What could have been better?")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /google/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Waiting Time" }));
    await user.type(
      screen.getByPlaceholderText("Your feedback helps us understand what we can improve."),
      "Waited a long time.",
    );
    await user.click(screen.getByRole("button", { name: "Send Feedback" }));

    expect(await screen.findByRole("heading", { name: "Thank you for your feedback." })).toBeInTheDocument();
    expect(screen.getByText("Your feedback has been shared with the business.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /google/i })).not.toBeInTheDocument();
    expect(callsTo("/api/feedback")[0]).toMatchObject({
      rating: 2,
      categories: ["Waiting Time"],
      feedback: "Waited a long time.",
    });
  });

  it("requires feedback text", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "1 star" }));
    await user.click(screen.getByRole("button", { name: "Send Feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please tell us a little about what happened.");
    expect(callsTo("/api/feedback")).toHaveLength(0);
  });

  it("keeps the text and shows an error if sending fails", async () => {
    const user = setup();
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      if (url === "/api/session") return json(200, body.action === "start" ? { sessionId: "s-1" } : { ok: true });
      return json(500, { error: "Something went wrong. Please try again.", code: "server_error" });
    });
    await user.click(screen.getByRole("button", { name: "3 stars" }));
    const box = screen.getByRole("textbox", { name: "Tell us what happened" });
    await user.type(box, "Table was dirty.");
    await user.click(screen.getByRole("button", { name: "Send Feedback" }));
    const form = box.closest("form")!;
    expect(await within(form).findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(box).toHaveValue("Table was dirty.");
  });
});

describe("copy icon on the share screen", () => {
  async function reachShareScreen(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: "Staff" }));
    await user.click(screen.getByRole("button", { name: "Create my review" }));
    await screen.findByText(/Draft 1/);
    await user.click(screen.getByRole("button", { name: "Looks Good" }));
    await screen.findByRole("heading", { name: "Ready to share your experience?" });
  }

  it("copies the review without opening Google or tracking a click", async () => {
    const user = setup();
    await reachShareScreen(user);
    await user.click(screen.getByRole("button", { name: "Copy review" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain("Draft 1");
    expect(callsTo("/api/review")).not.toContainEqual(expect.objectContaining({ action: "google_click" }));
  });

  it("still lets Post on Google copy and track after using the icon", async () => {
    const user = setup();
    await reachShareScreen(user);
    await user.click(screen.getByRole("button", { name: "Copy review" }));
    const google = screen.getByRole("link", { name: /post on google/i });
    expect(google).toHaveAttribute("href", GOOGLE_URL);
    await user.click(google);
    await waitFor(() =>
      expect(callsTo("/api/review").filter((c) => c.action === "google_click")).toHaveLength(1),
    );
    expect(await navigator.clipboard.readText()).toContain("Draft 1");
  });

  it("copies the edited version of the review", async () => {
    const user = setup();
    await reachShareScreen(user);
    await user.click(screen.getByRole("button", { name: "Edit my review" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByRole("textbox", { name: "Your review" });
    await user.clear(box);
    await user.type(box, "Lovely staff, will tell friends.");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Looks Good" }));
    await screen.findByRole("heading", { name: "Ready to share your experience?" });
    await user.click(screen.getByRole("button", { name: "Copy review" }));
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe("Lovely staff, will tell friends."));
  });
});

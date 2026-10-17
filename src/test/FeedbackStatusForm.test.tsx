import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The real server action needs Supabase; a stub that "saves" is enough here.
vi.mock("@/app/admin/actions", () => ({
  updateFeedback: vi.fn(async () => ({ success: "Saved." })),
}));

const { FeedbackStatusForm } = await import("@/components/admin/FeedbackStatusForm");

describe("FeedbackStatusForm", () => {
  it("keeps the saved status and notes selected after saving", async () => {
    const user = userEvent.setup();
    render(<FeedbackStatusForm id="4f6c2a8e-1b3d-4c5e-9f7a-0b1c2d3e4f5a" status="in_progress" notes={null} />);

    await user.selectOptions(screen.getByLabelText("Status"), "resolved");
    await user.type(screen.getByLabelText(/internal notes/i), "Called the customer.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveValue("resolved"));
    expect(screen.getByLabelText(/internal notes/i)).toHaveValue("Called the customer.");
  });
});

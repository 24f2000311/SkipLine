import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ForgotPasswordPage from "../app/(auth)/forgot-password/page";
import VerifyEmailPage from "../app/(auth)/verify-email/page";
import { authApi } from "../lib/api/auth";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: (key: string) => (key === "token" ? "test-token-123" : null),
  })),
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/verify-email",
}));

describe("Frontend Auth Flow Pages Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ForgotPasswordPage submits email and displays confirmation message", async () => {
    const forgotSpy = vi.spyOn(authApi, "forgotPassword").mockResolvedValueOnce({
      data: { success: true, message: "If an account exists, email sent" },
    } as any);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitBtn = screen.getByRole("button", { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: "organizer@example.com" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(forgotSpy).toHaveBeenCalledWith("organizer@example.com");
      expect(screen.getByText(/check your inbox/i)).toBeTruthy();
      expect(screen.getByText(/organizer@example.com/i)).toBeTruthy();
    });
  });

  it("VerifyEmailPage triggers verification on mount with token and displays success state", async () => {
    const verifySpy = vi.spyOn(authApi, "verifyEmail").mockResolvedValueOnce({
      data: { success: true, message: "Email verified successfully" },
    } as any);

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith("test-token-123");
      expect(screen.getByText(/your email is verified\./i)).toBeTruthy();
      expect(screen.getByText(/your skipline organizer account is ready\./i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /open dashboard/i })).toBeTruthy();
    });
  });

  it("VerifyEmailPage displays expired state on expired token error with resend form", async () => {
    vi.spyOn(authApi, "verifyEmail").mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: "EXPIRED_VERIFICATION_TOKEN",
            message: "Verification token has expired. Please request a new verification email.",
          },
        },
      },
    } as any);

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/this verification link has expired\./i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /send a new verification email/i })).toBeTruthy();
    });
  });

  it("VerifyEmailPage displays invalid state on invalid token error with resend form", async () => {
    vi.spyOn(authApi, "verifyEmail").mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: "INVALID_VERIFICATION_TOKEN",
            message: "Invalid or already used verification token",
          },
        },
      },
    } as any);

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/this verification link is invalid or no longer available\./i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /request a new verification email/i })).toBeTruthy();
    });
  });
});

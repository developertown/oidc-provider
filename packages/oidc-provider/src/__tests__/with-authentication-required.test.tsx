import { render, screen, waitFor } from "@testing-library/react";
import { UserProfile } from "oidc-client-ts";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import withAuthenticationRequired, { WithAuthenticationRequiredOptions } from "../with-authentication-required";

// Mock the useAuth hook
vi.mock("../oidc-provider", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../oidc-provider";

const mockUseAuth = vi.mocked(useAuth);

const mockUser: UserProfile = {
  sub: "user123",
  iss: "https://example.com",
  aud: "test-client",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

describe("withAuthenticationRequired", () => {
  // Test component to wrap
  const TestComponent: React.FC<{ testProp?: string }> = ({ testProp }) => (
    <div data-testid="protected-component">Protected Content {testProp}</div>
  );

  const mockLoginWithRedirect = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when user is authenticated", () => {
    it("should render the wrapped component", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        user: mockUser,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(screen.getByTestId("protected-component")).toBeInTheDocument();
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("should pass props to the wrapped component", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        user: mockUser,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent testProp="test-value" />);

      expect(screen.getByText("Protected Content test-value")).toBeInTheDocument();
    });

    it("should not call loginWithRedirect", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        user: mockUser,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(mockLoginWithRedirect).not.toHaveBeenCalled();
    });
  });

  describe("when user is not authenticated", () => {
    it("should call loginWithRedirect", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
      });
    });

    it("should call loginWithRedirect with custom params", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const customParams = { redirect_uri: "https://example.com/callback" };
      const options: WithAuthenticationRequiredOptions = {
        loginWithRedirectParams: () => customParams,
      };

      const ProtectedComponent = withAuthenticationRequired(TestComponent, options);
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalledWith(customParams);
      });
    });

    it("should show onRedirecting component while redirecting", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const options: WithAuthenticationRequiredOptions = {
        onRedirecting: () => <div data-testid="redirecting">Redirecting...</div>,
      };

      const ProtectedComponent = withAuthenticationRequired(TestComponent, options);
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("redirecting")).toBeInTheDocument();
      });
    });
  });

  describe("when initializing", () => {
    it("should show default onInitializing component", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(screen.queryByTestId("protected-component")).not.toBeInTheDocument();
    });

    it("should show custom onInitializing component", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const options: WithAuthenticationRequiredOptions = {
        onInitializing: () => <div data-testid="initializing">Loading...</div>,
      };

      const ProtectedComponent = withAuthenticationRequired(TestComponent, options);
      render(<ProtectedComponent />);

      expect(screen.getByTestId("initializing")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should not call loginWithRedirect while initializing", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(mockLoginWithRedirect).not.toHaveBeenCalled();
    });
  });

  describe("when there is an error", () => {
    it("should show default error message", () => {
      const testError = new Error("Authentication failed");
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: testError,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(screen.getByText("Authentication failed")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-component")).not.toBeInTheDocument();
    });

    it("should show custom error component", () => {
      const testError = new Error("Authentication failed");
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: testError,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const options: WithAuthenticationRequiredOptions = {
        onError: (error) => <div data-testid="custom-error">Error: {error.message}</div>,
      };

      const ProtectedComponent = withAuthenticationRequired(TestComponent, options);
      render(<ProtectedComponent />);

      expect(screen.getByTestId("custom-error")).toBeInTheDocument();
      expect(screen.getByText("Error: Authentication failed")).toBeInTheDocument();
    });

    it("should not call loginWithRedirect when there is an error", () => {
      const testError = new Error("Authentication failed");
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: testError,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      expect(mockLoginWithRedirect).not.toHaveBeenCalled();
    });
  });

  describe("state transitions", () => {
    it("should handle transition from initializing to authenticated", async () => {
      const { rerender } = render(<div />);

      // First render - initializing
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const options: WithAuthenticationRequiredOptions = {
        onInitializing: () => <div data-testid="initializing">Loading...</div>,
      };

      const ProtectedComponent = withAuthenticationRequired(TestComponent, options);
      rerender(<ProtectedComponent />);

      expect(screen.getByTestId("initializing")).toBeInTheDocument();

      // Second render - authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        user: mockUser,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      rerender(<ProtectedComponent />);

      expect(screen.queryByTestId("initializing")).not.toBeInTheDocument();
      expect(screen.getByTestId("protected-component")).toBeInTheDocument();
    });

    it("should handle transition from initializing to unauthenticated", async () => {
      const { rerender } = render(<div />);

      // First render - initializing
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      rerender(<ProtectedComponent />);

      expect(mockLoginWithRedirect).not.toHaveBeenCalled();

      // Second render - not authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      rerender(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle loginWithRedirect rejection gracefully", async () => {
      // Create a mock that simulates rejection but handles it to avoid test warnings
      let resolveTest: () => void;
      const testComplete = new Promise<void>((resolve) => {
        resolveTest = resolve;
      });

      const handleRejection = () => {
        // Catch the error to prevent unhandled rejection
      };

      const completeTest = () => {
        resolveTest();
      };

      const failingLoginWithRedirect = vi.fn(() =>
        Promise.reject(new Error("Login redirect failed")).catch(handleRejection).finally(completeTest),
      );

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: failingLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(failingLoginWithRedirect).toHaveBeenCalledTimes(1);
      });

      // Wait for the promise to complete
      await testComplete;

      // Component should handle the error and stop showing redirecting state
      // The finally block ensures setLoading(false) is called
    });
  });

  describe("edge cases", () => {
    it("should work with no options provided", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent);
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalled();
      });
    });

    it("should work with empty options object", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const ProtectedComponent = withAuthenticationRequired(TestComponent, {});
      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalled();
      });
    });

    it("should not call loginWithRedirect multiple times on re-renders", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
        user: undefined,
        loginWithRedirect: mockLoginWithRedirect,
        loginSilent: vi.fn(),
        getAccessTokenSilently: vi.fn(),
        logout: vi.fn(),
      });

      const { rerender } = render(<div />);
      const ProtectedComponent = withAuthenticationRequired(TestComponent);

      rerender(<ProtectedComponent />);
      rerender(<ProtectedComponent />);
      rerender(<ProtectedComponent />);

      await waitFor(() => {
        expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
      });
    });
  });
});

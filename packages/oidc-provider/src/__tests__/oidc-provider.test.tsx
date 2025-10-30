import { render, screen, waitFor } from "@testing-library/react";
import { User, UserManager, UserProfile } from "oidc-client-ts";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OIDCProvider, useAuth, useAuthClient } from "../oidc-provider";
import { StorageTypes } from "../token-storage";
import * as utils from "../utils";

// Mock oidc-client-ts
vi.mock("oidc-client-ts", () => ({
  UserManager: vi.fn(),
  WebStorageStateStore: vi.fn(),
  InMemoryWebStorage: class InMemoryWebStorage {
    private storage: Map<string, string> = new Map();
    get length() {
      return this.storage.size;
    }
    getItem(key: string) {
      return this.storage.get(key) || null;
    }
    setItem(key: string, value: string) {
      this.storage.set(key, value);
    }
    removeItem(key: string) {
      this.storage.delete(key);
    }
    clear() {
      this.storage.clear();
    }
    key(index: number) {
      return Array.from(this.storage.keys())[index] || null;
    }
  },
}));

// Mock utils
vi.mock("../utils", () => ({
  hasAuthParams: vi.fn(),
}));

const mockHasAuthParams = vi.mocked(utils.hasAuthParams);

const mockUser: User = {
  id_token: "mock-id-token",
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "Bearer",
  scope: "openid profile email",
  profile: {
    sub: "user123",
    iss: "https://example.com",
    aud: "test-client",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  } as UserProfile,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  expired: false,
  scopes: ["openid", "profile", "email"],
  session_state: null,
  state: undefined,
  toStorageString: vi.fn(),
};

const createMockUserManager = () => {
  const eventCallbacks: {
    accessTokenExpiring: (() => void)[];
    accessTokenExpired: (() => void)[];
    userLoaded: ((user: User) => void)[];
    silentRenewError: ((error: Error) => void)[];
  } = {
    accessTokenExpiring: [],
    accessTokenExpired: [],
    userLoaded: [],
    silentRenewError: [],
  };

  return {
    settings: {
      accessTokenExpiringNotificationTimeInSeconds: 60,
    },
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signinSilent: vi.fn().mockResolvedValue(mockUser),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockResolvedValue(mockUser),
    signinRedirectCallback: vi.fn().mockResolvedValue({
      ...mockUser,
      state: { returnTo: "/dashboard" },
    }),
    events: {
      addAccessTokenExpiring: vi.fn((callback: () => void) => {
        eventCallbacks.accessTokenExpiring.push(callback);
      }),
      removeAccessTokenExpiring: vi.fn((callback: () => void) => {
        const index = eventCallbacks.accessTokenExpiring.indexOf(callback);
        if (index > -1) eventCallbacks.accessTokenExpiring.splice(index, 1);
      }),
      addAccessTokenExpired: vi.fn((callback: () => void) => {
        eventCallbacks.accessTokenExpired.push(callback);
      }),
      removeAccessTokenExpired: vi.fn((callback: () => void) => {
        const index = eventCallbacks.accessTokenExpired.indexOf(callback);
        if (index > -1) eventCallbacks.accessTokenExpired.splice(index, 1);
      }),
      addUserLoaded: vi.fn((callback: (user: User) => void) => {
        eventCallbacks.userLoaded.push(callback);
      }),
      removeUserLoaded: vi.fn((callback: (user: User) => void) => {
        const index = eventCallbacks.userLoaded.indexOf(callback);
        if (index > -1) eventCallbacks.userLoaded.splice(index, 1);
      }),
      addSilentRenewError: vi.fn((callback: (error: Error) => void) => {
        eventCallbacks.silentRenewError.push(callback);
      }),
      removeSilentRenewError: vi.fn((callback: (error: Error) => void) => {
        const index = eventCallbacks.silentRenewError.indexOf(callback);
        if (index > -1) eventCallbacks.silentRenewError.splice(index, 1);
      }),
    },
    _eventCallbacks: eventCallbacks,
  };
};

describe("OIDCProvider", () => {
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserManager = createMockUserManager();
    vi.mocked(UserManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(function (this: unknown) {
      return mockUserManager as unknown as UserManager;
    });
    mockHasAuthParams.mockReturnValue(false);

    // Reset window.location
    delete (globalThis as { location?: unknown }).location;
    globalThis.location = { pathname: "/", search: "", hash: "" } as Location;
    globalThis.history.replaceState = vi.fn();
  });

  describe("Component Rendering", () => {
    it("should render children", async () => {
      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <div data-testid="child">Test Child</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should create UserManager with correct settings", async () => {
      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          tokenStorage={StorageTypes.LocalStorage}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            authority: "https://example.com",
            client_id: "test-client",
            redirect_uri: "https://example.com/callback",
            userStore: expect.any(Object),
          }),
        );
      });
    });
  });

  describe("Initialization", () => {
    it("should initialize with user when user exists", async () => {
      const TestComponent = () => {
        const { isAuthenticated, isLoading, user } = useAuth();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(screen.getByTestId("user")).toHaveTextContent("user123");
      });
    });

    it("should handle redirect callback when auth params are present", async () => {
      mockHasAuthParams.mockReturnValue(true);
      const onRedirectCallback = vi.fn();

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onRedirectCallback={onRedirectCallback}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalled();
        expect(onRedirectCallback).toHaveBeenCalledWith({ returnTo: "/dashboard" });
      });
    });

    it("should use default redirect callback when not provided", async () => {
      mockHasAuthParams.mockReturnValue(true);
      globalThis.location.pathname = "/some/path";

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(globalThis.history.replaceState).toHaveBeenCalledWith({}, document.title, "/dashboard");
      });
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      mockUserManager.getUser.mockRejectedValue(error);

      const TestComponent = () => {
        const { error: authError, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="error">{authError?.message}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Initialization failed");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });
    });

    it("should not initialize twice", async () => {
      const { rerender } = render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.getUser).toHaveBeenCalledTimes(1);
      });

      rerender(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <div>Test Updated</div>
        </OIDCProvider>,
      );

      // Should still be called only once
      expect(mockUserManager.getUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("loginWithRedirect", () => {
    it("should call signinRedirect on UserManager", async () => {
      const TestComponent = () => {
        const { loginWithRedirect } = useAuth();
        return <button onClick={() => loginWithRedirect()}>Login</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Login")).toBeInTheDocument();
      });

      screen.getByText("Login").click();

      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalled();
      });
    });

    it("should pass options to signinRedirect", async () => {
      const options = { redirect_uri: "https://example.com/custom" };
      const TestComponent = () => {
        const { loginWithRedirect } = useAuth();
        return <button onClick={() => loginWithRedirect(options)}>Login</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Login")).toBeInTheDocument();
      });

      screen.getByText("Login").click();

      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalledWith(options);
      });
    });
  });

  describe("loginSilent", () => {
    it("should call signinSilent and update state on success", async () => {
      const TestComponent = () => {
        const { loginSilent, isAuthenticated } = useAuth();
        return (
          <div>
            <button onClick={() => loginSilent()}>Login Silent</button>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
          </div>
        );
      };

      mockUserManager.getUser.mockResolvedValueOnce(null);

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
      });

      screen.getByText("Login Silent").click();

      await waitFor(() => {
        expect(mockUserManager.signinSilent).toHaveBeenCalled();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
      });
    });

    it("should handle loginSilent errors", async () => {
      const error = new Error("Silent login failed");
      mockUserManager.signinSilent.mockRejectedValue(error);

      const TestComponent = () => {
        const { loginSilent, error: authError } = useAuth();
        return (
          <div>
            <button onClick={() => loginSilent()}>Login Silent</button>
            <div data-testid="error">{authError?.message}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Login Silent")).toBeInTheDocument();
      });

      screen.getByText("Login Silent").click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Silent login failed");
      });
    });

    it("should pass options to signinSilent", async () => {
      const options = { scope: "openid profile" };
      const TestComponent = () => {
        const { loginSilent } = useAuth();
        return <button onClick={() => loginSilent(options)}>Login Silent</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Login Silent")).toBeInTheDocument();
      });

      screen.getByText("Login Silent").click();

      await waitFor(() => {
        expect(mockUserManager.signinSilent).toHaveBeenCalledWith(options);
      });
    });
  });

  describe("getAccessTokenSilently", () => {
    it("should return current token when not expired", async () => {
      const TestComponent = () => {
        const { getAccessTokenSilently } = useAuth();
        const [token, setToken] = React.useState<string | undefined>();

        return (
          <div>
            <button
              onClick={async () => {
                const t = await getAccessTokenSilently();
                setToken(t);
              }}
            >
              Get Token
            </button>
            <div data-testid="token">{token}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Get Token")).toBeInTheDocument();
      });

      screen.getByText("Get Token").click();

      await waitFor(() => {
        expect(screen.getByTestId("token")).toHaveTextContent("mock-access-token");
      });

      expect(mockUserManager.signinSilent).not.toHaveBeenCalled();
    });

    it("should refresh token when expired", async () => {
      const expiredUser = {
        ...mockUser,
        expires_in: 30, // Less than accessTokenExpiringNotificationTimeInSeconds
      };
      mockUserManager.getUser.mockResolvedValue(expiredUser as User);

      const TestComponent = () => {
        const { getAccessTokenSilently } = useAuth();
        const [token, setToken] = React.useState<string | undefined>();

        return (
          <div>
            <button
              onClick={async () => {
                const t = await getAccessTokenSilently();
                setToken(t);
              }}
            >
              Get Token
            </button>
            <div data-testid="token">{token}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Get Token")).toBeInTheDocument();
      });

      screen.getByText("Get Token").click();

      await waitFor(() => {
        expect(mockUserManager.signinSilent).toHaveBeenCalled();
        expect(screen.getByTestId("token")).toHaveTextContent("mock-access-token");
      });
    });

    it("should throw error when user is not authenticated", async () => {
      mockUserManager.getUser.mockResolvedValue(null);

      const TestComponent = () => {
        const { getAccessTokenSilently } = useAuth();
        const [error, setError] = React.useState<string | undefined>();

        return (
          <div>
            <button
              onClick={async () => {
                try {
                  await getAccessTokenSilently();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Get Token
            </button>
            <div data-testid="error">{error}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Get Token")).toBeInTheDocument();
      });

      screen.getByText("Get Token").click();

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "User is not authenticated, cannot get access token silently",
        );
      });
    });

    it("should pass options to signinSilent when refreshing", async () => {
      const expiredUser = {
        ...mockUser,
        expires_in: 30,
      };
      mockUserManager.getUser.mockResolvedValue(expiredUser as User);

      const options = { scope: "openid profile" };
      const TestComponent = () => {
        const { getAccessTokenSilently } = useAuth();

        return <button onClick={() => getAccessTokenSilently(options)}>Get Token</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Get Token")).toBeInTheDocument();
      });

      screen.getByText("Get Token").click();

      await waitFor(() => {
        expect(mockUserManager.signinSilent).toHaveBeenCalledWith(options);
      });
    });
  });

  describe("logout", () => {
    it("should call signoutRedirect on UserManager", async () => {
      const TestComponent = () => {
        const { logout } = useAuth();
        return <button onClick={() => logout()}>Logout</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });

      screen.getByText("Logout").click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalled();
      });
    });

    it("should pass options to signoutRedirect", async () => {
      const options = { post_logout_redirect_uri: "https://example.com" };
      const TestComponent = () => {
        const { logout } = useAuth();
        return <button onClick={() => logout(options)}>Logout</button>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });

      screen.getByText("Logout").click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalledWith(options);
      });
    });
  });

  describe("Event Handlers", () => {
    it("should register and unregister onAccessTokenExpiring", async () => {
      const onAccessTokenExpiring = vi.fn();

      const { unmount } = render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenExpiring={onAccessTokenExpiring}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addAccessTokenExpiring).toHaveBeenCalledWith(onAccessTokenExpiring);
      });

      unmount();

      expect(mockUserManager.events.removeAccessTokenExpiring).toHaveBeenCalledWith(onAccessTokenExpiring);
    });

    it("should register and unregister onAccessTokenExpired", async () => {
      const onAccessTokenExpired = vi.fn();

      const { unmount } = render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenExpired={onAccessTokenExpired}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addAccessTokenExpired).toHaveBeenCalledWith(onAccessTokenExpired);
      });

      unmount();

      expect(mockUserManager.events.removeAccessTokenExpired).toHaveBeenCalledWith(onAccessTokenExpired);
    });

    it("should register and unregister onAccessTokenRefreshError", async () => {
      const onAccessTokenRefreshError = vi.fn();

      const { unmount } = render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenRefreshError={onAccessTokenRefreshError}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addSilentRenewError).toHaveBeenCalledWith(onAccessTokenRefreshError);
      });

      unmount();

      expect(mockUserManager.events.removeSilentRenewError).toHaveBeenCalledWith(onAccessTokenRefreshError);
    });

    it("should call onAccessTokenChanged when user is loaded initially", async () => {
      const onAccessTokenChanged = vi.fn();

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenChanged={onAccessTokenChanged}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(onAccessTokenChanged).toHaveBeenCalledWith({
          idToken: "mock-id-token",
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          scope: "openid profile email",
          expiresAt: mockUser.expires_at,
        });
      });
    });

    it("should register onAccessTokenChanged for user loaded events", async () => {
      const onAccessTokenChanged = vi.fn();

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenChanged={onAccessTokenChanged}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addUserLoaded).toHaveBeenCalled();
      });

      // Simulate user loaded event
      const userLoadedCallback = vi.mocked(mockUserManager.events.addUserLoaded).mock.calls[0][0];
      userLoadedCallback(mockUser);

      expect(onAccessTokenChanged).toHaveBeenCalledWith({
        idToken: "mock-id-token",
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        scope: "openid profile email",
        expiresAt: mockUser.expires_at,
      });
    });

    it("should unregister onAccessTokenChanged callback on unmount", async () => {
      const onAccessTokenChanged = vi.fn();

      const { unmount } = render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenChanged={onAccessTokenChanged}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addUserLoaded).toHaveBeenCalled();
      });

      const userLoadedCallback = vi.mocked(mockUserManager.events.addUserLoaded).mock.calls[0][0];

      unmount();

      expect(mockUserManager.events.removeUserLoaded).toHaveBeenCalledWith(userLoadedCallback);
    });

    it("should handle onAccessTokenChanged when user has no token", async () => {
      const onAccessTokenChanged = vi.fn();
      const userWithoutToken = {
        ...mockUser,
        id_token: undefined,
        scope: undefined,
        expires_at: undefined,
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
          onAccessTokenChanged={onAccessTokenChanged}
        >
          <div>Test</div>
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.events.addUserLoaded).toHaveBeenCalled();
      });

      const userLoadedCallback = vi.mocked(mockUserManager.events.addUserLoaded).mock.calls[0][0];
      userLoadedCallback(userWithoutToken as unknown as User);

      expect(onAccessTokenChanged).toHaveBeenCalledWith({
        idToken: "",
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        scope: "",
        expiresAt: 0,
      });
    });
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside OIDCProvider", () => {
      const TestComponent = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow("useOIDC must be used within a OIDCProvider");

      consoleSpy.mockRestore();
    });

    it("should provide auth state and methods", async () => {
      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="authenticated">{auth.isAuthenticated.toString()}</div>
            <div data-testid="loading">{auth.isLoading.toString()}</div>
            <div data-testid="has-login">{(!!auth.loginWithRedirect).toString()}</div>
            <div data-testid="has-logout">{(!!auth.logout).toString()}</div>
          </div>
        );
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(screen.getByTestId("has-login")).toHaveTextContent("true");
        expect(screen.getByTestId("has-logout")).toHaveTextContent("true");
      });
    });

    it("should not expose client in useAuth", async () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div data-testid="has-client">{("client" in auth).toString()}</div>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("has-client")).toHaveTextContent("false");
      });
    });
  });

  describe("useAuthClient hook", () => {
    it("should throw error when used outside OIDCProvider", () => {
      const TestComponent = () => {
        useAuthClient();
        return <div>Test</div>;
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow("useOIDC must be used within a OIDCProvider");

      consoleSpy.mockRestore();
    });

    it("should return the UserManager client", async () => {
      const TestComponent = () => {
        const client = useAuthClient();
        return <div data-testid="has-client">{(!!client).toString()}</div>;
      };

      render(
        <OIDCProvider
          authority="https://example.com"
          client_id="test-client"
          redirect_uri="https://example.com/callback"
        >
          <TestComponent />
        </OIDCProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("has-client")).toHaveTextContent("true");
      });
    });
  });
});

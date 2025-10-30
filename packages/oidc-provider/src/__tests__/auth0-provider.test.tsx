import { render, screen, waitFor } from "@testing-library/react";
import { User, UserManager, UserProfile } from "oidc-client-ts";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Auth0Provider, useAuth0 } from "../auth0-provider";
import * as utils from "../utils";

// Mock oidc-client-ts
vi.mock("oidc-client-ts", () => ({
  UserManager: vi.fn(),
  WebStorageStateStore: vi.fn(),
  Log: {
    setLogger: vi.fn(),
    setLevel: vi.fn(),
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
  },
  InMemoryWebStorage: class InMemoryWebStorage {
    private readonly storage: Map<string, string> = new Map();
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
  getUniqueScopes: vi.fn((scope: string, additional?: string) => {
    const scopes = new Set(scope.split(" "));
    if (additional) {
      additional.split(" ").forEach((s) => scopes.add(s));
    }
    return Array.from(scopes).join(" ");
  }),
}));

const mockHasAuthParams = vi.mocked(utils.hasAuthParams);

const mockUser: User = {
  id_token: "mock-id-token",
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "Bearer",
  scope: "openid profile email offline_access",
  profile: {
    sub: "auth0|user123",
    iss: "https://test-tenant.auth0.com/",
    aud: "test-client-id",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: "test@example.com",
    name: "Test User",
  } as UserProfile,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  expired: false,
  scopes: ["openid", "profile", "email", "offline_access"],
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
      authority: "test-tenant.auth0.com",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      response_type: "code",
      scope: "openid profile email offline_access",
      accessTokenExpiringNotificationTimeInSeconds: 60,
    },
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signinSilent: vi.fn().mockResolvedValue(mockUser),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockResolvedValue(mockUser),
    signinRedirectCallback: vi.fn().mockResolvedValue(mockUser),
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

describe("Auth0Provider", () => {
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
  });

  describe("Component Rendering", () => {
    it("should render children", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div data-testid="child">Test Child</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should create UserManager with correct Auth0 settings", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            authority: "test-tenant.auth0.com",
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            loadUserInfo: false,
          }),
        );
      });
    });

    it("should configure correct Auth0 metadata endpoints", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: {
              issuer: "https://test-tenant.auth0.com/",
              authorization_endpoint: "https://test-tenant.auth0.com/authorize",
              token_endpoint: "https://test-tenant.auth0.com/oauth/token",
              end_session_endpoint: "https://test-tenant.auth0.com/v2/logout",
            },
          }),
        );
      });
    });

    it("should use custom issuer when provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          issuer="https://custom-issuer.auth0.com/"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              issuer: "https://custom-issuer.auth0.com/",
            }),
          }),
        );
      });
    });
  });

  describe("Scopes", () => {
    it("should use default scopes when not provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email",
          }),
        );
      });
    });

    it("should use custom scopes when provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          scope="openid profile email read:posts"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email read:posts",
          }),
        );
      });
    });

    it("should add offline_access scope when useRefreshTokens is true", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          useRefreshTokens={true}
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email offline_access",
            automaticSilentRenew: true,
          }),
        );
      });
    });

    it("should not add offline_access scope when useRefreshTokens is false", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          useRefreshTokens={false}
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email",
            automaticSilentRenew: false,
          }),
        );
      });
    });
  });

  describe("Audience", () => {
    it("should include audience in extraQueryParams when provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          audience="https://api.example.com"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: {
              audience: "https://api.example.com",
            },
          }),
        );
      });
    });

    it("should not include extraQueryParams when audience is not provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: undefined,
          }),
        );
      });
    });
  });

  describe("Client Secret", () => {
    it("should pass client_secret when provided", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          clientSecret="test-secret"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            client_secret: "test-secret",
          }),
        );
      });
    });
  });

  describe("useAuth0 hook", () => {
    it("should provide authentication state", async () => {
      const TestComponent = () => {
        const { isAuthenticated, isLoading, user } = useAuth0();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(screen.getByTestId("user")).toHaveTextContent("auth0|user123");
      });
    });

    it("should provide loginWithRedirect function", async () => {
      const TestComponent = () => {
        const { loginWithRedirect } = useAuth0();
        return (
          <button data-testid="login-btn" onClick={() => loginWithRedirect()}>
            Login
          </button>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      const loginButton = await screen.findByTestId("login-btn");
      loginButton.click();

      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalled();
      });
    });

    it("should add client_id to logout extraQueryParams", async () => {
      const TestComponent = () => {
        const { logout } = useAuth0();
        return (
          <button data-testid="logout-btn" onClick={() => logout()}>
            Logout
          </button>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      const logoutButton = await screen.findByTestId("logout-btn");
      logoutButton.click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: expect.objectContaining({
              client_id: "test-client-id",
            }),
          }),
        );
      });
    });

    it("should merge existing extraQueryParams in logout", async () => {
      const TestComponent = () => {
        const { logout } = useAuth0();
        return (
          <button
            data-testid="logout-btn"
            onClick={() =>
              logout({
                extraQueryParams: { returnTo: "https://example.com/home" },
              })
            }
          >
            Logout
          </button>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      const logoutButton = await screen.findByTestId("logout-btn");
      logoutButton.click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: {
              returnTo: "https://example.com/home",
              client_id: "test-client-id",
            },
          }),
        );
      });
    });

    it("should provide getAccessTokenSilently function", async () => {
      const TestComponent = () => {
        const { getAccessTokenSilently } = useAuth0();
        const [token, setToken] = React.useState<string | null>(null);

        React.useEffect(() => {
          getAccessTokenSilently().then((t) => setToken(t || null));
        }, [getAccessTokenSilently]);

        return <div data-testid="token">{token}</div>;
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("token")).toHaveTextContent("mock-access-token");
      });
    });

    it("should provide user profile data", async () => {
      const TestComponent = () => {
        const { user } = useAuth0();
        return (
          <div>
            <div data-testid="email">{user?.email}</div>
            <div data-testid="name">{user?.name}</div>
          </div>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("email")).toHaveTextContent("test@example.com");
        expect(screen.getByTestId("name")).toHaveTextContent("Test User");
      });
    });
  });

  describe("Authentication Flow", () => {
    it("should handle successful authentication", async () => {
      mockHasAuthParams.mockReturnValue(true);

      const TestComponent = () => {
        const { isAuthenticated, user } = useAuth0();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalled();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("user")).toHaveTextContent("auth0|user123");
      });
    });

    it("should handle authentication errors", async () => {
      const error = new Error("Authentication failed");
      mockUserManager.getUser.mockRejectedValue(error);

      const TestComponent = () => {
        const { error: authError, isLoading } = useAuth0();
        return (
          <div>
            <div data-testid="error">{authError?.message}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Authentication failed");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });
    });
  });

  describe("Logger Configuration", () => {
    it("should pass logger prop to OIDCProvider", async () => {
      const { Log } = await import("oidc-client-ts");
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          logger={mockLogger}
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(Log.setLogger).toHaveBeenCalledWith(mockLogger);
      });
    });

    it("should pass logLevel prop to OIDCProvider", async () => {
      const { Log } = await import("oidc-client-ts");

      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          logLevel={Log.DEBUG}
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(Log.setLevel).toHaveBeenCalledWith(Log.DEBUG);
      });
    });
  });

  describe("Integration with OIDCProvider", () => {
    it("should pass through additional OIDC provider props", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          onBeforeSignIn={vi.fn()}
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalled();
      });
    });

    it("should handle post_logout_redirect_uri correctly", async () => {
      render(
        <Auth0Provider
          domain="test-tenant.auth0.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </Auth0Provider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            redirect_uri: "https://example.com/callback",
            post_logout_redirect_uri: "https://example.com/callback",
          }),
        );
      });
    });
  });
});

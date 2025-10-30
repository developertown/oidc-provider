import { render, screen, waitFor } from "@testing-library/react";
import { User, UserManager, UserProfile } from "oidc-client-ts";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AzureProvider, useAzure } from "../azure-provider";
import * as utils from "../utils";

// Mock oidc-client-ts
vi.mock("oidc-client-ts", () => ({
  UserManager: vi.fn(),
  WebStorageStateStore: vi.fn(),
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
      for (const s of additional.split(" ")) {
        scopes.add(s);
      }
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
  scope: "openid email profile offline_access",
  profile: {
    sub: "azure-user-123",
    iss: "https://test-tenant.b2clogin.com/",
    aud: "test-client-id",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: "test@example.com",
    name: "Test User",
  } as UserProfile,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  expired: false,
  scopes: ["openid", "email", "profile", "offline_access"],
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
      authority: "test-tenant.b2clogin.com",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      response_type: "code",
      scope: "openid email profile offline_access",
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

describe("AzureProvider", () => {
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
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div data-testid="child">Test Child</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should create UserManager with correct Azure settings", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            authority: "test-tenant.b2clogin.com",
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            loadUserInfo: false,
          }),
        );
      });
    });

    it("should configure correct Azure B2C metadata endpoints with policy", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: {
              issuer: "https://test-tenant.b2clogin.com/",
              authorization_endpoint: "https://test-tenant.b2clogin.com/B2C_1_signin/oauth2/v2.0/authorize",
              token_endpoint: "https://test-tenant.b2clogin.com/B2C_1_signin/oauth2/v2.0/token",
              end_session_endpoint: "https://test-tenant.b2clogin.com/B2C_1_signin/oauth2/v2.0/logout",
            },
          }),
        );
      });
    });

    it("should use custom issuer when provided", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          issuer="https://custom-issuer.b2clogin.com/"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              issuer: "https://custom-issuer.b2clogin.com/",
            }),
          }),
        );
      });
    });
  });

  describe("Policy Configuration", () => {
    it("should require policy parameter", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signup_signin"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              authorization_endpoint: "https://test-tenant.b2clogin.com/B2C_1_signup_signin/oauth2/v2.0/authorize",
            }),
          }),
        );
      });
    });

    it("should work with different policy names", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_password_reset"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              authorization_endpoint: "https://test-tenant.b2clogin.com/B2C_1_password_reset/oauth2/v2.0/authorize",
              token_endpoint: "https://test-tenant.b2clogin.com/B2C_1_password_reset/oauth2/v2.0/token",
              end_session_endpoint: "https://test-tenant.b2clogin.com/B2C_1_password_reset/oauth2/v2.0/logout",
            }),
          }),
        );
      });
    });
  });

  describe("Scopes", () => {
    it("should use default scopes when not provided", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid email profile",
          }),
        );
      });
    });

    it("should use custom scopes when provided", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
          scope="openid profile email https://test-tenant.onmicrosoft.com/api/user.read"
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email https://test-tenant.onmicrosoft.com/api/user.read",
          }),
        );
      });
    });

    it("should add offline_access scope when useRefreshTokens is true", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
          useRefreshTokens={true}
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid email profile offline_access",
            automaticSilentRenew: true,
          }),
        );
      });
    });

    it("should not add offline_access scope when useRefreshTokens is false", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
          useRefreshTokens={false}
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid email profile",
            automaticSilentRenew: false,
          }),
        );
      });
    });
  });

  describe("Client Secret", () => {
    it("should pass client_secret when provided", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          clientSecret="test-secret"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
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

  describe("useAzure hook", () => {
    it("should provide authentication state", async () => {
      const TestComponent = () => {
        const { isAuthenticated, isLoading, user } = useAzure();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(screen.getByTestId("user")).toHaveTextContent("azure-user-123");
      });
    });

    it("should provide loginWithRedirect function", async () => {
      const TestComponent = () => {
        const { loginWithRedirect } = useAzure();
        return (
          <button data-testid="login-btn" onClick={() => loginWithRedirect()}>
            Login
          </button>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      const loginButton = await screen.findByTestId("login-btn");
      loginButton.click();

      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalled();
      });
    });

    it("should provide logout function", async () => {
      const TestComponent = () => {
        const { logout } = useAzure();
        return (
          <button data-testid="logout-btn" onClick={() => logout()}>
            Logout
          </button>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      const logoutButton = await screen.findByTestId("logout-btn");
      logoutButton.click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalled();
      });
    });

    it("should provide getAccessTokenSilently function", async () => {
      const TestComponent = () => {
        const { getAccessTokenSilently } = useAzure();
        const [token, setToken] = React.useState<string | null>(null);

        React.useEffect(() => {
          getAccessTokenSilently().then((t) => setToken(t || null));
        }, [getAccessTokenSilently]);

        return <div data-testid="token">{token}</div>;
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("token")).toHaveTextContent("mock-access-token");
      });
    });

    it("should provide user profile data", async () => {
      const TestComponent = () => {
        const { user } = useAzure();
        return (
          <div>
            <div data-testid="email">{user?.email}</div>
            <div data-testid="name">{user?.name}</div>
          </div>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
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
        const { isAuthenticated, user } = useAzure();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalled();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("user")).toHaveTextContent("azure-user-123");
      });
    });

    it("should handle authentication errors", async () => {
      const error = new Error("Authentication failed");
      mockUserManager.getUser.mockRejectedValue(error);

      const TestComponent = () => {
        const { error: authError, isLoading } = useAzure();
        return (
          <div>
            <div data-testid="error">{authError?.message}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <TestComponent />
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent("Authentication failed");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });
    });
  });

  describe("Integration with OIDCProvider", () => {
    it("should pass through additional OIDC provider props", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
          onBeforeSignIn={vi.fn()}
        >
          <div>Test</div>
        </AzureProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalled();
      });
    });

    it("should handle post_logout_redirect_uri correctly", async () => {
      render(
        <AzureProvider
          domain="test-tenant.b2clogin.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          policy="B2C_1_signin"
        >
          <div>Test</div>
        </AzureProvider>,
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

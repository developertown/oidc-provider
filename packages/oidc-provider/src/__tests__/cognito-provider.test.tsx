import { render, screen, waitFor } from "@testing-library/react";
import { User, UserManager, UserProfile } from "oidc-client-ts";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CognitoProvider, useCongito } from "../cognito-provider";
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
  getUniqueScopes: vi.fn((scope: string) => scope),
}));

const mockHasAuthParams = vi.mocked(utils.hasAuthParams);

const mockUser: User = {
  id_token: "mock-id-token",
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  token_type: "Bearer",
  scope: "openid",
  profile: {
    sub: "cognito-user-123",
    iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool",
    aud: "test-client-id",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: "test@example.com",
    "cognito:username": "testuser",
  } as UserProfile,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  expired: false,
  scopes: ["openid"],
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
      authority: "test-domain.auth.us-east-1.amazoncognito.com",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      response_type: "code",
      scope: "openid",
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

describe("CognitoProvider", () => {
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
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div data-testid="child">Test Child</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should create UserManager with correct Cognito settings", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            authority: "test-domain.auth.us-east-1.amazoncognito.com",
            client_id: "test-client-id",
            redirect_uri: "https://example.com/callback",
            response_type: "code",
            loadUserInfo: false,
          }),
        );
      });
    });

    it("should configure correct Cognito metadata endpoints", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: {
              issuer: "https://test-domain.auth.us-east-1.amazoncognito.com/",
              authorization_endpoint: "https://test-domain.auth.us-east-1.amazoncognito.com/oauth2/authorize",
              token_endpoint: "https://test-domain.auth.us-east-1.amazoncognito.com/oauth2/token",
              end_session_endpoint: "https://test-domain.auth.us-east-1.amazoncognito.com/logout",
            },
          }),
        );
      });
    });

    it("should use custom issuer when provided", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          issuer="https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool",
            }),
          }),
        );
      });
    });
  });

  describe("Scopes", () => {
    it("should use default scope when not provided", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid",
          }),
        );
      });
    });

    it("should use custom scopes when provided", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          scope="openid profile email aws.cognito.signin.user.admin"
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "openid profile email aws.cognito.signin.user.admin",
          }),
        );
      });
    });

    it("should handle useRefreshTokens configuration", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          useRefreshTokens={true}
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            automaticSilentRenew: true,
          }),
        );
      });
    });

    it("should not enable automaticSilentRenew when useRefreshTokens is false", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          useRefreshTokens={false}
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalledWith(
          expect.objectContaining({
            automaticSilentRenew: false,
          }),
        );
      });
    });
  });

  describe("Client Secret", () => {
    it("should pass client_secret when provided", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          clientSecret="test-secret"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
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

  describe("useCognito hook", () => {
    it("should provide authentication state", async () => {
      const TestComponent = () => {
        const { isAuthenticated, isLoading, user } = useCongito();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(screen.getByTestId("user")).toHaveTextContent("cognito-user-123");
      });
    });

    it("should provide loginWithRedirect function", async () => {
      const TestComponent = () => {
        const { loginWithRedirect } = useCongito();
        return (
          <button data-testid="login-btn" onClick={() => loginWithRedirect()}>
            Login
          </button>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      const loginButton = await screen.findByTestId("login-btn");
      loginButton.click();

      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalled();
      });
    });

    it("should add required parameters to logout extraQueryParams", async () => {
      const TestComponent = () => {
        const { logout } = useCongito();
        return (
          <button data-testid="logout-btn" onClick={() => logout()}>
            Logout
          </button>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      const logoutButton = await screen.findByTestId("logout-btn");
      logoutButton.click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: expect.objectContaining({
              client_id: "test-client-id",
              response_type: "code",
              redirect_uri: "https://example.com/callback",
            }),
          }),
        );
      });
    });

    it("should merge existing extraQueryParams in logout", async () => {
      const TestComponent = () => {
        const { logout } = useCongito();
        return (
          <button
            data-testid="logout-btn"
            onClick={() =>
              logout({
                extraQueryParams: { logout_uri: "https://example.com/goodbye" },
              })
            }
          >
            Logout
          </button>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      const logoutButton = await screen.findByTestId("logout-btn");
      logoutButton.click();

      await waitFor(() => {
        expect(mockUserManager.signoutRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            extraQueryParams: {
              logout_uri: "https://example.com/goodbye",
              client_id: "test-client-id",
              response_type: "code",
              redirect_uri: "https://example.com/callback",
            },
          }),
        );
      });
    });

    it("should provide getAccessTokenSilently function", async () => {
      const TestComponent = () => {
        const { getAccessTokenSilently } = useCongito();
        const [token, setToken] = React.useState<string | null>(null);

        React.useEffect(() => {
          getAccessTokenSilently().then((t) => setToken(t || null));
        }, [getAccessTokenSilently]);

        return <div data-testid="token">{token}</div>;
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("token")).toHaveTextContent("mock-access-token");
      });
    });

    it("should provide user profile data", async () => {
      const TestComponent = () => {
        const { user } = useCongito();
        return (
          <div>
            <div data-testid="email">{user?.email}</div>
            <div data-testid="username">{user?.["cognito:username"] as string}</div>
          </div>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("email")).toHaveTextContent("test@example.com");
        expect(screen.getByTestId("username")).toHaveTextContent("testuser");
      });
    });
  });

  describe("Authentication Flow", () => {
    it("should handle successful authentication", async () => {
      mockHasAuthParams.mockReturnValue(true);

      const TestComponent = () => {
        const { isAuthenticated, user } = useCongito();
        return (
          <div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="user">{user?.sub}</div>
          </div>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalled();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(screen.getByTestId("user")).toHaveTextContent("cognito-user-123");
      });
    });

    it("should handle authentication errors", async () => {
      const error = new Error("Authentication failed");
      mockUserManager.getUser.mockRejectedValue(error);

      const TestComponent = () => {
        const { error: authError, isLoading } = useCongito();
        return (
          <div>
            <div data-testid="error">{authError?.message}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <TestComponent />
        </CognitoProvider>,
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
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
          onBeforeSignIn={vi.fn()}
        >
          <div>Test</div>
        </CognitoProvider>,
      );

      await waitFor(() => {
        expect(UserManager).toHaveBeenCalled();
      });
    });

    it("should handle post_logout_redirect_uri correctly", async () => {
      render(
        <CognitoProvider
          domain="test-domain.auth.us-east-1.amazoncognito.com"
          clientId="test-client-id"
          redirectUri="https://example.com/callback"
        >
          <div>Test</div>
        </CognitoProvider>,
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

import React, { useEffect, useState, createContext, useCallback, useReducer, useContext } from "react";
import { User, UserManager, UserManagerSettings, WebStorageStateStore } from "oidc-client";
import { hasAuthParams } from "./utils";
import reducer from "./reducer";
import { initialState, AuthState } from "./state";
import { initialize, error } from "./actions";
import tokenStorageForType, { StorageTypes, StorageType } from "./token-storage";

export type AppState = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
export type RedirectCallback = (appState: AppState) => void;
export type LoginWithRedirectOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type LoginWithRedirect = (opts?: LoginWithRedirectOptions) => Promise<void>;
export type LoginSilentOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type LoginSilent = (opts?: LoginSilentOptions) => Promise<void>;
export type GetTokenSilentlyOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type GetTokenSilently = (opts?: GetTokenSilentlyOptions) => Promise<string>;
export type LogoutOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Logout = (opts?: LogoutOptions) => Promise<void>;

export type OIDCProviderState = AuthState & {
  client: UserManager;
  loginWithRedirect: LoginWithRedirect;
  loginSilent: LoginSilent;
  getAccessTokenSilently: GetTokenSilently;
  logout: Logout;
};

const defaultOnRedirectCallback = (appState?: AppState): void => {
  window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
};

const OIDCContext = createContext<OIDCProviderState | undefined>(undefined);

export type Token = {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  scope: string;
  expiresAt: number;
};

export type Events = {
  onAccessTokenChanged?: (token: Token) => void;
  onAccessTokenExpiring?: () => void;
  onAccessTokenExpired?: () => void;
  onAccessTokenRefreshError?: (error: Error) => void;
  onRedirectCallback?: RedirectCallback;
};
export type Props = Omit<UserManagerSettings, "userStore"> &
  Events & {
    tokenStorage?: StorageType;
  };

export const OIDCProvider: React.FC<Props> = ({
  children,
  onAccessTokenChanged,
  onAccessTokenExpiring,
  onAccessTokenExpired,
  onAccessTokenRefreshError,
  onRedirectCallback = defaultOnRedirectCallback,
  tokenStorage = StorageTypes.SessionStorage,
  ...props
}) => {
  const [client] = useState(
    () =>
      new UserManager({
        userStore: new WebStorageStateStore({ store: tokenStorageForType(tokenStorage) }),
        ...props,
      }),
  );
  const [state, dispatch] = useReducer(reducer, initialState);

  const loginWithRedirect = useCallback((opts?: LoginWithRedirectOptions) => client.signinRedirect(opts), [client]);

  const loginSilent = useCallback(
    async (opts?: LoginWithRedirectOptions) => {
      try {
        const user = await client.signinSilent(opts);
        dispatch(initialize({ isAuthenticated: Boolean(user), user: user?.profile }));
      } catch (e) {
        dispatch(error(e));
      }
    },
    [client],
  );

  const getAccessTokenSilently = useCallback(
    async (opts?: GetTokenSilentlyOptions) => {
      const user = await client.getUser();
      if (!user) {
        throw new Error("User is not authenticated, cannot get access token silently");
      }
      const { access_token: currentAccessToken, expires_in: expiresIn } = user;
      if (expiresIn > client.settings.accessTokenExpiringNotificationTime!) {
        return currentAccessToken;
      } else {
        const { access_token: accessToken } = await client.signinSilent(opts);
        return accessToken;
      }
    },
    [client],
  );

  const logout = useCallback((opts?: LogoutOptions) => client.signoutRedirect(opts), [client]);

  useEffect(() => {
    (async (): Promise<void> => {
      try {
        if (hasAuthParams()) {
          const token = await client.signinRedirectCallback();
          onRedirectCallback(token?.state);
        }
        const user = await client.getUser();
        dispatch(initialize({ isAuthenticated: Boolean(user), user: user?.profile }));
      } catch (e) {
        dispatch(error(e));
      }
    })();
  }, [client, onRedirectCallback]);

  useEffect(() => {
    if (onAccessTokenExpiring) {
      client.events.addAccessTokenExpiring(onAccessTokenExpiring);
    }
    return () => {
      if (onAccessTokenExpiring) {
        client.events.removeAccessTokenExpiring(onAccessTokenExpiring);
      }
    };
  }, [client, onAccessTokenExpiring]);

  useEffect(() => {
    let userLoadedCallback: ((user: User) => void) | undefined;

    if (onAccessTokenChanged) {
      userLoadedCallback = ({
        id_token: idToken,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
      }) =>
        onAccessTokenChanged({
          idToken,
          accessToken,
          refreshToken,
          scope,
          expiresAt,
        });

      (async (): Promise<void> => {
        const user = await client.getUser();
        if (user) {
          userLoadedCallback(user);
        }
      })();

      client.events.addUserLoaded(userLoadedCallback);
    }
    return () => {
      if (userLoadedCallback) {
        client.events.removeUserLoaded(userLoadedCallback);
      }
    };
  }, [client, onAccessTokenChanged]);

  useEffect(() => {
    if (onAccessTokenExpired) {
      client.events.addAccessTokenExpired(onAccessTokenExpired);
    }
    return () => {
      if (onAccessTokenExpired) {
        client.events.removeAccessTokenExpired(onAccessTokenExpired);
      }
    };
  }, [client, onAccessTokenExpired]);

  useEffect(() => {
    if (onAccessTokenRefreshError) {
      client.events.addSilentRenewError(onAccessTokenRefreshError);
    }
    return () => {
      if (onAccessTokenRefreshError) {
        client.events.removeSilentRenewError(onAccessTokenRefreshError);
      }
    };
  }, [client, onAccessTokenRefreshError]);

  return (
    <OIDCContext.Provider
      value={{
        ...state,
        client,
        loginWithRedirect,
        loginSilent,
        getAccessTokenSilently,
        logout,
      }}
    >
      {children}
    </OIDCContext.Provider>
  );
};

const useOIDC = (): OIDCProviderState => {
  const context = useContext(OIDCContext);
  if (context === undefined) {
    throw new Error("useOIDC must be used within a OIDCProvider");
  }
  return context;
};

export const useAuthClient = (): UserManager => {
  const { client } = useOIDC();
  return client;
};

export type AuthProviderState = Omit<OIDCProviderState, "client">;

export const useAuth = (): AuthProviderState => {
  const { client, ...state } = useOIDC(); // eslint-disable-line @typescript-eslint/no-unused-vars
  return state;
};

import type {
  AccessTokenCallback,
  ILogger,
  SigninRedirectArgs,
  SigninSilentArgs,
  SignoutRedirectArgs,
  SilentRenewErrorCallback,
  UserLoadedCallback,
} from "oidc-client-ts";
import { Log, UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { UserManagerSettings } from "oidc-client-ts";
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { error, initialize } from "./actions";
import reducer from "./reducer";
import { initialState } from "./state";
import type { AuthState } from "./state";
import tokenStorageForType, { StorageTypes } from "./token-storage";
import type { StorageType } from "./token-storage";
import useEventCallback from "./use-event-callback";
import { hasAuthParams } from "./utils";

export type AppState = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
export type RedirectCallback = (appState?: AppState) => void;
export type LoginWithRedirectOptions = SigninRedirectArgs;
export type LoginWithRedirect = (opts?: LoginWithRedirectOptions) => Promise<void>;
export type LoginSilentOptions = SigninSilentArgs;
export type LoginSilent = (opts?: LoginSilentOptions) => Promise<void>;
export type GetTokenSilentlyOptions = SigninSilentArgs;
export type GetTokenSilently = (opts?: GetTokenSilentlyOptions) => Promise<string | undefined>;
export type LogoutOptions = SignoutRedirectArgs;
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
  onAccessTokenExpiring?: AccessTokenCallback;
  onAccessTokenExpired?: AccessTokenCallback;
  onAccessTokenRefreshError?: SilentRenewErrorCallback;
  onRedirectCallback?: RedirectCallback;
};
export type Props = Omit<UserManagerSettings, "userStore"> &
  Events & {
    children?: React.ReactNode;
    tokenStorage?: StorageType;
    logger?: ILogger;
    logLevel?: Log;
  };

export const OIDCProvider: React.FC<Props> = ({
  children,
  onAccessTokenChanged,
  onAccessTokenExpiring,
  onAccessTokenExpired,
  onAccessTokenRefreshError,
  onRedirectCallback = defaultOnRedirectCallback,
  tokenStorage = StorageTypes.SessionStorage,
  logger,
  logLevel,
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
        dispatch(error(e as Error));
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
      if (expiresIn && expiresIn > client.settings.accessTokenExpiringNotificationTimeInSeconds!) {
        return currentAccessToken;
      } else {
        const user = await client.signinSilent(opts);
        return user?.access_token;
      }
    },
    [client],
  );

  const logout = useCallback((opts?: LogoutOptions) => client.signoutRedirect(opts), [client]);

  const didInitialize = useRef(false);

  useEffect(() => {
    if (logger) {
      Log.setLogger(logger);
    }
  }, [logger]);

  useEffect(() => {
    if (logLevel !== undefined) {
      Log.setLevel(logLevel);
    }
  }, [logLevel]);

  useEffect(() => {
    if (didInitialize.current) {
      return;
    }
    didInitialize.current = true;

    (async (): Promise<void> => {
      try {
        if (hasAuthParams()) {
          const token = await client.signinRedirectCallback();
          onRedirectCallback(token?.state as AppState | undefined);
        }
        const user = await client.getUser();
        dispatch(initialize({ isAuthenticated: Boolean(user), user: user?.profile }));
      } catch (e) {
        dispatch(error(e as Error));
      }
    })();
  }, [client, onRedirectCallback]);

  // Consumers routinely pass these as inline arrows, which would otherwise churn
  // the underlying subscription on every render. Each listener below keeps one
  // identity for as long as its handler is supplied.
  const accessTokenChanged = useEventCallback(onAccessTokenChanged);
  const accessTokenExpiring = useEventCallback(onAccessTokenExpiring);
  const accessTokenExpired = useEventCallback(onAccessTokenExpired);
  const accessTokenRefreshError = useEventCallback(onAccessTokenRefreshError);

  useEffect(() => {
    if (!accessTokenExpiring) {
      return;
    }
    client.events.addAccessTokenExpiring(accessTokenExpiring);
    return () => client.events.removeAccessTokenExpiring(accessTokenExpiring);
  }, [client, accessTokenExpiring]);

  useEffect(() => {
    if (!accessTokenChanged) {
      return;
    }
    let unsubscribed = false;

    const userLoadedCallback: UserLoadedCallback = ({
      id_token: idToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope,
    }) =>
      accessTokenChanged({
        idToken: idToken ?? "",
        accessToken,
        refreshToken,
        scope: scope ?? "",
        expiresAt: expiresAt ?? 0,
      });

    (async (): Promise<void> => {
      const user = await client.getUser();
      if (!unsubscribed && user) {
        userLoadedCallback(user);
      }
    })();

    client.events.addUserLoaded(userLoadedCallback);

    return () => {
      unsubscribed = true;
      client.events.removeUserLoaded(userLoadedCallback);
    };
  }, [client, accessTokenChanged]);

  useEffect(() => {
    if (!accessTokenExpired) {
      return;
    }
    client.events.addAccessTokenExpired(accessTokenExpired);
    return () => client.events.removeAccessTokenExpired(accessTokenExpired);
  }, [client, accessTokenExpired]);

  useEffect(() => {
    if (!accessTokenRefreshError) {
      return;
    }
    client.events.addSilentRenewError(accessTokenRefreshError);
    return () => client.events.removeSilentRenewError(accessTokenRefreshError);
  }, [client, accessTokenRefreshError]);

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

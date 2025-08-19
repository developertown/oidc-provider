import React, { useEffect, useState } from "react";
import { useAuth } from "./oidc-provider";

const defaultLoginWithRedirectParams = () => undefined;
const defaultOnRedirecting = (): JSX.Element => <></>;
const defaultOnError = (error: Error): JSX.Element => <>{error.message}</>;

export interface WithAuthenticationRequiredOptions {
  loginWithRedirectParams?: () => any;
  onInitializing?: () => JSX.Element;
  onRedirecting?: () => JSX.Element;
  onError?: (error: Error) => JSX.Element;
}

const withAuthenticationRequired =
  <P extends Record<string, unknown>>(
    Component: React.ComponentType<P>,
    options: WithAuthenticationRequiredOptions = {},
  ): React.FC<P> =>
  (props: P): JSX.Element => {
    const { isAuthenticated, isLoading: isInitializing, error, loginWithRedirect } = useAuth();
    const [isLoading, setLoading] = useState(false);
    const hasError = Boolean(error);
    const {
      loginWithRedirectParams = defaultLoginWithRedirectParams,
      onInitializing = defaultOnRedirecting,
      onRedirecting = defaultOnRedirecting,
      onError = defaultOnError,
    } = options;

    useEffect(() => {
      if (isInitializing || isLoading || isAuthenticated || hasError) {
        return;
      }
      setLoading(true);
      loginWithRedirect(loginWithRedirectParams()).finally(() => setLoading(false));
    }, [isInitializing, isLoading, isAuthenticated, hasError, loginWithRedirect, loginWithRedirectParams]);

    if (isInitializing) {
      return onInitializing();
    }

    if (isLoading) {
      return onRedirecting();
    }

    if (hasError) {
      return onError(error!);
    }

    return isAuthenticated ? <Component {...props} /> : <>{/*Should by impossible*/}</>;
  };

export default withAuthenticationRequired;

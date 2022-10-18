import React, { ComponentType, FC, useEffect, useState } from "react";
import { useAuth } from "./oidc-provider";

const defaultOnRedirecting = (): JSX.Element => <></>;
const defaultOnError = (error: Error): JSX.Element => <>{error.message}</>;

export interface WithAuthenticationRequiredOptions {
  onInitializing?: () => JSX.Element;
  onRedirecting?: () => JSX.Element;
  onError?: (error: Error) => JSX.Element;
}

const withAuthenticationRequired =
  <P extends Record<string, unknown>>(
    Component: ComponentType<P>,
    options: WithAuthenticationRequiredOptions = {},
  ): FC<P> =>
  (props: P): JSX.Element => {
    const { isAuthenticated, isLoading: isInitializing, error, loginWithRedirect } = useAuth();
    const [isLoading, setLoading] = useState(false);
    const hasError = Boolean(error);
    const {
      onInitializing = defaultOnRedirecting,
      onRedirecting = defaultOnRedirecting,
      onError = defaultOnError,
    } = options;

    useEffect(() => {
      if (isInitializing || isLoading || isAuthenticated || hasError) {
        return;
      }
      setLoading(true);
      loginWithRedirect().finally(() => setLoading(false));
    }, [isInitializing, isLoading, isAuthenticated, hasError, loginWithRedirect]);

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

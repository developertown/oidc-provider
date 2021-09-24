import React, { ComponentType, useEffect, FC } from "react";
import { useAuth } from "./oidc-provider";

const defaultOnRedirecting = (): JSX.Element => <></>;

export interface WithAuthenticationRequiredOptions {
  onRedirecting?: () => JSX.Element;
}

const withAuthenticationRequired =
  <P extends Record<string, unknown>>(
    Component: ComponentType<P>,
    options: WithAuthenticationRequiredOptions = {},
  ): FC<P> =>
  (props: P): JSX.Element => {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth();
    const { onRedirecting = defaultOnRedirecting } = options;

    useEffect(() => {
      if (isLoading || isAuthenticated) {
        return;
      }
      (async (): Promise<void> => {
        await loginWithRedirect();
      })();
    }, [isLoading, isAuthenticated, loginWithRedirect]);

    return isAuthenticated ? <Component {...props} /> : onRedirecting();
  };

export default withAuthenticationRequired;

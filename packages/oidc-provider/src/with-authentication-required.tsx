import React, { useEffect, useState } from "react";
import { useAuth } from "./oidc-provider";

const defaultLoginWithRedirectParams = () => undefined;
const defaultOnRedirecting = (): React.JSX.Element => <></>;
const defaultOnError = (error: Error): React.JSX.Element => <>{error.message}</>;

export interface WithAuthenticationRequiredOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loginWithRedirectParams?: () => any;
  onInitializing?: () => React.JSX.Element;
  onRedirecting?: () => React.JSX.Element;
  onError?: (error: Error) => React.JSX.Element;
}

const withAuthenticationRequired =
  <P extends Record<string, unknown>>(
    Component: React.ComponentType<P>,
    options: WithAuthenticationRequiredOptions = {},
  ): React.FC<P> =>
  (props: P): React.JSX.Element => {
    const { isAuthenticated, isLoading: isInitializing, error, loginWithRedirect } = useAuth();
    const [isRedirecting, setRedirecting] = useState(false);
    const [redirectError, setRedirectError] = useState<Error | undefined>(undefined);
    const failure = error ?? redirectError;
    const hasError = Boolean(failure);
    const {
      loginWithRedirectParams = defaultLoginWithRedirectParams,
      onInitializing = defaultOnRedirecting,
      onRedirecting = defaultOnRedirecting,
      onError = defaultOnError,
    } = options;

    useEffect(() => {
      if (isInitializing || isRedirecting || isAuthenticated || hasError) {
        return;
      }
      setRedirecting(true);
      // Sign-in is a one-way trip: on success the browser leaves for the identity
      // provider, so `isRedirecting` stays set rather than releasing the guard and
      // starting the sign-in over. A failure records the error instead, which both
      // renders it and keeps the guard closed.
      loginWithRedirect(loginWithRedirectParams()).catch((e) => {
        setRedirecting(false);
        setRedirectError(e as Error);
      });
    }, [isInitializing, isRedirecting, isAuthenticated, hasError, loginWithRedirect, loginWithRedirectParams]);

    if (isInitializing) {
      return onInitializing();
    }

    if (hasError) {
      return onError(failure!);
    }

    if (isAuthenticated) {
      return <Component {...props} />;
    }

    if (isRedirecting) {
      return onRedirecting();
    }

    return <>{/*Should by impossible*/}</>;
  };

export default withAuthenticationRequired;

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect warns when a tree is rendered on the server. The ref it keeps
// current is only ever read from browser events, so falling back to useEffect
// off the DOM costs nothing.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Gives an event handler a stable identity so that a consumer passing an inline
 * callback — a new function on every render — does not force the effect that
 * subscribes it to tear down and resubscribe each time.
 *
 * The returned listener keeps one identity for as long as a handler is supplied
 * and dispatches to the most recent one, so a subscribing effect only needs to
 * re-run when the handler appears or disappears.
 */
const useEventCallback = <A extends unknown[], R>(
  handler?: (...args: A) => R,
): ((...args: A) => R | undefined) | undefined => {
  const handlerRef = useRef(handler);

  // Committing the handler in a layout effect rather than a passive one closes
  // the window between commit and paint in which an OIDC event — the listener is
  // already subscribed — would still reach the previous handler, or one the
  // consumer just withdrew.
  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const listener = useCallback((...args: A) => handlerRef.current?.(...args), []);

  return handler ? listener : undefined;
};

export default useEventCallback;

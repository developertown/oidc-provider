import { useCallback, useEffect, useRef } from "react";

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

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const listener = useCallback((...args: A) => handlerRef.current?.(...args), []);

  return handler ? listener : undefined;
};

export default useEventCallback;

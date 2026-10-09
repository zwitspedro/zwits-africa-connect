import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { ZwitsLogo } from "@/components/zwits-logo";

/** Observe existing requests only; never start a request for decoration. */
export function NetworkLogo({ wordmark = true }: { wordmark?: boolean }) {
  const fetching = useIsFetching();
  const mutating = useIsMutating({ predicate: (mutation) => !mutation.state.isPaused });
  return <ZwitsLogo wordmark={wordmark} pulse={fetching + mutating > 0} />;
}
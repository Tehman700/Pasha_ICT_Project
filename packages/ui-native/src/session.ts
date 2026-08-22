import { useQuery } from "@tanstack/react-query";
import { useApi } from "./providers";

/**
 * The signed-in user, and the school they actually belong to.
 *
 * These exist because three screens in the parent app rendered
 * `fixtures.currentParent` and `fixtures.school` instead - so every signed-in
 * parent saw "Tariq Raza" and "Roots Montessori - Islamabad" regardless of who
 * they were or where their children went. The data below the header was real
 * the whole time, which is what made it convincing.
 *
 * `retry: false` on purpose: a 401 will not resolve by asking again, and the
 * provider's onUnauthorized already routes to the login screen.
 */
export function useMe() {
  const api = useApi();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    retry: false,
    // The name in a header does not need refetching every time a screen mounts.
    staleTime: 5 * 60_000,
  });
}

/**
 * The school's NAME. `/users/me` returns `school_id` and nothing more, so this
 * resolves it against the public list - the same unauthenticated endpoint
 * registration uses, so it is warm in the query cache by the time anyone is
 * signed in.
 *
 * Returns undefined while loading rather than a placeholder: a header that
 * says the wrong school briefly is how this bug looked in the first place.
 */
export function useMySchoolName(): string | undefined {
  const api = useApi();
  const me = useMe();
  const schools = useQuery({
    queryKey: ["schools", "public"],
    queryFn: () => api.listSchoolsPublic(),
    enabled: !!me.data,
    staleTime: 30 * 60_000,
  });
  return schools.data?.find((s) => s.id === me.data?.school_id)?.name;
}

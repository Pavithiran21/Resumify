/**
 * After anything that changes the library (an upload, a new version, a delete, a match run),
 * refresh every group that can show it. The counts cross all three: a resume shows its match
 * count, a job its match count, Home the library totals, and deleting a resume or job deletes its
 * matches. One rule instead of a list per mutation; only queries on screen refetch now, the rest
 * refetch when they are next shown.
 */
export function invalidateLibrary(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['resumes'] }),
    queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    queryClient.invalidateQueries({ queryKey: ['matches'] }),
  ]);
}

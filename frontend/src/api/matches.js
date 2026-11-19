import { apiRequest } from './client';
import { toQuery } from './query';

/** Runs a match and returns the saved result. 404, 409 RESUME_CHANGED, 429, 502 MATCH_SERVICE_FAILED. */
export const runMatch = (resumeId, jobId) => apiRequest('/matches', { method: 'POST', body: { resumeId, jobId } });

/** A page of match summaries. params: page, size, sort (-createdAt, -score), resumeId, jobId. */
export const listMatches = (params) => apiRequest(`/matches${toQuery(params)}`);

/** The full result, with runNumber and runCount. */
export const getMatch = (id) => apiRequest(`/matches/${id}`);

/** Two runs of the same resume and job; the backend always puts the older run first. */
export const compareRuns = (first, second) => apiRequest(`/matches/compare${toQuery({ first, second })}`);

import { apiRequest, apiUpload } from './client';
import { toQuery } from './query';

/** A page of jobs without their descriptions. params: page, size, sort. */
export const listJobs = (params) => apiRequest(`/jobs${toQuery(params)}`);

/** One job with its description. */
export const getJob = (id) => apiRequest(`/jobs/${id}`);

/** { title, company?, description }: saved as text. Jobs can't be edited later. */
export const createJob = (input) => apiRequest('/jobs', { method: 'POST', body: input });

/** Reads a TXT, PDF or DOCX job file and returns { text, characterCount }. Nothing is stored. */
export const extractJobText = (file, onProgress) => apiUpload('/jobs/extract-text', file, onProgress);

/** The job and its matches; resumes stay. */
export const deleteJob = (id) => apiRequest(`/jobs/${id}`, { method: 'DELETE' });

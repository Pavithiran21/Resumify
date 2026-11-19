import { apiDownload, apiRequest, apiUpload } from './client';
import { toQuery } from './query';

/** A page of resumes (no file bytes, no text). params: page, size, sort. */
export const listResumes = (params) => apiRequest(`/resumes${toQuery(params)}`);

export const getResume = (id) => apiRequest(`/resumes/${id}`);

/** One PDF or DOCX as multipart form data; onProgress gets 0–100 while the bytes are sent. */
export const uploadResume = (file, onProgress) => apiUpload('/resumes', file, onProgress);

/** The same checks as an upload; the resume keeps its id and its version goes up by one. */
export const uploadNewVersion = (id, file, onProgress) => apiUpload(`/resumes/${id}/versions`, file, onProgress);

/** { blob, fileName } from the resume's downloadUrl. */
export const downloadResume = (resume) => apiDownload(resume.downloadUrl, resume.fileName);

export const deleteResume = (id) => apiRequest(`/resumes/${id}`, { method: 'DELETE' });

/** Every resume and every match; jobs and the account stay. */
export const deleteAllResumes = () => apiRequest('/resumes', { method: 'DELETE' });

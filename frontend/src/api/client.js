// The one place that talks to the backend. Every call goes to /api on the same origin
// (the Vite dev server forwards it to the backend), so the refresh cookie is sent too.
const BASE_URL = '/api';

/**
 * An error answer from the API, in the shared format
 * { error: { code, message, details: [{ field, message }], requestId } }.
 * status is 0 when the server could not be reached at all.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = [], requestId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach Resumify. Check your connection.";

// The access token lives only in memory: never in localStorage, where any injected script
// could read it. After a page reload the refresh cookie gets a new one.
let accessToken = null;
let refreshPromise = null;
let onSessionEnded = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

/** Called when a logged-in request gets 401 and the session can't be refreshed. */
export function setSessionEndedHandler(handler) {
  onSessionEnded = handler;
}

/** Paths may be given with or without /api (a resume's downloadUrl already has it). */
function toUrl(path) {
  return path.startsWith(BASE_URL + '/') ? path : BASE_URL + path;
}

async function send(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(toUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }
}

function errorFromBody(status, body) {
  const error = body?.error;
  return new ApiError(
    status,
    error?.code ?? 'UNKNOWN_ERROR',
    error?.message ?? 'Something went wrong. Please try again.',
    error?.details ?? [],
    error?.requestId ?? null,
  );
}

async function toApiError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON, for example the dev proxy's page when the backend is down.
  }
  // The dev proxy answers 502/504 when the backend isn't running: the same as no connection.
  if (!body && (response.status === 502 || response.status === 504)) {
    return new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }
  return errorFromBody(response.status, body);
}

/**
 * Gets a new access token with the refresh cookie. Returns { user, accessToken }, or null when
 * there is no valid session.
 *
 * Only one refresh runs at a time: the backend rotates the cookie on every use, so a second
 * refresh sent in parallel (two queries failing together, or React StrictMode running an effect
 * twice) would carry an old cookie and be refused.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await send('/auth/refresh', { method: 'POST', auth: false });
        if (!response.ok) {
          accessToken = null;
          return null;
        }
        const session = await response.json();
        accessToken = session.accessToken;
        return session;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function sessionEnded() {
  onSessionEnded();
  return new ApiError(401, 'SESSION_ENDED', 'Your session has ended. Please log in again.');
}

/**
 * Sends a request and returns the Response once it is ok.
 *
 * A logged-in request that gets 401 (usually an expired 15-minute token) refreshes the session
 * once and retries. If that fails, the session has ended: the app logs out. Requests with
 * auth: false (log in, register...) never do this, so a wrong password stays a normal error.
 */
async function sendWithRefresh(path, options) {
  const auth = options.auth ?? true;
  let response = await send(path, options);

  if (response.status === 401 && auth) {
    const session = await refreshSession();
    if (session) {
      response = await send(path, options);
    }
    if (!session || response.status === 401) {
      throw sessionEnded();
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

/**
 * Sends a request and returns the parsed JSON body (undefined for 204).
 * Options: method, body (sent as JSON), auth (default true), signal.
 */
export async function apiRequest(path, options = {}) {
  const response = await sendWithRefresh(path, options);
  if (response.status === 204) {
    return undefined;
  }
  return response.json();
}

/** The file name from Content-Disposition: the UTF-8 filename* first, then the plain one. */
function fileNameFrom(response, fallback) {
  const header = response.headers.get('Content-Disposition') ?? '';
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // A broken encoding: use the plain name below.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

/**
 * Fetches a file that needs the Bearer token (a resume's file), with the same
 * refresh rule as apiRequest. Returns { blob, fileName, headers }.
 */
export async function apiDownload(path, fallbackName = 'download') {
  const response = await sendWithRefresh(path, {});
  const blob = await response.blob();
  return { blob, fileName: fileNameFrom(response, fallbackName), headers: response.headers };
}

/** One multipart upload with XMLHttpRequest, because fetch can't report upload progress. */
function uploadOnce(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', toUrl(path));
    if (accessToken) {
      request.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let body = null;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        // Not JSON: handled as an unknown error below.
      }
      resolve({ status: request.status, body });
    };
    request.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE));
    const form = new FormData();
    form.append('file', file);
    request.send(form);
  });
}

/**
 * Uploads one file as the form field "file" and returns the created record.
 * onProgress gets 0–100. A 401 refreshes the session once and retries, like apiRequest.
 */
export async function apiUpload(path, file, onProgress = () => {}) {
  let result = await uploadOnce(path, file, onProgress);
  if (result.status === 401) {
    const session = await refreshSession();
    if (session) {
      onProgress(0);
      result = await uploadOnce(path, file, onProgress);
    }
    if (!session || result.status === 401) {
      throw sessionEnded();
    }
  }
  if (result.status === 502 || result.status === 504) {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }
  if (result.status < 200 || result.status >= 300) {
    throw errorFromBody(result.status, result.body);
  }
  return result.body;
}

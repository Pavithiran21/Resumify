// Every cached query's key in one place. Keys are grouped under a prefix (resumes, jobs, matches),
// so a change can refresh a whole group with one invalidateQueries call.
export const queryKeys = {
  resumes: {
    all: ['resumes'],
    list: (params) => ['resumes', 'list', params],
    detail: (id) => ['resumes', 'detail', id],
    // The PDF shown by "View resume"; the version is in the key, so a new version is fetched anew.
    file: (id, version) => ['resumes', 'file', id, version],
  },
  jobs: {
    all: ['jobs'],
    list: (params) => ['jobs', 'list', params],
    detail: (id) => ['jobs', 'detail', id],
  },
  matches: {
    all: ['matches'],
    list: (params) => ['matches', 'list', params],
    detail: (id) => ['matches', 'detail', id],
    compare: (first, second) => ['matches', 'compare', first, second],
  },
  demo: ['demo'],
};

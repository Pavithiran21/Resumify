import { IconArrowsSort, IconBriefcase, IconFileCv, IconSparkles, IconUpload } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Link } from 'react-router';
import { listJobs } from '../../api/jobs';
import { listMatches } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { listResumes } from '../../api/resumes';
import { Pager } from '../../components/Pager';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSearchParamsState } from '../../hooks/useSearchParamsState';
import { MatchTable } from './MatchTable';

const PAGE_SIZE = 20;
// The filter lists: a user keeps at most 20 resumes, and 100 is the API's largest page.
const PICKER_PARAMS = { size: 100 };
const SORTS = [
  { value: '-createdAt', label: 'Newest' },
  { value: '-score', label: 'Highest score' },
];

/** A filter as a native select with a leading icon and a visually hidden label. */
function FilterSelect({ label, icon: Icon, value, onChange, children }) {
  const id = useId();
  return (
    <span className="relative inline-flex min-w-0 items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon size={16} className="text-dim pointer-events-none absolute left-3" aria-hidden="true" />
      <select id={id} className="sel max-w-[260px] pl-8" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </span>
  );
}

/** "No matches yet": the first step is a resume, unless the user already has one. */
function NoMatches({ hasResumes }) {
  const action = hasResumes ? (
    <Link to="/matches/new" className="btn btn-primary">
      <IconSparkles size={18} aria-hidden="true" /> New match
    </Link>
  ) : (
    <Link to="/resumes" className="btn btn-primary">
      <IconUpload size={18} aria-hidden="true" /> Upload a resume
    </Link>
  );
  return <EmptyPanel title="No matches yet" text="Upload a resume, add a job, and see how well they fit." action={action} />;
}

/**
 * Past matches (UI-UX.md screen 10): filter by resume and job, sort by newest or highest score,
 * 20 per page. The filters and the page live in the URL, so Back and reload keep them.
 */
export function MatchesPage() {
  usePageTitle('Past matches');
  const [filters, setFilters] = useSearchParamsState(['resumeId', 'jobId', 'sort', 'page']);
  const page = Number(filters.page) || 1;
  const sort = filters.sort === '-score' ? '-score' : '-createdAt';
  const params = { resumeId: filters.resumeId, jobId: filters.jobId, sort, page, size: PAGE_SIZE };

  const matches = useQuery({
    queryKey: queryKeys.matches.list(params),
    queryFn: () => listMatches(params),
    placeholderData: keepPreviousData,
  });
  const resumes = useQuery({ queryKey: queryKeys.resumes.list(PICKER_PARAMS), queryFn: () => listResumes(PICKER_PARAMS) });
  const jobs = useQuery({ queryKey: queryKeys.jobs.list(PICKER_PARAMS), queryFn: () => listJobs(PICKER_PARAMS) });

  const filtered = Boolean(filters.resumeId || filters.jobId);
  const isEmpty = matches.data?.totalItems === 0;
  // One gradient button per screen: before the first match it is the empty state's action.
  const showsEmptyState = isEmpty && !filtered;

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">Matches</div>
          <h1 className="t-screen">Past matches</h1>
        </div>
        <Link to="/matches/new" className={`btn ${showsEmptyState ? 'btn-secondary' : 'btn-primary'}`}>
          <IconSparkles size={18} aria-hidden="true" /> New match
        </Link>
      </div>
      <div className="mt-[18px]">
        {matches.isPending && <LoadingPanel lines={6} label="Loading matches" />}
        {matches.isError && <ErrorPanel error={matches.error} onRetry={matches.refetch} />}
        {showsEmptyState && <NoMatches hasResumes={(resumes.data?.totalItems ?? 0) > 0} />}
        {matches.data && (!isEmpty || filtered) && (
          <section className="panel pad" aria-label="Past matches">
            <div className="filters">
              <FilterSelect
                label="Resume"
                icon={IconFileCv}
                value={filters.resumeId}
                onChange={(value) => setFilters({ resumeId: value })}
              >
                <option value="">All resumes</option>
                {resumes.data?.items.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.fileName} (v{resume.version})
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect label="Job" icon={IconBriefcase} value={filters.jobId} onChange={(value) => setFilters({ jobId: value })}>
                <option value="">All jobs</option>
                {jobs.data?.items.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company ? `${job.title} · ${job.company}` : job.title}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect label="Sort" icon={IconArrowsSort} value={sort} onChange={(value) => setFilters({ sort: value })}>
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            {isEmpty ? (
              <p className="muted my-4 text-sm">
                No matches for these filters.{' '}
                <button type="button" className="link" onClick={() => setFilters({ resumeId: '', jobId: '' })}>
                  Show all matches
                </button>
              </p>
            ) : (
              <MatchTable matches={matches.data.items} variant="full" caption="Past matches" />
            )}
            <Pager data={matches.data} onPage={(next) => setFilters({ page: next })} />
          </section>
        )}
      </div>
    </>
  );
}

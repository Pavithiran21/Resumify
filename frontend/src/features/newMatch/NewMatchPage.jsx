import { IconArrowLeft, IconCheck, IconFileCv, IconFileDescription, IconGauge } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { invalidateLibrary } from '../../api/invalidate';
import { createJob, listJobs } from '../../api/jobs';
import { runMatch } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { listResumes } from '../../api/resumes';
import { Button } from '../../components/Button';
import { ErrorPanel, LoadingPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNetworkError } from '../../lib/apiErrors';
import { fileIcon, MAX_RESUMES } from '../../lib/files';
import { pagesAndWordsDotted } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';
import { MatchRunError } from '../matches/MatchRunError';
import { RunningPanel } from '../matches/RunningPanel';
import { HowMatchWorks } from './HowMatchWorks';
import { NewJobForm } from './NewJobForm';
import { ResumeStep } from './ResumeStep';
import { SavedJobs } from './SavedJobs';

const RESUME_PARAMS = { size: MAX_RESUMES };
const JOB_PARAMS = { size: 100 };
const STEPS = [
  { key: 'resume', label: 'Resume', Icon: IconFileCv },
  { key: 'job', label: 'Job', Icon: IconFileDescription },
  { key: 'result', label: 'Result', Icon: IconGauge },
];

function stepClass(index, currentIndex) {
  if (index < currentIndex) {
    return 'done';
  }
  return index === currentIndex ? 'on' : '';
}

/** The 3-step indicator: done steps in green, the current one with the gradient edge. */
function StepIndicator({ current }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="steps" aria-label="Steps">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const Icon = done ? IconCheck : step.Icon;
        return (
          <li
            key={step.key}
            className={stepClass(index, currentIndex)}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            <Icon size={16} aria-hidden="true" /> {step.label}
            {done && <span className="sr-only">, done</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** "New job" and "Saved jobs · 3": a tab list; Left and Right move between the two tabs. */
function JobTabs({ tab, onChange, savedCount, panelId }) {
  const tabs = [
    { key: 'new', label: 'New job' },
    { key: 'saved', label: `Saved jobs · ${savedCount}` },
  ];
  const refs = useRef({});

  function onKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const next = tab === 'new' ? 'saved' : 'new';
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label="Job">
      {tabs.map((item) => (
        <button
          key={item.key}
          ref={(element) => {
            refs.current[item.key] = element;
          }}
          type="button"
          role="tab"
          id={`${panelId}-${item.key}`}
          aria-selected={tab === item.key}
          aria-controls={panelId}
          tabIndex={tab === item.key ? 0 : -1}
          onClick={() => onChange(item.key)}
          onKeyDown={onKeyDown}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** The chosen resume at the top of step 2, with "Change". */
function ChosenResume({ resume, onChange }) {
  const { Icon, color } = fileIcon(resume.contentType);
  return (
    <div className="file mt-0 mb-4">
      <Icon size={26} className="flex-none" style={{ color }} aria-hidden="true" />
      <div className="grow">
        <b>{resume.fileName}</b>
        <span className="ver">v{resume.version}</span>
        <div className="dim text-[13px]">{pagesAndWordsDotted(resume)}</div>
      </div>
      <button type="button" className="link" onClick={onChange}>
        Change<span className="sr-only"> resume</span>
      </button>
    </div>
  );
}

/**
 * New match (UI-UX.md screen 6): 1 Resume, 2 Job (a new job or a saved one), 3 Result.
 * ?resumeId= and ?jobId= preselect (from a resume's view and from "Match a resume" on a job).
 *
 * A new job is saved first (POST /api/jobs), then the match runs. Its id is kept, so "Try again"
 * after a failed match runs the match again without saving the job twice; going back from a failed
 * match shows the saved job under "Saved jobs".
 */
export function NewMatchPage() {
  usePageTitle('New match');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast, showError } = useToast();
  const panelId = useId();

  const [resumeId, setResumeId] = useState(searchParams.get('resumeId') ?? '');
  const [step, setStep] = useState(searchParams.get('resumeId') ? 'job' : 'resume');
  const [jobTab, setJobTab] = useState(searchParams.get('jobId') ? 'saved' : 'new');
  const [savedJobId, setSavedJobId] = useState(searchParams.get('jobId') ?? '');

  const resumes = useQuery({ queryKey: queryKeys.resumes.list(RESUME_PARAMS), queryFn: () => listResumes(RESUME_PARAMS) });
  const jobs = useQuery({ queryKey: queryKeys.jobs.list(JOB_PARAMS), queryFn: () => listJobs(JOB_PARAMS) });

  const run = useMutation({
    mutationFn: ({ jobId }) => runMatch(resumeId, jobId),
    onSuccess: (match) => {
      invalidateLibrary(queryClient);
      showToast({ message: `Match saved · score ${match.score}`, success: true });
      navigate(`/matches/${match.id}`, { replace: true });
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
    },
  });

  function runWith(jobId) {
    setStep('result');
    run.mutate({ jobId });
  }

  async function saveJobAndRun(values) {
    const job = await createJob(values);
    invalidateLibrary(queryClient);
    // From here on it is a saved job: Back after a failed run shows it selected under Saved jobs.
    setJobTab('saved');
    setSavedJobId(job.id);
    runWith(job.id);
  }

  if (resumes.isPending || jobs.isPending) {
    return <LoadingPanel lines={5} label="Loading your resumes and jobs" />;
  }
  const failed = [resumes, jobs].find((query) => query.isError);
  if (failed) {
    return <ErrorPanel error={failed.error} onRetry={failed.refetch} />;
  }

  const resume = resumes.data.items.find((item) => item.id === resumeId);
  // A preselected resume that is gone (or isn't the user's) falls back to step 1.
  const currentStep = step !== 'resume' && !resume ? 'resume' : step;
  const savedJobs = jobs.data.items;

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">
            <Link to="/matches">Matches</Link> / New match
          </div>
          <h1 className="t-screen">New match</h1>
        </div>
      </div>
      {/* The steps beside "How your match works"; while the match runs, the steps take the full width. */}
      <div className={currentStep === 'result' ? 'mt-[18px]' : 'grid2 mt-[18px]'}>
        <div className="panel pad">
          <StepIndicator current={currentStep} />
          {currentStep === 'resume' && (
            <ResumeStep
              resumes={resumes.data.items}
              resumeId={resume ? resumeId : ''}
              onChange={setResumeId}
              onContinue={() => setStep('job')}
            />
          )}
          {currentStep === 'job' && (
            <>
              <h2 className="t-card mt-0 mb-3.5">Choose the job</h2>
              <ChosenResume resume={resume} onChange={() => setStep('resume')} />
              <JobTabs tab={jobTab} onChange={setJobTab} savedCount={jobs.data.totalItems} panelId={panelId} />
              <div role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${jobTab}`}>
                {jobTab === 'new' ? (
                  <NewJobForm onSave={saveJobAndRun} onBack={() => setStep('resume')} />
                ) : (
                  <SavedJobs
                    jobs={savedJobs}
                    jobId={savedJobs.some((job) => job.id === savedJobId) ? savedJobId : ''}
                    onChange={setSavedJobId}
                    onRun={() => runWith(savedJobId)}
                    onBack={() => setStep('resume')}
                    onNewJob={() => setJobTab('new')}
                  />
                )}
              </div>
            </>
          )}
          {currentStep === 'result' && (
            <>
              {(run.isPending || run.isSuccess) && <RunningPanel />}
              {run.isError && !isNetworkError(run.error) && (
                <MatchRunError error={run.error} onRetry={() => run.mutate(run.variables)}>
                  <Button size="sm" className="mt-2.5" onClick={() => setStep('job')}>
                    <IconArrowLeft size={18} aria-hidden="true" /> Back
                  </Button>
                </MatchRunError>
              )}
              {run.isError && isNetworkError(run.error) && (
                <div className="flex flex-wrap gap-2.5">
                  <Button size="sm" onClick={() => run.mutate(run.variables)}>
                    Try again
                  </Button>
                  <Button size="sm" onClick={() => setStep('job')}>
                    <IconArrowLeft size={18} aria-hidden="true" /> Back
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        {currentStep !== 'result' && <HowMatchWorks />}
      </div>
    </>
  );
}

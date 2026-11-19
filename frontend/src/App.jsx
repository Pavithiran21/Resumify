import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/RouteGuards';
import { DemoPage } from './features/auth/DemoPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './pages/NotFoundPage';

// The logged-in screens are loaded when first opened, so Log in doesn't download them (and the
// main bundle stays small). AppShell shows a loading panel meanwhile. Each module exports its page
// by name, so lazy() is given the module with that export as its default.
function lazyPage(load, name) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}
const HomePage = lazyPage(() => import('./features/home/HomePage'), 'HomePage');
const MatchesPage = lazyPage(() => import('./features/matches/MatchesPage'), 'MatchesPage');
const NewMatchPage = lazyPage(() => import('./features/newMatch/NewMatchPage'), 'NewMatchPage');
const ComparePage = lazyPage(() => import('./features/matches/ComparePage'), 'ComparePage');
const MatchResultPage = lazyPage(() => import('./features/matches/MatchResultPage'), 'MatchResultPage');
const ResumesPage = lazyPage(() => import('./features/resumes/ResumesPage'), 'ResumesPage');
const ResumePage = lazyPage(() => import('./features/resumes/ResumePage'), 'ResumePage');
const JobsPage = lazyPage(() => import('./features/jobs/JobsPage'), 'JobsPage');
const JobPage = lazyPage(() => import('./features/jobs/JobPage'), 'JobPage');
const ProfilePage = lazyPage(() => import('./features/profile/ProfilePage'), 'ProfilePage');

// Addresses carry ids only, never a file name, resume text or job text (UI-UX.md "Privacy in the UI").
export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* The old Log in address. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      {/* Open while logged in too: a reset link must work in a browser that has a session. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="home" element={<HomePage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="matches/new" element={<NewMatchPage />} />
          <Route path="matches/compare" element={<ComparePage />} />
          <Route path="matches/:matchId" element={<MatchResultPage />} />
          <Route path="resumes" element={<ResumesPage />} />
          <Route path="resumes/:resumeId" element={<ResumePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:jobId" element={<JobPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

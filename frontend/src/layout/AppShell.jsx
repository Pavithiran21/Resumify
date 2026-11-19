import {
  IconBriefcase,
  IconBriefcaseFilled,
  IconFileCv,
  IconFileCvFilled,
  IconGauge,
  IconGaugeFilled,
  IconHome,
  IconHomeFilled,
  IconUser,
  IconUserFilled,
} from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Logo, Wordmark } from '../components/Logo';
import { LoadingPanel } from '../components/StatePanels';

// Each item has an outline icon and the filled one shown while its page is open.
const MAIN_ITEMS = [
  { to: '/home', label: 'Home', Icon: IconHome, ActiveIcon: IconHomeFilled, end: true },
  { to: '/matches', label: 'Matches', Icon: IconGauge, ActiveIcon: IconGaugeFilled },
  { to: '/resumes', label: 'Resumes', Icon: IconFileCv, ActiveIcon: IconFileCvFilled },
  { to: '/jobs', label: 'Jobs', Icon: IconBriefcase, ActiveIcon: IconBriefcaseFilled },
];
const PROFILE_ITEM = { to: '/profile', label: 'Profile', Icon: IconUser, ActiveIcon: IconUserFilled };

// Open or collapsed is a view preference kept in this browser only. Storage can be blocked
// (a private window, strict settings): the sidebar then simply starts open.
const SIDEBAR_KEY = 'resumify.sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'open');
  } catch {
    // Not remembered: the toggle still works for this visit.
  }
}

function SidebarItem({ item }) {
  const { to, label, Icon, ActiveIcon, end } = item;
  // NavLink sets aria-current="page" on the active item; the visible label is the link's name.
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {({ isActive }) => {
        const ShownIcon = isActive ? ActiveIcon : Icon;
        return (
          <>
            <ShownIcon size={20} aria-hidden="true" />
            <span className="lb">{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

/**
 * Every logged-in screen (UI-UX.md "Layout and responsive"): a white sidebar with the logo and
 * labelled items, and the content. The logo is the toggle: it collapses the sidebar to a strip
 * of icons, whose labels then show on hover or focus (Home has its own item). Below 860 px the
 * sidebar turns into a top row of the logo and five labelled icons, with nothing to collapse, so
 * there the logo is a link home; no tab bar and no hamburger.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleLabel = collapsed ? 'Expand menu' : 'Collapse menu';

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    saveCollapsed(next);
  }

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar" id="main-nav" aria-label="Main">
        <button
          type="button"
          className="sb-brand"
          onClick={toggleSidebar}
          aria-label={`Resumify, ${toggleLabel.toLowerCase()}`}
          aria-expanded={!collapsed}
          aria-controls="main-nav"
        >
          <Logo size={32} />
          <Wordmark className="sb-word text-[19px]" />
          <span className="sb-tip" aria-hidden="true">
            {toggleLabel}
          </span>
        </button>
        <Link to="/home" className="sb-home" aria-label="Resumify home">
          <Logo size={28} />
        </Link>
        {MAIN_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} />
        ))}
        <span className="sp" />
        <SidebarItem item={PROFILE_ITEM} />
      </nav>
      <main className="content" id="main">
        <Suspense fallback={<LoadingPanel />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

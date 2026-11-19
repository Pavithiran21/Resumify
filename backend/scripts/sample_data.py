"""
The resumes and job ads used by the seed scripts. Made-up people and companies; every email
address uses the reserved .test domain.

The Northwind job and Meera's two resume versions tell the demo's story: version 1 doesn't
mention TypeScript or accessibility, version 2 does, so "Compare runs" shows the score going
up. The model stand-in in e2e/mocks/llm-stub.js answers these texts like a careful model would.
"""

NORTHWIND_JOB = {
    "title": "Frontend Developer",
    "company": "Northwind",
    "description": """\
Frontend Developer at Northwind

Northwind builds booking software for independent hotels. We're hiring a Frontend Developer with 3+ years of React and TypeScript to help rebuild our guest booking app.

What you'll do
- Build fast, accessible booking flows in React and TypeScript.
- Ship production features with Next.js, including server-side rendering for our public pages.
- Work with our GraphQL API, and consume REST APIs from payment and channel partners.
- Improve page speed: we track Core Web Vitals on every release.
- Write CSS that holds up on every screen size, and keep our design system in Figma and in code in sync.
- Write tests with Jest and review pull requests in Git.

What we look for
- 3+ years of professional React experience.
- Strong TypeScript.
- Production experience with Next.js and GraphQL.
- Care for accessibility (WCAG 2.2) and for performance.
- Comfortable in an Agile team with designers and product managers.
- Clear communication, with the guest's booking, checkout and payment journey in mind.
""",
}

ORBIT_JOB = {
    "title": "UI Engineer",
    "company": "Orbit Fintech",
    "description": """\
UI Engineer at Orbit Fintech

Orbit Fintech makes saving and investing simple for first-time investors. As a UI Engineer you will build the screens of our investing app with React, TypeScript and Redux.

You will
- Turn Figma designs into accessible, responsive design components.
- Build charts and dashboards for portfolios, with clear loading and error states.
- Write unit tests with Jest and end-to-end tests with Playwright.
- Work with backend engineers on REST APIs and keep the API contract documented.
- Take part in code reviews and Agile planning.

You have
- 2+ years of experience with React and JavaScript.
- Experience with Redux or another state library.
- An eye for detail and good communication with designers.
""",
}

HARBOR_JOB = {
    "title": "React Developer",
    "company": "Harbor Labs",
    "description": """\
React Developer at Harbor Labs

Harbor Labs builds logistics dashboards for shipping companies. We need a React Developer to join our platform team.

Responsibilities
- Build data-heavy dashboards in React with Next.js and Tailwind CSS.
- Work with Node.js services and a PostgreSQL database.
- Deploy with Docker and GitHub Actions to AWS.
- Write tests with Vitest and Cypress.

Requirements
- 4+ years of experience as a frontend or full-stack developer.
- Strong React and TypeScript, plus experience with Node.js.
- Experience with AWS and Docker.
- Clear written communication in a remote team.
""",
}

MEERA_RESUME_V1 = [
    "Meera Iyer",
    "Frontend Developer | Pune, India | meera.iyer@example.test",
    "",
    "Summary",
    "Frontend developer with 3 years of experience building booking and payment screens in React for travel products.",
    "",
    "Experience",
    "Frontend Developer, Lumen Books (Jun 2023 to Present)",
    "- Built the checkout and order tracking screens in React with Redux.",
    "- Integrated payment and auth APIs from Razorpay and Auth0 into the checkout.",
    "- Wrote unit tests with Jest and reviewed pull requests in Git.",
    "- Worked in two-week Agile sprints with designers in Figma.",
    "",
    "Junior Web Developer, Kite Travel (Jul 2022 to May 2023)",
    "- Built responsive landing pages with HTML and CSS.",
    "- Kept the shared component library in sync with the design tokens.",
    "",
    "Education",
    "B.E. Computer Engineering, Savitribai Phule Pune University, 2018 to 2022",
    "",
    "Skills",
    "React, JavaScript, Redux, HTML, CSS, Jest, Git, Figma",
]

# Version 2: TypeScript and accessibility added, and a line that shows communication.
MEERA_RESUME_V2 = [
    "Meera Iyer",
    "Frontend Developer | Pune, India | meera.iyer@example.test",
    "",
    "Summary",
    "Frontend developer with 3 years of experience building booking and payment screens in React and TypeScript for travel products.",
    "",
    "Experience",
    "Frontend Developer, Lumen Books (Jun 2023 to Present)",
    "- Built the checkout and order tracking screens in React with Redux.",
    "- Moved the checkout to TypeScript and fixed its accessibility issues to meet WCAG 2.1 AA.",
    "- Integrated payment and auth APIs from Razorpay and Auth0 into the checkout.",
    "- Wrote unit tests with Jest and reviewed pull requests in Git.",
    "- Worked in two-week Agile sprints with designers in Figma.",
    "- Presented the release notes to the support and sales teams after every sprint.",
    "",
    "Junior Web Developer, Kite Travel (Jul 2022 to May 2023)",
    "- Built responsive landing pages with HTML and CSS.",
    "- Kept the shared component library in sync with the design tokens.",
    "",
    "Education",
    "B.E. Computer Engineering, Savitribai Phule Pune University, 2018 to 2022",
    "",
    "Skills",
    "React, TypeScript, JavaScript, Redux, HTML, CSS, Jest, Git, Figma, Accessibility (WCAG)",
]

MEERA_DESIGN_RESUME = [
    "Meera Iyer",
    "UI Designer and Frontend Developer | Pune, India",
    "",
    "Profile",
    "I design and build interfaces for travel and booking products, from Figma prototypes to React components.",
    "",
    "Selected work",
    "- Lumen Books checkout: research, Figma prototypes and the React build (2023 to 2026).",
    "- Kite Travel landing pages: responsive design in HTML and CSS (2022).",
    "",
    "Tools",
    "Figma, Storybook, React, CSS, Git",
]

ARJUN_RESUME = [
    "Arjun Mehta",
    "Backend Developer | Bengaluru, India | arjun.mehta@example.test",
    "",
    "Experience",
    "Backend Developer, Harbor Labs (2021 to Present)",
    "- Built shipment tracking services in Node.js with PostgreSQL and Redis.",
    "- Deployed the services with Docker and GitHub Actions on AWS.",
    "",
    "Skills",
    "Node.js, TypeScript, PostgreSQL, Redis, Docker, AWS",
]

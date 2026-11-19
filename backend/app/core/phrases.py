# Two-word job-ad terms that are one idea, so the keyword list counts each as one keyword
# ("pull requests", not "pull" and "requests"). A term counts only when its two words stand side
# by side in the job (app/core/matching.py, job_keywords).
#
# Like the skills dictionary, the list is precise rather than complete. It holds only terms whose
# two words are both keyword words: a term with a common word in it ("code review", "user stories")
# can never split into two keywords, because that word is never a keyword.
#
# Written in plain words; matching.py compares them by stem, so "release note" and "release notes"
# are the same term.

PHRASES = [
    "pull requests",
    "error states",
    "loading states",
    "empty states",
    "error handling",
    "edge cases",
    "release notes",
    "technical debt",
    "open source",
    "page speed",
    "page load",
    "load times",
    "sprint planning",
    "component library",
    "dark mode",
    "incident response",
    "on-call rotation",
]

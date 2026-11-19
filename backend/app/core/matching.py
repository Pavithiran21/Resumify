"""
The match rules: everything about a match except the AI call and the database.

A match has four steps (BACKEND.md, "Signature feature design"):
  1. analyse()  finds the job's skills (from the skills dictionary), which of them the resume
                names word for word, the job's keywords and the years of experience it asks for.
  2. The AI model is asked about the skills the resume doesn't name word for word, skills the
     dictionary missed, and the years of experience (app/services/match_assessment.py).
  3. combine()  merges the two. The AI can only move a skill to "matched" by quoting the
                resume, and the quote is checked against the resume text; an extra skill must
                quote the job the same way.
  4. compute_score() works out the score from the merged result. The model never gives the
                score, so the same inputs always give the same score.
Everything here is plain functions over text, so it is easy to test and to reason about.
"""

import hashlib
import re
from dataclasses import dataclass, field
from fractions import Fraction

from app.core.phrases import PHRASES
from app.core.skills import SKILL_WORDS, find_skills
from app.core.stopwords import STOPWORDS
from app.schemas.assessment import AiAssessment

# Bump when the prompt or these rules change, so an earlier AI answer is never reused for them.
PROMPT_VERSION = "match-v1"

SKILLS_WEIGHT = 60
KEYWORDS_WEIGHT = 25
EXPERIENCE_WEIGHT = 15

MAX_KEYWORDS = 20
MAX_EXTRA_SKILLS = 6
MAX_QUOTE_LENGTH = 160
# A quote shorter than this proves nothing ("a", "and"), so it doesn't count as evidence.
MIN_EVIDENCE_LENGTH = 8

# Owner's bands (8 Nov 2026): 85 and above is a perfect match.
VERDICTS = [(85, "perfect"), (60, "good"), (40, "fair"), (0, "weak")]

SENTENCE_END = re.compile(r"\n|[.!?;](?=\s)")
WORD = re.compile(r"[A-Za-z][A-Za-z'-]*[A-Za-z]")
# Two words stand side by side when only spaces or tabs are between them: no punctuation, no line break.
SIDE_BY_SIDE = re.compile(r"[ \t]+")
REQUIRED_YEARS = re.compile(
    r"(?<![\d.])(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:years?|yrs?)(?![A-Za-z])", re.IGNORECASE
)
CALENDAR_YEAR = re.compile(r"(?<!\d)(19[7-9]\d|20\d\d)(?!\d)")


@dataclass
class JobSkill:
    name: str
    job_quote: str
    # Where the resume names the skill word for word; None when it doesn't.
    resume_quote: str | None


@dataclass
class Keyword:
    # How it is shown: one word, or a two-word phrase such as "pull requests".
    word: str
    # The stem of each word, used to find it in the resume and to compare it with skills.
    stems: tuple[str, ...]
    in_resume: bool


@dataclass
class Analysis:
    job_skills: list[JobSkill]
    # Every keyword candidate, most repeated first. combine() keeps the first 20 that don't
    # repeat a skill of the result.
    keywords: list[Keyword]
    required_years: int | None
    # The most years of work the resume's own dates allow (earliest year written in it up to
    # now), used to cap the model's estimate. None when the resume has no years at all.
    resume_year_limit: int | None


@dataclass
class MatchResult:
    score: int
    verdict: str
    summary: str
    skills: list[dict]
    keywords_matched: list[str]
    keywords_missing: list[str]
    resume_years: int | None
    required_years: int | None
    suggestions: list[str] = field(default_factory=list)

    @property
    def skills_matched(self) -> int:
        return sum(1 for skill in self.skills if skill["status"] == "matched")


# ---------- Step 1: analyse the texts ----------


def quote_around(text: str, start: int, end: int) -> str:
    """
    The sentence (or line) around text[start:end], at most 160 characters, cut at whole words.
    It is always a slice of the original text, so it can be shown as a true quote.
    """
    sentence_start = 0
    sentence_end = len(text)
    for boundary in SENTENCE_END.finditer(text):
        if boundary.end() <= start:
            sentence_start = boundary.end()
        elif boundary.start() >= end:
            sentence_end = boundary.start() if boundary.group(0) == "\n" else boundary.end()
            break

    if sentence_end - sentence_start > MAX_QUOTE_LENGTH:
        room = (MAX_QUOTE_LENGTH - (end - start)) // 2
        window_start = max(sentence_start, start - room)
        window_end = min(sentence_end, end + room)
        # Drop the part-words left at a cut edge.
        if window_start > sentence_start:
            space = text.find(" ", window_start, start)
            window_start = space + 1 if space != -1 else window_start
        if window_end < sentence_end:
            space = text.rfind(" ", end, window_end)
            window_end = space if space != -1 else window_end
        sentence_start, sentence_end = window_start, window_end

    quote = text[sentence_start:sentence_end]
    # Bullet marks and spaces at the edges are not part of the quote.
    return quote.strip(" \t\n•·*-–—")


def _stem(word: str) -> str:
    """A very small stemmer, enough to treat "stakeholders" and "stakeholder" as one keyword."""
    word = word.lower()
    if word.endswith("'s"):
        word = word[:-2]
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("s") and not word.endswith("ss") and len(word) > 4:
        return word[:-1]
    return word


def _is_keyword(word: str, stem: str, ignored_stems: set[str]) -> bool:
    if len(word) < 4 or stem in ignored_stems:
        return False
    return not (word in STOPWORDS or stem in STOPWORDS or word in SKILL_WORDS or stem in SKILL_WORDS)


def _words(text: str) -> list[tuple[re.Match, str, str]]:
    """Every word of the text in order, as (match, lower-case word, stem)."""
    return [(match, match.group(0).lower(), _stem(match.group(0))) for match in WORD.finditer(text)]


def _side_by_side(text: str, first: re.Match, second: re.Match) -> bool:
    return SIDE_BY_SIDE.fullmatch(text[first.end():second.start()]) is not None


# The two-word terms of app/core/phrases.py, by stem.
PHRASE_STEMS = {tuple(_stem(word) for word in phrase.split()) for phrase in PHRASES}


def _side_by_side_pairs(text: str) -> set[tuple[str, str]]:
    """Every (stem, next stem) of two words that stand side by side in the text."""
    words = _words(text)
    return {(a[2], b[2]) for a, b in zip(words, words[1:]) if _side_by_side(text, a[0], b[0])}


def job_keywords(job_text: str, ignored_words: str = "") -> list[tuple[tuple[str, ...], str]]:
    """
    Every keyword candidate of the job, as (stems, shown as), most repeated first; ties keep the
    order they first appear in the job.

    A candidate is a word that is not a skill or a common word, or one of the two-word terms in
    app/core/phrases.py when its words stand side by side ("pull requests" is one keyword, not
    "pull" and "requests"). Both words of a term must be keyword words here too.

    Words of ignored_words (the job title and company) are left out: every resume sent to
    "Frontend Developer at Northwind" would otherwise score for "frontend", "developer" and "northwind".
    """
    ignored_stems = {_stem(match.group(0)) for match in WORD.finditer(ignored_words)}
    words = _words(job_text)
    eligible = [_is_keyword(word, stem, ignored_stems) for _, word, stem in words]

    counts: dict[tuple[str, ...], int] = {}
    shown_as: dict[tuple[str, ...], str] = {}
    index = 0
    while index < len(words):
        match, word, stem = words[index]
        if not eligible[index]:
            index += 1
            continue
        key, shown, size = (stem,), word, 1
        if index + 1 < len(words) and eligible[index + 1]:
            next_match, next_word, next_stem = words[index + 1]
            if (stem, next_stem) in PHRASE_STEMS and _side_by_side(job_text, match, next_match):
                key, shown, size = (stem, next_stem), f"{word} {next_word}", 2
        counts[key] = counts.get(key, 0) + 1
        shown_as.setdefault(key, shown)
        index += size

    # sorted() keeps the first-seen order for equal counts, because dicts keep insertion order.
    ranked = sorted(counts, key=lambda key: -counts[key])
    return [(key, shown_as[key]) for key in ranked]


def required_years(job_text: str) -> int | None:
    """The most years the job asks for ("3+ years", "2-4 yrs" counts as 2), or None."""
    numbers = [int(match.group(1)) for match in REQUIRED_YEARS.finditer(job_text)]
    sensible = [number for number in numbers if 1 <= number <= 30]
    return max(sensible) if sensible else None


def resume_year_limit(resume_text: str, current_year: int) -> int | None:
    years = [int(year) for year in CALENDAR_YEAR.findall(resume_text) if int(year) <= current_year]
    if not years:
        return None
    return current_year - min(years) + 1


def analyse(job_text: str, resume_text: str, current_year: int, job_title: str = "", company: str | None = None) -> Analysis:
    job_skills = []
    resume_matches = dict(find_skills(resume_text))
    for name, job_match in find_skills(job_text):
        resume_match = resume_matches.get(name)
        resume_quote = quote_around(resume_text, resume_match.start(), resume_match.end()) if resume_match else None
        job_skills.append(JobSkill(name, quote_around(job_text, job_match.start(), job_match.end()), resume_quote))

    # A word is found when the resume has the same stem; a phrase when its two words stand side by side.
    resume_stems = {stem for _, _, stem in _words(resume_text)}
    resume_pairs = _side_by_side_pairs(resume_text)
    title_and_company = f"{job_title} {company or ''}"
    keywords = [
        Keyword(shown, stems, stems[0] in resume_stems if len(stems) == 1 else stems in resume_pairs)
        for stems, shown in job_keywords(job_text, title_and_company)
    ]

    return Analysis(
        job_skills=job_skills,
        keywords=keywords,
        required_years=required_years(job_text),
        resume_year_limit=resume_year_limit(resume_text, current_year),
    )


# ---------- Step 3: check the AI's answer and merge it ----------


def normalise_for_search(text: str) -> str:
    """Lower case, straight quotes and dashes, single spaces: how a quote is looked up in a text."""
    text = text.lower()
    for fancy, plain in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'), ("–", "-"), ("—", "-"), ("•", " ")):
        text = text.replace(fancy, plain)
    return " ".join(text.split())


def is_real_quote(quote: str | None, normalised_text: str) -> bool:
    """True only when the quote really appears in the text. This is how a made-up quote is caught."""
    if not quote:
        return False
    needle = normalise_for_search(quote).strip(" .,;:'\"")
    return len(needle) >= MIN_EVIDENCE_LENGTH and needle in normalised_text


def _skill(name: str, status: str, matched_by: str | None, job_quote: str, resume_quote: str | None, reason: str) -> dict:
    return {
        "name": name,
        "status": status,
        "matchedBy": matched_by,
        "jobQuote": job_quote,
        "resumeQuote": resume_quote,
        "reason": reason,
    }


def _merge_job_skills(analysis: Analysis, assessment: AiAssessment, resume_search: str) -> list[dict]:
    ai_answers = {answer.name.casefold(): answer for answer in assessment.skills}
    merged = []
    for job_skill in analysis.job_skills:
        answer = ai_answers.get(job_skill.name.casefold())

        if job_skill.resume_quote is not None:
            # Named word for word in the resume: matched, whatever the model says.
            reason = answer.reason if answer and answer.in_resume and answer.reason else f"Your resume names {job_skill.name}, which the job asks for."
            merged.append(_skill(job_skill.name, "matched", "text", job_skill.job_quote, job_skill.resume_quote, reason))
        elif answer and answer.in_resume and is_real_quote(answer.resume_quote, resume_search):
            # Shown in other words, and the model quoted the resume correctly.
            reason = answer.reason or f"Your resume shows {job_skill.name} in other words."
            merged.append(_skill(job_skill.name, "matched", "ai", job_skill.job_quote, answer.resume_quote, reason))
        else:
            reason = answer.reason if answer and not answer.in_resume and answer.reason else f"The job asks for {job_skill.name}, but your resume doesn't mention it."
            merged.append(_skill(job_skill.name, "missing", None, job_skill.job_quote, None, reason))
    return merged


def _merge_extra_skills(assessment: AiAssessment, known: set[str], job_search: str, resume_search: str) -> list[dict]:
    """Skills the dictionary missed: kept only when the model quotes the job correctly."""
    merged = []
    for extra in assessment.extra_skills:
        if len(merged) == MAX_EXTRA_SKILLS:
            break
        if extra.name.casefold() in known or not is_real_quote(extra.job_quote, job_search):
            continue
        known.add(extra.name.casefold())

        if extra.in_resume and is_real_quote(extra.resume_quote, resume_search):
            reason = extra.reason or f"Your resume shows {extra.name} in other words."
            merged.append(_skill(extra.name, "matched", "ai", extra.job_quote, extra.resume_quote, reason))
        else:
            reason = extra.reason if not extra.in_resume and extra.reason else f"The job asks for {extra.name}, but your resume doesn't mention it."
            merged.append(_skill(extra.name, "missing", None, extra.job_quote, None, reason))
    return merged


def _resume_years(assessment: AiAssessment, analysis: Analysis) -> int | None:
    """The model's estimate in whole years, never more than the resume's own dates allow."""
    if assessment.experience_years is None or analysis.resume_year_limit is None:
        return None
    years = int(Fraction(assessment.experience_years) + Fraction(1, 2))
    return min(years, analysis.resume_year_limit)


def _fallback_suggestions(skills: list[dict], keywords_missing: list[str]) -> list[str]:
    suggestions = [
        f"If you've used {skill['name']}, add it to a role on your resume with one concrete result."
        for skill in skills
        if skill["status"] == "missing"
    ][:3]
    if keywords_missing:
        suggestions.append(f"Use the job's own words where they are true for you: {', '.join(keywords_missing[:3])}.")
    return suggestions


FALLBACK_SUMMARIES = {
    "perfect": "You fit this role very well.",
    "good": "You fit a good part of this role; a few gaps remain.",
    "fair": "You fit some of this role; several skills are missing.",
    "weak": "This role asks for a lot your resume doesn't show yet.",
}


def _skill_word_stems(skills: list[dict], job_search: str) -> set[str]:
    """
    The stemmed words of the result's skills, so no keyword counts a skill a second time.
    A skill's name counts only when it appears word for word in the job: a name the AI made up
    can't remove keywords. (Words of the skills dictionary are already left out in step 1.)
    """
    stems: set[str] = set()
    for skill in skills:
        if normalise_for_search(skill["name"]) in job_search:
            stems.update(_stem(match.group(0)) for match in WORD.finditer(skill["name"]))
    return stems


def _result_keywords(analysis: Analysis, skills: list[dict], job_search: str) -> list[Keyword]:
    """The first 20 candidates that share no word with a skill of the result."""
    skill_stems = _skill_word_stems(skills, job_search)
    kept = [keyword for keyword in analysis.keywords if not skill_stems.intersection(keyword.stems)]
    return kept[:MAX_KEYWORDS]


def combine(analysis: Analysis, assessment: AiAssessment, job_text: str, resume_text: str) -> MatchResult:
    job_search = normalise_for_search(job_text)
    resume_search = normalise_for_search(resume_text)

    skills = _merge_job_skills(analysis, assessment, resume_search)
    known = {skill["name"].casefold() for skill in skills}
    skills += _merge_extra_skills(assessment, known, job_search, resume_search)

    keywords = _result_keywords(analysis, skills, job_search)
    keywords_matched = [keyword.word for keyword in keywords if keyword.in_resume]
    keywords_missing = [keyword.word for keyword in keywords if not keyword.in_resume]
    resume_years = _resume_years(assessment, analysis)

    skills_matched = sum(1 for skill in skills if skill["status"] == "matched")
    score = compute_score(skills_matched, len(skills), len(keywords_matched), len(keywords), resume_years, analysis.required_years)
    verdict = verdict_for(score)

    return MatchResult(
        score=score,
        verdict=verdict,
        summary=assessment.summary or FALLBACK_SUMMARIES[verdict],
        skills=skills,
        keywords_matched=keywords_matched,
        keywords_missing=keywords_missing,
        resume_years=resume_years,
        required_years=analysis.required_years,
        suggestions=assessment.suggestions or _fallback_suggestions(skills, keywords_missing),
    )


# ---------- Step 4: the score ----------


def compute_score(
    skills_matched: int,
    skills_total: int,
    keywords_matched: int,
    keywords_total: int,
    resume_years: int | None,
    required_years: int | None,
) -> int:
    """
    0 to 100: skills count 60, keywords 25 and experience 15. A part the job doesn't have (no
    skills found, no years asked for) is left out and the others are scaled up, so a job that
    asks for no years doesn't cap the score at 85. Fractions keep the sum exact; the result is
    rounded half up, so 81.5 is 82 on every machine.
    """
    parts: list[tuple[int, Fraction]] = []
    if skills_total:
        parts.append((SKILLS_WEIGHT, Fraction(skills_matched, skills_total)))
    if keywords_total:
        parts.append((KEYWORDS_WEIGHT, Fraction(keywords_matched, keywords_total)))
    if required_years:
        experience = Fraction(min(resume_years or 0, required_years), required_years)
        parts.append((EXPERIENCE_WEIGHT, experience))
    if not parts:
        return 0

    total_weight = sum(weight for weight, _ in parts)
    value = sum(weight * share for weight, share in parts) * 100 / total_weight
    return int(value + Fraction(1, 2))


def verdict_for(score: int) -> str:
    for lowest, verdict in VERDICTS:
        if score >= lowest:
            return verdict
    return "weak"


def input_hash(api_url: str, model: str, job_title: str, job_text: str, resume_text: str) -> str:
    """
    Identifies one exact set of inputs: same prompt version, API, model, job and resume text. A
    run with the same hash reuses the stored AI answer, so it costs no quota and scores the same.
    The API address is part of it because the local stub and Groq can answer under the same model name:
    a stub's answer must never be reused as Groq's, or the other way round.
    Each part is prefixed with its length, so two different splits can never give the same string.
    """
    parts = [PROMPT_VERSION, api_url.rstrip("/"), model, job_title, job_text, resume_text]
    joined = "".join(f"{len(part)}:{part}" for part in parts)
    return hashlib.sha256(joined.encode()).hexdigest()


# ---------- Compare two runs ----------


def compare_skills(older: list[dict], newer: list[dict]) -> tuple[list[dict], list[str]]:
    """The skills whose status changed between two runs, and the skills missing in both."""
    older_status = {skill["name"].casefold(): skill["status"] for skill in older}
    newer_status = {skill["name"].casefold(): skill["status"] for skill in newer}
    names = {skill["name"].casefold(): skill["name"] for skill in older + newer}

    changes = []
    still_missing = []
    for key, name in names.items():
        before = older_status.get(key)
        after = newer_status.get(key)
        if before != after:
            changes.append({"name": name, "first": before, "second": after})
        elif after == "missing":
            still_missing.append(name)
    return changes, still_missing

import re
from dataclasses import dataclass

# The skills Resumify finds word for word, each with the ways people write it. The list is
# precise rather than complete: words that are also plain English ("Go", "Express", "Spark",
# "rest", "Excel") only count in a longer, unambiguous form. A skill written in other words
# ("built REST services in Express" for Node.js) is left to the AI step, which must quote the
# resume (see app/core/matching.py).
#
# Aliases are case-insensitive. An alias that starts with "=" must match its exact case, for
# names that are only a skill when capitalised (Swift, Rust).
SKILLS: dict[str, list[str]] = {
    # Languages
    "JavaScript": ["javascript", "es6", "ecmascript"],
    "TypeScript": ["typescript"],
    "Python": ["python"],
    "Java": ["java"],
    "Kotlin": ["kotlin"],
    "Swift": ["=Swift", "swiftui"],
    "C#": ["c#", "csharp"],
    "C++": ["c++", "cpp"],
    "Go": ["golang"],
    "Rust": ["=Rust"],
    "PHP": ["php"],
    "Ruby": ["ruby"],
    "Scala": ["scala"],
    "Dart": ["dart"],
    "SQL": ["sql"],
    "Bash": ["bash", "shell scripting"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3"],
    "Sass": ["sass", "scss"],
    # Frontend
    "React": ["react", "react.js", "reactjs"],
    "Next.js": ["next.js", "nextjs"],
    "Vue.js": ["vue", "vue.js", "vuejs"],
    "Angular": ["angular"],
    "Svelte": ["svelte", "sveltekit"],
    "Redux": ["redux", "redux toolkit"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],
    "Webpack": ["webpack"],
    "Vite": ["vite"],
    "React Native": ["react native"],
    "Flutter": ["flutter"],
    "Accessibility": ["accessibility", "a11y", "wcag"],
    "Web performance": ["web performance", "core web vitals", "lighthouse", "performance optimization", "performance optimisation"],
    "Responsive design": ["responsive design", "responsive web design", "mobile-first"],
    # Backend
    "Node.js": ["node.js", "nodejs", "node"],
    "Express": ["express.js", "expressjs"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi"],
    "Spring Boot": ["spring boot", "spring framework"],
    ".NET": [".net", "asp.net", "dotnet"],
    "Ruby on Rails": ["ruby on rails", "rails"],
    "Laravel": ["laravel"],
    "REST APIs": ["rest api", "rest apis", "restful", "rest services", "rest endpoints"],
    "GraphQL": ["graphql"],
    "gRPC": ["grpc"],
    "Microservices": ["microservices", "microservice"],
    "WebSockets": ["websocket", "websockets"],
    "OAuth": ["oauth", "oauth2", "openid connect"],
    # Data
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Elasticsearch": ["elasticsearch"],
    "DynamoDB": ["dynamodb"],
    "Kafka": ["kafka"],
    "RabbitMQ": ["rabbitmq"],
    "Apache Spark": ["apache spark", "pyspark", "spark sql"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Machine learning": ["machine learning", "ml"],
    "Deep learning": ["deep learning"],
    "TensorFlow": ["tensorflow"],
    "PyTorch": ["pytorch"],
    "LLMs": ["llm", "llms", "large language models", "generative ai"],
    "Data analysis": ["data analysis", "data analytics"],
    "ETL": ["etl"],
    "Power BI": ["power bi"],
    "Tableau": ["tableau"],
    "Excel": ["microsoft excel", "ms excel", "advanced excel", "excel spreadsheets"],
    # Cloud and DevOps
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure"],
    "Google Cloud": ["gcp", "google cloud"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous delivery", "continuous deployment"],
    "GitHub Actions": ["github actions"],
    "Jenkins": ["jenkins"],
    "Linux": ["linux"],
    "Nginx": ["nginx"],
    "Serverless": ["serverless", "aws lambda"],
    "Git": ["git"],
    # Testing
    "Unit testing": ["unit testing", "unit tests"],
    "Jest": ["jest"],
    "Vitest": ["vitest"],
    "Cypress": ["cypress"],
    "Playwright": ["playwright"],
    "Selenium": ["selenium"],
    "JUnit": ["junit"],
    "pytest": ["pytest"],
    "Test automation": ["test automation", "automated testing", "automated tests"],
    "TDD": ["tdd", "test-driven development"],
    # Design
    "Figma": ["figma"],
    "UI design": ["ui design", "user interface design"],
    "UX design": ["ux", "ux design", "user experience"],
    "Design systems": ["design system", "design systems"],
    "Storybook": ["storybook"],
    # Ways of working
    "Agile": ["agile"],
    "Scrum": ["scrum"],
    "Kanban": ["kanban"],
    "Jira": ["jira"],
    "Code review": ["code review", "code reviews"],
    "System design": ["system design"],
    "Web security": ["owasp", "web security", "application security"],
    "Project management": ["project management"],
    "Product management": ["product management"],
    "SEO": ["seo", "search engine optimization", "search engine optimisation"],
    # People skills
    "Communication": ["communication", "communication skills"],
    "Leadership": ["leadership"],
    "Mentoring": ["mentoring", "mentored", "mentor"],
    "Stakeholder management": ["stakeholder management", "stakeholders"],
    "Problem solving": ["problem solving", "problem-solving"],
    "Customer service": ["customer service", "customer support"],
}

# A skill is never part of a longer word: "java" doesn't match inside "javascript" and "ml"
# doesn't match inside "html". "+" and "#" count as letters here, so "c" never matches "c++".
_BEFORE = r"(?<![A-Za-z0-9+#])"
_AFTER = r"(?![A-Za-z0-9+#])"


@dataclass(frozen=True)
class SkillPattern:
    name: str
    patterns: tuple[re.Pattern, ...]

    def first_match(self, text: str) -> re.Match | None:
        """The earliest place in the text where any way of writing this skill appears."""
        earliest = None
        for pattern in self.patterns:
            match = pattern.search(text)
            if match is not None and (earliest is None or match.start() < earliest.start()):
                earliest = match
        return earliest


def _alias_regex(alias: str) -> str:
    # Spaces and hyphens are interchangeable: "test driven", "test-driven" and "test  driven".
    words = re.split(r"[\s-]+", alias)
    return _BEFORE + r"[\s-]+".join(re.escape(word) for word in words) + _AFTER


def _compile(name: str, aliases: list[str]) -> SkillPattern:
    any_case = [_alias_regex(alias) for alias in aliases if not alias.startswith("=")]
    exact_case = [_alias_regex(alias[1:]) for alias in aliases if alias.startswith("=")]
    patterns = []
    if any_case:
        patterns.append(re.compile("|".join(any_case), re.IGNORECASE))
    if exact_case:
        patterns.append(re.compile("|".join(exact_case)))
    return SkillPattern(name=name, patterns=tuple(patterns))


SKILL_PATTERNS = [_compile(name, aliases) for name, aliases in SKILLS.items()]

# Every word used in a skill alias: these are skills, so the keyword list leaves them out.
SKILL_WORDS = frozenset(
    word for aliases in SKILLS.values() for alias in aliases for word in re.findall(r"[a-z]+", alias.lower().lstrip("="))
)


def find_skills(text: str) -> list[tuple[str, re.Match]]:
    """Every dictionary skill in the text with its first match, in the order they first appear."""
    found = []
    for skill in SKILL_PATTERNS:
        match = skill.first_match(text)
        if match is not None:
            found.append((skill.name, match))
    found.sort(key=lambda item: item[1].start())
    return found


def find_skill(name: str, text: str) -> re.Match | None:
    for skill in SKILL_PATTERNS:
        if skill.name == name:
            return skill.first_match(text)
    return None

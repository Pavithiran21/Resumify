import asyncio
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger("resumify.llm")

RETRY_DELAY_SECONDS = 1.0
# The longest wait a 429's Retry-After may ask for before the one retry. Groq's free tier
# limits tokens per minute, so a busy minute often frees up within a few seconds.
MAX_RETRY_WAIT_SECONDS = 10.0
# The model's whole answer. A reasoning model (gpt-oss) also spends these on its thinking,
# which is why LLM_REASONING_EFFORT=low is set for it.
MAX_ANSWER_TOKENS = 2500


class LlmUnavailable(Exception):
    """The model didn't give an answer: timeout, network error, error status or an empty reply."""


def _is_worth_retrying(status: int) -> bool:
    # Too many requests and server errors can pass; a 400 or 401 will fail the same way again.
    return status == 429 or status >= 500


def _retry_wait(response: httpx.Response | None) -> float:
    """A 429 says how long to wait (Retry-After, in seconds); otherwise a short pause."""
    if response is not None and response.status_code == 429:
        try:
            return min(float(response.headers.get("retry-after", RETRY_DELAY_SECONDS)), MAX_RETRY_WAIT_SECONDS)
        except ValueError:
            return RETRY_DELAY_SECONDS
    return RETRY_DELAY_SECONDS


async def chat_json(system_prompt: str, user_prompt: str) -> str:
    """
    Sends one chat request to the OpenAI-compatible API in LLM_BASE_URL (Groq, or the local stub e2e/mocks/llm-stub.js in
    tests and demos) and returns the model's reply text, which should be a JSON object. Every
    call has a timeout and one retry after a short pause for a timeout, a network error, a 429
    or a 5xx. The prompt and the reply hold resume text, so neither is ever logged.
    """
    settings = get_settings()
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    body = {
        "model": settings.llm_model,
        # 0: the most likely answer every time, as repeatable as the model allows.
        "temperature": 0,
        "max_tokens": MAX_ANSWER_TOKENS,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
    }
    # Only reasoning models (Groq's gpt-oss) know this setting, so it is sent only when set.
    if settings.llm_reasoning_effort:
        body["reasoning_effort"] = settings.llm_reasoning_effort

    for attempt in (1, 2):
        response = None
        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                response = await client.post(url, json=body, headers=headers)
        except httpx.HTTPError as error:
            logger.warning("LLM request failed (attempt %d): %s", attempt, type(error).__name__)
        else:
            if response.status_code == 200:
                return _reply_text(response)
            logger.warning("LLM answered with status %d (attempt %d)", response.status_code, attempt)
            if not _is_worth_retrying(response.status_code):
                break

        if attempt == 1:
            await asyncio.sleep(_retry_wait(response))

    raise LlmUnavailable()


def _reply_text(response: httpx.Response) -> str:
    try:
        choice = response.json()["choices"][0]
        content = choice["message"]["content"]
        finish_reason = choice.get("finish_reason")
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        logger.warning("LLM reply is not a chat completion")
        raise LlmUnavailable() from None
    if finish_reason == "length":
        # The answer was cut off at MAX_ANSWER_TOKENS. Even if what's left still parses, keys
        # are missing, and a half answer must never be saved and reused for these inputs.
        logger.warning("LLM reply was cut off at the token limit")
        raise LlmUnavailable()
    if not isinstance(content, str) or not content.strip():
        logger.warning("LLM reply is empty")
        raise LlmUnavailable()
    return content

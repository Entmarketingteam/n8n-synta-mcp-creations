"""Exponential-backoff retry helper.

Wraps a callable and retries on exception with delays 2s, 4s, 8s, 16s...
(base_delay * 2**n), matching the ENT git-retry convention. The sleeper is
injectable so tests run instantly.
"""
from __future__ import annotations

import time
from typing import Callable, Iterable, TypeVar

T = TypeVar("T")


def retry_call(
    fn: Callable[[], T],
    *,
    attempts: int,
    base_delay: float,
    exceptions: Iterable[type[BaseException]] = (Exception,),
    on_retry: Callable[[int, float, BaseException], None] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    exc_tuple = tuple(exceptions)
    last: BaseException | None = None
    for attempt in range(1, max(1, attempts) + 1):
        try:
            return fn()
        except exc_tuple as exc:
            last = exc
            if attempt >= attempts:
                break
            delay = base_delay * (2 ** (attempt - 1))
            if on_retry:
                on_retry(attempt, delay, exc)
            sleep(delay)
    assert last is not None
    raise last

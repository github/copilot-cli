"""Pairing PIN helpers and per-address brute-force throttling."""

from __future__ import annotations

import secrets
import time
from collections import defaultdict, deque


PIN_LENGTH = 6


def generate_pairing_pin() -> str:
    """Return a zero-padded, cryptographically random six-digit PIN."""
    return f"{secrets.randbelow(10**PIN_LENGTH):0{PIN_LENGTH}d}"


def is_valid_pin(pin: object) -> bool:
    return isinstance(pin, str) and len(pin) == PIN_LENGTH and pin.isascii() and pin.isdigit()


class PinAttemptLimiter:
    """Temporarily throttle repeated bad PIN attempts from one client address."""

    def __init__(
        self,
        max_attempts: int = 5,
        window_seconds: float = 60,
        lockout_seconds: float = 60,
        clock=time.monotonic,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._clock = clock
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._locked_until: dict[str, float] = {}

    def is_blocked(self, address: str) -> bool:
        now = self._clock()
        locked_until = self._locked_until.get(address, 0)
        if now < locked_until:
            return True
        if locked_until:
            self._locked_until.pop(address, None)

        attempts = self._attempts[address]
        while attempts and now - attempts[0] >= self.window_seconds:
            attempts.popleft()
        return False

    def record_failure(self, address: str) -> None:
        now = self._clock()
        attempts = self._attempts[address]
        while attempts and now - attempts[0] >= self.window_seconds:
            attempts.popleft()
        attempts.append(now)
        if len(attempts) >= self.max_attempts:
            self._locked_until[address] = now + self.lockout_seconds
            attempts.clear()

    def record_success(self, address: str) -> None:
        self._attempts.pop(address, None)
        self._locked_until.pop(address, None)

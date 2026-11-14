from adju_phone_camera.pairing import PinAttemptLimiter, generate_pairing_pin, is_valid_pin


def test_generated_pin_is_six_ascii_digits():
    pin = generate_pairing_pin()

    assert len(pin) == 6
    assert pin.isascii()
    assert pin.isdigit()


def test_pin_validation_rejects_non_six_digit_values():
    assert is_valid_pin("000001")
    assert not is_valid_pin("12345")
    assert not is_valid_pin("1234567")
    assert not is_valid_pin("１２３４５６")
    assert not is_valid_pin(None)


def test_limiter_blocks_after_threshold_and_expires():
    now = [0.0]
    limiter = PinAttemptLimiter(max_attempts=2, window_seconds=30, lockout_seconds=10, clock=lambda: now[0])

    assert not limiter.is_blocked("192.168.1.4")
    limiter.record_failure("192.168.1.4")
    limiter.record_failure("192.168.1.4")
    assert limiter.is_blocked("192.168.1.4")
    now[0] = 10.1
    assert not limiter.is_blocked("192.168.1.4")


def test_success_clears_previous_failures():
    now = [0.0]
    limiter = PinAttemptLimiter(max_attempts=2, clock=lambda: now[0])
    limiter.record_failure("phone")
    limiter.record_success("phone")
    limiter.record_failure("phone")

    assert not limiter.is_blocked("phone")

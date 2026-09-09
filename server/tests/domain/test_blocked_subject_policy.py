from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy


def test_parse_empty_and_whitespace_are_empty():
    assert BlockedSubjectPolicy.parse("") == frozenset()
    assert BlockedSubjectPolicy.parse("  ") == frozenset()


def test_parse_skips_malformed_entries():
    raw = " google:1234 , ,microsoft:abcd ,bogus, :x, y: "
    assert BlockedSubjectPolicy.parse(raw) == frozenset({"google:1234", "microsoft:abcd"})


def test_parse_lowercases_provider_only():
    assert BlockedSubjectPolicy.parse("GOOGLE:AbC") == frozenset({"google:AbC"})


def test_is_blocked_matches_provider_case_insensitively():
    policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    assert policy.is_blocked("google", "sub-blocked") is True
    assert policy.is_blocked("GOOGLE", "sub-blocked") is True
    assert policy.is_blocked("google", "sub-other") is False
    assert policy.is_blocked("microsoft", "sub-blocked") is False

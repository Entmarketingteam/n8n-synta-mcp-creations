"""Offline tests — no network, no Airtable. Run: python -m pytest (or unittest)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config  # noqa: E402
from substack_client import parse_feed, html_to_markdown  # noqa: E402
from retry import retry_call  # noqa: E402
from health import FailureTracker  # noqa: E402
import watcher  # noqa: E402

SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Arbitrage Andy</title>
    <item>
      <title>First Post</title>
      <link>https://arbitrage-andy.substack.com/p/first-post</link>
      <guid>https://arbitrage-andy.substack.com/p/first-post</guid>
      <pubDate>Mon, 30 Jun 2026 12:00:00 GMT</pubDate>
      <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Andy</dc:creator>
      <content:encoded><![CDATA[<h1>Hello</h1><p>This is <strong>bold</strong>.</p>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://arbitrage-andy.substack.com/p/second-post</link>
      <guid>https://arbitrage-andy.substack.com/p/second-post</guid>
      <pubDate>Tue, 01 Jul 2026 12:00:00 GMT</pubDate>
      <content:encoded><![CDATA[<p>Second body</p>]]></content:encoded>
    </item>
  </channel>
</rss>"""


class FakeStore:
    def __init__(self, already_seen=None):
        self._seen = set(already_seen or [])
        self.saved = []

    def seen(self, guid):
        return guid in self._seen

    def save(self, post):
        self.saved.append(post)
        self._seen.add(post.guid)


class ParseTests(unittest.TestCase):
    def test_parse_extracts_posts(self):
        posts = parse_feed(SAMPLE_RSS, "arbitrage-andy")
        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].title, "First Post")
        self.assertEqual(posts[0].publication, "Arbitrage Andy")
        self.assertIn("**bold**", posts[0].markdown)

    def test_html_to_markdown(self):
        self.assertIn("**x**", html_to_markdown("<p><strong>x</strong></p>"))


class CycleTests(unittest.TestCase):
    def setUp(self):
        # Force config to a single known publication and stub the network fetch.
        os.environ["SUBSTACK_PUBLICATIONS"] = "arbitrage-andy"
        self._orig_fetch = watcher.fetch_feed
        watcher.fetch_feed = lambda pub: parse_feed(SAMPLE_RSS, "arbitrage-andy")

    def tearDown(self):
        watcher.fetch_feed = self._orig_fetch
        os.environ.pop("SUBSTACK_PUBLICATIONS", None)

    def test_new_posts_are_saved(self):
        store = FakeStore()
        result = watcher.run_cycle(store=store)
        self.assertEqual(result.new_count, 2)
        self.assertEqual(len(store.saved), 2)
        self.assertEqual(result.errors, [])

    def test_already_seen_are_skipped(self):
        store = FakeStore(
            already_seen=["https://arbitrage-andy.substack.com/p/first-post"]
        )
        result = watcher.run_cycle(store=store)
        self.assertEqual(result.new_count, 1)
        self.assertEqual(result.new_posts[0].title, "Second Post")

    def test_second_run_is_a_noop(self):
        store = FakeStore()
        watcher.run_cycle(store=store)
        result2 = watcher.run_cycle(store=store)
        self.assertEqual(result2.new_count, 0)

    def test_feed_error_is_isolated(self):
        def boom(pub):
            raise RuntimeError("feed down")

        watcher.fetch_feed = boom
        store = FakeStore()
        result = watcher.run_cycle(store=store, tracker=_tracker())
        self.assertEqual(result.new_count, 0)
        self.assertEqual(len(result.errors), 1)


class RetryTests(unittest.TestCase):
    def test_succeeds_after_transient_failures(self):
        calls = {"n": 0}

        def flaky():
            calls["n"] += 1
            if calls["n"] < 3:
                raise ValueError("blip")
            return "ok"

        out = retry_call(flaky, attempts=4, base_delay=0.01, sleep=lambda _: None)
        self.assertEqual(out, "ok")
        self.assertEqual(calls["n"], 3)

    def test_raises_after_exhausting_attempts(self):
        def always_fail():
            raise ValueError("down")

        with self.assertRaises(ValueError):
            retry_call(always_fail, attempts=3, base_delay=0.01, sleep=lambda _: None)


class DebounceTests(unittest.TestCase):
    """The core anti-flapping guarantee: silent blips, one alert, one recovery."""

    def setUp(self):
        import tempfile

        self.dir = tempfile.mkdtemp()

    def _t(self):
        return FailureTracker(state_dir=self.dir, threshold=3)

    def test_transient_failures_never_alert(self):
        t = self._t()
        self.assertFalse(t.record_failure("pub"))  # 1
        self.assertFalse(t.record_failure("pub"))  # 2
        self.assertFalse(t.record_success("pub"))  # healed before threshold

    def test_alerts_once_at_threshold_then_stays_quiet(self):
        t = self._t()
        self.assertFalse(t.record_failure("pub"))  # 1
        self.assertFalse(t.record_failure("pub"))  # 2
        self.assertTrue(t.record_failure("pub"))   # 3 -> ALERT
        self.assertFalse(t.record_failure("pub"))  # 4 -> already alerted, silent

    def test_recovers_once_after_alert(self):
        t = self._t()
        for _ in range(3):
            t.record_failure("pub")
        self.assertTrue(t.record_success("pub"))   # one recovery notice
        self.assertFalse(t.record_success("pub"))  # subsequent successes silent

    def test_state_persists_across_instances(self):
        t1 = self._t()
        t1.record_failure("pub")
        t1.record_failure("pub")
        t2 = self._t()  # simulate process restart
        self.assertTrue(t2.record_failure("pub"))  # 3rd across restart -> alert


def _tracker():
    import tempfile

    return FailureTracker(state_dir=tempfile.mkdtemp(), threshold=3)


if __name__ == "__main__":
    unittest.main(verbosity=2)

import unittest
from ml_predictor.features import extract_features, extract_features_next

class TestFeatures(unittest.TestCase):
    def test_feature_extraction(self):
        sleeps = [
            {"start_time": 1714900000000, "end_time": 1714903600000, "duration_seconds": 3600, "quality": 3},
            {"start_time": 1714910800000, "end_time": 1714914400000, "duration_seconds": 3600, "quality": 4},
        ]

        X, y_wake, y_duration = extract_features(
            sleeps=sleeps,
            age_months=6.5,
            feed_count=5,
            walk_duration=3600,
            is_sick=True
        )

        self.assertEqual(X.shape, (1, 13))
        self.assertEqual(y_wake.tolist(), [7200000])
        self.assertEqual(y_duration.tolist(), [3600])
        self.assertEqual(X[0, 0], 3600)
        self.assertEqual(X[0, 3], 6.5)
        self.assertEqual(X[0, 4], 1.0)
        self.assertEqual(X[0, 5], 5)
        self.assertEqual(X[0, 6], 3600)

    def test_next_features_are_order_independent(self):
        base = 1714900000000
        sleeps = []
        start = base
        for duration, wake_after in [
            (1000, 3600),
            (2000, 7200),
            (3000, 10800),
            (4000, 0),
        ]:
            end = start + duration * 1000
            sleeps.append({
                "start_time": start,
                "end_time": end,
                "duration_seconds": duration,
                "quality": 3,
            })
            start = end + wake_after * 1000

        last_sleep = sleeps[-1]
        descending_sleeps = list(reversed(sleeps))

        X_next = extract_features_next(
            last_sleep=last_sleep,
            sleeps=descending_sleeps,
            age_months=6.5,
            feed_count=4,
            walk_duration=1800,
            is_sick=False,
        )

        self.assertEqual(X_next.shape, (1, 13))
        self.assertEqual(X_next[0, 0], 4000)
        self.assertEqual(X_next[0, 10], 3000)
        self.assertEqual(X_next[0, 11], 7200)
        self.assertEqual(X_next[0, 12], 4)

if __name__ == '__main__':
    unittest.main()

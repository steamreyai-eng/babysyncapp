import unittest
import numpy as np
from ..features import extract_features

class TestFeatures(unittest.TestCase):
    def test_feature_extraction(self):
        # Dummy data
        age_months = 6.5
        current_time_ms = 1714900000000
        recent_sleeps = [
            {"start_time": 1714890000000, "duration_seconds": 3600},
            {"start_time": 1714800000000, "duration_seconds": 5400}
        ]
        
        # Test basic extraction
        X = extract_features(
            age_months=age_months,
            recent_sleeps=recent_sleeps,
            current_time_ms=current_time_ms,
            feed_count=5,
            walk_duration=3600,
            is_sick=True
        )
        
        # We expect 13 features returned
        self.assertEqual(X.shape, (1, 13))
        
        # Check specific features
        self.assertEqual(X[0, 0], age_months)
        self.assertEqual(X[0, 10], 5.0)    # feed_count
        self.assertEqual(X[0, 11], 3600.0) # walk_duration
        self.assertEqual(X[0, 12], 1.0)    # is_sick
        
if __name__ == '__main__':
    unittest.main()

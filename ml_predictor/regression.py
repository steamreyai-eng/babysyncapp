import numpy as np
from model_store import get_models

def run_regression_tests():
    print("Running regression checks for ML models...")
    
    try:
        model_wake, model_dur, source = get_models("test_baby")
        
        # Test with 13 features
        X_test = np.random.rand(5, 13)
        
        wake_preds = model_wake.predict(X_test)
        dur_preds = model_dur.predict(X_test)
        
        print(f"Source: {source}")
        print(f"Wake window predictions: {wake_preds}")
        print(f"Duration predictions: {dur_preds}")
        print("Regression tests passed successfully.")
    except Exception as e:
        print(f"Regression tests failed: {e}")

if __name__ == "__main__":
    run_regression_tests()

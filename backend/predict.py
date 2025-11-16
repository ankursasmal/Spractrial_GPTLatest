"""
Simple Prediction Interface
============================
Provide wavelengths and reflectance, get best prediction.
"""

import numpy as np
from ensemble_predictor import run_ensemble_prediction


def predict(wavelengths, reflectance):
    """
    Predict spectral material from wavelength and reflectance data.
    
    This function:
    1. Takes your input (wavelengths, reflectance)
    2. Runs all 4 methods (raw cosine, wavelet, hilbert, spectral depth)
    3. Returns the best prediction (highest score)
    
    Args:
        wavelengths: array-like, wavelengths in micrometers (e.g., [0.4, 0.5, 0.6, ...])
        reflectance: array-like, reflectance values 0-1 (e.g., [0.05, 0.06, 0.08, ...])
    
    Returns:
        dict with:
            - best_method: str, name of best method
            - best_prediction: str, predicted material name
            - best_score: float, confidence score (0-1)
            - class: str, material class
            - all_results: dict, results from all 4 methods
    """
    
    # Convert to numpy arrays
    wavelengths = np.array(wavelengths)
    reflectance = np.array(reflectance)
    
    # Run ensemble prediction
    result = run_ensemble_prediction(wavelengths, reflectance)
    
    return {
        'best_method': result['best_method'],
        'best_prediction': result['best_prediction'],
        'best_score': result['best_score'],
        'accuracy_percentage': result['best_score'] * 100,
        'class': result['best_metadata']['Class'],
        'subclass': result['best_metadata']['Subclass'],
        'type': result['best_metadata']['Type'],
        'all_results': result['all_results'],
        'analytics': result['analytics']
    }


def predict_simple(wavelengths, reflectance):
    """
    Simple version - just returns best method and prediction.
    
    Args:
        wavelengths: array-like, wavelengths in micrometers
        reflectance: array-like, reflectance values 0-1
    
    Returns:
        tuple: (best_method, best_prediction)
    """
    result = predict(wavelengths, reflectance)
    return result['best_method'], result['best_prediction']


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("="*80)
    print("SIMPLE PREDICTION INTERFACE")
    print("="*80)
    
    # Example 1: Vegetation spectrum
    print("\n[Example 1] Vegetation-like spectrum:")
    wavelengths = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 2.5]
    reflectance = [0.05, 0.06, 0.08, 0.35, 0.45, 0.48, 0.50, 0.40, 0.35, 0.30]
    
    result = predict(wavelengths, reflectance)

    print(f"  Input: {len(wavelengths)} wavelength points")
    print(f"  Best Method: {result['best_method'].upper()}")
    print(f"  Best Prediction: {result['best_prediction']}")
    print(f"  Class: {result['class']}")
    print(f"  Accuracy: {result['accuracy_percentage']:.2f}%")

    # Example 2: Using simple version
    print("\n[Example 2] Using simple version:")
    method, prediction = predict_simple(wavelengths, reflectance)
    print(f"  Method: {method.upper()}")
    print(f"  Prediction: {prediction}")

    # Example 3: Show all method results
    print("\n[Example 3] All method results:")
    result = predict(wavelengths, reflectance)
    for method_name, method_result in result['all_results'].items():
        print(f"  {method_name.upper():<15} Score: {method_result['score']:.4f}  →  {method_result['prediction']}")

    # Example 4: Show analytics
    print("\n[Example 4] Analytics:")
    analytics = result['analytics']
    print(f"  Average Score: {analytics['average_percentage']:.2f}%")
    print(f"  Method Agreement: {analytics['agreement_percentage']:.1f}%")
    print(f"  Confidence Level: {analytics['confidence_level']}")
    print(f"  Recommendation: {analytics['recommendation']}")

    print("\n" + "="*80)
    print("FINAL PREDICTION (HIGHEST SCORE):")
    print("="*80)
    print(f"Best Method:          {result['best_method'].upper()}")
    print(f"Best Answer:          {result['best_prediction']}")
    print(f"Accuracy Score:       {result['accuracy_percentage']:.2f}%")
    print(f"Confidence Level:     {analytics['confidence_level']}")
    print(f"Method Agreement:     {analytics['agreement_percentage']:.1f}%")
    print(f"Recommendation:       {analytics['recommendation']}")
    print("="*80)


"""
Ensemble Predictor - Combines All 4 Methods
============================================
Runs all methods and returns the highest prediction
"""

import numpy as np
from pymongo import MongoClient
import os

# Import all 4 methods
from method_raw_cosine import predict_raw_cosine
from method_wavelet import predict_wavelet
from method_hilbert import predict_hilbert
from method_spectral_depth import predict_spectral_depth


def run_ensemble_prediction(query_xs, query_ys, dataset=None, target_x=None):
    """
    Run all 4 methods and return the best prediction
    
    Args:
        query_xs: Query wavelengths (numpy array or list)
        query_ys: Query reflectance (numpy array or list)
        dataset: List of spectral samples (if None, loads from MongoDB)
        target_x: Target wavelength grid (if None, uses default)
    
    Returns:
        {
            'best_method': str,
            'best_prediction': str,
            'best_score': float,
            'all_results': dict
        }
    """
    
    # Convert to numpy arrays
    query_xs = np.array(query_xs)
    query_ys = np.array(query_ys)
    
    # Load dataset if not provided
    if dataset is None:
        MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/spectralData')
        DATABASE_NAME = os.getenv('DATABASE_NAME', 'store_db')
        COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'json_data')
        
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        dataset = list(collection.find())
    
    # Set default target wavelength grid
    if target_x is None:
        target_x = np.linspace(0.3, 15.0, 561)
    
    # Run all 4 methods
    print("\nRunning all 4 methods...")
    
    print("  [1/4] Raw Cosine Similarity...")
    result_raw = predict_raw_cosine(query_xs, query_ys, dataset, target_x)
    
    print("  [2/4] Wavelet Transform...")
    result_wavelet = predict_wavelet(query_xs, query_ys, dataset, target_x)
    
    print("  [3/4] Hilbert Transform...")
    result_hilbert = predict_hilbert(query_xs, query_ys, dataset, target_x)
    
    print("  [4/4] Spectral Depth...")
    result_depth = predict_spectral_depth(query_xs, query_ys, dataset, target_x)
    
    # Collect all results
    all_results = {
        'raw': result_raw,
        'wavelet': result_wavelet,
        'hilbert': result_hilbert,
        'depth': result_depth
    }
    
    # Find best method (highest score)
    best_method = max(all_results, key=lambda m: all_results[m]['score'])
    best_result = all_results[best_method]

    # Calculate analytics
    all_scores = [r['score'] for r in all_results.values()]
    avg_score = float(np.mean(all_scores))
    std_score = float(np.std(all_scores))
    min_score = float(np.min(all_scores))
    max_score = float(np.max(all_scores))

    # Check agreement between methods
    all_predictions = [r['prediction'] for r in all_results.values()]
    unique_predictions = set(all_predictions)
    agreement_count = all_predictions.count(best_result['prediction'])
    agreement_percentage = (agreement_count / len(all_predictions)) * 100

    # Calculate confidence level
    score_range = max_score - min_score
    if score_range < 0.05:
        confidence_level = "VERY HIGH"
    elif score_range < 0.10:
        confidence_level = "HIGH"
    elif score_range < 0.20:
        confidence_level = "MODERATE"
    else:
        confidence_level = "LOW"

    # Recommendation
    if agreement_percentage == 100 and best_result['score'] > 0.95:
        recommendation = "Very reliable prediction - all methods agree"
    elif agreement_percentage >= 75 and best_result['score'] > 0.90:
        recommendation = "Reliable prediction - strong consensus"
    elif agreement_percentage >= 50 and best_result['score'] > 0.80:
        recommendation = "Moderate confidence - some method disagreement"
    else:
        recommendation = "Low confidence - significant method disagreement"

    return {
        'best_method': best_method,
        'best_prediction': best_result['prediction'],
        'best_score': best_result['score'],
        'best_metadata': best_result['metadata'],
        'all_results': all_results,
        'analytics': {
            'average_score': avg_score,
            'average_percentage': avg_score * 100,
            'min_score': min_score,
            'max_score': max_score,
            'std_deviation': std_score,
            'score_range': score_range,
            'method_agreement_count': agreement_count,
            'total_methods': len(all_results),
            'agreement_percentage': agreement_percentage,
            'unique_predictions': len(unique_predictions),
            'confidence_level': confidence_level,
            'recommendation': recommendation
        }
    }


if __name__ == "__main__":
    print("="*70)
    print("ENSEMBLE SPECTRAL PREDICTOR")
    print("="*70)
    print("\nThis runs all 4 methods and selects the best prediction:")
    print("  1. Raw Cosine Similarity")
    print("  2. Wavelet Transform")
    print("  3. Hilbert Transform")
    print("  4. Spectral Depth")
    
    # Load dataset
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/spectralData')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'store_db')
    COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'json_data')
    
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    dataset = list(collection.find())
    
    if len(dataset) == 0:
        print("\n✗ No dataset available in MongoDB")
        print("Please import data first:")
        print("  mongoimport --db store_db --collection json_data --file ecospeclib_all.json --jsonArray")
        exit(1)
    
    print(f"\n✓ Loaded {len(dataset)} spectral samples from database")
    
    # Find a sample with spectral data
    sample = None
    for s in dataset:
        spectral_data = s.get('spectral_data', [])
        if spectral_data and len(spectral_data) > 0:
            sample = s
            break

    if sample is None:
        print("\n✗ No samples with spectral data found")
        exit(1)

    # Extract spectral data
    spectral_data = sample.get('spectral_data', [])
    spectral_array = np.array(spectral_data)
    query_xs = spectral_array[:, 0]
    query_ys = spectral_array[:, 1]

    # Get metadata
    metadata = sample.get('metadata', {})
    
    print(f"\nQuery Sample: {metadata.get('Name', 'Unknown')}")
    print(f"Actual Class: {metadata.get('Class', 'Unknown')}")
    print(f"Wavelength points: {len(query_xs)}")
    
    # Run ensemble prediction
    result = run_ensemble_prediction(query_xs, query_ys, dataset)
    
    # Display all method results
    print("\n" + "="*70)
    print("INDIVIDUAL METHOD RESULTS:")
    print("="*70)
    print(f"{'Method':<20} {'Score':<12} {'Prediction'}")
    print("-"*70)

    for method_name, method_result in result['all_results'].items():
        print(f"{method_name.upper():<20} {method_result['score']:<12.4f} {method_result['prediction']}")

    # Calculate analytics
    all_scores = [r['score'] for r in result['all_results'].values()]
    avg_score = np.mean(all_scores)
    std_score = np.std(all_scores)
    min_score = np.min(all_scores)
    max_score = np.max(all_scores)

    # Check agreement between methods
    all_predictions = [r['prediction'] for r in result['all_results'].values()]
    unique_predictions = set(all_predictions)
    agreement_count = all_predictions.count(result['best_prediction'])
    agreement_percentage = (agreement_count / len(all_predictions)) * 100

    # Calculate confidence level based on score distribution
    score_range = max_score - min_score
    if score_range < 0.05:
        confidence_level = "VERY HIGH"
    elif score_range < 0.10:
        confidence_level = "HIGH"
    elif score_range < 0.20:
        confidence_level = "MODERATE"
    else:
        confidence_level = "LOW"

    # Display analytics
    print("\n" + "="*70)
    print("PREDICTION ANALYTICS:")
    print("="*70)
    print(f"Average Score:        {avg_score:.4f} ({avg_score*100:.2f}%)")
    print(f"Score Range:          {min_score:.4f} - {max_score:.4f}")
    print(f"Standard Deviation:   {std_score:.4f}")
    print(f"Method Agreement:     {agreement_count}/{len(all_predictions)} methods ({agreement_percentage:.1f}%)")
    print(f"Unique Predictions:   {len(unique_predictions)}")
    print(f"Confidence Level:     {confidence_level}")

    # Display best result
    print("\n" + "="*70)
    print("FINAL PREDICTION (HIGHEST SCORE):")
    print("="*70)
    print(f"Best Method:          {result['best_method'].upper()}")
    print(f"Prediction:           {result['best_prediction']}")
    print(f"Class:                {result['best_metadata']['Class']}")
    print(f"Subclass:             {result['best_metadata']['Subclass']}")
    print(f"Type:                 {result['best_metadata']['Type']}")
    print(f"Accuracy Score:       {result['best_score']:.4f} ({result['best_score']*100:.2f}%)")
    print(f"Confidence Level:     {confidence_level}")
    print(f"Method Agreement:     {agreement_percentage:.1f}%")

    # Recommendation based on analytics
    print("\n" + "-"*70)
    if agreement_percentage == 100 and result['best_score'] > 0.95:
        print("✓ RECOMMENDATION: Very reliable prediction - all methods agree")
    elif agreement_percentage >= 75 and result['best_score'] > 0.90:
        print("✓ RECOMMENDATION: Reliable prediction - strong consensus")
    elif agreement_percentage >= 50 and result['best_score'] > 0.80:
        print("⚠ RECOMMENDATION: Moderate confidence - some method disagreement")
    else:
        print("⚠ RECOMMENDATION: Low confidence - significant method disagreement")
    print("-"*70)
    print("="*70)


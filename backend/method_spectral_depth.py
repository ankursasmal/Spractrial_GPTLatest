"""
Method 4: Spectral Depth Analysis
==================================
Absorption feature detection using convex hull continuum removal
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def normalize(v):
    """Normalize vector to unit length"""
    v = np.array(v, dtype=float)
    n = np.linalg.norm(v)
    return v / n if n != 0 else v


def resample(xs, ys, new_x):
    """Resample spectrum to new wavelength grid"""
    return np.interp(new_x, xs, ys)


def spectral_depth(xs, ys, keep=80):
    """
    Calculate spectral depth features using convex hull approximation
    Computes absorption depths relative to continuum
    """
    # Convex hull upper envelope (simplified)
    cont = np.maximum.accumulate(ys)
    depth = (cont - ys) / (cont + 1e-12)
    
    if len(depth) > keep:
        depth = depth[:keep]
    else:
        depth = np.pad(depth, (0, keep - len(depth)))
    
    return normalize(depth)


def cosine_sim(a, b):
    """Calculate cosine similarity"""
    return cosine_similarity([a], [b])[0][0]


def predict_spectral_depth(query_xs, query_ys, dataset, target_x):
    """
    Predict using spectral depth analysis
    
    Args:
        query_xs: Query wavelengths
        query_ys: Query reflectance
        dataset: List of spectral samples from database
        target_x: Target wavelength grid
    
    Returns:
        {
            'method': 'depth',
            'score': float,
            'metadata': dict,
            'prediction': str
        }
    """
    
    # Resample query to target grid
    query_resampled = resample(query_xs, query_ys, target_x)
    query_features = spectral_depth(target_x, query_resampled)
    
    # Build dataset features
    dataset_features = []
    valid_indices = []
    
    for idx, item in enumerate(dataset):
        # Handle different data formats
        spectral_data = item.get('spectral_data', [])
        if spectral_data and len(spectral_data) > 0:
            spectral_array = np.array(spectral_data)
            item_xs = spectral_array[:, 0]
            item_ys = spectral_array[:, 1]
        else:
            item_xs = np.array(item.get('xs', item.get('Wavelength', [])))
            item_ys = np.array(item.get('ys', item.get('Reflectance', [])))

        if len(item_xs) == 0 or len(item_ys) == 0:
            continue

        # Resample and extract features
        item_resampled = resample(item_xs, item_ys, target_x)
        features = spectral_depth(target_x, item_resampled)

        dataset_features.append(features)
        valid_indices.append(idx)
    
    if len(dataset_features) == 0:
        return {
            'method': 'depth',
            'score': 0.0,
            'metadata': {'Name': 'Unknown', 'Class': 'Unknown'},
            'prediction': 'Unknown'
        }
    
    # Compute similarities
    similarities = [cosine_sim(query_features, df) for df in dataset_features]
    
    # Find best match
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])
    best_sample = dataset[valid_indices[best_idx]]
    
    # Extract metadata
    sample_metadata = best_sample.get('metadata', {})
    metadata = {
        'Name': sample_metadata.get('Name', best_sample.get('Name', 'Unknown')),
        'Class': sample_metadata.get('Class', best_sample.get('Class', 'Unknown')),
        'Subclass': sample_metadata.get('Subclass', best_sample.get('Subclass', 'Unknown')),
        'Type': sample_metadata.get('Type', best_sample.get('Type', 'Unknown'))
    }

    return {
        'method': 'depth',
        'score': best_score,
        'metadata': metadata,
        'prediction': metadata['Name']
    }


if __name__ == "__main__":
    # Test example
    from pymongo import MongoClient
    import os

    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/spectralData')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'store_db')
    COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'json_data')

    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    dataset = list(collection.find())

    if len(dataset) > 0:
        # Test with first sample
        sample = dataset[0]
        spectral_data = sample.get('spectral_data', [])
        if spectral_data:
            spectral_array = np.array(spectral_data)
            query_xs = spectral_array[:, 0]
            query_ys = spectral_array[:, 1]
        else:
            query_xs = np.array(sample.get('Wavelength', []))
            query_ys = np.array(sample.get('Reflectance', []))
        target_x = np.linspace(0.3, 15.0, 561)
        
        result = predict_spectral_depth(query_xs, query_ys, dataset, target_x)
        
        print("="*60)
        print("SPECTRAL DEPTH METHOD")
        print("="*60)
        print(f"Prediction: {result['prediction']}")
        print(f"Class: {result['metadata']['Class']}")
        print(f"Score: {result['score']:.4f}")
        print("="*60)
    else:
        print("No dataset available")


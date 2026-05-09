import numpy as np
from pymongo import MongoClient
from sklearn.preprocessing import LabelEncoder

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralGpt"
COLLECTION_NAME = "spectralData"

FIXED_LENGTH = 512


def normalize_spectrum(values):
    arr = np.array(values, dtype=np.float32)

    if len(arr) == 0:
        return np.zeros(FIXED_LENGTH, dtype=np.float32)

    min_v = arr.min()
    max_v = arr.max()

    if max_v - min_v == 0:
        arr = np.zeros_like(arr)
    else:
        arr = (arr - min_v) / (max_v - min_v)

    if len(arr) > FIXED_LENGTH:
        arr = arr[:FIXED_LENGTH]

    if len(arr) < FIXED_LENGTH:
        arr = np.pad(
            arr,
            (0, FIXED_LENGTH - len(arr)),
            mode="constant"
        )

    return arr


def extract_values(spectral_data):
    if not spectral_data:
        return None

    first = spectral_data[0]

    # format: [[wavelength, reflectance], ...]
    if isinstance(first, list) and len(first) >= 2:
        return [point[1] for point in spectral_data]

    # format: [0.12, 0.15, ...]
    if isinstance(first, (int, float)):
        return spectral_data

    return None


def load_dataset():
    client = MongoClient(MONGO_URI)

    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    docs = list(collection.find({}))

    print(f"TOTAL DOCS FOUND: {len(docs)}")

    X = []
    y = []

    for doc in docs:
        spectral_data = doc.get("spectral_data")
        metadata = doc.get("metadata", {})

        material = metadata.get("Name")

        if not spectral_data:
            continue

        if not material:
            continue

        try:
            values = extract_values(spectral_data)

            if values is None:
                continue

            processed = normalize_spectrum(values)

            X.append(processed)
            y.append(material)

        except Exception as e:
            print("SKIP ERROR:", e)

    print(f"VALID TRAINING SAMPLES: {len(X)}")

    if len(X) == 0:
        raise Exception(
            "No valid training samples found. Check MongoDB schema."
        )

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    return (
        np.array(X, dtype=np.float32),
        np.array(y_encoded, dtype=np.int64),
        encoder
    )


def create_siamese_pairs(X, y):
    pairs_left = []
    pairs_right = []
    labels = []

    label_to_indices = {}

    for idx, label in enumerate(y):
        label_to_indices.setdefault(
            label,
            []
        ).append(idx)

    valid_labels = [
        lbl for lbl, idxs in label_to_indices.items()
        if len(idxs) >= 2
    ]

    if len(valid_labels) == 0:
        raise Exception(
            "Need at least 2 samples per class for Siamese training."
        )

    for label in valid_labels:

        indices = label_to_indices[label]

        for idx in indices:

            anchor = X[idx]

            positive_idx = idx

            while positive_idx == idx:
                positive_idx = np.random.choice(indices)

            pairs_left.append(anchor)
            pairs_right.append(X[positive_idx])
            labels.append(1)

            negative_labels = [
                lbl for lbl in label_to_indices
                if lbl != label
            ]

            if not negative_labels:
                continue

            negative_label = np.random.choice(
                negative_labels
            )

            negative_idx = np.random.choice(
                label_to_indices[negative_label]
            )

            pairs_left.append(anchor)
            pairs_right.append(X[negative_idx])
            labels.append(0)

    print(f"SIAMESE PAIRS CREATED: {len(labels)}")

    return (
        np.array(pairs_left, dtype=np.float32),
        np.array(pairs_right, dtype=np.float32),
        np.array(labels, dtype=np.float32)
    )
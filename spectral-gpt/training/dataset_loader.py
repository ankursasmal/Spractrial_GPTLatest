import numpy as np
from pymongo import MongoClient
from sklearn.preprocessing import LabelEncoder

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralDB"
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


def load_dataset():
    client = MongoClient(MONGO_URI)

    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    docs = collection.find({})

    X = []
    y = []

    for doc in docs:
        spectral_data = doc.get("spectral_data")
        metadata = doc.get("metadata", {})

        if not spectral_data:
            continue

        material = metadata.get("Name")

        if not material:
            continue

        try:
            values = [point[1] for point in spectral_data]
            processed = normalize_spectrum(values)

            X.append(processed)
            y.append(material)

        except Exception:
            continue

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
        label_to_indices.setdefault(label, []).append(idx)

    for idx in range(len(X)):
        anchor = X[idx]
        anchor_label = y[idx]

        positive_idx = idx

        while positive_idx == idx:
            positive_idx = np.random.choice(
                label_to_indices[anchor_label]
            )

        pairs_left.append(anchor)
        pairs_right.append(X[positive_idx])
        labels.append(1)

        negative_label = anchor_label

        while negative_label == anchor_label:
            negative_label = np.random.choice(y)

        negative_idx = np.random.choice(
            label_to_indices[negative_label]
        )

        pairs_left.append(anchor)
        pairs_right.append(X[negative_idx])
        labels.append(0)

    return (
        np.array(pairs_left, dtype=np.float32),
        np.array(pairs_right, dtype=np.float32),
        np.array(labels, dtype=np.float32)
    )
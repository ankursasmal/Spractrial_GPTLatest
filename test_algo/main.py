"""
Spectral Matching API (Single File)
----------------------------------
- Upload spectrum image (screenshot of plotted graph)
- Extract curve from image
- Match against MongoDB spectra using SAM
- Return best match + accuracy
"""

from fastapi import FastAPI, UploadFile, File
from pymongo import MongoClient
import numpy as np
import cv2
import shutil
import os
import uvicorn

# =========================================================
# CONFIGURATION
# =========================================================
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralGpt"
COLLECTION_NAME = "spectralData"

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =========================================================
# FASTAPI APP
# =========================================================
app = FastAPI(title="Spectral Matching API")

# =========================================================
# MONGODB CONNECTION
# =========================================================
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# =========================================================
# SPECTRAL ANGLE MAPPER (SAM)
# =========================================================
def spectral_angle_mapper(r, t):
    r = r / np.linalg.norm(r)
    t = t / np.linalg.norm(t)

    cos_theta = np.dot(r, t)
    cos_theta = np.clip(cos_theta, -1.0, 1.0)

    return np.degrees(np.arccos(cos_theta))


def sam_to_accuracy(angle_deg):
    return max(0.0, 100.0 * (1.0 - angle_deg / 90.0))

# =========================================================
# IMAGE → SPECTRUM EXTRACTION
# =========================================================
def extract_base_spectrum(image_path, num_points):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Invalid image")

    # 1. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Adaptive threshold (curve isolation)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31, 5
    )

    # 3. Remove horizontal/vertical lines (axes & grid)
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))

    remove_h = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_h)
    remove_v = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_v)

    curve_only = thresh - remove_h - remove_v

    # 4. Edge detection (thin curve)
    edges = cv2.Canny(curve_only, 50, 150)

    h, w = edges.shape
    spectrum = np.zeros(num_points, dtype=np.float64)

    xs = np.linspace(0, w - 1, num_points).astype(int)

    # 5. Trace curve (bottom-most edge pixel)
    for i, x in enumerate(xs):
        ys = np.where(edges[:, x] > 0)[0]
        if len(ys) == 0:
            spectrum[i] = spectrum[i - 1] if i > 0 else 0
        else:
            spectrum[i] = h - np.mean(ys)

    # 6. Normalize
    spectrum -= spectrum.min()
    if spectrum.max() > 0:
        spectrum /= spectrum.max()

    return spectrum

def extract_spectrum_from_image(image_path, num_points):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise ValueError("Invalid image")

    h, w = img.shape
    spectrum = []

    x_positions = np.linspace(0, w - 1, num_points).astype(int)

    for x in x_positions:
        column = img[:, x]
        y = np.argmin(column)     # darkest pixel
        spectrum.append(h - y)   # invert y-axis

    spectrum = np.array(spectrum, dtype=np.float64)

    # normalize
    spectrum = (spectrum - spectrum.min()) / (spectrum.max() - spectrum.min())
    return spectrum

# =========================================================
# API ENDPOINT for data base match only
# =========================================================
@app.post("/api/spectral/match")
async def match_spectrum(image: UploadFile = File(...)):
    # -------------------------------
    # Save uploaded image
    # -------------------------------
    image_path = os.path.join(UPLOAD_DIR, image.filename)

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    matches = []

    # -------------------------------
    # Iterate DB spectra
    # -------------------------------
    cursor = collection.find()

    for doc in cursor:
        spectral_data = np.array(doc["spectral_data"])
        db_depth = spectral_data.shape[0]

        if db_depth < 10:
            continue

        # -------------------------------
        # Extract image spectrum
        # (match DB spectral depth)
        # -------------------------------
        try:
            image_spectrum = extract_base_spectrum(
                image_path, db_depth
            )
        except Exception:
            continue

        reflectance = spectral_data[:, 1].astype(np.float64)

        # normalize DB spectrum
        reflectance = (reflectance - reflectance.min()) / (
            reflectance.max() - reflectance.min()
        )

        angle = spectral_angle_mapper(reflectance, image_spectrum)
        accuracy = sam_to_accuracy(angle)

        matches.append({
            "material": doc["metadata"]["Name"],
            "spectral_depth": db_depth,
            "accuracy": round(accuracy, 2),
            "sam_angle": round(angle, 4)
        })

    matches.sort(key=lambda x: x["accuracy"], reverse=True)

    os.remove(image_path)

    return {
        "best_match": matches[0] if matches else None,
        "top_matches": matches[:5]
    }

# =========================================================
# RUN SERVER
# =========================================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

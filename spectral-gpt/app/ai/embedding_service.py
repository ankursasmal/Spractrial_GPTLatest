import torch
import numpy as np

from app.ai.siamese_model import SpectralEncoder

MODEL_PATH = "training/saved_models/siamese_model.pth"

device = torch.device("cpu")

encoder = SpectralEncoder()

try:
    encoder.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location=device
        )
    )
    encoder.eval()

except Exception:
    encoder = None


def generate_embedding(spectrum):

    if encoder is None:
        return None

    arr = np.array(
        spectrum,
        dtype=np.float32
    )

    tensor = torch.tensor(
        arr
    ).unsqueeze(0).unsqueeze(0)

    with torch.no_grad():
        embedding = encoder(tensor)

    return embedding.numpy()[0]
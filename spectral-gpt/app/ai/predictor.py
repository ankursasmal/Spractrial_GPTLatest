import torch
import numpy as np

from app.ai.cnn_model import SpectralCNN

MODEL_PATH = "training/saved_models/cnn_model.pth"

CLASS_MAP = {
    0: "Quartz",
    1: "Calcite",
    2: "Concrete",
    3: "Vermiculite",
    4: "Nontronite"
}

device = torch.device("cpu")

model = SpectralCNN(
    num_classes=len(CLASS_MAP)
)

try:
    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location=device
        )
    )
    model.eval()

except Exception:
    model = None


def predict_class(spectrum):

    if model is None:
        return None

    arr = np.array(
        spectrum,
        dtype=np.float32
    )

    tensor = torch.tensor(
        arr
    ).unsqueeze(0).unsqueeze(0)

    with torch.no_grad():
        output = model(tensor)
        pred = torch.argmax(
            output,
            dim=1
        ).item()

    return CLASS_MAP.get(pred)
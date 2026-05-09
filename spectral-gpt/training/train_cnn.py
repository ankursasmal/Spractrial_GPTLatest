import os
import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import TensorDataset, DataLoader

from dataset_loader import load_dataset
from app.ai.cnn_model import SpectralCNN

MODEL_DIR = "saved_models"
MODEL_PATH = os.path.join(
    MODEL_DIR,
    "cnn_model.pth"
)

BATCH_SIZE = 32
EPOCHS = 20
LR = 0.001


def train():
    X, y, encoder = load_dataset()

    X_tensor = torch.tensor(X).unsqueeze(1)
    y_tensor = torch.tensor(y)

    dataset = TensorDataset(
        X_tensor,
        y_tensor
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True
    )

    model = SpectralCNN(
        num_classes=len(encoder.classes_)
    )

    criterion = nn.CrossEntropyLoss()

    optimizer = optim.Adam(
        model.parameters(),
        lr=LR
    )

    for epoch in range(EPOCHS):
        total_loss = 0

        for batch_x, batch_y in loader:
            optimizer.zero_grad()

            outputs = model(batch_x)

            loss = criterion(
                outputs,
                batch_y
            )

            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        print(
            f"Epoch {epoch+1}/{EPOCHS} "
            f"Loss: {total_loss:.4f}"
        )

    os.makedirs(MODEL_DIR, exist_ok=True)

    torch.save(
        model.state_dict(),
        MODEL_PATH
    )

    print("CNN model saved")


if __name__ == "__main__":
    train()
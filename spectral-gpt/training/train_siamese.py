import os
import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import TensorDataset, DataLoader

from dataset_loader import (
    load_dataset,
    create_siamese_pairs
)

from app.ai.siamese_model import SiameseNetwork

MODEL_DIR = "saved_models"
MODEL_PATH = os.path.join(
    MODEL_DIR,
    "siamese_model.pth"
)

BATCH_SIZE = 32
EPOCHS = 20
LR = 0.001
MARGIN = 1.0


class ContrastiveLoss(nn.Module):
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin

    def forward(
        self,
        emb1,
        emb2,
        label
    ):
        distance = torch.nn.functional.pairwise_distance(
            emb1,
            emb2
        )

        loss = torch.mean(
            label * torch.pow(distance, 2) +
            (1 - label) *
            torch.pow(
                torch.clamp(
                    self.margin - distance,
                    min=0.0
                ),
                2
            )
        )

        return loss


def train():
    X, y, _ = load_dataset()

    left, right, labels = create_siamese_pairs(X, y)

    left_tensor = torch.tensor(left).unsqueeze(1)
    right_tensor = torch.tensor(right).unsqueeze(1)
    labels_tensor = torch.tensor(labels)

    dataset = TensorDataset(
        left_tensor,
        right_tensor,
        labels_tensor
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True
    )

    model = SiameseNetwork()

    criterion = ContrastiveLoss(
        margin=MARGIN
    )

    optimizer = optim.Adam(
        model.parameters(),
        lr=LR
    )

    for epoch in range(EPOCHS):
        total_loss = 0

        for x1, x2, lbl in loader:
            optimizer.zero_grad()

            emb1, emb2 = model(
                x1,
                x2
            )

            loss = criterion(
                emb1,
                emb2,
                lbl
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
        model.encoder.state_dict(),
        MODEL_PATH
    )

    print("Siamese model saved")


if __name__ == "__main__":
    train()
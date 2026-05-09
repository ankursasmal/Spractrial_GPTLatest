import sys
import os

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            ".."
        )
    )
)

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from training.dataset_loader import (
    load_dataset,
    create_siamese_pairs
)

from app.ai.siamese_model import SiameseNetwork

MODEL_DIR = "training/saved_models"
MODEL_PATH = os.path.join(
    MODEL_DIR,
    "siamese_model.pth"
)

BATCH_SIZE = 32
EPOCHS = 20
LR = 0.001
MARGIN = 1.0
THRESHOLD = 0.5


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

    left, right, labels = create_siamese_pairs(
        X,
        y
    )

    X1_train, X1_test, X2_train, X2_test, y_train, y_test = train_test_split(
        left,
        right,
        labels,
        test_size=0.2,
        random_state=42
    )

    X1_train = torch.tensor(X1_train).unsqueeze(1)
    X2_train = torch.tensor(X2_train).unsqueeze(1)
    y_train = torch.tensor(y_train)

    X1_test = torch.tensor(X1_test).unsqueeze(1)
    X2_test = torch.tensor(X2_test).unsqueeze(1)
    y_test = torch.tensor(y_test)

    train_dataset = TensorDataset(
        X1_train,
        X2_train,
        y_train
    )

    train_loader = DataLoader(
        train_dataset,
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

        model.train()
        total_loss = 0

        for x1, x2, lbl in train_loader:

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

    model.eval()

    with torch.no_grad():

        emb1, emb2 = model(
            X1_test,
            X2_test
        )

        distances = torch.nn.functional.pairwise_distance(
            emb1,
            emb2
        )

        preds = (
            distances < THRESHOLD
        ).int().numpy()

    accuracy = accuracy_score(
        y_test.numpy(),
        preds
    )

    print(
        f"\nSiamese Test Accuracy: {accuracy:.4f}"
    )

    os.makedirs(MODEL_DIR, exist_ok=True)

    torch.save(
        model.encoder.state_dict(),
        MODEL_PATH
    )

    print("\nSiamese model saved")


if __name__ == "__main__":
    train()
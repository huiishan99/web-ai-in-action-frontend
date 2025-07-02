#image_api.py
# image_api.py
import io
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import models, transforms

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "best_mobilenet_mixup.pth"
EMOTION_LABELS = ["angry", "disgusted", "afraid", "happy", "sad", "surprised", "neutral"]
IMAGE_TO_THREE_LABELS = {
    "angry": "negative", "disgusted": "negative", "afraid": "negative", "sad": "negative",
    "happy": "positive", "surprised": "positive", "neutral": "neutral"
}

# 加载模型
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
model.features[0][0] = torch.nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1, bias=False)
model.classifier = torch.nn.Sequential(
    torch.nn.Dropout(0.3),
    torch.nn.Linear(model.last_channel, len(EMOTION_LABELS))
)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()

transform = transforms.Compose([
    transforms.Grayscale(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])

def predict_image_from_bytes(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_tensor = transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = model(img_tensor)
        probs = F.softmax(output, dim=1)
        pred = torch.argmax(probs, dim=1).item()
        confidence = probs[0][pred].item()
    label = IMAGE_TO_THREE_LABELS[EMOTION_LABELS[pred]]
    return {"label": label, "confidence": round(confidence, 3)}
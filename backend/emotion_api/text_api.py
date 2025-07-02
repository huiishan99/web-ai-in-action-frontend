#text_api.py
# text_api.py
import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from google.cloud import language_v1
from google.oauth2 import service_account

# ✅ 设置模型路径和设备
MODEL_PATH = "best_distilbert_model"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ✅ 设置 Google JSON 凭证路径（统一 Cloud Run 用法）
CURRENT_DIR = os.path.dirname(__file__)
CREDENTIALS_FILE = os.path.join(CURRENT_DIR, "textapi.json")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_FILE
id2label = {
    0: "concerned",
    1: "negative",
    2: "neutral",
    3: "positive"
}

# ✅ 加载 DistilBERT 模型
print("✅ 正在加载 DistilBERT 模型...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH).to(DEVICE)
model.eval()

# ✅ 初始化 Google NLP 客户端
print("✅ 正在初始化 Google NLP...")
credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE)
google_client = language_v1.LanguageServiceClient(credentials=credentials)

# ✅ Google NLP 推理
def google_sentiment(text):
    doc = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
    response = google_client.analyze_sentiment(request={'document': doc})
    score = response.document_sentiment.score
    if score > 0.25:
        return "positive", score
    elif score < -0.25:
        return "negative", score
    else:
        return "neutral", score

# ✅ DistilBERT 推理
def distilbert_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1)
        idx = torch.argmax(probs, dim=-1).item()
        label = id2label[idx]
        confidence = probs[0][idx].item()

    if label == "concerned":
        label = "negative"
    return label, confidence

# ✅ 混合策略
def hybrid_sentiment(text):
    g_label, g_score = google_sentiment(text)
    d_label, d_conf = distilbert_sentiment(text)

    if g_label == d_label:
        final = d_label
    else:
        if d_conf >= 0.85:
            final = d_label
        elif abs(g_score) >= 0.6:
            final = g_label
        else:
            final = d_label

    return {
        "text": text,
        "distilbert": {"label": d_label, "confidence": round(d_conf, 3)},
        "google": {"label": g_label, "score": round(g_score, 3)},
        "final_label": final
    }

# ✅ 外部调用用函数
def predict_text(text: str):
    result = hybrid_sentiment(text)
    return {
        "label": result["final_label"],
        "confidence": result["distilbert"]["confidence"]
    }

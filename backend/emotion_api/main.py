# main.py
# ✅ main.py（优化版）
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# ✅ 导入模块
from text_api import predict_text
from image_api import predict_image_from_bytes
from fuse_emotion import fuse_emotions

app = FastAPI(title="Multimodal Emotion API")

# ✅ 支持跨域请求（前端可以直接 fetch）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 可以设置成你的前端地址比如 http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/fuse-emotion")
async def fuse_emotion_endpoint(
    text: str = Form(None),
    image: UploadFile = File(None)
):
    try:
        text_result, image_result = None, None

        # ✅ 文本分析
        if text:
            text_result = predict_text(text)

        # ✅ 图像分析
        if image:
            image_bytes = await image.read()
            image_result = predict_image_from_bytes(image_bytes)

        # ❌ 两个都没有传
        if not text_result and not image_result:
            return JSONResponse(
                status_code=400,
                content={"error": "Please provide either text or image input."}
            )

        # ✅ 情绪融合逻辑
        if text_result and image_result:
            final_emotion = fuse_emotions(
                text_label=text_result["label"], text_conf=text_result["confidence"],
                image_label=image_result["label"], image_conf=image_result["confidence"]
            )
        elif text_result:
            final_emotion = text_result["label"]
        else:
            final_emotion = image_result["label"]

        return {
            "final_emotion": final_emotion,      # ✅ 前端重点字段（最终推荐用）
            "text_emotion": text_result,         # 原始文本情绪分析结果
            "image_emotion": image_result        # 原始图像情绪分析结果
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



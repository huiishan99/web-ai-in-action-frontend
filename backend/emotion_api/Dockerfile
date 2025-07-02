FROM python:3.10-slim

# ✅ 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# ✅ 设置工作目录为 emotion_api
WORKDIR /app

# ✅ 拷贝当前 emotion_api 内容到容器中（包括 textapi.json 和模型）
COPY . .

# ✅ 安装 Python 依赖
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt


# ✅ 设置 Google API 认证路径为相对路径
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/textapi.json"

# ✅ 暴露端口
EXPOSE 8080

# ✅ 启动 FastAPI 服务（main.py）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

FROM python:3.11-slim

# 安装 Pillow 依赖（用于 webp 转换）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir Pillow

WORKDIR /app

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 8082

# 启动服务器
CMD ["python", "启动服务器.py"]

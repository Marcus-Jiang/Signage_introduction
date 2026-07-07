FROM python:3.11-slim

# 安装 Pillow 依赖（用于 webp 转换）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo-dev \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Pillow（用于图片格式转换）
RUN pip install --no-cache-dir Pillow

WORKDIR /app

# 暴露端口
EXPOSE 65002

# 默认启动方式（会被 docker-compose 的 command 覆盖）
CMD ["python", "启动服务器.py"]

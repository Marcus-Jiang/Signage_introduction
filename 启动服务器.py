# -*- coding: utf-8 -*-
"""
数字标牌产品介绍页面 - 一键启动脚本
使用方法：双击此文件运行
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import shutil
import urllib.parse

# 尝试导入 Pillow，用于图片格式转换
try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

# 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 65002

# 支持的图片扩展名
IMAGE_EXTENSIONS = ('.webp', '.jpg', '.png')


class APIHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器，在静态文件服务基础上增加 API 端点"""

    def _set_cors_headers(self):
        """设置 CORS 响应头，允许本地开发跨域"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json_response(self, data, status_code=200):
        """发送 JSON 格式的响应"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._set_cors_headers()
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error_json(self, message, status_code=500):
        """发送错误 JSON 响应"""
        self._send_json_response({"success": False, "error": message}, status_code)

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        """处理 GET 请求：API 路径走 API 逻辑，其余走静态文件服务"""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            self._handle_api_get(path)
        else:
            # 调用父类的静态文件服务
            super().do_GET()

    def do_POST(self):
        """处理 POST 请求：仅处理 /api/ 路径"""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            self._handle_api_post(path)
        else:
            self._send_error_json("未知的 POST 路径", 404)

    def _handle_api_get(self, path):
        """路由 GET API 请求"""
        try:
            if path == '/api/list-images':
                self._api_list_images()
            elif path == '/api/list-descriptions':
                self._api_list_descriptions()
            else:
                self._send_error_json("未知的 API 路径: " + path, 404)
        except Exception as e:
            self._send_error_json(str(e))

    def _handle_api_post(self, path):
        """路由 POST API 请求"""
        try:
            if path == '/api/save-mapping':
                self._api_save_mapping()
            elif path == '/api/upload-image':
                self._api_upload_image()
            else:
                self._send_error_json("未知的 API 路径: " + path, 404)
        except Exception as e:
            self._send_error_json(str(e))

    # ========== API 实现 ==========

    def _api_save_mapping(self):
        """POST /api/save-mapping - 保存 mapping.json，先备份"""
        # 读取请求体中的 JSON 数据
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self._send_error_json("请求体为空", 400)
            return

        raw_body = self.rfile.read(content_length)
        try:
            data = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError as e:
            self._send_error_json("JSON 解析失败: " + str(e), 400)
            return

        mapping_path = os.path.join(PROJECT_ROOT, 'mapping.json')
        backup_path = os.path.join(PROJECT_ROOT, 'mapping.json.bak')

        # 写入前先备份原文件
        if os.path.exists(mapping_path):
            shutil.copy2(mapping_path, backup_path)

        # 写入新的 mapping.json
        with open(mapping_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        self._send_json_response({"success": True})

    def _parse_multipart(self):
        """手动解析 multipart/form-data，替代已弃用的 cgi 模块"""
        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            return None, {}

        # 提取 boundary
        boundary = None
        for part in content_type.split(';'):
            part = part.strip()
            if part.startswith('boundary='):
                boundary = part[len('boundary='):].strip('"')
                break

        if not boundary:
            return None, {}

        # 读取请求体
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        # 按 boundary 分割各部分
        boundary_bytes = boundary.encode('utf-8')
        delimiter = b'--' + boundary_bytes
        parts = body.split(delimiter)

        fields = {}  # 普通表单字段
        files = {}   # 文件字段

        for part in parts:
            # 跳过空部分和结束标记
            if not part or part.strip() in (b'', b'--'):
                continue

            # 去掉开头的 \r\n
            if part.startswith(b'\r\n'):
                part = part[2:]

            # 分离头部和内容
            header_end = part.find(b'\r\n\r\n')
            if header_end == -1:
                continue

            header_section = part[:header_end].decode('utf-8', errors='replace')
            content = part[header_end + 4:]

            # 去掉尾部的 \r\n
            if content.endswith(b'\r\n'):
                content = content[:-2]

            # 解析 Content-Disposition 头部
            name = None
            filename = None
            for line in header_section.split('\r\n'):
                if line.lower().startswith('content-disposition:'):
                    for item in line.split(';'):
                        item = item.strip()
                        if item.startswith('name='):
                            name = item[5:].strip('"')
                        elif item.startswith('filename='):
                            filename = item[9:].strip('"')

            if name:
                if filename:
                    files[name] = {'filename': filename, 'data': content}
                else:
                    fields[name] = content.decode('utf-8', errors='replace')

        return files, fields

    def _api_upload_image(self):
        """POST /api/upload-image - 上传图片并自动转换为 webp 格式"""
        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            self._send_error_json("请求必须是 multipart/form-data 格式", 400)
            return

        # 使用手动解析替代已弃用的 cgi 模块
        files, fields = self._parse_multipart()
        if files is None:
            self._send_error_json("multipart 解析失败", 400)
            return

        # 获取表单字段
        file_entry = files.get('file')
        upload_type = fields.get('type', '')
        category = fields.get('category', '')
        filename = fields.get('filename', '')

        if not file_entry:
            self._send_error_json("未找到上传文件", 400)
            return

        original_name = filename if filename else file_entry['filename']
        if not original_name:
            original_name = 'unnamed'

        # 安全处理文件名：只取基本名，防止路径遍历
        original_name = os.path.basename(original_name)

        if not upload_type:
            self._send_error_json("缺少 type 参数", 400)
            return

        # 确定保存目录
        if upload_type == 'scene':
            if not category:
                self._send_error_json("上传场景图片时必须提供 category 参数", 400)
                return
            save_dir = os.path.join(PROJECT_ROOT, '场景图', category)
        elif upload_type == 'product':
            save_dir = os.path.join(PROJECT_ROOT, '产品图')
        else:
            self._send_error_json("type 参数必须是 scene 或 product", 400)
            return

        # 目录不存在则创建
        os.makedirs(save_dir, exist_ok=True)

        # 先保存原始文件
        save_path = os.path.join(save_dir, original_name)
        file_data = file_entry['data']
        with open(save_path, 'wb') as f:
            f.write(file_data)

        # 尝试用 Pillow 转换为 webp
        converted = False
        saved_name = original_name

        if HAS_PILLOW:
            try:
                img = Image.open(save_path)

                # 提取 ICC 色彩配置文件（如果原图有的话）
                icc_profile = img.info.get('icc_profile')

                # 处理不支持直接保存为 webp 的图像模式
                if img.mode == 'CMYK':
                    img = img.convert('RGB')
                elif img.mode == 'LA':
                    img = img.convert('RGBA')
                elif img.mode == 'P':
                    # 调色板模式，尝试转换（保留透明度）
                    if 'transparency' in img.info:
                        img = img.convert('RGBA')
                    else:
                        img = img.convert('RGB')

                # 修改文件扩展名为 .webp
                base_name = os.path.splitext(original_name)[0]
                webp_name = base_name + '.webp'
                webp_path = os.path.join(save_dir, webp_name)

                # 保存为 webp 格式
                save_kwargs = {'quality': 100, 'method': 6}
                if icc_profile:
                    save_kwargs['icc_profile'] = icc_profile

                img.save(webp_path, 'WEBP', **save_kwargs)

                # 如果原始文件不是 webp，删除原始文件
                if save_path != webp_path and os.path.exists(save_path):
                    os.remove(save_path)

                saved_name = webp_name
                converted = True

            except Exception as e:
                print(f"[警告] Pillow 转换失败，保留原始文件: {e}")
                converted = False
        else:
            converted = False

        # 计算相对路径
        final_path = os.path.join(save_dir, saved_name)
        relative_path = os.path.relpath(final_path, PROJECT_ROOT)
        # 使用正斜杠确保跨平台兼容
        relative_path = relative_path.replace(os.sep, '/')

        self._send_json_response({
            "success": True,
            "path": relative_path,
            "converted": converted,
            "originalName": original_name,
            "savedName": saved_name
        })

    def _api_list_images(self):
        """GET /api/list-images - 返回所有图片文件列表（递归扫描多层子目录）"""
        scenes_dir = os.path.join(PROJECT_ROOT, '场景图')
        products_dir = os.path.join(PROJECT_ROOT, '产品图')

        result = {"scenes": {}, "products": []}

        # 递归扫描场景图目录，按一级子目录分组
        if os.path.isdir(scenes_dir):
            for category in sorted(os.listdir(scenes_dir)):
                category_path = os.path.join(scenes_dir, category)
                if not os.path.isdir(category_path):
                    continue
                images = []
                # 使用 os.walk 递归遍历所有子目录
                for dirpath, dirnames, filenames in os.walk(category_path):
                    dirnames.sort()  # 确保子目录遍历顺序一致
                    for fname in sorted(filenames):
                        if fname.lower().endswith(IMAGE_EXTENSIONS):
                            relative = os.path.relpath(
                                os.path.join(dirpath, fname), PROJECT_ROOT
                            ).replace(os.sep, '/')
                            images.append(relative)
                if images:
                    result["scenes"][category] = images

        # 递归扫描产品图目录
        if os.path.isdir(products_dir):
            for dirpath, dirnames, filenames in os.walk(products_dir):
                dirnames.sort()  # 确保子目录遍历顺序一致
                for fname in sorted(filenames):
                    if fname.lower().endswith(IMAGE_EXTENSIONS):
                        relative = os.path.relpath(
                            os.path.join(dirpath, fname), PROJECT_ROOT
                        ).replace(os.sep, '/')
                        result["products"].append(relative)

        self._send_json_response(result)

    def _api_list_descriptions(self):
        """GET /api/list-descriptions - 返回所有产品描述文件列表（递归扫描多层子目录）"""
        desc_dir = os.path.join(PROJECT_ROOT, '产品描述')
        result = []

        if os.path.isdir(desc_dir):
            # 使用 os.walk 递归遍历所有子目录
            for dirpath, dirnames, filenames in os.walk(desc_dir):
                dirnames.sort()  # 确保子目录遍历顺序一致
                for fname in sorted(filenames):
                    if fname.lower().endswith('.md'):
                        relative = os.path.relpath(
                            os.path.join(dirpath, fname), PROJECT_ROOT
                        ).replace(os.sep, '/')
                        result.append(relative)

        self._send_json_response(result)


def find_available_port(start_port):
    """从指定端口开始查找可用端口"""
    port = start_port
    while port < start_port + 100:
        try:
            with socketserver.TCPServer(("", port), APIHandler) as test_server:
                return port
        except OSError:
            port += 1
    return start_port  # 如果找不到可用端口，返回原始端口


def main():
    # 查找可用端口
    port = find_available_port(PORT)

    with socketserver.TCPServer(("", port), APIHandler) as httpd:
        url = f"http://localhost:{port}/index.html"
        print("========================================")
        print("  数字标牌产品介绍页面")
        print("========================================")
        print()
        print(f"  服务地址: {url}")
        print(f"  API 端点:")
        print(f"    POST /api/save-mapping  - 保存配置")
        print(f"    POST /api/upload-image  - 上传图片")
        print(f"    GET  /api/list-images   - 图片列表")
        print(f"    GET  /api/list-descriptions - 描述列表")
        print()
        print("  按 Ctrl+C 停止服务器")
        print()

        # 自动打开浏览器
        webbrowser.open(url)

        # 启动服务器
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
            sys.exit(0)


if __name__ == "__main__":
    main()
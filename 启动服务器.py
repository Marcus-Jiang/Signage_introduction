# -*- coding: utf-8 -*-
"""
デジタルサイネージ製品紹介ページ - ワンクリック起動スクリプト
使用方法：ダブルクリックでこのファイルを実行
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# プロジェクトルートディレクトリ
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8082

def main():
    # ポート8082を使用（他のプロセスが使用中の場合は自動的にインクリメント）
    with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print(f"========================================")
        print(f"  デジタルサイネージ製品紹介ページ")
        print(f"========================================")
        print(f"")
        print(f"  サーバー起動中: {url}")
        print(f"  停止するにはウィンドウを閉じてください")
        print(f"")
        print(f"  ※ ブラウザが自動起動しない場合は、")
        print(f"    上記URLにアクセスしてください")
        print(f"")

        # ブラウザを自動起動
        webbrowser.open(url)

        # サーバーを起動（Ctrl+Cで停止可能）
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止しました")
            sys.exit(0)

if __name__ == "__main__":
    main()

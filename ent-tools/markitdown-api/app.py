"""
MarkItDown HTTP API – convert documents to markdown.
Contract: { "ok": true, "markdown": "...", "filename": "..." } | { "ok": false, "error": "...", "stage": "markitdown" }
"""

import io
import os
from flask import Flask, request, jsonify

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB

try:
    from markitdown import MarkItDown
    md = MarkItDown(enable_plugins=False)
except Exception as e:
    md = None
    _markitdown_error = str(e)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "markitdown-api"}), 200


@app.route("/convert", methods=["POST"])
def convert():
    if md is None:
        return jsonify({
            "ok": False,
            "error": f"MarkItDown not available: {_markitdown_error}",
            "stage": "markitdown",
        }), 503

    if "file" not in request.files:
        return jsonify({
            "ok": False,
            "error": "No file in request; use form field 'file'",
            "stage": "markitdown",
        }), 400

    file = request.files["file"]
    if file.filename == "" or not file.filename:
        return jsonify({
            "ok": False,
            "error": "Empty filename",
            "stage": "markitdown",
        }), 400

    try:
        data = file.read()
        if not data:
            return jsonify({
                "ok": False,
                "error": "Empty file",
                "stage": "markitdown",
            }), 400

        stream = io.BytesIO(data)
        result = md.convert_stream(stream)
        markdown_text = result.text_content if result else ""

        return jsonify({
            "ok": True,
            "markdown": markdown_text,
            "filename": file.filename or "unknown",
        }), 200
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e),
            "stage": "markitdown",
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

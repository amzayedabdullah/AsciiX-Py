from flask import Flask, request
from flask_cors import CORS
from PIL import Image, ImageOps
import os, uuid
from pyfiglet import Figlet

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Use your preferred ASCII characters from dark to light
ASCII_CHARS = ["@", "#", "$", "%", "&", "*", "+", "=", "-", ":", "."]

@app.route("/api/text-to-ascii", methods=["POST"])
def text_to_ascii():
    data = request.get_json()
    text = data.get("text", "")
    font = data.get("font", "standard")
    f = Figlet(font=font)
    ascii_art = f.renderText(text)
    return ascii_art, 200, {"Content-Type": "text/plain; charset=utf-8"}

def resize_image(image, new_width=100):
    width, height = image.size
    ratio = height / width / 1.65
    new_height = int(new_width * ratio)
    return image.resize((new_width, new_height))

def grayify(image):
    return ImageOps.grayscale(image)

def pixels_to_ascii(image, threshold=255):
    pixels = image.getdata()
    ascii_str = ""
    for pixel in pixels:
        # Skip very light pixels to preserve shape
        if pixel < threshold:
            index = pixel * (len(ASCII_CHARS) - 1) // 255
            ascii_str += ASCII_CHARS[index]
        else:
            ascii_str += " "  # preserve empty/transparent areas
    return ascii_str

@app.route("/api/image-to-ascii", methods=["POST"])
def image_to_ascii():
    if "image" not in request.files:
        return "No file uploaded", 400
    file = request.files["image"]
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        image = Image.open(filepath)
        width = int(request.form.get("width", 100))
        image = resize_image(image, new_width=width)
        image = grayify(image)
        ascii_str = pixels_to_ascii(image)
        ascii_lines = [ascii_str[i:i+image.width] for i in range(0, len(ascii_str), image.width)]
        ascii_art = "\n".join(ascii_lines)
    except Exception as e:
        return f"Error: {str(e)}", 500
    finally:
        os.remove(filepath)

    return ascii_art, 200, {"Content-Type": "text/plain; charset=utf-8"}

if __name__ == "__main__":
    app.run(debug=True)

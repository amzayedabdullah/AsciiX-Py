from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import os
from pyfiglet import Figlet
import uuid

app = Flask(__name__)
CORS(app)  # allow frontend requests
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ASCII_CHARS = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."]

# Text to ASCII
@app.route('/api/text-to-ascii', methods=['POST'])
def text_to_ascii():
    data = request.get_json()
    text = data.get('text', '')
    font = data.get('font', 'standard')
    f = Figlet(font=font)
    ascii_art = f.renderText(text)
    return ascii_art, 200, {'Content-Type': 'text/plain; charset=utf-8'}

# Image to ASCII
def resize_image(image, new_width=100):
    width, height = image.size
    ratio = height / width / 1.65
    new_height = int(new_width * ratio)
    return image.resize((new_width, new_height))

def grayify(image):
    return image.convert("L")

def pixels_to_ascii(image):
    pixels = image.getdata()
    return "".join([ASCII_CHARS[pixel//25] for pixel in pixels])

@app.route('/api/image-to-ascii', methods=['POST'])
def image_to_ascii():
    if 'image' not in request.files:
        return "No file uploaded", 400
    file = request.files['image']
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # Open and convert image
    image = Image.open(filepath)
    image = resize_image(image, new_width=100)
    image = grayify(image)
    ascii_str = pixels_to_ascii(image)
    width = image.width
    ascii_lines = [ascii_str[i:i+width] for i in range(0, len(ascii_str), width)]
    ascii_art = "\n".join(ascii_lines)

    # Delete temp file
    os.remove(filepath)

    return ascii_art, 200, {'Content-Type': 'text/plain; charset=utf-8'}

if __name__ == '__main__':
    app.run(debug=True)

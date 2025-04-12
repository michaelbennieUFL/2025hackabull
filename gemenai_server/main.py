import os
import io
import json
import base64
from dataclasses import dataclass

import numpy as np
from flask import Flask, request, jsonify
from PIL import Image, ImageDraw, ImageFont, ImageColor

# Import and initialize the Gemini client
from google import genai
from google.genai import types

from gemenai_server.items import item_types

app = Flask(__name__)

# Retrieve API key from environment (ensure you set GOOGLE_API_KEY)
GOOGLE_API_KEY = "AIzaSyBf110U5S4hurLPwycrnjyKbyD9-pdk2yE"
client = genai.Client(api_key=GOOGLE_API_KEY)
model_name = "gemini-2.5-pro-exp-03-25"
safety_settings = [
    types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="BLOCK_NONE",
    ),
]




# --- Helper functions --- #

def parse_json(json_output: str):
    """
    Removes markdown fencing from a string.
    """
    lines = json_output.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == "```json":
            json_output = "\n".join(lines[i + 1:])
            json_output = json_output.split("```")[0]
            break
    return json_output


@dataclass(frozen=True)
class SegmentationMask:
    y0: int
    x0: int
    y1: int
    x1: int
    mask: np.array  # numpy array representing the mask (grayscale)
    label: str


def parse_segmentation_masks(predicted_str: str, *, img_height: int, img_width: int) -> list:
    """
    Parses the JSON output from Gemini that includes segmentation masks.
    Expects keys: "box_2d", "mask", and "label" in each entry.
    The "mask" field is a Base64-encoded PNG with the prefix.
    """
    items = json.loads(parse_json(predicted_str))
    masks = []
    for item in items:
        abs_y0 = int(item["box_2d"][0] / 1000 * img_height)
        abs_x0 = int(item["box_2d"][1] / 1000 * img_width)
        abs_y1 = int(item["box_2d"][2] / 1000 * img_height)
        abs_x1 = int(item["box_2d"][3] / 1000 * img_width)
        if abs_y0 >= abs_y1 or abs_x0 >= abs_x1:
            continue
        label = item.get("label", "")
        png_str = item.get("mask", "")
        if not png_str.startswith("data:image/png;base64,"):
            continue
        png_data = png_str.replace("data:image/png;base64,", "")
        try:
            png_data = base64.b64decode(png_data)
        except Exception:
            continue
        mask_img = Image.open(io.BytesIO(png_data)).convert("L")
        bbox_width = abs_x1 - abs_x0
        bbox_height = abs_y1 - abs_y0
        if bbox_width < 1 or bbox_height < 1:
            continue
        mask_img = mask_img.resize((bbox_width, bbox_height), resample=Image.Resampling.BILINEAR)
        full_mask = np.zeros((img_height, img_width), dtype=np.uint8)
        mask_array = np.array(mask_img)
        full_mask[abs_y0:abs_y1, abs_x0:abs_x1] = mask_array
        masks.append(SegmentationMask(abs_y0, abs_x0, abs_y1, abs_x1, full_mask, label))
    return masks


def encode_mask_to_base64(np_mask):
    """
    Encodes a NumPy array representing a grayscale mask to a Base64 PNG string.
    """
    img = Image.fromarray(np_mask.astype("uint8"), mode="L")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    encoded_string = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return "data:image/png;base64," + encoded_string


# --- Flask Endpoints --- #

@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello, world!"})


@app.route('/analyze/segment_items', methods=['POST'])
def analyze_segment_items():
    """
    Expects a POST with a file field "image".
    Returns a JSON list of items found in the image that match the predefined `item_types`.
    Each item has:
      - box_2d: [y0, x0, y1, x1]
      - mask: Base64 PNG string
      - label: detected label
      - description: a descriptive string (here, simply including the label)
      - amount: an integer (default 1)
    """
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files["image"]
    try:
        im = Image.open(image_file)
    except Exception as e:
        return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

    im.thumbnail([1024, 1024], Image.Resampling.LANCZOS)

    # Prompt for segmentation (the prompt can be adjusted to fit your use-case)
    prompt = (
        "Detect the items in the image and provide segmentation masks. "
        "Return a JSON list where each entry has 'box_2d', 'mask' (a Base64-encoded PNG image), and 'label'. "
        "Only use these labels (use the exact names): "+str(",".join(item_types))
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, im],
            config=types.GenerateContentConfig(
                temperature=0.5,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    seg_masks = parse_segmentation_masks(response.text, img_height=im.size[1], img_width=im.size[0])

    # Filter to include only the items whose label is in item_types (case-insensitive)
    filtered_items = []
    item_types_lower = [itm.lower() for itm in item_types]
    for seg in seg_masks:
        for item in item_types_lower:
            if item.lower() in seg.label.lower():
                item_dict = {
                    "box_2d": [seg.y0, seg.x0, seg.y1, seg.x1],
                    "mask": encode_mask_to_base64(seg.mask),
                    "label": item,
                    "amount": 1,
                }
                filtered_items.append(item_dict)
                break

    return jsonify(filtered_items)


@app.route('/analyze/generate_instructions', methods=['POST'])
def analyze_generate_instructions():
    """
    Expects a POST with:
      - a form field "instruction": the instruction string
      - a file field "data": a JSON file containing items in the format {box_2d, label, description, amount}
      - a file field "image": the image file
    Returns a JSON list of step-by-step instructions. Each step includes:
      - step_number
      - box_2d
      - mask: Base64-encoded PNG string
      - label
      - instructions
    """
    if "instruction" not in request.form:
        return jsonify({"error": "No instruction provided"}), 400
    if "data" not in request.files:
        return jsonify({"error": "No data file provided"}), 400
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    instruction = request.form["instruction"]
    data_file = request.files["data"]
    image_file = request.files["image"]

    try:
        data_json = json.load(data_file)
    except Exception as e:
        return jsonify({"error": f"Invalid JSON data file: {str(e)}"}), 400

    try:
        im = Image.open(image_file)
    except Exception as e:
        return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

    im.thumbnail([1024, 1024], Image.Resampling.LANCZOS)

    # Build a prompt combining the provided instruction and JSON data
    prompt = (
        f"Using the following items: {json.dumps(data_json)} "
        f"and the instruction: '{instruction}', generate step-by-step instructions for handling the items. "
        "For each step, return a JSON object with 'step_number', 'box_2d', 'mask' (a Base64-encoded PNG image), 'label', and 'instructions'."
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, im],
            config=types.GenerateContentConfig(
                temperature=0.5,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    try:
        instructions_json = json.loads(parse_json(response.text))
    except Exception as e:
        return jsonify({"error": f"Failed to parse instructions JSON: {str(e)}"}), 500

    return jsonify(instructions_json)


@app.route('/analyze/question', methods=['POST'])
def analyze_question():
    """
    Expects a POST with:
      - a form field "question": a question string
      - optionally, a file field "image": an image file
    Returns a JSON object with a "result" string.
    """
    if "question" not in request.form:
        return jsonify({"error": "No question provided"}), 400

    question = request.form["question"]
    image = None
    if "image" in request.files:
        try:
            image = Image.open(request.files["image"])
            image.thumbnail([1024, 1024], Image.Resampling.LANCZOS)
        except Exception as e:
            return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

    contents = [question]
    if image is not None:
        contents.append(image)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.5,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    return jsonify({"result": response.text})


if __name__ == '__main__':
    # Run the Flask server on host 0.0.0.0 and port 5001.
    app.run(host='0.0.0.0',debug=True, port=5001)

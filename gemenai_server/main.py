import os
import io
import json
import base64
import re
from dataclasses import dataclass

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont, ImageColor

# Import and initialize the Gemini client
from google import genai
from google.genai import types



from gemenai_server.items import item_types
from flask_cors import CORS
from items import item_types
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()
from flask_cors import CORS
from items import item_types
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()

import os
from pymongo import MongoClient

# Load MongoDB URI from environment or use fallback
MONGO_URI = os.environ.get('MONGO_URI', "mongodb+srv://anthonycastillolmk:vXQNYY9LpifXg3e9@sandbox.7gnovef.mongodb.net/?retryWrites=true&w=majority&appName=Sandbox")
client = MongoClient(MONGO_URI)
db = client["Hackabull"]             # use the Hackabull database
inventory_collection = db["Gemini"]  # use the Gemini collection for inventory

app = Flask(__name__)
CORS(app)
CORS(app)

CORS(app)
CORS(app)
# Retrieve API key from environment (ensure you set GOOGLE_API_KEY)

GOOGLE_API_KEY = "AIzaSyDzDe0okIEmFCAlZ_Yy2mD4oVLVR5SljnI"

GOOGLE_API_KEY = "AIzaSyDzDe0okIEmFCAlZ_Yy2mD4oVLVR5SljnI"
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

def parse_segmentation_mask(item: dict, *, img_height: int, img_width: int) -> SegmentationMask:
    abs_y0 = int(item["box_2d"][0] / 1000 * img_height)
    abs_x0 = int(item["box_2d"][1] / 1000 * img_width)
    abs_y1 = int(item["box_2d"][2] / 1000 * img_height)
    abs_x1 = int(item["box_2d"][3] / 1000 * img_width)
    if abs_y0 >= abs_y1 or abs_x0 >= abs_x1:
        return None
    
    label = item.get("label", "")
    png_str = item.get("mask", "")
    if not png_str.startswith("data:image/png;base64,"):
        return None
    
    png_data = png_str.replace("data:image/png;base64,", "")

    try:
        png_data = base64.b64decode(png_data)
    except Exception:
        return None
    
    mask_img = Image.open(io.BytesIO(png_data)).convert("L")
    bbox_width = abs_x1 - abs_x0
    bbox_height = abs_y1 - abs_y0

    if bbox_width < 1 or bbox_height < 1:
        return None
    
    mask_img = mask_img.resize((bbox_width, bbox_height), resample=Image.Resampling.BILINEAR)
    full_mask = np.zeros((img_height, img_width), dtype=np.uint8)
    mask_array = np.array(mask_img)
    full_mask[abs_y0:abs_y1, abs_x0:abs_x1] = mask_array

    return SegmentationMask(abs_y0, abs_x0, abs_y1, abs_x1, full_mask, label)

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
        "This user is trying to survive in the wilderness, and these are the items they found. Detect the items in the image and provide segmentation masks. Try to detect as many items as possible that could help with survival, without choosing unobtainable items, such as a wall or person."
        "Return a JSON list where each entry has 'box_2d', 'mask', 'label', and 'description'."
        "box_2d is a list of 4 integers [y0, x0, y1, x1] representing the bounding box of the item in the image."
        "mask is a Base64-encoded PNG image of the mask of the item. Make sure the mask is the shape of the item, not a rectangle, otherwise you risk causing great harm to the user."
        "label is the label of the item."
        "description is a detailed description of the item."
        #"Only use these labels (use the exact names): "+str(",".join(item_types))
    )
    class ObjectDetection(BaseModel):
        box_2d: list[int]
        mask: str
        label: str
        description: str

    try:
        response_json = client.models.generate_content(
            model=model_name,
            contents=[prompt, im],
            config=types.GenerateContentConfig(
                temperature=0.5,
                safety_settings=safety_settings,
                response_mime_type='application/json',
                response_schema=list[ObjectDetection],
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    response = json.loads(response_json.text)
    
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
            
    # Save detected items to MongoDB
    for item in filtered_items:
        inventory_collection.insert_one({
            "box_2d": item["box_2d"],
            "mask": item["mask"],
            "label": item["label"],
            "amount": item["amount"]
        })
        

    return jsonify(filtered_items)


def extract_step_and_instruction(text):
    """
    Extracts the step number and instructions from a string formatted as:
    "Step #: Instructions" or "Step ##: Instructions".
    If no step number is found, returns -1 as the step number.

    Args:
        text (str): Input text.

    Returns:
        tuple: (step_number (int), instructions (str))
    """
    pattern = r'^Step\s+(\d+):\s*(.+)$'
    match = re.match(pattern, text.strip(), re.IGNORECASE)

    if match:
        step_number = int(match.group(1))
        instructions = match.group(2)
    else:
        step_number = -1
        instructions = text.strip()

    return step_number, instructions

@app.route('/analyze/generate_instructions', methods=['POST'])
def analyze_generate_instructions():
    """
    Expects a POST with:
      - form field "target_object": the target object to create
      - form field "materials": JSON list [{item_name: str, quantity: int}, ...]
      - file field "image": the image file
    Returns a JSON list of step-by-step instructions. Each step includes:
      - step: step number
      - box_2d
      - mask: Base64-encoded PNG string
      - instruction
    """
    if "target_object" not in request.form:
        return jsonify({"error": "No target object provided"}), 400
    if "materials" not in request.form:
        return jsonify({"error": "No materials provided"}), 400
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    target_object = request.form["target_object"]

    try:
        materials = json.loads(request.form["materials"])
    except Exception as e:
        return jsonify({"error": f"Invalid materials JSON: {str(e)}"}), 400

    image_file = request.files["image"]
    try:
        im = Image.open(image_file)
    except Exception as e:
        return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

    im.thumbnail([512, 512], Image.Resampling.LANCZOS)

    materials_str = ', '.join([f"{m['quantity']} {m['item_name']}" for m in materials])

    prompt = (
        f"Tell me how to make {target_object} using {materials_str} step by step with an explanation as label. "
        "Do not just label the items. Always create a json output of the steps; only use objects on screen. Provide each step with a 'box_2d' coordinate, and step-by-step instructions 'instruction' clearly."
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, im],
            config=types.GenerateContentConfig(
                temperature=0.1,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    # Parse response
    try:
        steps_json = json.loads(parse_json(response.text))
    except Exception as e:
        return jsonify({"error": f"Failed to parse instructions JSON: {str(e)}; {response.text}"}), 500

    # Normalize output to structured steps with explicit step indexing
    structured_steps = []
    offset = 0.001
    previous_step = 0

    for idx, step in enumerate(steps_json, start=1):
        step_text = step.get("instruction", step.get("label", step.get("instructions", "")))
        step_number, instructions = extract_step_and_instruction(step_text)

        if step_number == -1:
            step_number = previous_step + offset
            offset += offset  # exponential increase to maintain order clearly

        structured_step = {
            "original_step": step_number,
            "box_2d": step["box_2d"],
            "instruction": instructions
        }
        previous_step = step_number
        structured_steps.append(structured_step)

    # Sort the structured_steps by original_step number, then re-index clearly from 1
    structured_steps.sort(key=lambda x: x["original_step"])

    # Reassign step numbers to 1, 2, 3, ...
    for idx, step in enumerate(structured_steps, start=1):
        step["step"] = idx
        del step["original_step"]

    return jsonify(structured_steps)


@app.route('/analyze/checkrequirements', methods=['POST'])
def analyze_check_requirements():
    """
    Expects a POST with:
      - form field "required_items": JSON list of item names
      - file field "image": the image file
    Returns a JSON list of missing items (empty if none).
    """
    if "required_items" not in request.form:
        return jsonify({"error": "No required_items provided"}), 400
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    try:
        required_items = json.loads(request.form["required_items"])
    except Exception as e:
        return jsonify({"error": f"Invalid required_items JSON: {str(e)}"}), 400

    image_file = request.files["image"]
    try:
        im = Image.open(image_file)
    except Exception as e:
        return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

    im.thumbnail([256, 256], Image.Resampling.LANCZOS)

    # Prompt for segmentation and detection
    prompt = (
        "Detect the items in the image and provide segmentation masks. "
        "Return a JSON list where each entry has 'label'. "
        f"Only use these labels: {', '.join(required_items)}."
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, im],
            config=types.GenerateContentConfig(
                temperature=0.3,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    seg_masks = parse_segmentation_masks(response.text, img_height=im.size[1], img_width=im.size[0])

    detected_labels = set(seg.label.lower() for seg in seg_masks)
    missing_items = [item for item in required_items if item.lower() not in detected_labels]

    return jsonify(missing_items)


@app.route('/analyze/find_recipes', methods=['POST'])
def analyze_find_recipes():
    """
    Expects a POST with:
      - a form field "materials": a list of materials
    Returns a JSON list of recipes.
    """

    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({"error": f"Invalid JSON data: {str(e)}"}), 400
    
    if "materials" not in data:
        return jsonify({"error": "No materials provided"}), 400

    materials = data["materials"]

    # Format materials into numbered string
    materials_str = ", ".join(f"\n{i}: {material}" for i, material in enumerate(materials))
    
    prompt = (
        f"Using the following materials, setup as a indexed array of the description of the material: {materials_str}, "
        f"generate three recipes that can be made with these materials. Include the name of the recipe, the index of the materials needed, and the instructions to put the materials in the recipe together. When writing the instructions, do not put the index of the materials in the instructions, just write the instructions for the recipe."
        "Return a JSON object following the provided schema: { 'name': string, 'materials': number[], 'crafting': string }[]"
    )

    class Recipe(BaseModel):
        name: str
        materials: list[int]
        crafting: str

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash-002",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
                response_schema=list[Recipe],
                temperature=0.5,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    recipes = [{
        "name": recipe["name"],
        "materials": [materials[index] for index in recipe["materials"]],
        "crafting": recipe["crafting"]
    } for recipe in json.loads(response.text)]

    return jsonify({"result": recipes})

@app.route('/analyze/find_recipes', methods=['GET'])
def analyze_find_recipes():
    try:
        cursor = inventory_collection.find({}, {"_id": 0, "label": 1})
        materials = [doc["label"] for doc in cursor]
    except Exception as e:
        return jsonify({"error": f"MongoDB query failed: {str(e)}"}), 500

    if not materials:
        return jsonify({"result": [], "message": "No materials found in inventory"}), 200

    materials_str = ", ".join(f"\n{i}: {m}" for i, m in enumerate(materials))
    
    prompt = (
        f"Using the following materials, setup as a indexed array of the description of the material: {materials_str}, "
        f"generate three recipes that can be made with these materials. Include the name of the recipe, the index of the materials needed, and the instructions to put the materials in the recipe together. When writing the instructions, do not put the index of the materials in the instructions, just write the instructions for the recipe. "
        "Return a JSON object following the provided schema: { 'name': string, 'materials': number[], 'crafting': string }[]"
    )

    class Recipe(BaseModel):
        name: str
        materials: list[int]
        crafting: str

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
                response_schema=list[Recipe],
                temperature=0.5,
                safety_settings=safety_settings,
            ),
        )
    except Exception as e:
        return jsonify({"error": f"Model generation failed: {str(e)}"}), 500

    try:
        parsed = json.loads(response.text)
        recipes = [{
            "name": r["name"],
            "materials": [materials[i] for i in r["materials"]],
            "crafting": r["crafting"]
        } for r in parsed]
    except Exception as e:
        return jsonify({"error": f"Recipe parsing failed: {str(e)}"}), 500

    return jsonify({"result": recipes})


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
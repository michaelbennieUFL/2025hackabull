.PHONY: all download-images test-hello test-segment test-generate test-question test-check-requirements test-instructions test-all clean

# Change the HOST and PORT if necessary.
HOST=http://localhost
PORT=5001
BASE_URL=$(HOST):$(PORT)

# Image downloads target
download-images:
	@echo "Downloading images..."
	wget https://blog-assets.thedyrt.com/uploads/2019/09/shutterstock_420688960.jpg -O Survival.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/socks.jpg -O Socks.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/vegetables.jpg -O Vegetables.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/Japanese_Bento.png -O Japanese_bento.png -q
	wget https://storage.googleapis.com/generativeai-downloads/images/Cupcakes.jpg -O Cupcakes.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/origamis.jpg -O Origamis.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/fruits.jpg -O Fruits.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/cat.jpg -O Cat.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/pumpkins.jpg -O Pumpkins.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/breakfast.jpg -O Breakfast.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/bookshelf.jpg -O Bookshelf.jpg -q
	wget https://storage.googleapis.com/generativeai-downloads/images/spill.jpg -O Spill.jpg -q
	@echo "Images downloaded."

# Test /hello endpoint
test-hello:
	@echo "Testing /hello endpoint..."
	curl -X GET "$(BASE_URL)/hello"
	@echo "\n"

# Test /analyze/segment_items endpoint using Survival.jpg
test-segment:
	@echo "Testing /analyze/segment_items endpoint..."
	curl -X POST -F "image=@Survival.jpg" "$(BASE_URL)/analyze/segment_items"
	@echo "\n"

# Test /analyze/generate_instructions endpoint
test-generate:
	@echo "Creating temporary JSON data file for instruction generation..."
	@echo '[{"box_2d": [149,419,217,872], "label": "knife", "description": "Test item", "amount": 1}]' > test_data.json
	@echo "Testing /analyze/generate_instructions endpoint..."
	curl -X POST \
		-F "instruction=How can I use the knife to cut up the boots to get leather." \
		-F "data=@test_data.json" \
		-F "image=@Survival.jpg" \
		"$(BASE_URL)/analyze/generate_instructions"
	@echo "\n"
	@rm -f test_data.json

# Test /analyze/checkrequirements endpoint
test-check-requirements:
	@echo "Testing /analyze/checkrequirements endpoint with Spill.jpg and required item 'cup'..."
	curl -X POST \
		-F 'required_items=["cup","fishies"]' \
		-F "image=@Spill.jpg" \
		"$(BASE_URL)/analyze/checkrequirements"
	@echo "\n"

# Test /analyze/generate_instructions endpoint for sweetened tea scenario
test-instructions:
	@echo "Testing /analyze/generate_instructions endpoint with Spill.jpg for making sweetened tea..."
	curl -X POST \
		-F "target_object=put sugar in the teapot" \
		-F 'materials=[{"item_name":"cup","quantity":1},{"item_name":"sugar","quantity":1}]' \
		-F "image=@Spill.jpg" \
		"$(BASE_URL)/analyze/generate_instructions"
	@echo "\n"

# Test /analyze/generate_instructions endpoint for sweetened tea scenario
test-instructions-2:
	@echo "Testing /analyze/generate_instructions endpoint with Spill.jpg for making sweetened tea..."
	curl -X POST \
		-F "target_object=scrap cloth" \
		-F 'materials=[{"item_name":"knife","quantity":1},{"item_name":"duct tape","quantity":1},{"item_name":"shoes","quantity":1},{"item_name":"flashlight","quantity":1}]' \
		-F "image=@Survival.jpg" \
		"$(BASE_URL)/analyze/generate_instructions"
	@echo "\n"

# Test /analyze/question endpoint with and without image
test-question:
	@echo "Testing /analyze/question endpoint without image..."
	curl -X POST -F "question=What is the color of the sky?" "$(BASE_URL)/analyze/question"
	@echo "\n"
	@echo "Testing /analyze/question endpoint with an image..."
	curl -X POST -F "question=What do you see in the image?" -F "image=@Origamis.jpg" "$(BASE_URL)/analyze/question"
	@echo "\n"

# Test all endpoints
test-all: download-images test-hello test-segment test-generate test-check-requirements test-instructions test-question

# Optional: clean downloaded images
clean:
	rm -f Survival.jpg Socks.jpg Vegetables.jpg Japanese_bento.png Cupcakes.jpg Origamis.jpg Fruits.jpg Cat.jpg Pumpkins.jpg Breakfast.jpg Bookshelf.jpg Spill.jpg

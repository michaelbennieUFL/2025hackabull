.PHONY: all download-images test-hello test-segment test-generate test-question test-all clean

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

# Test /analyze/segment_items endpoint using Socks.jpg
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

# Test /analyze/question endpoint with and without image
test-question:
	@echo "Testing /analyze/question endpoint without image..."
	curl -X POST -F "question=What is the color of the sky?" "$(BASE_URL)/analyze/question"
	@echo "\n"
	@echo "Testing /analyze/question endpoint with an image..."
	curl -X POST -F "question=What do you see in the image?" -F "image=@Origamis.jpg" "$(BASE_URL)/analyze/question"
	@echo "\n"

# Test all endpoints
test-all: download-images test-hello test-segment test-generate test-question

# Optional: clean downloaded images
clean:
	rm -f Socks.jpg Vegetables.jpg Japanese_bento.png Cupcakes.jpg Origamis.jpg Fruits.jpg Cat.jpg Pumpkins.jpg Breakfast.jpg Bookshelf.jpg Spill.jpg


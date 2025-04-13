.PHONY: run test

# Run the Docker container
run:
	sudo docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'

# Test that the service is responding using curl
test:
	@sleep 5
	@echo "Testing service on http://localhost:6300 ..."
	@curl -s http://localhost:6300 || (echo "Server not responding" && exit 1)

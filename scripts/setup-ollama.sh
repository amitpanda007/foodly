#!/bin/bash

# Script to setup Ollama with the required model

echo "🤖 Setting up Ollama for Foodly..."
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Ollama doesn't seem to be running at localhost:11434"
    echo "Please start Ollama first:"
    echo "  - On Windows/Mac: Open the Ollama app"
    echo "  - On Linux: Run 'ollama serve'"
    echo ""
    echo "Or use Docker:"
    echo "  docker-compose -f docker-compose.dev.yml up -d ollama"
    exit 1
fi

echo "✅ Ollama is running"
echo ""

# Pull the model
MODEL="llama3.2:3b"
echo "📥 Pulling $MODEL model..."
echo "   (This may take a few minutes on first run)"
echo ""

ollama pull $MODEL

echo ""
echo "✅ Model $MODEL is ready!"
echo ""
echo "You can also try other models:"
echo "  - ollama pull mistral:7b (better quality, more resources)"
echo "  - ollama pull phi3:3.8b (Microsoft's small model)"
echo "  - ollama pull llama3.2:1b (smallest, fastest)"
echo ""
echo "Update your .env file to use a different model:"
echo "  OLLAMA_MODEL=mistral:7b"


import httpx
import json
import re
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Maximum characters to send to LLM based on provider context windows
# Ollama (local): ~4K tokens = ~12K chars (conservative for 3B models)
# OpenAI GPT-4o-mini: 128K tokens = ~400K chars
# Gemini 1.5 Flash: 1M tokens = ~3M chars
MAX_CONTENT_LENGTH_LOCAL = 12000      # For Ollama
MAX_CONTENT_LENGTH_CLOUD = 100000     # For OpenAI/Gemini (~25K tokens)


class LLMService:
    def __init__(self):
        self.provider = settings.llm_provider
        self.ollama_base_url = settings.ollama_base_url
        self.ollama_model = settings.ollama_model
        self.openai_api_key = settings.openai_api_key
        self.openai_model = settings.openai_model
        self.gemini_api_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model
    
    def _get_max_content_length(self) -> int:
        """Get max content length based on LLM provider."""
        if self.provider == "ollama":
            return MAX_CONTENT_LENGTH_LOCAL
        else:
            # OpenAI and Gemini have much larger context windows
            return MAX_CONTENT_LENGTH_CLOUD
    
    def _truncate_content(self, content: str, max_length: int = None) -> str:
        """Truncate content to fit within LLM context window."""
        if max_length is None:
            max_length = self._get_max_content_length()
        
        if len(content) <= max_length:
            return content
        
        # Try to truncate at a sentence boundary
        truncated = content[:max_length]
        last_period = truncated.rfind('.')
        if last_period > max_length * 0.8:  # Only use period if it's not too far back
            truncated = truncated[:last_period + 1]
        
        return truncated + "\n\n[Content truncated for processing]"
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if self.provider == "ollama":
            return await self._generate_ollama(prompt, system_prompt)
        elif self.provider == "openai":
            return await self._generate_openai(prompt, system_prompt)
        elif self.provider == "gemini":
            return await self._generate_gemini(prompt, system_prompt)
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")
    
    async def _generate_ollama(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = f"{self.ollama_base_url}/api/generate"
        
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        print(f"[Ollama] Sending request to {url}, prompt length: {len(full_prompt)} chars")
        
        payload = {
            "model": self.ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 2048,
                "num_ctx": 4096
            }
        }
        
        # Longer timeout for CPU-based inference
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(url, json=payload)
                print(f"[Ollama] Response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    print(f"[Ollama] Error response: {error_text[:500]}")
                    raise Exception(f"Ollama returned {response.status_code}: {error_text[:200]}")
                
                result = response.json()
                return result.get("response", "")
            except httpx.TimeoutException as e:
                print(f"[Ollama] Request timed out after 300s")
                raise Exception(f"Ollama request timed out - the model may be too slow on CPU") from e
            except httpx.RequestError as e:
                print(f"[Ollama] Request error: {e}")
                raise Exception(f"Could not connect to Ollama at {url}: {e}") from e
    
    async def _generate_openai(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        import openai
        
        client = openai.AsyncOpenAI(api_key=self.openai_api_key)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await client.chat.completions.create(
            model=self.openai_model,
            messages=messages,
            temperature=0.3,
            max_tokens=2048
        )
        
        return response.choices[0].message.content
    
    async def _generate_gemini(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        import google.generativeai as genai
        
        genai.configure(api_key=self.gemini_api_key)
        model = genai.GenerativeModel(self.gemini_model)
        
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        # Configure safety settings to be permissive for recipe content
        # Using raw dictionary keys/values to avoid version compatibility issues
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        
        try:
            response = await model.generate_content_async(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=4096  # Increased for larger context
                ),
                safety_settings=safety_settings
            )
            return response.text
        except ValueError as e:
            # Handle blocked response or other generation errors
            print(f"Gemini generation error: {e}")
            try:
                if hasattr(response, 'prompt_feedback'):
                    print(f"Safety ratings: {response.prompt_feedback}")
                if hasattr(response, 'candidates') and response.candidates:
                    print(f"Finish reason: {response.candidates[0].finish_reason}")
                    print(f"Safety ratings: {response.candidates[0].safety_ratings}")
            except Exception:
                print("Could not print detailed safety info")
            
            raise Exception(f"Gemini failed to generate response: {str(e)}")
    
    def _repair_json(self, json_str: str) -> Optional[dict]:
        """Attempt to repair truncated or malformed JSON."""
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
            
        # 1. Remove markdown code blocks if still present
        json_str = json_str.strip()
        if json_str.startswith("```"):
            lines = json_str.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            json_str = "\n".join(lines)
            
        # 2. Handle truncation
        # If it ends with a trailing comma, remove it
        json_str = json_str.rstrip().rstrip(',')
        
        # Close open quotes if needed
        if json_str.count('"') % 2 != 0:
            json_str += '"'
            
        # Close open brackets/braces
        open_braces = json_str.count('{')
        close_braces = json_str.count('}')
        open_brackets = json_str.count('[')
        close_brackets = json_str.count(']')
        
        # Naive approach: append missing closures
        # Usually we are deep in: { ... "steps": [ { ... 
        # So we likely need to close object }, then array ], then main object }
        # But exact order depends on structure.
        
        # Simple stack-based closer could be better, but naive counting often works for simple truncation
        padding = (']' * (open_brackets - close_brackets)) + ('}' * (open_braces - close_braces))
        
        try:
            return json.loads(json_str + padding)
        except json.JSONDecodeError:
            return None

    async def _transcribe_audio_gemini(self, audio_path: str) -> str:
        import google.generativeai as genai
        
        genai.configure(api_key=self.gemini_api_key)
        
        # Safety settings to prevent blocking
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        
        try:
            print(f"Uploading audio file {audio_path} to Gemini...")
            # Upload the file
            audio_file = genai.upload_file(path=audio_path)
            
            # Wait for file to be processed
            import time
            while audio_file.state.name == "PROCESSING":
                print("Waiting for audio file to be processed...")
                time.sleep(2)
                audio_file = genai.get_file(audio_file.name)
            
            if audio_file.state.name == "FAILED":
                print(f"Audio file processing failed: {audio_file.state}")
                return ""
            
            # Prompt for transcription with safety settings
            model = genai.GenerativeModel(self.gemini_model)
            response = await model.generate_content_async(
                [
                    "Transcribe this audio. Focus on extracting recipe instructions, ingredients, and cooking steps. Write everything spoken clearly.",
                    audio_file
                ],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=8192  # Larger output for transcriptions
                ),
                safety_settings=safety_settings
            )
            
            # Handle potential blocked or empty response
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    return candidate.content.parts[0].text
                else:
                    print(f"Transcription returned empty content. Finish reason: {candidate.finish_reason}")
                    return ""
            
            return response.text
        except ValueError as e:
            print(f"Gemini audio transcription ValueError: {e}")
            # Try to extract partial content if available
            try:
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if candidate.content and candidate.content.parts:
                        partial = candidate.content.parts[0].text
                        if partial:
                            print(f"Extracted partial transcription: {len(partial)} chars")
                            return partial
            except Exception:
                pass
            return ""
        except Exception as e:
            print(f"Gemini audio transcription error: {e}")
            import traceback
            print(traceback.format_exc())
            return ""

    async def parse_recipe(self, content: str, source_type: str, voice: Optional[str] = None) -> dict:
        # Check for audio file
        if content.startswith("[AUDIO_FILE]:"):
            audio_path = content.split(":", 1)[1].strip()
            print(f"Detected audio file for processing: {audio_path}")
            
            if self.provider == "gemini":
                transcript = await self._transcribe_audio_gemini(audio_path)
                if transcript:
                    print("Audio transcription successful.")
                    content = transcript
                else:
                    content = "Could not transcribe audio from video."
            else:
                content = "Audio transcription is currently only supported with Gemini provider."
            
            # Cleanup audio file
            import os
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception as e:
                print(f"Error removing temp audio file: {e}")

        # Truncate content to fit in context window
        truncated_content = self._truncate_content(content)
        
        system_prompt = """You are an expert recipe structurer. Your ONLY job is to convert raw text into a perfectly structured JSON recipe.

CRITICAL RULE: YOU MUST SPLIT INSTRUCTIONS INTO MANY SMALL STEPS.
- ❌ BAD: "Preheat oven to 350. Mix dry ingredients in a bowl. Add wet ingredients and stir until combined." (This is 1 step. REJECTED.)
- ✅ GOOD:
  [
    {"number": 1, "instruction": "Preheat oven to 350°F."},
    {"number": 2, "instruction": "In a large bowl, whisk together flour, sugar, and salt."},
    {"number": 3, "instruction": "Pour in the milk and eggs."},
    {"number": 4, "instruction": "Stir gently until just combined."}
  ]

REQUIREMENTS:
1.  **Break it down:** If a paragraph contains 5 actions, create 5 separate steps.
2.  **No Chatter:** Do not include intro text ("Here is your recipe..."). Return ONLY JSON.
3.  **Expressive Instructions:** Write clear, descriptive instructions. Do not be overly concise. Include helpful details (e.g., "Mix until the batter is smooth and no lumps remain" instead of just "Mix"). Explain WHY an action is taken if the context provides it. **If a step is very short (e.g. "Chop onions"), expand it to be more conversational and guiding (e.g. "Finely chop the onions, being careful to keep the pieces uniform for even cooking.").**
4.  **Clean Text:** Remove "Step 1", "1.", icons, emojis, or navigation text from the instructions.
5.  **Ingredients:** Extract all ingredients precisely.
6.  **Tips:** If the content contains pro-tips, secrets, or advice, include them in the 'tips' field of the relevant step.
7.  **Intro/Outro:**
    -   **intro_text:** A brief, welcoming 1-2 sentence overview of what we are cooking.
    -   **outro_text:** A friendly concluding sentence (e.g. "Serve hot and enjoy your meal!").
8.  **Structure:** Follow this JSON schema EXACTLY:

{
    "title": "String",
    "description": "String",
    "intro_text": "String",
    "outro_text": "String",
    "prep_time": "String or null",
    "cook_time": "String or null",
    "total_time": "String or null",
    "servings": "String or null",
    "ingredients": [
        {"name": "String", "amount": "String", "unit": "String", "notes": "String"}
    ],
    "steps": [
        {"number": Integer, "instruction": "String", "duration": "String or null", "tips": "String or null"}
    ],
    "tags": ["String"]
}"""

        prompt = f"""Parse this {source_type} content into the structured JSON format defined above.
        
CONTENT:
{truncated_content}

REMEMBER: Split instructions into as many small, logical steps as possible. Do not lump them together."""

        try:
            response = await self.generate(prompt, system_prompt)
            
            # Clean up response (remove markdown code blocks if present)
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            
            cleaned_response = cleaned_response.strip()
            
            # Extract JSON from response
            data = self._repair_json(cleaned_response)
            
            # If repair failed, try regex
            if not data:
                json_match = re.search(r'\{[\s\S]*\}', cleaned_response)
                if json_match:
                    data = self._repair_json(json_match.group())
            
            if not data:
                raise json.JSONDecodeError("Could not decode JSON even after repair", cleaned_response, 0)
            
            # POST-PROCESSING: Fallback for lazy LLM (Single step fix)
            steps = data.get("steps", [])
            if len(steps) < 3 and steps:
                first_step = steps[0].get("instruction", "")
                if len(first_step) > 300:
                    sentences = [s.strip() + "." for s in first_step.split(". ") if s.strip()]
                    new_steps = []
                    for i, sent in enumerate(sentences, 1):
                        new_steps.append({
                            "number": i,
                            "instruction": sent,
                            "duration": None,
                            "tips": None
                        })
                    if len(new_steps) > 1:
                        data["steps"] = new_steps
            
            # GENERATE AUDIO FOR STEPS
            try:
                from app.services.tts_service import get_tts_service
                import asyncio
                
                tts = get_tts_service()
                print(f"[TTS] Starting audio generation for {len(data.get('steps', []))} steps...")
                
                # Generate Intro Audio
                if data.get("intro_text"):
                    try:
                        intro_url = await tts.generate_audio(data["intro_text"], voice=voice)
                        data["intro_audio_url"] = intro_url
                        print(f"[TTS] Intro audio: {intro_url}")
                    except Exception as e:
                        print(f"[TTS] Failed to generate intro audio: {e}")

                # Generate Outro Audio
                if data.get("outro_text"):
                    try:
                        outro_url = await tts.generate_audio(data["outro_text"], voice=voice)
                        data["outro_audio_url"] = outro_url
                        print(f"[TTS] Outro audio: {outro_url}")
                    except Exception as e:
                        print(f"[TTS] Failed to generate outro audio: {e}")

                # Generate Ingredients Audio
                ingredients = data.get("ingredients", [])
                if ingredients:
                    try:
                        ing_text = "Ingredients. "
                        ing_list = []
                        for ing in ingredients:
                            if isinstance(ing, dict):
                                parts = []
                                if ing.get('amount'): parts.append(ing.get('amount'))
                                if ing.get('unit'): parts.append(ing.get('unit'))
                                if ing.get('name'): parts.append(ing.get('name'))
                                item = " ".join(parts)
                                if ing.get('notes'):
                                    item += f", {ing.get('notes')}"
                                ing_list.append(item)
                            elif isinstance(ing, str):
                                ing_list.append(ing)
                        
                        ing_text += ". ".join(ing_list)
                        
                        # Limit length to avoid issues
                        if len(ing_text) > 4000:
                            ing_text = ing_text[:4000] + "..."
                            
                        ing_url = await tts.generate_audio(ing_text, voice=voice)
                        data["ingredients_audio_url"] = ing_url
                        print(f"[TTS] Ingredients audio: {ing_url}")
                    except Exception as e:
                        print(f"[TTS] Failed to generate ingredients audio: {e}")

                async def process_step_audio(step):
                    instruction = step.get("instruction", "")
                    if instruction:
                        # Compose full text for narration including tips and duration
                        speech_text = f"Step {step.get('number')}. {instruction}"
                        if step.get('duration'):
                            speech_text += f". Duration: {step['duration']}."
                        if step.get('tips'):
                            speech_text += f". Pro tip: {step['tips']}."
                            
                        try:
                            audio_url = await tts.generate_audio(speech_text, voice=voice)
                            step["audio_url"] = audio_url
                            print(f"[TTS] Step {step.get('number')} audio: {audio_url}")
                        except Exception as e:
                            print(f"[TTS] Failed to generate audio for step {step.get('number')}: {e}")
                            import traceback
                            print(traceback.format_exc())

                # Generate audio in parallel
                await asyncio.gather(*[process_step_audio(step) for step in data.get("steps", [])])
                print(f"[TTS] Audio generation complete.")
                
            except Exception as e:
                print(f"[TTS] Generation failed: {e}")
                import traceback
                print(traceback.format_exc())

            return data
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response was: {response if response else 'empty'}")
            # Return a basic structure if parsing fails
            return {
                "title": "Untitled Recipe",
                "description": "Could not parse recipe description",
                "prep_time": None,
                "cook_time": None,
                "total_time": None,
                "servings": None,
                "ingredients": [],
                "steps": [{"number": 1, "instruction": truncated_content[:500], "duration": None, "tips": None}],
                "tags": []
            }
        except Exception as e:
            import traceback
            print(f"LLM error: {e}")
            print(f"LLM provider: {self.provider}")
            print(f"Full traceback:\n{traceback.format_exc()}")
            raise


def get_llm_service() -> LLMService:
    return LLMService()

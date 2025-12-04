import httpx
import re
import os
import uuid
import tempfile
from bs4 import BeautifulSoup
from typing import Tuple, Optional
from urllib.parse import urlparse, parse_qs


class ScraperService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
    
    def is_youtube_url(self, url: str) -> bool:
        parsed = urlparse(url)
        return any(domain in parsed.netloc for domain in ["youtube.com", "youtu.be", "www.youtube.com"])
    
    def extract_youtube_id(self, url: str) -> Optional[str]:
        parsed = urlparse(url)
        
        if "youtu.be" in parsed.netloc:
            return parsed.path.strip("/")
        
        if "youtube.com" in parsed.netloc or "www.youtube.com" in parsed.netloc:
            if parsed.path == "/watch":
                query = parse_qs(parsed.query)
                return query.get("v", [None])[0]
            elif "/embed/" in parsed.path:
                return parsed.path.split("/embed/")[1].split("?")[0]
            elif "/v/" in parsed.path:
                return parsed.path.split("/v/")[1].split("?")[0]
            elif "/shorts/" in parsed.path:
                return parsed.path.split("/shorts/")[1].split("?")[0]
        
        return None
    
    def download_youtube_audio(self, url: str) -> Optional[str]:
        """Download YouTube audio to a temp file."""
        import yt_dlp
        
        try:
            temp_dir = tempfile.gettempdir()
            filename = f"yt_audio_{uuid.uuid4()}"
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'outtmpl': os.path.join(temp_dir, filename + '.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
                
            return os.path.join(temp_dir, filename + ".mp3")
        except Exception as e:
            print(f"Error downloading audio: {e}")
            return None

    async def scrape_youtube(self, url: str) -> Tuple[str, str, Optional[str]]:
        """Scrape YouTube video transcript and metadata."""
        from youtube_transcript_api import YouTubeTranscriptApi
        
        video_id = self.extract_youtube_id(url)
        if not video_id:
            raise ValueError("Could not extract YouTube video ID from URL")
        
        # Get transcript
        transcript = ""
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript = " ".join([entry["text"] for entry in transcript_list])
        except Exception as e:
            print(f"Warning: Could not fetch YouTube transcript: {e}")
            # Fallback to audio download or description
        
        # Get video title and metadata from page
        title = "YouTube Recipe Video"
        thumbnail = None
        description = ""
        
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                soup = BeautifulSoup(response.text, "lxml")
                
                title_tag = soup.find("meta", property="og:title")
                if title_tag:
                    title = title_tag.get("content", title)
                
                thumb_tag = soup.find("meta", property="og:image")
                if thumb_tag:
                    thumbnail = thumb_tag.get("content")
                    
                desc_tag = soup.find("meta", property="og:description") or soup.find("meta", {"name": "description"})
                if desc_tag:
                    description = desc_tag.get("content", "")
        except Exception as e:
            print(f"Warning: Could not fetch YouTube metadata: {e}")
        
        if not transcript:
            print(f"Transcript API failed, attempting audio download for {url}")
            audio_path = self.download_youtube_audio(url)
            if audio_path:
                print(f"Audio downloaded to {audio_path}")
                transcript = f"[AUDIO_FILE]:{audio_path}"
            elif description:
                transcript = f"Video Description: {description}. (Note: Full transcript was unavailable, generating recipe from description.)"
            else:
                transcript = "No content available for this video."

        return transcript, title, thumbnail
    
    async def scrape_website(self, url: str) -> Tuple[str, str, Optional[str]]:
        """Scrape recipe content from a website."""
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            
            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
            
            # Try to get title
            title = "Recipe"
            title_tag = soup.find("h1") or soup.find("meta", property="og:title")
            if title_tag:
                title = title_tag.get_text(strip=True) if hasattr(title_tag, 'get_text') else title_tag.get("content", title)
            
            # Try to get image
            image_url = None
            img_tag = soup.find("meta", property="og:image")
            if img_tag:
                image_url = img_tag.get("content")
            
            # Try to find recipe schema
            schema_content = self._extract_schema_recipe(soup)
            if schema_content:
                return schema_content, title, image_url
            
            # Fall back to extracting main content
            content = self._extract_main_content(soup)
            
            return content, title, image_url
    
    def _extract_schema_recipe(self, soup: BeautifulSoup) -> Optional[str]:
        """Try to extract structured recipe data from JSON-LD schema."""
        import json
        
        schema_tags = soup.find_all("script", type="application/ld+json")
        
        for tag in schema_tags:
            try:
                data = json.loads(tag.string)
                
                # Handle array of schemas
                if isinstance(data, list):
                    for item in data:
                        if item.get("@type") == "Recipe":
                            return json.dumps(item, indent=2)
                
                # Handle single schema or @graph
                if data.get("@type") == "Recipe":
                    return json.dumps(data, indent=2)
                
                if "@graph" in data:
                    for item in data["@graph"]:
                        if item.get("@type") == "Recipe":
                            return json.dumps(item, indent=2)
            except (json.JSONDecodeError, TypeError):
                continue
        
        return None
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and common artifacts."""
        # Remove Unicode control characters
        text = "".join(ch for ch in text if ch.isprintable())
        
        # Replace multiple newlines/spaces
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        
        return text.strip()

    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """Extract main content from page."""
        # 1. Basic cleanup (safe)
        for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg', 'meta', 'link']):
            tag.decompose()

        # 2. Find the best container BEFORE aggressive cleaning
        content_selectors = [
            {"class_": re.compile(r"recipe-content|recipe-body|wprm-recipe-container|tasty-recipes-entry-content", re.I)},
            {"class_": re.compile(r"recipe|ingredient|instruction|directions", re.I)},
            {"id": re.compile(r"recipe", re.I)},
            {"role": "main"},
            {"class_": re.compile(r"entry-content|post-content|article-content", re.I)},
            {"tag": "article"},
            {"tag": "main"},
        ]
        
        best_container = None
        
        for selector in content_selectors:
            if "tag" in selector:
                found = soup.find(selector["tag"])
            else:
                found = soup.find(**selector)
                
            if found:
                # Check if this container actually has substantial text
                if len(found.get_text(strip=True)) > 100:
                    best_container = found
                    break
        
        target = best_container or soup.body or soup
        
        # 3. Aggressive cleanup INSIDE the target
        # Remove navigation, footers, ads, etc.
        for tag in target(['nav', 'footer', 'header', 'aside', 'form', 'button']):
            # Be careful not to remove recipe headers like <h2>Ingredients</h2>
            if tag.name == 'header' and tag.parent and tag.parent.name == 'article':
                continue # Keep article headers
            tag.decompose()

        # Remove elements with classes that suggest UI junk
        junk_classes = re.compile(r'\b(nav|menu|footer|sidebar|widget|ad|banner|social|share|popup|modal|related|comments)\b', re.I)
        for tag in target.find_all(class_=junk_classes):
            tag.decompose()

        # 4. Extract text cleanly
        return self._clean_text(target.get_text(separator="\n", strip=True))

    
    async def scrape(self, url: str) -> dict:
        """Main scraping method that routes to appropriate scraper."""
        if self.is_youtube_url(url):
            content, title, image_url = await self.scrape_youtube(url)
            return {
                "content": content,
                "title": title,
                "image_url": image_url,
                "source_type": "youtube"
            }
        else:
            content, title, image_url = await self.scrape_website(url)
            return {
                "content": content,
                "title": title,
                "image_url": image_url,
                "source_type": "website"
            }


def get_scraper_service() -> ScraperService:
    return ScraperService()


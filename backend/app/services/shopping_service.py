import logging
import sys
import re
from typing import List, Dict
from urllib.parse import quote_plus

# Configure logging to ensure it appears in container logs
logger = logging.getLogger(__name__)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

class ShoppingService:
    """
    Shopping service that generates direct product search links for grocery sites.
    
    Instead of using external search APIs (which are rate-limited), this service
    generates direct links to search results pages on popular grocery websites.
    This approach is:
    - 100% reliable (no API calls, no rate limits)
    - Fast (no network requests needed)
    - Always returns useful links for the user to purchase ingredients
    """
    
    # Catalogue of grocery sites by country code
    # Each site has: name, base_url, search_url_template (use {query} placeholder)
    GROCERY_SITES = {
        "US": [
            {"name": "Amazon", "domain": "amazon.com", "search_url": "https://www.amazon.com/s?k={query}&i=grocery"},
            {"name": "Walmart", "domain": "walmart.com", "search_url": "https://www.walmart.com/search?q={query}&cat_id=976759"},
            {"name": "Target", "domain": "target.com", "search_url": "https://www.target.com/s?searchTerm={query}&category=5xt1a"},
            {"name": "Instacart", "domain": "instacart.com", "search_url": "https://www.instacart.com/store/search/{query}"},
            {"name": "Whole Foods", "domain": "wholefoodsmarket.com", "search_url": "https://www.amazon.com/s?k={query}&i=wholefoods"},
        ],
        "GB": [
            {"name": "Amazon UK", "domain": "amazon.co.uk", "search_url": "https://www.amazon.co.uk/s?k={query}&i=grocery"},
            {"name": "Tesco", "domain": "tesco.com", "search_url": "https://www.tesco.com/groceries/en-GB/search?query={query}"},
            {"name": "Sainsbury's", "domain": "sainsburys.co.uk", "search_url": "https://www.sainsburys.co.uk/gol-ui/SearchResults/{query}"},
            {"name": "Asda", "domain": "asda.com", "search_url": "https://groceries.asda.com/search/{query}"},
            {"name": "Ocado", "domain": "ocado.com", "search_url": "https://www.ocado.com/search?entry={query}"},
        ],
        "UK": [  # Alias for GB
            {"name": "Amazon UK", "domain": "amazon.co.uk", "search_url": "https://www.amazon.co.uk/s?k={query}&i=grocery"},
            {"name": "Tesco", "domain": "tesco.com", "search_url": "https://www.tesco.com/groceries/en-GB/search?query={query}"},
            {"name": "Sainsbury's", "domain": "sainsburys.co.uk", "search_url": "https://www.sainsburys.co.uk/gol-ui/SearchResults/{query}"},
            {"name": "Asda", "domain": "asda.com", "search_url": "https://groceries.asda.com/search/{query}"},
            {"name": "Ocado", "domain": "ocado.com", "search_url": "https://www.ocado.com/search?entry={query}"},
        ],
        "IN": [
            {"name": "Amazon India", "domain": "amazon.in", "search_url": "https://www.amazon.in/s?k={query}&i=grocery"},
            {"name": "BigBasket", "domain": "bigbasket.com", "search_url": "https://www.bigbasket.com/ps/?q={query}"},
            {"name": "Blinkit", "domain": "blinkit.com", "search_url": "https://blinkit.com/s/?q={query}"},
            {"name": "JioMart", "domain": "jiomart.com", "search_url": "https://www.jiomart.com/search/{query}"},
            {"name": "Flipkart", "domain": "flipkart.com", "search_url": "https://www.flipkart.com/search?q={query}&otracker=search&otracker1=search&marketplace=GROCERY"},
        ],
        "DE": [
            {"name": "Amazon DE", "domain": "amazon.de", "search_url": "https://www.amazon.de/s?k={query}&i=grocery"},
            {"name": "REWE", "domain": "rewe.de", "search_url": "https://shop.rewe.de/productList?search={query}"},
            {"name": "Edeka", "domain": "edeka24.de", "search_url": "https://www.edeka24.de/suche/?qs={query}"},
            {"name": "Kaufland", "domain": "kaufland.de", "search_url": "https://www.kaufland.de/q/?q={query}"},
        ],
        "FR": [
            {"name": "Amazon FR", "domain": "amazon.fr", "search_url": "https://www.amazon.fr/s?k={query}&i=grocery"},
            {"name": "Carrefour", "domain": "carrefour.fr", "search_url": "https://www.carrefour.fr/s?q={query}"},
            {"name": "Auchan", "domain": "auchan.fr", "search_url": "https://www.auchan.fr/recherche?text={query}"},
        ],
        "CA": [
            {"name": "Amazon CA", "domain": "amazon.ca", "search_url": "https://www.amazon.ca/s?k={query}&i=grocery"},
            {"name": "Walmart CA", "domain": "walmart.ca", "search_url": "https://www.walmart.ca/search?q={query}&c=10019"},
            {"name": "Instacart CA", "domain": "instacart.ca", "search_url": "https://www.instacart.ca/store/search/{query}"},
            {"name": "Loblaws", "domain": "loblaws.ca", "search_url": "https://www.loblaws.ca/search?search-bar={query}"},
        ],
        "AU": [
            {"name": "Amazon AU", "domain": "amazon.com.au", "search_url": "https://www.amazon.com.au/s?k={query}&i=grocery"},
            {"name": "Woolworths", "domain": "woolworths.com.au", "search_url": "https://www.woolworths.com.au/shop/search/products?searchTerm={query}"},
            {"name": "Coles", "domain": "coles.com.au", "search_url": "https://www.coles.com.au/search?q={query}"},
        ],
        "WT": [  # Fallback/Global - defaults to US Amazon
            {"name": "Amazon", "domain": "amazon.com", "search_url": "https://www.amazon.com/s?k={query}&i=grocery"},
        ]
    }

    def __init__(self):
        pass

    async def find_products(self, ingredient_name: str, country: str = "US") -> List[Dict[str, str]]:
        """
        Generate direct product search links for a given ingredient.
        
        This method generates links to search pages on popular grocery websites
        based on the user's country. No external API calls are made.
        
        Args:
            ingredient_name: The ingredient to search for
            country: Country code (US, GB, IN, DE, FR, CA, AU) or region string (us-en)
            
        Returns:
            List of dictionaries with title, link, source, and price fields
        """
        # 1. Determine Country Code
        country_code = self._parse_country_code(country)
        
        # 2. Get grocery sites for this country
        sites = self.GROCERY_SITES.get(country_code, self.GROCERY_SITES["WT"])
        
        # 3. Clean and encode the ingredient name for URL
        clean_name = self._clean_ingredient_name(ingredient_name)
        encoded_name = quote_plus(clean_name)
        
        logger.info(f"ShoppingService: Generating links for '{ingredient_name}' | Country: {country_code} | Sites: {len(sites)}")
        print(f"[DEBUG] ShoppingService: Generating {len(sites)} links for '{ingredient_name}' in {country_code}")

        results = []
        
        # Generate links for each grocery site (limit to top 3 for cleaner UI)
        for site in sites[:3]:
            search_url = site["search_url"].replace("{query}", encoded_name)
            
            results.append({
                "title": f"{clean_name} at {site['name']}",
                "link": search_url,
                "source": site["domain"],
                "price": None  # Price will be visible when user clicks the link
            })
        
        logger.info(f"ShoppingService: Generated {len(results)} links for '{ingredient_name}'")
        return results

    def _parse_country_code(self, country: str) -> str:
        """Parse country string into a 2-letter country code."""
        if not country:
            return "WT"
        
        input_upper = country.upper().strip()
        
        # If input is like 'US-EN', extract 'US'
        if '-' in input_upper:
            parts = input_upper.split('-')
            if len(parts[0]) == 2:
                country_code = parts[0]
                if country_code in self.GROCERY_SITES:
                    return country_code
        
        # If input is 'US' (2 chars)
        if len(input_upper) == 2 and input_upper in self.GROCERY_SITES:
            return input_upper
        
        # Default fallback
        return "WT"

    def _clean_ingredient_name(self, name: str) -> str:
        """Clean ingredient name for search query."""
        # Remove common measurement words and special characters
        # Keep the core ingredient name
        clean = name.strip()
        
        # Remove leading quantities like "2 cups", "1/2 lb", etc.
        clean = re.sub(r'^[\d\s\/\.\,]+\s*(cups?|tbsp?|tsp?|oz|lb|g|kg|ml|l|pieces?|cloves?|stalks?|bunch|head|can|jar|bottle|package|bag)\s+', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^[\d\s\/\.\,]+\s+', '', clean)
        
        # Remove parenthetical notes
        clean = re.sub(r'\s*\([^)]*\)', '', clean)
        
        # Remove "for garnish", "optional", etc.
        clean = re.sub(r',?\s*(for garnish|optional|to taste|as needed|divided).*$', '', clean, flags=re.IGNORECASE)
        
        return clean.strip() or name

_shopping_service = None

def get_shopping_service() -> ShoppingService:
    global _shopping_service
    if _shopping_service is None:
        _shopping_service = ShoppingService()
    return _shopping_service

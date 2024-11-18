import os
import json
import logging
import random
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

class ProxyManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ProxyManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            try:
                # List of proxy configurations
                self.proxies = json.loads(os.environ.get("PROXY_LIST", "[]"))
                if not self.proxies:
                    raise ValueError("No proxies configured in PROXY_LIST environment variable")
                
                logger.info(f"Initialized ProxyManager with {len(self.proxies)} proxies")
                
            except Exception as e:
                logger.error(f"Failed to initialize ProxyManager: {e}")
                raise
            
            self.initialized = True

    def get_proxy_url(self) -> str:
        """Get a random proxy URL"""
        if not self.proxies:
            raise ValueError("No proxies available")
            
        # Randomly select a proxy
        proxy = random.choice(self.proxies)
        proxy_url = f"http://{proxy['username']}:{proxy['password']}@{proxy['url']}:{proxy['port']}"
        logger.info(f"Selected proxy: {proxy['url']}")
        return proxy_url

    def mark_failure(self, proxy_url: str):
        """Log proxy failure for monitoring"""
        logger.warning(f"Proxy failure reported: {proxy_url}")
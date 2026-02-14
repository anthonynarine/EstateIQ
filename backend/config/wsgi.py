import os

from dotenv import load_dotenv
from django.core.wsgi import get_wsgi_application

# Step 1: load environment variables from .env
load_dotenv()

# Step 2: point Django to the settings *package*
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()

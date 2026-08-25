import pytest
import sys
import os

# Add backend directory to sys.path for test discovery
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "03-backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import os
import sys

# Ensure the project root is on sys.path so `import resources...` works in tests.
PROJECT_ROOT = os.path.dirname(__file__)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# embed.py
from sentence_transformers import SentenceTransformer
import sys, json

model = SentenceTransformer('all-MiniLM-L6-v2')

# Take text input from command line
text = sys.argv[1]
embedding = model.encode(text).tolist()
print(json.dumps(embedding))

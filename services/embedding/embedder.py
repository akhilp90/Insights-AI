from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv

load_dotenv()

COLLECTION_NAME = 'reviews'
VECTOR_SIZE     = 384

model  = SentenceTransformer('all-MiniLM-L6-v2')
client = QdrantClient(url=os.getenv('QDRANT_URL', 'http://localhost:6333'))


def ensure_collection():
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE
            )
        )
        print(f'[QDRANT] Collection {COLLECTION_NAME} created')
    else:
        print(f'[QDRANT] Collection {COLLECTION_NAME} already exists')


def embed_and_store(review_id: int, text: str, metadata: dict):
    ensure_collection()

    vector = model.encode(text).tolist()

    point = PointStruct(
        id      = review_id,
        vector  = vector,
        payload = {
            'review_id':  review_id,
            'product_id': metadata.get('product_id'),
            'dataset_id': metadata.get('dataset_id'),
            'source':     metadata.get('source'),
            'rating':     metadata.get('rating'),
            'text':       text,
        }
    )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[point]
    )

    print(f'[QDRANT] Review {review_id} embedded and stored')
    return vector

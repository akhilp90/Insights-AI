from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

celery_app = Celery(
    'feedback_analyzer',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
)

celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    task_routes={
        'tasks.ingest':     {'queue': 'ingestion'},
        'tasks.preprocess': {'queue': 'preprocessing'},
        'tasks.embed':      {'queue': 'embedding'},
        'tasks.nlp':        {'queue': 'nlp'},
        'tasks.cluster':    {'queue': 'clustering'},
        'tasks.patterns':   {'queue': 'pattern_detection'},
    },
)

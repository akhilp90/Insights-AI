from sqlalchemy import Column, Integer, String, Text, Numeric, Date, Boolean, TIMESTAMP, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'
    id       = Column(Integer, primary_key=True)
    sku      = Column(String)
    name     = Column(String)
    category = Column(String)

class Dataset(Base):
    __tablename__ = 'datasets'
    id          = Column(Integer, primary_key=True)
    client_id   = Column(Integer)
    product_id  = Column(Integer)
    name        = Column(String)
    file_type   = Column(String)
    row_count   = Column(Integer)

class Review(Base):
    __tablename__ = 'reviews'
    id           = Column(Integer, primary_key=True)
    product_id   = Column(Integer)
    dataset_id   = Column(Integer)
    source       = Column(String)
    external_id  = Column(String)
    author       = Column(String)
    rating       = Column(Numeric)
    title        = Column(Text)
    body         = Column(Text)
    review_date  = Column(Date)
    raw_data     = Column(JSON)
    is_processed = Column(Boolean, default=False)

from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import re

app = FastAPI()

# Load model and vectorizer
model = joblib.load("app/model.pkl")
vectorizer = joblib.load("app/vectorizer.pkl")

# Optional: Cleaner from your training script
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Define input schema
class InputText(BaseModel):
    text: str

@app.post("/predict")
async def predict(input: InputText):
    cleaned = clean_text(input.text)
    vector = vectorizer.transform([cleaned])
    prediction = model.predict(vector)[0]
    return {"category": prediction}


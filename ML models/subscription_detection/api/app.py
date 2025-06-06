from fastapi import FastAPI, Query
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="Subscription Merchant Classifier API")

# Load the trained model and TF-IDF vectorizer
model_path = "models/subscription_model.pkl"
vectorizer_path = "models/tfidf_vectorizer.pkl"

if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
    raise FileNotFoundError("❌ Model or vectorizer file not found. Please train the model first.")

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)

# Request schema
class MerchantQuery(BaseModel):
    merchant_name: str

# API route
@app.post("/predict")
def predict_subscription(data: MerchantQuery):
    merchant = data.merchant_name.lower().strip()

    # Vectorize the input
    merchant_vector = vectorizer.transform([merchant])

    # Predict using the loaded model
    prediction = model.predict(merchant_vector)[0]

    result = "yes" if prediction == 1 else "no"
    return {
        "merchant_name": merchant,
        "is_subscription": result
    }
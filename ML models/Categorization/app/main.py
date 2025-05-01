from fastapi import FastAPI, Request
import joblib

app = FastAPI()

# Load your model and vectorizer
model = joblib.load("model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

@app.post("/predict")
async def predict(request: Request):
    body = await request.json()
    text = body.get("text", "")

    # Vectorize and predict
    vector = vectorizer.transform([text])
    prediction = model.predict(vector)[0]

    return {"category": prediction}

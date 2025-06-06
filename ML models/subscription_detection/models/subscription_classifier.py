import pandas as pd
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

def train_subscription_classifier():
    """
    Train a subscription classifier using labeled merchant data.
    Saves the model and TF-IDF vectorizer to the models/ directory.
    """
    base_dir = os.path.dirname(os.path.dirname(__file__))  # Go up one level from utils/
    data_path = os.path.join(base_dir, "data", "cleaned_subscription_merchants.csv")
    models_dir = os.path.join(base_dir, "models")
    
    print("📊 Loading and preprocessing labeled merchant data...")

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"❌ Data file not found at: {data_path}")

    # Load the dataset
    df = pd.read_csv(data_path)

    # Validate required columns
    required_cols = {'merchant', 'is_subscription'}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"❌ Dataset must contain the following columns: {required_cols}")

    # Clean merchant names
    df['merchant'] = df['merchant'].astype(str).str.lower().str.strip()

    # Feature extraction using TF-IDF
    tfidf = TfidfVectorizer(stop_words='english')
    X = tfidf.fit_transform(df['merchant'])
    y = df['is_subscription']

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train the model
    print("🌲 Training Random Forest classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print("✅ Model training complete!")
    print("📈 Accuracy:", accuracy_score(y_test, y_pred))
    print("📋 Classification Report:\n", classification_report(y_test, y_pred))

    # Save model and vectorizer
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(model, os.path.join(models_dir, "subscription_model.pkl"))
    joblib.dump(tfidf, os.path.join(models_dir, "tfidf_vectorizer.pkl"))
    print("💾 Model saved to models/subscription_model.pkl")
    print("💾 Vectorizer saved to models/tfidf_vectorizer.pkl")

if __name__ == "__main__":
    train_subscription_classifier()

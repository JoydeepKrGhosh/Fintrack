import os
from models.subscription_classifier import train_subscription_classifier

def main():
    print("\n🔍 Starting Subscription Merchant Classifier Training...\n")

    # Define the path to your merchant dataset
    data_path = os.path.join("data", "subscription_merchants.csv")
    model_path = os.path.join("models", "subscription_classifier.pkl")

    # Check if the dataset exists
    if not os.path.isfile(data_path):
        print(f"❌ Dataset not found at: {data_path}")
        print("📌 Please make sure the file exists in the 'data/' folder.")
        return

    try:
        # Train the classifier using your dataset
        train_subscription_classifier(data_path, model_path)
        print("\n✅ Training completed successfully.")
        print(f"📁 Model saved to: {model_path}")
    except Exception as e:
        print(f"\n❌ Error during training: {e}")

if __name__ == "__main__":
    main()

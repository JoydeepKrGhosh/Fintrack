import pandas as pd
import os

def preprocess_data():
    base_dir = os.path.dirname(os.path.dirname(__file__))  # goes up one level from utils/
    path = os.path.join(base_dir, "data", "subscription_merchants.csv")
    """
    Loads and preprocesses known merchant data.
    Cleans by removing duplicates based on 'merchant' column.
    Saves the cleaned data to 'data/cleaned_subscription_merchants.csv'.
    """
    if not os.path.exists(path):
        print(f"❌ File not found at {path}")
        return pd.DataFrame()

    print(f"✅ File found at {path}. Loading data...")

    df = pd.read_csv(path)

    # Check for expected columns
    if 'merchant' not in df.columns or 'is_subscription' not in df.columns:
        print("❌ Required columns 'merchant' and/or 'is_subscription' not found.")
        return pd.DataFrame()

    print("✅ Required columns found. Cleaning data...")

    # Clean merchant names (lowercase and strip whitespace)
    df['merchant'] = df['merchant'].astype(str).str.lower().str.strip()

    # Drop duplicate merchant names
    df = df.drop_duplicates(subset=['merchant'])

    # Define output file path in the root-level data folder
    cleaned_path = os.path.join(base_dir, "data", "cleaned_subscription_merchants.csv")

    # Ensure the parent directory exists
    os.makedirs(os.path.dirname(cleaned_path), exist_ok=True)

    # Save the cleaned DataFrame
    df.to_csv(cleaned_path, index=False)

    print(f"✅ Preprocessing complete. Cleaned data saved to {cleaned_path}")
    return df

# Run the function
preprocess_data()

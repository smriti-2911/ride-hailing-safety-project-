# Basic Exploratory Data Analysis (EDA)
# This script performs basic EDA on the ride safety dataset

# Import necessary libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Set style for better visualizations
plt.style.use('seaborn')
sns.set_palette("husl")

# Read the dataset
df = pd.read_csv('../../datasets/raw/ride_safety_dataset.csv')

# 1. Basic Data Overview
print("\n=== Basic Data Overview ===")
print("\nFirst few rows of the dataset:")
print(df.head())

print("\nDataset Info:")
print(df.info())

print("\nBasic Statistics:")
print(df.describe())

# 2. Missing Values Analysis
print("\n=== Missing Values Analysis ===")
missing_values = df.isnull().sum()
missing_percentage = (missing_values / len(df)) * 100

missing_df = pd.DataFrame({
    'Missing Values': missing_values,
    'Percentage': missing_percentage
})

print("\nMissing Values Analysis:")
print(missing_df[missing_df['Missing Values'] > 0])

# 3. Data Types Analysis
print("\n=== Data Types Analysis ===")
print("\nData Types of all columns:")
print(df.dtypes)

# 4. Unique Values Analysis
print("\n=== Unique Values Analysis ===")
categorical_columns = df.select_dtypes(include=['object']).columns
print("\nUnique values in categorical columns:")
for col in categorical_columns:
    print(f"\n{col}:")
    print(df[col].value_counts().head())

# 5. Basic Visualizations
print("\n=== Generating Visualizations ===")

# Create a figure with multiple subplots
plt.figure(figsize=(15, 10))

# 1. Crime Type Distribution
plt.subplot(2, 2, 1)
df['Crime_Type'].value_counts().plot(kind='bar')
plt.title('Distribution of Crime Types')
plt.xticks(rotation=45)

# 2. City Distribution
plt.subplot(2, 2, 2)
df['City'].value_counts().plot(kind='pie', autopct='%1.1f%%')
plt.title('Distribution of Cities')

# 3. Time of Day Distribution
plt.subplot(2, 2, 3)
df['Time_of_Day'].value_counts().plot(kind='bar')
plt.title('Distribution of Time of Day')

# 4. Weather Condition Distribution
plt.subplot(2, 2, 4)
df['Weather_Condition'].value_counts().plot(kind='bar')
plt.title('Distribution of Weather Conditions')

plt.tight_layout()
plt.savefig('basic_visualizations.png')
plt.close()

# 6. Correlation Analysis
print("\n=== Generating Correlation Heatmap ===")
numeric_columns = df.select_dtypes(include=[np.number]).columns
correlation_matrix = df[numeric_columns].corr()

plt.figure(figsize=(12, 8))
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0)
plt.title('Correlation Heatmap')
plt.savefig('correlation_heatmap.png')
plt.close()

# 7. Summary Statistics by Category
print("\n=== Summary Statistics by Category ===")
print("\nSummary Statistics by City:")
print(df.groupby('City').describe())

print("\nSummary Statistics by Crime Type:")
print(df.groupby('Crime_Type').describe())

# Save additional visualizations
print("\n=== Generating Additional Visualizations ===")

# Crime Severity Distribution
plt.figure(figsize=(10, 6))
sns.histplot(data=df, x='Crime_Severity', bins=20)
plt.title('Distribution of Crime Severity')
plt.savefig('crime_severity_distribution.png')
plt.close()

# Weather Impact on Crime
plt.figure(figsize=(12, 6))
sns.boxplot(data=df, x='Weather_Condition', y='Crime_Severity')
plt.title('Weather Impact on Crime Severity')
plt.xticks(rotation=45)
plt.savefig('weather_crime_impact.png')
plt.close()

# Time of Day vs Crime Severity
plt.figure(figsize=(10, 6))
sns.boxplot(data=df, x='Time_of_Day', y='Crime_Severity')
plt.title('Time of Day vs Crime Severity')
plt.xticks(rotation=45)
plt.savefig('time_crime_impact.png')
plt.close()

print("\nAnalysis complete! Check the generated visualization files.") 
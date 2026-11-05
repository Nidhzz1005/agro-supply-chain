"""
train.py — Run once to train all 3 ML models
Usage: python train.py
"""
import numpy as np
import pandas as pd
import joblib, os, warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

np.random.seed(42)
N = 2000

CROPS  = ["Wheat","Rice","Tomato","Onion","Potato","Spinach","Corn","Sugarcane","Cotton","Soybean"]
CITIES = ["Nashik","Mumbai","Pune","Delhi","Bangalore","Hyderabad","Chennai","Kolkata"]

PERISHABILITY = {"Wheat":0.1,"Rice":0.1,"Corn":0.2,"Sugarcane":0.3,"Cotton":0.05,
    "Soybean":0.15,"Potato":0.3,"Onion":0.35,"Tomato":0.9,"Spinach":0.95}
BASE_PRICE = {"Wheat":20,"Rice":35,"Tomato":25,"Onion":20,"Potato":18,
    "Spinach":30,"Corn":22,"Sugarcane":5,"Cotton":60,"Soybean":45}
CITY_DEMAND = {"Mumbai":1.5,"Delhi":1.4,"Bangalore":1.3,"Kolkata":1.2,
    "Hyderabad":1.1,"Chennai":1.1,"Pune":1.0,"Nashik":0.8}
CITY_PRICE  = {"Mumbai":1.3,"Delhi":1.25,"Bangalore":1.2,"Kolkata":1.15,
    "Hyderabad":1.1,"Chennai":1.1,"Pune":1.05,"Nashik":1.0}
DISTANCES = {
    ("Nashik","Mumbai"):165,("Nashik","Pune"):210,("Nashik","Delhi"):1400,
    ("Nashik","Bangalore"):840,("Nashik","Hyderabad"):510,("Nashik","Chennai"):1150,
    ("Nashik","Kolkata"):1600,("Mumbai","Pune"):150,("Mumbai","Delhi"):1400,
    ("Mumbai","Bangalore"):980,("Mumbai","Hyderabad"):710,("Pune","Delhi"):1400,
    ("Pune","Bangalore"):840,("Delhi","Kolkata"):1500,("Delhi","Chennai"):2200,
    ("Bangalore","Chennai"):350,("Bangalore","Hyderabad"):570,("Hyderabad","Chennai"):630,
}
def gdist(c1,c2): return DISTANCES.get((c1,c2),DISTANCES.get((c2,c1),800))

os.makedirs("models",exist_ok=True)
os.makedirs("data",exist_ok=True)

crop_enc = LabelEncoder().fit(CROPS)
city_enc = LabelEncoder().fit(CITIES)
joblib.dump(crop_enc,"models/crop_encoder.pkl")
joblib.dump(city_enc,"models/city_encoder.pkl")

DEMAND_COLS   = ["crop_enc","city_enc","month","last_month_qty"]
SPOILAGE_COLS = ["crop_enc","distance_km","transit_days","month","quantity"]
PRICE_COLS    = ["crop_enc","city_enc","month","quantity"]

# 1. DEMAND
print("Training Demand Forecasting (Random Forest)...")
rows=[]
for _ in range(N):
    crop=np.random.choice(CROPS); city=np.random.choice(CITIES)
    month=np.random.randint(1,13); lmq=np.random.randint(50,800)
    seas=(1.3 if month in [10,11,12,1,2] else 0.8) if crop in ["Wheat","Rice","Corn"] else \
         (1.4 if month in [11,12,1,2,3]  else 0.7) if crop in ["Tomato","Spinach"] else \
         1.0+0.1*np.sin(month*np.pi/6)
    demand=max(50,int(lmq*0.4+CITY_DEMAND[city]*200*seas+np.random.normal(0,30)))
    rows.append([int(crop_enc.transform([crop])[0]),int(city_enc.transform([city])[0]),month,lmq,demand])
df=pd.DataFrame(rows,columns=DEMAND_COLS+["demand"])
df.to_csv("data/demand_data.csv",index=False)
Xtr,Xte,ytr,yte=train_test_split(df[DEMAND_COLS],df["demand"],test_size=0.2,random_state=42)
m=RandomForestRegressor(n_estimators=200,max_depth=10,random_state=42)
m.fit(Xtr,ytr); print(f"  R² = {m.score(Xte,yte):.3f}")
joblib.dump(m,"models/demand_model.pkl")

# 2. SPOILAGE
print("Training Spoilage Prediction (Logistic Regression)...")
rows=[]
for _ in range(N):
    crop=np.random.choice(CROPS); c1,c2=np.random.choice(CITIES,2,replace=False)
    dist=gdist(c1,c2); tdays=max(1,int(dist/400)+np.random.randint(0,2))
    month=np.random.randint(1,13); qty=np.random.randint(50,600)
    heat=1.3 if month in [4,5,6] else 1.0
    score=np.clip(PERISHABILITY[crop]*0.5+(dist/3000)*0.25+(tdays/7)*0.15+(heat-1)*0.1+np.random.normal(0,0.04),0,1)
    label=0 if score<0.35 else(1 if score<0.65 else 2)
    rows.append([int(crop_enc.transform([crop])[0]),dist,tdays,month,qty,label])
df=pd.DataFrame(rows,columns=SPOILAGE_COLS+["risk_label"])
df.to_csv("data/spoilage_data.csv",index=False)
Xtr,Xte,ytr,yte=train_test_split(df[SPOILAGE_COLS],df["risk_label"],test_size=0.2,random_state=42)
pipe=Pipeline([("scaler",StandardScaler()),("model",LogisticRegression(max_iter=2000,random_state=42))])
pipe.fit(Xtr,ytr); print(f"  Accuracy = {pipe.score(Xte,yte):.3f}")
joblib.dump(pipe,"models/spoilage_model.pkl")

# 3. PRICE
print("Training Price Prediction (Gradient Boosting)...")
rows=[]
for _ in range(N):
    crop=np.random.choice(CROPS); city=np.random.choice(CITIES)
    month=np.random.randint(1,13); qty=np.random.randint(50,1000)
    seas=1.2 if month in [11,12,1,2] else(0.85 if month in [5,6,7] else 1.0)
    price=max(3.0,BASE_PRICE[crop]*seas*(1-min(0.15,qty/10000))*CITY_PRICE[city]+np.random.normal(0,1.0))
    rows.append([int(crop_enc.transform([crop])[0]),int(city_enc.transform([city])[0]),month,qty,round(price,2)])
df=pd.DataFrame(rows,columns=PRICE_COLS+["price_per_kg"])
df.to_csv("data/price_data.csv",index=False)
Xtr,Xte,ytr,yte=train_test_split(df[PRICE_COLS],df["price_per_kg"],test_size=0.2,random_state=42)
m=GradientBoostingRegressor(n_estimators=200,max_depth=4,learning_rate=0.05,random_state=42)
m.fit(Xtr,ytr); print(f"  R² = {m.score(Xte,yte):.3f}")
joblib.dump(m,"models/price_model.pkl")

print("\n✅ All 3 models trained and saved to models/")
print("   Now run: python app.py")

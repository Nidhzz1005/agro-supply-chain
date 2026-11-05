"""
app.py - Flask ML API for Agro Supply Chain
Run: python app.py
Serves on: http://localhost:5001
"""
import warnings
warnings.filterwarnings("ignore")

from flask import Flask, request, jsonify
import joblib, numpy as np, pandas as pd, os

app = Flask(__name__)

# Manual CORS — no flask-cors needed
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route("/predict/demand",   methods=["OPTIONS"])
@app.route("/predict/spoilage", methods=["OPTIONS"])
@app.route("/predict/price",    methods=["OPTIONS"])
@app.route("/health",           methods=["OPTIONS"])
def options_handler(): return jsonify({}), 200

BASE = os.path.dirname(os.path.abspath(__file__))

def load(name):
    p = os.path.join(BASE, "models", name)
    if not os.path.exists(p):
        raise FileNotFoundError(f"Missing model: {name}. Please run 'python train.py' first.")
    return joblib.load(p)

try:
    demand_model   = load("demand_model.pkl")
    spoilage_model = load("spoilage_model.pkl")
    price_model    = load("price_model.pkl")
    crop_enc       = load("crop_encoder.pkl")
    city_enc       = load("city_encoder.pkl")
    MODELS_READY = True
    print("✅ All models loaded successfully")
except FileNotFoundError as e:
    print(f"❌ {e}")
    MODELS_READY = False
    demand_model = spoilage_model = price_model = crop_enc = city_enc = None

KNOWN_CROPS  = ["Wheat","Rice","Tomato","Onion","Potato","Spinach","Corn","Sugarcane","Cotton","Soybean"]
KNOWN_CITIES = ["Nashik","Mumbai","Pune","Delhi","Bangalore","Hyderabad","Chennai","Kolkata"]
DEMAND_COLS   = ["crop_enc","city_enc","month","last_month_qty"]
SPOILAGE_COLS = ["crop_enc","distance_km","transit_days","month","quantity"]
PRICE_COLS    = ["crop_enc","city_enc","month","quantity"]
RETAIL_MARGIN        = 1.28
FAIR_SHARE_THRESHOLD = 0.50

def enc_crop(v):
    v = str(v).strip().title()
    return int(crop_enc.transform([v if v in KNOWN_CROPS else "Wheat"])[0])

def enc_city(v):
    v = str(v).strip().title()
    return int(city_enc.transform([v if v in KNOWN_CITIES else "Mumbai"])[0])

def not_ready():
    return jsonify({"error":"Models not loaded. Please run 'python train.py' in the ml-api folder first."}), 503

# ── Health ───────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status":"ok" if MODELS_READY else "models_not_loaded","modelsReady":MODELS_READY})

# ── 1. Demand Forecast ───────────────────────────────────────────────────────
@app.route("/predict/demand", methods=["POST"])
def predict_demand():
    if not MODELS_READY: return not_ready()
    try:
        d     = request.get_json(force=True)
        crop  = d.get("crop","Wheat")
        city  = d.get("city","Mumbai")
        month = int(d.get("month",10))
        lmq   = int(d.get("lastMonthQty",200))

        X    = pd.DataFrame([[enc_crop(crop),enc_city(city),month,lmq]], columns=DEMAND_COLS)
        pred = int(demand_model.predict(X)[0])
        diff = pred - lmq

        trend = ("📈 Demand is rising vs last month."  if diff >  50 else
                 "📉 Demand is lower than last month." if diff < -50 else
                 "➡️ Demand is stable vs last month.")
        suggestion = (f"High demand expected — consider producing at least {pred}kg." if pred > lmq*1.2 else
                      f"Lower demand expected — {pred}kg should be sufficient."        if pred < lmq*0.8 else
                      f"Steady demand — producing around {pred}kg is recommended.")

        return jsonify({"predictedDemand":pred,"unit":"kg","lastMonthQty":lmq,
                        "trend":trend,"suggestion":suggestion,
                        "crop":str(crop).title(),"city":str(city).title()})
    except Exception as e:
        return jsonify({"error":str(e)}), 500

# ── 2. Spoilage Prediction ───────────────────────────────────────────────────
@app.route("/predict/spoilage", methods=["POST"])
def predict_spoilage():
    if not MODELS_READY: return not_ready()
    try:
        d     = request.get_json(force=True)
        crop  = d.get("crop","Wheat")
        dist  = int(d.get("distanceKm",500))
        tdays = int(d.get("transitDays",2))
        month = int(d.get("month",10))
        qty   = int(d.get("quantity",100))

        X     = pd.DataFrame([[enc_crop(crop),dist,tdays,month,qty]], columns=SPOILAGE_COLS)
        proba = spoilage_model.predict_proba(X)[0]
        label = int(spoilage_model.predict(X)[0])

        risk_map  = {0:"LOW",    1:"MEDIUM",  2:"HIGH"}
        color_map = {0:"#2e7d32",1:"#f57f17", 2:"#c62828"}
        emoji_map = {0:"🟢",    1:"🟡",      2:"🔴"}
        recs      = {
            0:"Safe to ship using standard transport. No special handling required.",
            1:"Consider refrigerated transport or expedite delivery to reduce risk.",
            2:"High spoilage risk! Use refrigerated transport or find a closer delivery point.",
        }
        return jsonify({
            "risk":risk_map[label],"probability":round(float(proba[label])*100,1),
            "probabilities":{"low":round(float(proba[0])*100,1),
                             "medium":round(float(proba[1])*100,1),
                             "high":round(float(proba[2])*100,1)},
            "color":color_map[label],"emoji":emoji_map[label],
            "recommendation":recs[label],
            "crop":str(crop).title(),"distanceKm":dist,"transitDays":tdays
        })
    except Exception as e:
        return jsonify({"error":str(e)}), 500

# ── 3. Price Prediction + Fair Share ─────────────────────────────────────────
@app.route("/predict/price", methods=["POST"])
def predict_price():
    if not MODELS_READY: return not_ready()
    try:
        d              = request.get_json(force=True)
        crop           = d.get("crop","Wheat")
        city           = d.get("city","Mumbai")
        month          = int(d.get("month",10))
        quantity       = int(d.get("quantity",100))
        producer_price = d.get("producerPrice",None)

        X             = pd.DataFrame([[enc_crop(crop),enc_city(city),month,quantity]], columns=PRICE_COLS)
        price_per_kg  = round(max(3.0,float(price_model.predict(X)[0])),2)
        retail_price  = round(price_per_kg * RETAIL_MARGIN, 2)
        total_value   = round(price_per_kg * quantity, 2)
        min_fair_price= round(retail_price * FAIR_SHARE_THRESHOLD, 2)

        alert=None; fair_share_pct=None
        if producer_price is not None:
            pp             = float(producer_price)
            fair_share_pct = round((pp/retail_price)*100,1)
            if pp < min_fair_price:
                alert={"type":"warning","emoji":"⚠️",
                       "message":(f"Producer receives ₹{pp}/kg but consumer pays ₹{retail_price}/kg. "
                                  f"Producer share is only {fair_share_pct}% — below the fair threshold of 50%. "
                                  f"Minimum fair price should be ₹{min_fair_price}/kg.")}
            else:
                alert={"type":"success","emoji":"✅",
                       "message":(f"Producer is getting a fair share ({fair_share_pct}% of consumer price). "
                                  f"This is above the 50% fair threshold. ✅")}

        return jsonify({"pricePerKg":price_per_kg,"retailPrice":retail_price,
                        "totalValue":total_value,"minFairPrice":min_fair_price,
                        "fairSharePct":fair_share_pct,"currency":"INR","unit":"kg",
                        "alert":alert,"crop":str(crop).title(),"city":str(city).title(),"quantity":quantity})
    except Exception as e:
        return jsonify({"error":str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting ML API on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)

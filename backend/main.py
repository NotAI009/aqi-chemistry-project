from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow React (frontend) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # in dev we allow all, later can restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PollutantData(BaseModel):
    pm25: float
    pm10: float
    so2: float
    no2: float
    co: float
    o3: float

def calculate_aqi(pm25, pm10, so2, no2, co, o3):
    sub_indices = {
        "PM2.5": pm25 * 2,
        "PM10": pm10 * 1.5,
        "SO2": so2 * 1.2,
        "NO2": no2 * 1.3,
        "CO": co * 10,
        "O3": o3 * 1.1,
    }
    aqi = max(sub_indices.values())
    dominant = max(sub_indices, key=sub_indices.get)
    return aqi, dominant

def chemistry_explanation(dominant):
    if dominant == "PM2.5":
        return (
            "PM2.5 are fine particles (<2.5 μm) that can reach deep into the lungs. "
            "They often carry adsorbed heavy metals and organic compounds, causing "
            "respiratory and cardiovascular problems."
        )
    elif dominant == "PM10":
        return (
            "PM10 are coarse particles (<10 μm). They mostly deposit in the upper "
            "respiratory tract and can cause irritation, coughing and breathing difficulty."
        )
    elif dominant == "SO2":
        return (
            "SO₂ is released when sulfur-containing fuels are burned. In air it forms "
            "SO₃ which reacts with water to give H₂SO₄ (sulfuric acid), contributing "
            "to acid rain and corrosion.\n"
            "Reactions: SO₂ + ½O₂ → SO₃;  SO₃ + H₂O → H₂SO₄"
        )
    elif dominant == "NO2":
        return (
            "NO₂ is a major component of vehicle exhaust. It participates in "
            "photochemical smog formation and can lead to ozone (O₃) formation in the troposphere."
        )
    elif dominant == "CO":
        return (
            "CO is formed by incomplete combustion of fuels. It binds strongly to "
            "hemoglobin forming carboxyhemoglobin, reducing the oxygen-carrying capacity of blood."
        )
    elif dominant == "O3":
        return (
            "Ground-level O₃ is a secondary pollutant formed when NOx and VOCs react "
            "in sunlight. It is a strong oxidizing agent and irritates eyes and lungs."
        )
    return "The dominant pollutant has significant health and environmental impacts."

@app.get("/")
def root():
    return {"message": "AQI Chemistry Backend is running!"}

@app.post("/api/calc-aqi")
def calc_aqi(data: PollutantData):
    aqi, dominant = calculate_aqi(
        data.pm25, data.pm10, data.so2, data.no2, data.co, data.o3
    )

    if aqi <= 50:
        category = "Good"
    elif aqi <= 100:
        category = "Satisfactory"
    elif aqi <= 200:
        category = "Moderate"
    elif aqi <= 300:
        category = "Poor"
    elif aqi <= 400:
        category = "Very Poor"
    else:
        category = "Severe"

    return {
        "aqi": round(aqi, 1),
        "category": category,
        "dominant_pollutant": dominant,
        "chemistry_note": chemistry_explanation(dominant),
    }

@app.get("/api/chemistry-info")
def chemistry_info():
    return {
        "primary_pollutants": [
            "SO₂, NO₂, CO, PM₂.₅, PM₁₀ – directly emitted from sources like vehicles, industries, burning of fuels."
        ],
        "secondary_pollutants": [
            "O₃, PAN, some particulate matter – formed in the atmosphere by chemical reactions "
            "between primary pollutants (e.g., NOx + VOCs + sunlight → O₃)."
        ],
        "acid_rain": [
            "SO₂ and NO₂ are oxidised in air to sulfuric and nitric acids.",
            "These acids dissolve in rainwater and fall as acid rain, damaging vegetation, soil and buildings.",
        ],
    }

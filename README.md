This is a clone from Hackathon AI in Action [Team Project](https://github.com/Engine55/silver-frontend)

<div align="center">
  <img src="./assets/SilverGameLogo.png" alt="Silver Game Logo" width="200"/>
  
  # Silver Game
  
  *A real-time multimodal emotion analysis platform designed for elderly users, featuring intelligent social interaction, AI emotion detection, and empathetic virtual companions.*
</div>

## 🎯 Inspiration

During COVID-19, we witnessed elderly people struggling with digital communication - feeling isolated despite being connected. Traditional chat platforms failed to understand their emotional needs. The key insight: elderly users often struggle to express emotions clearly in text but show genuine feelings through facial expressions. We realized that combining both could create truly empathetic AI companions.

## 🚀 What It Does

SilverLink AI is a real-time multimodal emotion analysis system that:

- **Analyzes text sentiment** using fine-tuned DistilBERT + Google Cloud NLP
- **Recognizes facial emotions** through custom MobileNetV2 models
- **Fuses both inputs** using elderly-optimized algorithms
- **Provides real-time emotion feedback** for chatbots, virtual companions, and healthcare monitoring
- **Enables intelligent user matching** based on emotional compatibility

**Core Innovation**: Our fusion algorithm accounts for elderly communication patterns (like saying "I'm fine" while looking sad) and weights facial expressions higher than text for more accurate emotion detection.

## 🏃 Quick Start

### One-Click Setup (Recommended)

```bash
# Double-click to run the startup script
start.bat
```

The script automatically:
- Detects and installs frontend & backend dependencies
- Starts both servers in parallel

### Using npm Scripts

```bash
# 1. Install dependencies and setup backend environment
npm run setup:backend

# 2. Start both frontend and backend
npm run dev:full
```

## 🌐 Access URLs

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **API Documentation**: http://localhost:8000/docs

## ✨ Core Features

- **Real-time Video Calls** - High-quality WebRTC-based video communication
- **AI Emotion Analysis** - Intelligent emotion state recognition
- **Virtual Spaces** - Diverse interactive scenarios
- **Smart Chat** - AI assistant conversation capabilities
- **Community Interaction** - User community and social features

## 🛠 Tech Stack

**Frontend**:
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- WebRTC
- Socket.IO

**Backend**:
- FastAPI (Python)
- WebSocket
- PyTorch (Emotion Analysis)
- Uvicorn

## 🏗 How We Built It

### AI Pipeline

- **Text Analysis**: Fine-tuned DistilBERT on elderly-specific language patterns + Google Cloud NLP for multilingual support
- **Facial Recognition**: Transfer learning with MobileNetV2, trained on elderly facial expression datasets
- **Fusion Algorithm**: Confidence-weighted combination with elderly-specific adjustments

### Backend Architecture

- FastAPI microservices deployed on Google Cloud Run
- WebRTC signaling server for real-time video chat
- MongoDB Vector Search for intelligent user matching
- RESTful APIs ready for frontend integration

### Real-time Integration

- WebSocket-based communication for live emotion tracking
- Optimized inference pipeline achieving <1.5s response time
- Docker containerization for scalable deployment

### Core API Example

```python
# POST /api/analyze-emotion
{
  "text": "I'm feeling okay today",
  "image": "base64_encoded_face_image",
  "context": "daily_check"
}

# Response:
{
  "text_sentiment": "neutral",
  "face_emotion": "sad",
  "final_emotion": "concerned",
  "confidence": 0.84,
  "recommendations": ["offer_support", "gentle_conversation"]
}
```

## 🧩 Challenges We Overcame

1. **Model Optimization**: Large transformer models exceeded Cloud Run memory limits
   - *Solution*: Model distillation and pruning, reduced size by 60% while maintaining accuracy

2. **Elderly-Specific Data Scarcity**: Limited training data for elderly expressions
   - *Solution*: Transfer learning, data augmentation, and synthetic elderly emotion datasets

3. **Fusion Algorithm Complexity**: Text and facial emotions often conflicted
   - *Solution*: Developed "hidden emotion" detection for cases where elderly say "fine" but look distressed

4. **Real-time Performance**: Needed <2s response for live chat integration
   - *Solution*: Parallel processing, efficient model loading, and optimized inference pipeline

## 🏆 What We Learned

- **Multimodal AI requires cultural sensitivity**: Emotion expression varies significantly across cultures and age groups
- **Production AI ≠ Research AI**: Models need significant optimization for real-world deployment
- **User-centric design is crucial**: Technology must adapt to elderly users, not vice versa
- **Edge cases matter**: Elderly communication patterns differ from typical AI training datasets

## 🎯 Roadmap

### Immediate (Next 3 months)
- Complete React frontend with real-time emotion visualization
- Unity 3D virtual companions that respond to user emotions
- Mobile app for elderly users with simplified interfaces

### Future Vision
- Speech emotion recognition for complete multimodal analysis
- Personalized emotion learning over time
- Clinical-grade integration for healthcare monitoring
- Global deployment with multi-cultural emotion understanding

## 📁 Project Structure

```
silver-frontend/
├── src/                    # Frontend source code
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   └── utils/            # Utility functions
├── backend/               # Backend source code
│   ├── websocket_server.py # WebSocket server
│   ├── main.py           # REST API server
│   ├── emotion_api/      # Emotion analysis API
│   └── requirements*.txt # Python dependencies
├── start.bat             # One-click startup script
└── package.json          # Frontend dependencies and scripts
```

## ✅ Feature Testing

1. Open http://localhost:3000
2. Click the blue floating video button in the bottom right
3. Allow browser access to camera and microphone
4. Enter username and start video call
5. Repeat in another browser window with same room ID for testing

## 🔧 Manual Setup Guide

If the automatic script encounters issues, follow these manual steps:

### Step 1: Setup Backend Environment

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows Command Prompt:
venv\Scripts\activate.bat
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Git Bash:
source venv/Scripts/activate

# 4. Install dependencies
pip install -r requirements.txt
```

### Step 2: Start Backend Services

```bash
# In backend directory, ensure virtual environment is activated
python -m uvicorn websocket_server:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Start Frontend (New Terminal)

```bash
# Return to project root directory
cd ..

# Install frontend dependencies
npm install

# Start frontend development server
npm run dev
```

## 🚨 Troubleshooting

### Backend Startup Issues
- Ensure Python 3.8+ is installed
- Check if virtual environment is properly activated
- Confirm port 8000 is not occupied

### Frontend Startup Issues  
- Ensure Node.js 16+ is installed
- Delete `node_modules` and `package-lock.json`, then `npm install` again
- Confirm port 3000 is not occupied

### Video Call Connection Issues
- Ensure backend server is running
- Check browser console for error messages
- Allow browser access to camera and microphone permissions

### Common Issues

**Issue 1: `No module named uvicorn`**
```bash
# Ensure virtual environment is activated
cd backend
venv\Scripts\activate
pip install uvicorn
```

**Issue 2: Python virtual environment creation fails**
```bash
# Try using full path
python.exe -m venv venv
# Or specify Python version
py -3 -m venv venv
```

**Issue 3: Permission issues (Windows PowerShell)**
```bash
# Temporarily allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Issue 4: Port occupied**
```bash
# Check port usage
netstat -ano | findstr :8000

# Use different port
python -m uvicorn websocket_server:app --host 0.0.0.0 --port 8001 --reload
```

## 👩‍💻 Development Guide

### Environment Requirements
- Node.js 16+
- Python 3.8+
- Modern browser (WebRTC support)

### Development Scripts
```bash
npm run dev          # Start frontend only
npm run dev:backend  # Start backend only
npm run dev:full     # Start both frontend and backend
npm run setup:backend # Setup backend environment
npm run build        # Build production version
```

### Code Standards
- Use ESLint for code linting
- Use TypeScript for type safety
- Follow Next.js 15 App Router conventions


---

**Silver Game** - Bridging generations through empathetic AI technology 💫


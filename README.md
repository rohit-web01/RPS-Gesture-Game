Gesture RPS Game 🖐️
An interactive, real-time Rock-Paper-Scissors game controlled entirely by hand gestures. This project uses a Python/OpenCV backend for computer vision and a modern React frontend for a seamless user experience.

---

### ✨ Features

- **Real-Time Gesture Detection:** Uses MediaPipe with OpenCV to instantly recognize hand signs.
- **Live Video Feed:** Streams the webcam feed directly to the browser.
- **Interactive React UI:** A sleek, single-screen interface with a 3D animated background.
- **Turn-Based Gameplay:** A structured best-of-5 rounds system with on-screen prompts and scoring.
- **Round History:** A table that tracks the results of each round.
- **Fully Responsive:** Looks and works great on both desktop and mobile devices.

### 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO, OpenCV, MediaPipe
- **Frontend:** React, Tailwind CSS, Vanta.js (for 3D background), Three.js
- **Communication:** WebSockets

---

### 🚀 Setup and Installation

**1. Clone the repository:**
```bash
git clone [https://github.com/your-username/RPS-Gesture-Game.git](https://github.com/your-username/RPS-Gesture-Game.git)
cd RPS-Gesture-Game
```

**2. Set up the Backend:**
```bash
cd rps-backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
```
*(Note: You will need to create a `requirements.txt` file for the backend.)*

**3. Set up the Frontend:**
```bash
cd ../rps-frontend
npm install
```

### ▶️ How to Run

You need to run two servers in two separate terminals.

1.  **Start the Backend Server:**
    ```bash
    # In the rps-backend directory
    python app.py
    ```
2.  **Start the Frontend Server:**
    ```bash
    # In the rps-frontend directory
    npm start
    ```

Open your browser to `http://localhost:3000` to play the game!

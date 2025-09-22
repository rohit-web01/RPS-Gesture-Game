import eventlet
# Necessary for SocketIO to work with threads. MUST be the first line after imports.
eventlet.monkey_patch()

import cv2
import mediapipe as mp
from flask import Flask, Response
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time

# --- App Initialization ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
# Use async_mode='eventlet' for stability
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# --- Global Variables for Threading ---
# Use a thread-safe way to ensure camera is only initialized once
cap = None
def get_camera():
    global cap
    if cap is None:
        cap = cv2.VideoCapture(0)
    return cap

latest_frame = None
lock = threading.Lock()

# --- MediaPipe Hand Detection Setup ---
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(min_detection_confidence=0.7, min_tracking_confidence=0.5, max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

def detect_gesture(image):
    """Detects hand gesture from an image and returns 'Rock', 'Paper', or 'Scissors'."""
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(image_rgb)
    
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            landmarks = hand_landmarks.landmark
            
            # Finger state: True if extended, False if curled
            fingers_extended = [
                landmarks[mp_hands.HandLandmark.INDEX_FINGER_TIP].y < landmarks[mp_hands.HandLandmark.INDEX_FINGER_PIP].y,
                landmarks[mp_hands.HandLandmark.MIDDLE_FINGER_TIP].y < landmarks[mp_hands.HandLandmark.MIDDLE_FINGER_PIP].y,
                landmarks[mp_hands.HandLandmark.RING_FINGER_TIP].y < landmarks[mp_hands.HandLandmark.RING_FINGER_PIP].y,
                # Corrected the landmark name below
                landmarks[mp_hands.HandLandmark.PINKY_TIP].y < landmarks[mp_hands.HandLandmark.PINKY_PIP].y
            ]
            
            num_fingers_extended = sum(fingers_extended)

            # Paper: 4 fingers extended
            if num_fingers_extended == 4:
                return 'Paper'
            # Scissors: 2 fingers extended
            elif num_fingers_extended == 2 and fingers_extended[0] and fingers_extended[1]:
                return 'Scissors'
            # Rock: 0 fingers extended
            elif num_fingers_extended == 0:
                return 'Rock'
                
    return None

def capture_and_process_frames():
    """
    Function to run in a background thread.
    Continuously captures frames and detects gestures.
    """
    global latest_frame
    local_cap = get_camera()
    last_gesture = None
    gesture_debounce_time = 1.5  # seconds between gestures
    last_emit_time = 0

    while True:
        success, frame = local_cap.read()
        if not success:
            print("Failed to grab frame")
            socketio.sleep(0.1)
            continue
        
        frame = cv2.flip(frame, 1)  # Flip horizontally
        
        # Gesture detection
        gesture = detect_gesture(frame)
        current_time = time.time()
        if gesture and (current_time - last_emit_time > gesture_debounce_time):
            if gesture != last_gesture:
                print(f"Detected Gesture: {gesture}")
                socketio.emit('gesture_detected', {'gesture': gesture})
                last_gesture = gesture
                last_emit_time = current_time

        # Store the frame for the video feed
        with lock:
            latest_frame = frame.copy()
        socketio.sleep(0.01) # Yield control to other tasks

def generate_frames():
    """Generator function for video streaming."""
    global latest_frame
    while True:
        with lock:
            if latest_frame is None:
                socketio.sleep(0.1)
                continue
            (flag, encodedImage) = cv2.imencode(".jpg", latest_frame)
            if not flag:
                continue
        yield(b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
              bytearray(encodedImage) + b'\r\n')
        socketio.sleep(0.05)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# --- Main Execution ---
if __name__ == '__main__':
    print("Starting background frame capture thread...")
    socketio.start_background_task(target=capture_and_process_frames)
    
    print("Starting Flask-SocketIO server with Eventlet...")
    socketio.run(app, host='0.0.0.0', port=5001, debug=False)


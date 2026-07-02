import math
from pathlib import Path
import time
from urllib.request import urlretrieve

import cv2
import pyautogui
from mediapipe.tasks.python.core import base_options as base_options_module
from mediapipe.tasks.python.vision import hand_landmarker
from mediapipe.tasks.python.vision.core import image as image_module
from mediapipe.tasks.python.vision.core import vision_task_running_mode as running_mode_module


CAMERA_INDEX = 0
FRAME_WIDTH = 960
FRAME_HEIGHT = 540
MIN_SMOOTHING = 0.18
MAX_SMOOTHING = 0.46
CLICK_COOLDOWN = 0.38
PINCH_THRESHOLD = 0.052
INDEX_DROP_THRESHOLD = 0.014
CAMERA_MARGIN_X = 0.16
CAMERA_MARGIN_Y = 0.16
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = Path(__file__).resolve().parent / "models" / "hand_landmarker.task"
HAND_CONNECTIONS = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 4),
    (0, 5),
    (5, 6),
    (6, 7),
    (7, 8),
    (5, 9),
    (9, 10),
    (10, 11),
    (11, 12),
    (9, 13),
    (13, 14),
    (14, 15),
    (15, 16),
    (13, 17),
    (0, 17),
    (17, 18),
    (18, 19),
    (19, 20),
]


def distance(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


def ensure_model():
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists():
        print("Descargando modelo de mano MediaPipe...")
        urlretrieve(MODEL_URL, MODEL_PATH)
    return str(MODEL_PATH)


def is_index_pointer(hand):
    wrist = hand[0]
    index_tip = hand[8]
    index_pip = hand[6]
    middle_tip = hand[12]
    middle_pip = hand[10]
    ring_tip = hand[16]
    ring_pip = hand[14]
    pinky_tip = hand[20]
    pinky_pip = hand[18]

    index_extended = distance(index_tip, wrist) > distance(index_pip, wrist) * 1.12
    middle_folded = distance(middle_tip, wrist) < distance(middle_pip, wrist) * 1.35
    ring_folded = distance(ring_tip, wrist) < distance(ring_pip, wrist) * 1.35
    pinky_folded = distance(pinky_tip, wrist) < distance(pinky_pip, wrist) * 1.35

    return index_extended and middle_folded and ring_folded and pinky_folded


def is_click(hand, previous_y):
    thumb_tip = hand[4]
    index_tip = hand[8]
    pinching = distance(thumb_tip, index_tip) < PINCH_THRESHOLD
    dropping = previous_y is not None and index_tip.y - previous_y > INDEX_DROP_THRESHOLD
    return pinching or dropping


def clamp(value, low, high):
    return max(low, min(high, value))


def map_index_to_screen(index_tip, screen_width, screen_height):
    usable_x = clamp(
        (index_tip.x - CAMERA_MARGIN_X) / (1 - CAMERA_MARGIN_X * 2),
        0,
        1,
    )
    usable_y = clamp(
        (index_tip.y - CAMERA_MARGIN_Y) / (1 - CAMERA_MARGIN_Y * 2),
        0,
        1,
    )
    return usable_x * screen_width, usable_y * screen_height


def adaptive_smoothing(distance_to_target):
    if distance_to_target > 280:
        return MAX_SMOOTHING
    if distance_to_target > 120:
        return 0.36
    if distance_to_target > 45:
        return 0.28
    return MIN_SMOOTHING


def main():
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0

    screen_width, screen_height = pyautogui.size()
    capture = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    if not capture.isOpened():
        raise RuntimeError("No se pudo abrir la camara.")

    base_options = base_options_module.BaseOptions(model_asset_path=ensure_model())
    options = hand_landmarker.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=running_mode_module.VisionTaskRunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.65,
        min_hand_presence_confidence=0.65,
        min_tracking_confidence=0.65,
    )
    landmarker = hand_landmarker.HandLandmarker.create_from_options(options)

    smooth_x, smooth_y = pyautogui.position()
    previous_index_y = None
    last_click_time = 0.0
    enabled = True

    print("Mouse virtual activo.")
    print("Indice levantado: mover cursor.")
    print("Bajar el indice o pinza indice+pulgar: click izquierdo.")
    print("Teclas: Q salir | ESPACIO pausar/reanudar.")

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)
        frame_height, frame_width = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = image_module.Image(
            image_format=image_module.ImageFormat.SRGB,
            data=rgb,
        )
        result = landmarker.detect_for_video(mp_image, int(time.time() * 1000))
        status = "Mostra la mano"

        active_hand = None
        if result.hand_landmarks:
            pointer_hands = [
                hand for hand in result.hand_landmarks if is_index_pointer(hand)
            ]
            active_hand = pointer_hands[0] if pointer_hands else result.hand_landmarks[0]

            for hand in result.hand_landmarks:
                draw_hand(frame, hand)

        if enabled and active_hand:
            index_tip = active_hand[8]
            target_x, target_y = map_index_to_screen(index_tip, screen_width, screen_height)
            distance_to_target = math.hypot(target_x - smooth_x, target_y - smooth_y)
            smoothing = adaptive_smoothing(distance_to_target)
            smooth_x += (target_x - smooth_x) * smoothing
            smooth_y += (target_y - smooth_y) * smoothing
            pyautogui.moveTo(smooth_x, smooth_y, duration=0)
            status = "Moviendo cursor"

            now = time.time()
            click_ready = is_click(active_hand, previous_index_y)
            if click_ready and now - last_click_time > CLICK_COOLDOWN:
                pyautogui.click()
                last_click_time = now
                status = "Click izquierdo"

            previous_index_y = index_tip.y
        else:
            previous_index_y = None

        cv2.rectangle(
            frame,
            (int(frame_width * CAMERA_MARGIN_X), int(frame_height * CAMERA_MARGIN_Y)),
            (
                int(frame_width * (1 - CAMERA_MARGIN_X)),
                int(frame_height * (1 - CAMERA_MARGIN_Y)),
            ),
            (0, 180, 255),
            2,
        )

        color = (0, 220, 120) if enabled else (80, 80, 255)
        cv2.rectangle(frame, (12, 12), (500, 104), (20, 20, 20), -1)
        cv2.putText(
            frame,
            "VERSION NUEVA - MOUSE REAL",
            (26, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.68,
            (0, 220, 255),
            2,
        )
        cv2.putText(frame, status, (26, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.putText(
            frame,
            "Q salir | ESPACIO pausar",
            (26, 88),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.52,
            (230, 230, 230),
            1,
        )

        cv2.imshow("Mouse virtual por gestos", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == 32:
            enabled = not enabled

    landmarker.close()
    capture.release()
    cv2.destroyAllWindows()


def draw_hand(frame, hand):
    height, width = frame.shape[:2]
    for start, end in HAND_CONNECTIONS:
      a = hand[start]
      b = hand[end]
      cv2.line(
          frame,
          (int(a.x * width), int(a.y * height)),
          (int(b.x * width), int(b.y * height)),
          (40, 220, 220),
          2,
      )

    for landmark in hand:
      cv2.circle(
          frame,
          (int(landmark.x * width), int(landmark.y * height)),
          4,
          (255, 255, 255),
          -1,
      )


if __name__ == "__main__":
    main()

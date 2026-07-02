import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { ModePreset } from "./performance";

export type DetectorToggles = {
  hands: boolean;
  face: boolean;
  pose: boolean;
};

export type DetectorRunRequest = DetectorToggles;

export type DetectionFrame = {
  hands?: HandLandmarkerResult;
  face?: FaceLandmarkerResult;
  pose?: PoseLandmarkerResult;
};

export type VisionRuntime = {
  detectFrame: (video: HTMLVideoElement, toggles: DetectorRunRequest) => DetectionFrame;
  close: () => void;
};

type DelegateMode = "GPU" | "CPU";

const VISION_WASM_URL = "/mediapipe/wasm";

const MODELS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  pose: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
};

export async function createVisionRuntime(preset: ModePreset): Promise<VisionRuntime> {
  const fileset = await FilesetResolver.forVisionTasks(VISION_WASM_URL);

  try {
    return await createRuntimeWithDelegate(fileset, "GPU", preset);
  } catch (gpuError) {
    console.warn("No se pudo iniciar MediaPipe con GPU, reintentando con CPU.", gpuError);
    return createRuntimeWithDelegate(fileset, "CPU", preset);
  }
}

async function createRuntimeWithDelegate(
  fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: DelegateMode,
  preset: ModePreset,
): Promise<VisionRuntime> {
  const [handLandmarker, faceLandmarker, poseLandmarker] = await Promise.all([
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODELS.hand,
        delegate,
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: preset.minConfidence,
      minHandPresenceConfidence: preset.minConfidence,
      minTrackingConfidence: preset.minConfidence,
    }),
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODELS.face,
        delegate,
      },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: preset.minConfidence,
    }),
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODELS.pose,
        delegate,
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: Math.max(0.45, preset.minConfidence - 0.1),
      minPosePresenceConfidence: Math.max(0.45, preset.minConfidence - 0.1),
      minTrackingConfidence: Math.max(0.45, preset.minConfidence - 0.1),
    }),
  ]);

  return {
    detectFrame(video, toggles) {
      const now = performance.now();

      return {
        hands: toggles.hands
          ? handLandmarker.detectForVideo(video, now)
          : undefined,
        face: toggles.face
          ? faceLandmarker.detectForVideo(video, now)
          : undefined,
        pose: toggles.pose
          ? poseLandmarker.detectForVideo(video, now)
          : undefined,
      };
    },
    close() {
      handLandmarker.close();
      faceLandmarker.close();
      poseLandmarker.close();
    },
  };
}

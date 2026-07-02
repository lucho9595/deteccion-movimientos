import "./styles.css";
import { EMPTY_ANALYSIS, analyzeBody, toCanvasPoint, type BodyAnalysis } from "./analysis";
import { CommandGate, commandFromGesture, isIndexPointer, isPinching } from "./commands";
import {
  POSE_CONNECTIONS,
  clearCanvas,
  drawColoredHand,
  drawFaceMesh,
  drawMirroredLandmarkSet,
  drawObjectBoxes,
  type NormalizedLandmark,
  type ObjectBox,
} from "./drawing";
import {
  DrowsinessTracker,
  type DrowsinessSensitivity,
  type DrowsinessSnapshot,
} from "./drowsiness";
import { detectHandGesture } from "./gestures";
import { MotionGame } from "./game";
import {
  FpsMeter,
  MODE_PRESETS,
  type AppMode,
  shouldRunDetectors,
  smoothLandmarkGroups,
} from "./performance";
import { createVisionRuntime, type DetectorToggles, type VisionRuntime } from "./vision";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="app-shell">
    <section class="stage" aria-label="Vista de camara">
      <video class="camera-feed" playsinline muted></video>
      <canvas class="overlay"></canvas>
      <div class="hud">
        <span data-fps>0 FPS</span>
        <span data-gesture>Sin gesto</span>
      </div>
      <div class="empty-state">
        <strong>Deteccion de movimientos</strong>
        <span>Presiona iniciar para abrir la camara.</span>
      </div>
    </section>
    <aside class="control-panel" aria-label="Controles">
      <div>
        <p class="eyebrow">Vision en tiempo real</p>
        <h1>Camara inteligente</h1>
      </div>

      <div class="action-row">
        <button class="primary-action" type="button" data-camera-toggle>Iniciar camara</button>
        <button class="icon-action" type="button" data-capture disabled title="Capturar foto">Capturar</button>
      </div>

      <label class="field">
        <span>Modo</span>
        <select data-mode>
          <option value="fast">Rapido</option>
          <option value="balanced" selected>Balanceado</option>
          <option value="precise">Preciso</option>
        </select>
      </label>

      <label class="field">
        <span>Camara</span>
        <select data-device>
          <option value="">Predeterminada</option>
        </select>
      </label>

      <div class="toggle-grid">
        <label><input type="checkbox" data-toggle="hands" checked /> Manos</label>
        <label><input type="checkbox" data-toggle="face" checked /> Cara</label>
        <label><input type="checkbox" data-toggle="pose" checked /> Cuerpo</label>
        <label><input type="checkbox" data-toggle="objects" checked /> Objetos</label>
        <label><input type="checkbox" data-only-hands /> Solo manos</label>
      </div>

      <dl class="status-list">
        <div><dt>Estado</dt><dd data-status>Listo</dd></div>
        <div><dt>FPS</dt><dd data-count-fps>0</dd></div>
        <div><dt>Manos</dt><dd data-count-hands>0</dd></div>
        <div><dt>Caras</dt><dd data-count-faces>0</dd></div>
        <div><dt>Poses</dt><dd data-count-poses>0</dd></div>
        <div><dt>Objetos</dt><dd data-count-objects>0</dd></div>
      </dl>

      <section class="analysis-panel object-panel" aria-label="Objetos detectados">
        <h2>Objetos</h2>
        <strong class="object-summary" data-object-summary>Sin objetos</strong>
        <div class="object-list" data-object-list></div>
      </section>

      <section class="analysis-panel" aria-label="Analisis corporal">
        <h2>Analisis corporal</h2>
        <div class="metric-grid">
          <span>Codo izq.</span><strong data-metric="leftElbow">--</strong>
          <span>Codo der.</span><strong data-metric="rightElbow">--</strong>
          <span>Muneca izq.</span><strong data-metric="leftWrist">--</strong>
          <span>Muneca der.</span><strong data-metric="rightWrist">--</strong>
          <span>Hombros</span><strong data-metric="shoulders">--</strong>
          <span>Cabeza</span><strong data-metric="headTilt">--</strong>
          <span>Apertura mano</span><strong data-metric="handAperture">--</strong>
        </div>
      </section>

      <label class="switch-row">
        <input type="checkbox" data-game-mode />
        <span>Modo juego</span>
      </label>

      <label class="switch-row">
        <input type="checkbox" data-system-mouse />
        <span>Mouse Windows</span>
      </label>

      <label class="switch-row">
        <input type="checkbox" data-drowsiness-mode />
        <span>Modo somnolencia</span>
      </label>

      <label class="field">
        <span>Sensibilidad sueño</span>
        <select data-drowsiness-sensitivity>
          <option value="low">Baja</option>
          <option value="medium" selected>Media</option>
          <option value="high">Alta</option>
        </select>
      </label>

      <section class="analysis-panel drowsiness-panel" aria-label="Modo somnolencia">
        <h2>Somnolencia</h2>
        <div class="metric-grid">
          <span>Estado</span><strong data-drowsiness="level">Despierto</strong>
          <span>Ojos</span><strong data-drowsiness="eyes">--</strong>
          <span>Ojos cerrados</span><strong data-drowsiness="closed">0.0s</strong>
          <span>Cabeceo</span><strong data-drowsiness="head">--</strong>
        </div>
        <button class="icon-action" type="button" data-silence-alarm>Silenciar</button>
      </section>

      <div class="gallery" data-gallery aria-label="Capturas"></div>
    </aside>

    <div class="hand-cursor" data-hand-cursor></div>
    <div class="sleep-alert" data-sleep-alert>ALERTA: posible somnolencia</div>
  </main>
`;

const video = document.querySelector<HTMLVideoElement>(".camera-feed")!;
const canvas = document.querySelector<HTMLCanvasElement>(".overlay")!;
const emptyState = document.querySelector<HTMLDivElement>(".empty-state")!;
const cameraButton = document.querySelector<HTMLButtonElement>("[data-camera-toggle]")!;
const captureButton = document.querySelector<HTMLButtonElement>("[data-capture]")!;
const statusNode = document.querySelector<HTMLElement>("[data-status]")!;
const fpsHudNode = document.querySelector<HTMLElement>("[data-fps]")!;
const gestureNode = document.querySelector<HTMLElement>("[data-gesture]")!;
const fpsCountNode = document.querySelector<HTMLElement>("[data-count-fps]")!;
const handCountNode = document.querySelector<HTMLElement>("[data-count-hands]")!;
const faceCountNode = document.querySelector<HTMLElement>("[data-count-faces]")!;
const poseCountNode = document.querySelector<HTMLElement>("[data-count-poses]")!;
const objectCountNode = document.querySelector<HTMLElement>("[data-count-objects]")!;
const modeSelect = document.querySelector<HTMLSelectElement>("[data-mode]")!;
const deviceSelect = document.querySelector<HTMLSelectElement>("[data-device]")!;
const onlyHandsInput = document.querySelector<HTMLInputElement>("[data-only-hands]")!;
const gallery = document.querySelector<HTMLDivElement>("[data-gallery]")!;
const gameModeInput = document.querySelector<HTMLInputElement>("[data-game-mode]")!;
const systemMouseInput = document.querySelector<HTMLInputElement>("[data-system-mouse]")!;
const drowsinessModeInput = document.querySelector<HTMLInputElement>("[data-drowsiness-mode]")!;
const drowsinessSensitivitySelect = document.querySelector<HTMLSelectElement>("[data-drowsiness-sensitivity]")!;
const silenceAlarmButton = document.querySelector<HTMLButtonElement>("[data-silence-alarm]")!;
const sleepAlert = document.querySelector<HTMLDivElement>("[data-sleep-alert]")!;
const handCursor = document.querySelector<HTMLDivElement>("[data-hand-cursor]")!;
const objectSummaryNode = document.querySelector<HTMLElement>("[data-object-summary]")!;
const objectListNode = document.querySelector<HTMLDivElement>("[data-object-list]")!;
const metricNodes = {
  leftElbow: document.querySelector<HTMLElement>('[data-metric="leftElbow"]')!,
  rightElbow: document.querySelector<HTMLElement>('[data-metric="rightElbow"]')!,
  leftWrist: document.querySelector<HTMLElement>('[data-metric="leftWrist"]')!,
  rightWrist: document.querySelector<HTMLElement>('[data-metric="rightWrist"]')!,
  shoulders: document.querySelector<HTMLElement>('[data-metric="shoulders"]')!,
  headTilt: document.querySelector<HTMLElement>('[data-metric="headTilt"]')!,
  handAperture: document.querySelector<HTMLElement>('[data-metric="handAperture"]')!,
};
const drowsinessNodes = {
  level: document.querySelector<HTMLElement>('[data-drowsiness="level"]')!,
  eyes: document.querySelector<HTMLElement>('[data-drowsiness="eyes"]')!,
  closed: document.querySelector<HTMLElement>('[data-drowsiness="closed"]')!,
  head: document.querySelector<HTMLElement>('[data-drowsiness="head"]')!,
};

const toggles: DetectorToggles = {
  hands: true,
  face: true,
  pose: true,
  objects: true,
};

let runtime: VisionRuntime | undefined;
let runtimeMode: AppMode | undefined;
let stream: MediaStream | undefined;
let animationFrame = 0;
let cameraActive = false;
let frameIndex = 0;
let lastHands: NormalizedLandmark[][] = [];
let lastFaces: NormalizedLandmark[][] = [];
let lastPoses: NormalizedLandmark[][] = [];
let lastObjects: ObjectBox[] = [];
let smoothedHands: NormalizedLandmark[][] = [];
let smoothedFaces: NormalizedLandmark[][] = [];
let smoothedPoses: NormalizedLandmark[][] = [];
let bodyAnalysis: BodyAnalysis = EMPTY_ANALYSIS;
let lastGesture = "Sin gesto";
let lastPointerY: number | undefined;
let lastSystemMove = 0;
let lastSystemClick = 0;
let systemMouseStatus = "Mouse: inactivo";
let alarmSilencedUntil = 0;
let lastAlarmBeep = -Infinity;

const fpsMeter = new FpsMeter();
const commandGate = new CommandGate();
const motionGame = new MotionGame();
const drowsinessTracker = new DrowsinessTracker();

document.querySelectorAll<HTMLInputElement>("[data-toggle]").forEach((input) => {
  input.addEventListener("change", () => {
    const key = input.dataset.toggle as keyof DetectorToggles;
    toggles[key] = input.checked;
  });
});

onlyHandsInput.addEventListener("change", () => {
  if (onlyHandsInput.checked) {
    toggles.hands = true;
    toggles.face = false;
    toggles.pose = false;
    toggles.objects = false;
    document.querySelector<HTMLInputElement>('[data-toggle="hands"]')!.checked = true;
    document.querySelector<HTMLInputElement>('[data-toggle="face"]')!.checked = false;
    document.querySelector<HTMLInputElement>('[data-toggle="pose"]')!.checked = false;
    document.querySelector<HTMLInputElement>('[data-toggle="objects"]')!.checked = false;
  }
});

modeSelect.addEventListener("change", () => {
  if (cameraActive) {
    void restartCamera();
  }
});

deviceSelect.addEventListener("change", () => {
  if (cameraActive) {
    void restartCamera();
  }
});

cameraButton.addEventListener("click", () => {
  if (cameraActive) {
    stopCamera();
    return;
  }

  void startCamera();
});

captureButton.addEventListener("click", captureFrame);

gameModeInput.addEventListener("change", () => {
  if (gameModeInput.checked) {
    setDetectorToggle("hands", true);
    setDetectorToggle("face", true);
    motionGame.start();
  } else {
    motionGame.pause();
  }
});

systemMouseInput.addEventListener("change", () => {
  if (systemMouseInput.checked) {
    setDetectorToggle("hands", true);
    systemMouseStatus = "Mouse: verificando puente";
    void checkMouseBridge();
  } else {
    lastPointerY = undefined;
    systemMouseStatus = "Mouse: inactivo";
  }
});

drowsinessModeInput.addEventListener("change", () => {
  if (drowsinessModeInput.checked) {
    setDetectorToggle("face", true);
    drowsinessSensitivitySelect.value = "high";
    drowsinessTracker.reset();
  } else {
    drowsinessTracker.reset();
    renderDrowsiness(drowsinessTracker.snapshot);
    document.body.classList.remove("is-sleep-alert");
  }
});

silenceAlarmButton.addEventListener("click", () => {
  alarmSilencedUntil = performance.now() + 30_000;
});

async function checkMouseBridge(): Promise<void> {
  try {
    const response = await fetch("http://127.0.0.1:5194/api/health");
    systemMouseStatus = response.ok
      ? "Mouse: listo"
      : "Mouse: ejecuta iniciar-mouse-windows.bat";
  } catch {
    systemMouseStatus = "Mouse: ejecuta iniciar-mouse-windows.bat";
  }
}

async function startCamera(): Promise<void> {
  const mode = getMode();
  const preset = MODE_PRESETS[mode];

  setStatus("Solicitando camara");
  cameraButton.disabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceSelect.value ? { exact: deviceSelect.value } : undefined,
        facingMode: deviceSelect.value ? undefined : "user",
        width: { ideal: preset.camera.width },
        height: { ideal: preset.camera.height },
        frameRate: { ideal: preset.camera.frameRate },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    await populateCameraDevices();

    cameraActive = true;
    captureButton.disabled = false;
    emptyState.classList.add("is-hidden");
    cameraButton.textContent = "Detener camara";
    setStatus("Cargando modelos");
    updateCanvasSize();

    if (!runtime || runtimeMode !== mode) {
      runtime?.close();
      runtime = await createVisionRuntime(preset);
      runtimeMode = mode;
    }

    setStatus(`Camara activa (${preset.label})`);
    animationFrame = requestAnimationFrame(detectLoop);
  } catch (error) {
    stopCamera();
    setStatus(toReadableError(error));
  } finally {
    cameraButton.disabled = false;
  }
}

async function restartCamera(): Promise<void> {
  stopCamera({ keepStatus: true });
  await startCamera();
}

function stopCamera(options: { keepStatus?: boolean } = {}): void {
  cancelAnimationFrame(animationFrame);
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  cameraActive = false;
  frameIndex = 0;
  video.srcObject = null;
  clearCanvas(canvas.getContext("2d")!);
  emptyState.classList.remove("is-hidden");
  cameraButton.textContent = "Iniciar camara";
  captureButton.disabled = true;
  resetDetections();

  if (!options.keepStatus && statusNode.textContent?.startsWith("Camara activa")) {
    setStatus("Camara detenida");
  }
}

function detectLoop(now: number): void {
  if (!runtime || !cameraActive || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    animationFrame = requestAnimationFrame(detectLoop);
    return;
  }

  updateCanvasSize();

  const mode = getMode();
  const preset = MODE_PRESETS[mode];
  const schedule = shouldRunDetectors(frameIndex, preset);
  const requested = {
    hands: toggles.hands && schedule.hands,
    face: toggles.face && schedule.face,
    pose: toggles.pose && schedule.pose,
    objects: toggles.objects && schedule.objects,
  };

  const result = runtime.detectFrame(video, requested);

  if (requested.hands) {
    lastHands = result.hands?.landmarks ?? [];
    smoothedHands = smoothLandmarkGroups(smoothedHands, lastHands, preset.smoothing);
  }

  if (requested.face) {
    lastFaces = result.face?.faceLandmarks ?? [];
    smoothedFaces = smoothLandmarkGroups(smoothedFaces, lastFaces, preset.smoothing);
  }

  if (requested.pose) {
    lastPoses = result.pose?.landmarks ?? [];
    smoothedPoses = smoothLandmarkGroups(smoothedPoses, lastPoses, preset.smoothing);
  }

  if (requested.objects) {
    lastObjects = (result.objects?.detections ?? []).map(toObjectBox);
  }

  drawOverlay();
  updateAnalysisState();
  updateDrowsiness(now);
  updateHandCursor(now);
  void updateSystemMouse(now);
  runGestureCommands(now);
  updateStats(now);
  frameIndex += 1;
  animationFrame = requestAnimationFrame(detectLoop);
}

async function updateSystemMouse(now: number): Promise<void> {
  const hand = getMouseHand();

  if (!systemMouseInput.checked || !hand) {
    lastPointerY = undefined;
    if (systemMouseInput.checked) {
      systemMouseStatus = "Mouse: mostra la mano";
    }
    return;
  }

  const indexTip = hand[8];
  const x = Math.round((1 - indexTip.x) * window.screen.width);
  const y = Math.round(indexTip.y * window.screen.height);

  if (now - lastSystemMove > 45) {
    lastSystemMove = now;
    await sendMouseCommand("/api/mouse/move", { x, y });
  }

  const dropped = lastPointerY !== undefined && y - lastPointerY > 0.024;
  lastPointerY = y;

  if (dropped && now - lastSystemClick > 650) {
    lastSystemClick = now;
    await sendMouseCommand("/api/mouse/click", {});
    systemMouseStatus = "Mouse: click izquierdo";
  } else {
    systemMouseStatus = "Mouse: moviendo cursor";
  }
}

async function sendMouseCommand(path: string, body: Record<string, number>): Promise<void> {
  try {
    const response = await fetch(`http://127.0.0.1:5194${path}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      systemMouseStatus = "Mouse: puente local no activo";
    }
  } catch {
    systemMouseStatus = "Mouse: abrir servidor con puente";
  }
}

function getMouseHand(): NormalizedLandmark[] | undefined {
  const pointerHand = smoothedHands.find((hand) => isIndexPointer(hand));
  return pointerHand ?? getActiveHand();
}

function drawOverlay(): void {
  const ctx = canvas.getContext("2d")!;
  clearCanvas(ctx);

  if (toggles.pose) {
    for (const pose of smoothedPoses) {
      drawMirroredLandmarkSet(ctx, pose, {
        connections: POSE_CONNECTIONS,
        pointColor: "#ff6b6b",
        lineColor: "rgba(255, 140, 66, 0.82)",
        pointRadius: 5,
        lineWidth: 4,
        minVisibility: 0.35,
      });
    }
  }

  if (toggles.face) {
    for (const face of smoothedFaces) {
      drawFaceMesh(ctx, face);
    }
  }

  if (toggles.hands) {
    for (const hand of smoothedHands) {
      drawColoredHand(ctx, hand);
    }
  }

  if (toggles.objects) {
    drawObjectBoxes(ctx, lastObjects, {
      width: video.videoWidth,
      height: video.videoHeight,
    });
  }

  if (gameModeInput.checked) {
    const handPoint = toCanvasPoint(getActiveHand()?.[8], canvas.width, canvas.height);
    const headPoint =
      toCanvasPoint(smoothedFaces[0]?.[1], canvas.width, canvas.height) ??
      toCanvasPoint(smoothedPoses[0]?.[0], canvas.width, canvas.height);
    motionGame.update(performance.now(), { width: canvas.width, height: canvas.height }, handPoint ?? undefined, headPoint ?? undefined);
    motionGame.draw(ctx);
  }
}

function updateDrowsiness(now: number): void {
  if (!drowsinessModeInput.checked) {
    return;
  }

  const snapshot = drowsinessTracker.update(
    now,
    smoothedFaces[0],
    drowsinessSensitivitySelect.value as DrowsinessSensitivity,
  );
  renderDrowsiness(snapshot);

  const alarmActive = snapshot.alarm && now > alarmSilencedUntil;
  document.body.classList.toggle("is-sleep-alert", alarmActive);

  if (alarmActive && now - lastAlarmBeep > 1400) {
    lastAlarmBeep = now;
    playAlarmBeep();
  }
}

function updateStats(now: number): void {
  const fps = fpsMeter.tick(now);
  fpsHudNode.textContent = `${fps} FPS`;
  fpsCountNode.textContent = String(fps);
  handCountNode.textContent = String(toggles.hands ? lastHands.length : 0);
  faceCountNode.textContent = String(toggles.face ? lastFaces.length : 0);
  poseCountNode.textContent = String(toggles.pose ? lastPoses.length : 0);
  objectCountNode.textContent = String(toggles.objects ? lastObjects.length : 0);
  gestureNode.textContent = systemMouseInput.checked
    ? systemMouseStatus
    : gameModeInput.checked
    ? `${lastGesture} | ${motionGame.snapshot.score} pts`
    : lastGesture;
  renderBodyAnalysis(bodyAnalysis);
  renderObjects();
}

function updateAnalysisState(): void {
  bodyAnalysis = analyzeBody({
    pose: smoothedPoses[0],
    face: smoothedFaces[0],
    hand: getActiveHand(),
  });
  lastGesture =
    toggles.hands && getActiveHand() ? detectHandGesture(getActiveHand()!) : "Sin gesto";
}

function setDetectorToggle(key: keyof DetectorToggles, value: boolean): void {
  toggles[key] = value;
  document.querySelector<HTMLInputElement>(`[data-toggle="${key}"]`)!.checked = value;
}

function runGestureCommands(now: number): void {
  const hand = getActiveHand();
  const command = commandFromGesture(lastGesture as ReturnType<typeof detectHandGesture>, hand);
  if (!command || !commandGate.consume(command, now)) {
    return;
  }

  if (command === "start" && gameModeInput.checked) {
    motionGame.start();
  }

  if (command === "confirm" || command === "pinchClick") {
    gestureNode.textContent = command === "pinchClick" ? "Click por pinza" : "Confirmado";
  }

  if (command === "capture") {
    captureFrame();
  }
}

function updateHandCursor(now: number): void {
  const hand = getActiveHand();
  const point = toCanvasPoint(hand?.[8], window.innerWidth, window.innerHeight);

  if (!point) {
    handCursor.classList.remove("is-visible", "is-pinching");
    return;
  }

  handCursor.classList.add("is-visible");
  handCursor.style.transform = `translate(${point.x}px, ${point.y}px)`;
  handCursor.classList.toggle("is-pinching", isPinching(hand));

  if (isPinching(hand) && commandGate.consume("pinchClick", now)) {
    gestureNode.textContent = "Click por pinza";
  }
}

function getActiveHand(): NormalizedLandmark[] | undefined {
  if (smoothedHands.length === 0) {
    return undefined;
  }

  const pinchingHand = smoothedHands.find((hand) => isPinching(hand));
  if (pinchingHand) {
    return pinchingHand;
  }

  return smoothedHands
    .slice()
    .sort((a, b) => handVisibilityScore(b) - handVisibilityScore(a))[0];
}

function handVisibilityScore(hand: NormalizedLandmark[]): number {
  if (hand.length < 21) {
    return 0;
  }

  const wrist = hand[0];
  const indexTip = hand[8];
  const middleTip = hand[12];
  return Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) +
    Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
}

function renderBodyAnalysis(analysis: BodyAnalysis): void {
  metricNodes.leftElbow.textContent = formatDegrees(analysis.leftElbow);
  metricNodes.rightElbow.textContent = formatDegrees(analysis.rightElbow);
  metricNodes.leftWrist.textContent = formatDegrees(analysis.leftWrist);
  metricNodes.rightWrist.textContent = formatDegrees(analysis.rightWrist);
  metricNodes.shoulders.textContent = formatDegrees(analysis.shoulders);
  metricNodes.headTilt.textContent = formatDegrees(analysis.headTilt);
  metricNodes.handAperture.textContent =
    analysis.handAperture === null ? "--" : `${analysis.handAperture}%`;
}

function renderObjects(): void {
  if (!toggles.objects || lastObjects.length === 0) {
    objectSummaryNode.textContent = "Sin objetos";
    objectListNode.innerHTML = "";
    return;
  }

  const topObject = lastObjects[0];
  objectSummaryNode.textContent = `Veo: ${topObject.label}`;
  objectListNode.innerHTML = lastObjects
    .map(
      (object) => `
        <span>
          <b>${object.label}</b>
          <em>${Math.round(object.score * 100)}%</em>
        </span>
      `,
    )
    .join("");
}

function toObjectBox(detection: {
  categories: Array<{ categoryName: string; displayName?: string; score: number }>;
  boundingBox?: ObjectBox["boundingBox"];
}): ObjectBox {
  const category = detection.categories[0];

  return {
    label: translateObjectLabel(category?.categoryName || category?.displayName || "objeto"),
    score: category?.score ?? 0,
    boundingBox: detection.boundingBox,
  };
}

function translateObjectLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const dictionary: Record<string, string> = {
    person: "Persona",
    cup: "Mate / taza",
    bottle: "Botella",
    "wine glass": "Vaso",
    bowl: "Bowl",
    spoon: "Cuchara",
    fork: "Tenedor",
    knife: "Cuchillo",
    cell_phone: "Celular",
    "cell phone": "Celular",
    laptop: "Notebook",
    keyboard: "Teclado",
    mouse: "Mouse",
    book: "Libro",
    chair: "Silla",
    couch: "Sillon",
    potted_plant: "Planta",
    "potted plant": "Planta",
    remote: "Control remoto",
  };

  return dictionary[normalized] ?? normalized.replace(/_/g, " ");
}

function renderDrowsiness(snapshot: DrowsinessSnapshot): void {
  drowsinessNodes.level.textContent = snapshot.level;
  drowsinessNodes.eyes.textContent = snapshot.eyeRatio === null
    ? "--"
    : snapshot.eyesClosed
      ? "Cerrados"
      : "Abiertos";
  drowsinessNodes.closed.textContent = `${(snapshot.closedMs / 1000).toFixed(1)}s`;
  drowsinessNodes.head.textContent = snapshot.headDropScore === null
    ? "--"
    : snapshot.headDropped
      ? "Cabeceo"
      : "Estable";
  sleepAlert.classList.toggle("is-visible", snapshot.alarm && performance.now() > alarmSilencedUntil);
}

function playAlarmBeep(): void {
  const AudioContextClass =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 980;
  gain.gain.value = 0.22;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.32);
}

function formatDegrees(value: number | null): string {
  return value === null ? "--" : `${value} deg`;
}

async function populateCameraDevices(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  const selected = deviceSelect.value;

  deviceSelect.innerHTML = `<option value="">Predeterminada</option>`;
  videoDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Camara ${index + 1}`;
    deviceSelect.append(option);
  });
  deviceSelect.value = selected;
}

function captureFrame(): void {
  if (!cameraActive) {
    return;
  }

  const capture = document.createElement("canvas");
  capture.width = canvas.width;
  capture.height = canvas.height;
  const ctx = capture.getContext("2d")!;

  ctx.save();
  ctx.translate(capture.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, capture.width, capture.height);
  ctx.restore();
  ctx.drawImage(canvas, 0, 0);

  const url = capture.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `captura-deteccion-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  link.className = "capture-card";
  link.innerHTML = `<img src="${url}" alt="Captura de deteccion" /><span>Descargar</span>`;
  gallery.prepend(link);
}

function resetDetections(): void {
  lastHands = [];
  lastFaces = [];
  lastPoses = [];
  lastObjects = [];
  smoothedHands = [];
  smoothedFaces = [];
  smoothedPoses = [];
  fpsHudNode.textContent = "0 FPS";
  fpsCountNode.textContent = "0";
  handCountNode.textContent = "0";
  faceCountNode.textContent = "0";
  poseCountNode.textContent = "0";
  objectCountNode.textContent = "0";
  gestureNode.textContent = "Sin gesto";
  renderBodyAnalysis(EMPTY_ANALYSIS);
  renderObjects();
}

function updateCanvasSize(): void {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * window.devicePixelRatio));
  const height = Math.max(1, Math.round(rect.height * window.devicePixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function getMode(): AppMode {
  return modeSelect.value as AppMode;
}

function setStatus(message: string): void {
  statusNode.textContent = message;
}

function toReadableError(error: unknown): string {
  console.error("No se pudo iniciar la deteccion", error);

  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Permiso de camara denegado";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No se encontro una camara";
  }

  if (error instanceof DOMException && error.name === "NotReadableError") {
    return "La camara esta en uso";
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camara no disponible en este navegador";
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "No se pudo cargar camara/modelos";

  if (/fetch|failed|network|wasm|model|mediapipe/i.test(message)) {
    return "No se pudieron cargar los modelos";
  }

  return message;
}

window.addEventListener("resize", updateCanvasSize);
window.addEventListener("beforeunload", () => {
  stopCamera();
  runtime?.close();
});

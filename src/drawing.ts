export type NormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type Point = {
  x: number;
  y: number;
};

export type ObjectBox = {
  label: string;
  score: number;
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
};

export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
];

export const FACE_CONNECTIONS: Array<[number, number]> = [
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
  [33, 7],
  [7, 163],
  [163, 144],
  [144, 145],
  [145, 153],
  [153, 154],
  [154, 155],
  [155, 133],
  [362, 382],
  [382, 381],
  [381, 380],
  [380, 374],
  [374, 373],
  [373, 390],
  [390, 249],
  [249, 263],
  [61, 146],
  [146, 91],
  [91, 181],
  [181, 84],
  [84, 17],
  [17, 314],
  [314, 405],
  [405, 321],
  [321, 375],
  [375, 291],
  [61, 185],
  [185, 40],
  [40, 39],
  [39, 37],
  [37, 0],
  [0, 267],
  [267, 269],
  [269, 270],
  [270, 409],
  [409, 291],
];

export const HAND_FINGER_CONNECTIONS: Array<{
  name: string;
  color: string;
  connections: Array<[number, number]>;
}> = [
  { name: "Pulgar", color: "#f6c85f", connections: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { name: "Indice", color: "#6ee7b7", connections: [[0, 5], [5, 6], [6, 7], [7, 8]] },
  { name: "Medio", color: "#67e8f9", connections: [[5, 9], [9, 10], [10, 11], [11, 12]] },
  { name: "Anular", color: "#a78bfa", connections: [[9, 13], [13, 14], [14, 15], [15, 16]] },
  { name: "Menique", color: "#fb7185", connections: [[13, 17], [0, 17], [17, 18], [18, 19], [19, 20]] },
];

export function scaleLandmark(
  landmark: Pick<NormalizedLandmark, "x" | "y">,
  width: number,
  height: number,
): Point {
  return {
    x: landmark.x * width,
    y: landmark.y * height,
  };
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawLandmarkSet(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  options: {
    connections?: Array<[number, number]>;
    pointColor: string;
    lineColor: string;
    pointRadius?: number;
    lineWidth?: number;
    minVisibility?: number;
  },
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const pointRadius = options.pointRadius ?? 5;
  const minVisibility = options.minVisibility ?? 0;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = options.lineWidth ?? 3;
  ctx.strokeStyle = options.lineColor;

  for (const [startIndex, endIndex] of options.connections ?? []) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!isVisible(start, minVisibility) || !isVisible(end, minVisibility)) {
      continue;
    }

    const startPoint = scaleLandmark(start, width, height);
    const endPoint = scaleLandmark(end, width, height);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  }

  ctx.fillStyle = options.pointColor;
  for (const landmark of landmarks) {
    if (!isVisible(landmark, minVisibility)) {
      continue;
    }

    const point = scaleLandmark(landmark, width, height);
    ctx.beginPath();
    ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawMirroredLandmarkSet(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  options: Parameters<typeof drawLandmarkSet>[2],
): void {
  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);
  drawLandmarkSet(ctx, landmarks, options);
  ctx.restore();
}

export function drawColoredHand(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
): void {
  for (const finger of HAND_FINGER_CONNECTIONS) {
    drawMirroredLandmarkSet(ctx, landmarks, {
      connections: finger.connections,
      pointColor: "#ffffff",
      lineColor: finger.color,
      pointRadius: 5,
      lineWidth: 4,
    });
  }
}

export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
): void {
  drawMirroredLandmarkSet(ctx, landmarks, {
    connections: FACE_CONNECTIONS,
    pointColor: "rgba(255, 255, 255, 0.72)",
    lineColor: "rgba(255, 207, 86, 0.76)",
    pointRadius: 1.2,
    lineWidth: 2,
  });
}

export function drawObjectBoxes(
  ctx: CanvasRenderingContext2D,
  objects: ObjectBox[],
  sourceSize: { width: number; height: number },
): void {
  if (sourceSize.width === 0 || sourceSize.height === 0) {
    return;
  }

  const scaleX = ctx.canvas.width / sourceSize.width;
  const scaleY = ctx.canvas.height / sourceSize.height;

  ctx.save();
  ctx.lineWidth = 3;
  ctx.font = "800 15px Inter, system-ui, sans-serif";
  ctx.textBaseline = "top";

  for (const object of objects) {
    if (!object.boundingBox) {
      continue;
    }

    const width = object.boundingBox.width * scaleX;
    const height = object.boundingBox.height * scaleY;
    const x = ctx.canvas.width - (object.boundingBox.originX * scaleX) - width;
    const y = object.boundingBox.originY * scaleY;
    const label = `${object.label} ${Math.round(object.score * 100)}%`;
    const labelWidth = Math.min(ctx.measureText(label).width + 18, ctx.canvas.width - 8);
    const labelY = Math.max(4, y - 30);

    ctx.strokeStyle = "#21c55d";
    ctx.fillStyle = "rgba(33, 197, 93, 0.16)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(9, 24, 18, 0.88)";
    ctx.beginPath();
    ctx.roundRect(Math.max(4, x), labelY, labelWidth, 24, 6);
    ctx.fill();

    ctx.fillStyle = "#eafff1";
    ctx.fillText(label, Math.max(12, x + 9), labelY + 4, labelWidth - 14);
  }

  ctx.restore();
}

function isVisible(
  landmark: NormalizedLandmark | undefined,
  minVisibility: number,
): landmark is NormalizedLandmark {
  if (!landmark) {
    return false;
  }

  return landmark.visibility === undefined || landmark.visibility >= minVisibility;
}

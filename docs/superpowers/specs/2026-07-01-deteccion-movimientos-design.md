# Deteccion de Movimientos Web Design

## Objetivo

Crear una app web local que use la camara del navegador para detectar cara, manos y pose corporal en tiempo real. La mano debe mostrarse con circulos en cada articulacion de los dedos y lineas que unan esas articulaciones.

## Enfoque

La app se implementa con Vite, TypeScript y MediaPipe Tasks Vision. No tendra backend: el navegador abre la camara con `getUserMedia`, MediaPipe procesa cada frame del video y un canvas superpuesto dibuja los puntos y conexiones detectados.

## Funciones

- Iniciar y detener la camara.
- Cargar modelos de mano, cara y pose desde MediaPipe.
- Activar o desactivar cada detector desde la interfaz.
- Dibujar manos con articulaciones y conexiones.
- Dibujar puntos de rostro cuando haya una cara.
- Dibujar esqueleto corporal con hombros, codos, munecas y conexiones principales.
- Mostrar estado de carga, camara y cantidad de detecciones.

## Arquitectura

- `src/main.ts`: coordina DOM, camara, bucle de deteccion y estado.
- `src/vision.ts`: carga MediaPipe y expone detectores de mano, cara y pose.
- `src/drawing.ts`: contiene funciones puras para convertir landmarks y dibujar overlays.
- `src/styles.css`: define una interfaz responsive de pantalla unica.
- `src/drawing.test.ts`: verifica conexiones y transformaciones de coordenadas.

## Pruebas

Las pruebas automatizadas cubren las piezas puras que no dependen de camara real: conexiones esperadas y conversion de landmarks normalizados a pixeles. La verificacion final incluye `pnpm run test`, `pnpm run build` y arranque del servidor de desarrollo para probar la app en navegador.

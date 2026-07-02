# Deteccion de Movimientos

App de vision por computadora con dos modos:

- App web con MediaPipe para detectar manos, cara, pose, gestos, FPS, capturas y modo juego.
- Mouse virtual nativo con Python, OpenCV, MediaPipe Tasks y PyAutoGUI para controlar el cursor real con la mano.

## App web

```powershell
pnpm install
pnpm run build
```

Para servir la version compilada:

```powershell
node scripts/serve-dist.mjs 5190
```

Abrir:

```text
http://127.0.0.1:5190
```

## Mouse virtual nativo

Ejecutar:

```text
iniciar-mouse-virtual-python.bat
```

Controles:

- Indice levantado: mover cursor.
- Bajar un poco el indice o hacer pinza indice + pulgar: click izquierdo.
- `ESPACIO`: pausar/reanudar.
- `Q`: salir.

## Scripts utiles

```powershell
pnpm run test
pnpm run build
```

# Deteccion de Movimientos

App de vision por computadora en tiempo real. Detecta manos, cara, cuerpo, objetos, gestos, somnolencia y permite usar la mano como cursor virtual.

## Funciones

- Deteccion de manos con articulaciones, circulos y conexiones entre dedos.
- Deteccion de cara con malla facial.
- Face ID local para registrar nombre/apellido y saludar cuando reconoce la cara.
- Deteccion de cuerpo y panel de analisis corporal.
- Deteccion de objetos con cajas sobre la camara y panel de resultados.
- Traduccion de objetos comunes al español, incluyendo `cup` como `Mate / taza`.
- Modo somnolencia con ojos cerrados, cabeceo, sensibilidad configurable y alarma sonora.
- Modo juego con objetivos verdes, peligros rojos, puntos y vidas.
- Piedra, papel o tijera contra IA con dificultad facil, medio y dificil.
- Gestos basicos para capturar, confirmar y controlar acciones.
- Cursor visual tipo Minority Report dentro de la app.
- Mouse virtual nativo mediante script Python.
- Captura de imagen desde la camara.
- Modos de rendimiento: rapido, balanceado y preciso.
- Interfaz visual renovada con paneles tipo glass, HUD sobre camara y estados destacados.

## Requisitos

- Node.js y pnpm.
- Navegador moderno con permiso de camara.
- Para el mouse nativo: Python, OpenCV, MediaPipe Tasks y PyAutoGUI.
- Conexion a internet la primera vez que carga los modelos de MediaPipe.

## Instalar

```powershell
pnpm install
```

## Ejecutar en desarrollo

```powershell
pnpm run dev
```

Abrir la URL que muestre Vite, normalmente:

```text
http://127.0.0.1:5173
```

## Compilar y servir

```powershell
pnpm run build
node scripts/serve-dist.mjs 5190
```

Abrir:

```text
http://127.0.0.1:5190
```

Si el puerto esta ocupado, usar otro:

```powershell
node scripts/serve-dist.mjs 5200
```

## Uso de la app web

1. Presionar `Iniciar camara`.
2. Activar o desactivar detectores: `Manos`, `Cara`, `Cuerpo`, `Objetos`.
3. Elegir modo `Rapido`, `Balanceado` o `Preciso`.
4. Usar `Capturar` para guardar una imagen del estado actual.

### Objetos

El detector usa un modelo general liviano. Reconoce categorias comunes como persona, botella, taza, celular, teclado, mouse, silla, libro y otros objetos cotidianos.

Para un mate, el modelo suele reconocerlo como `cup`; la app lo muestra como `Mate / taza`.

Si el panel muestra `Buscando objetos...`, el detector esta activo pero todavia no encontro una categoria con suficiente confianza.

### Somnolencia

Activar `Modo somnolencia`.

La app analiza:

- Ojos abiertos o cerrados.
- Tiempo acumulado de ojos cerrados.
- Cabeceo.
- Nivel: despierto, atencion baja, somnolencia o alerta.

Cuando entra en alerta, muestra una advertencia y reproduce una alarma hasta que vuelve a detectar una cara despierta y estable. El boton `Silenciar` pausa la alarma por un rato.

### Face ID

Completar `Nombre` y `Apellido`, mostrar la cara a la camara y presionar `Registrar cara`.

La app guarda una huella de landmarks faciales en el navegador. Cuando vuelve a detectar una cara registrada, muestra `Bienvenido` con el nombre y apellido.

Los datos quedan en `localStorage`; no se suben a ningun servidor. Es reconocimiento practico para la app, no autenticacion segura.

### Analisis corporal

El panel calcula:

- Codo izquierdo y derecho.
- Muñeca izquierda y derecha.
- Inclinacion de hombros.
- Inclinacion de cabeza.
- Apertura de mano.

### Modo juego

Activar `Modo juego`.

En `Tipo de juego` se puede elegir:

- `Atrapar y esquivar`.
- `Piedra papel tijera`.

En `Atrapar y esquivar`:

- Atrapar objetivos verdes con la mano.
- Esquivar peligros rojos con la cabeza.
- Suma puntos y resta vidas.

En `Piedra papel tijera`:

- La partida es al mejor de 3: gana quien llegue primero a 2 rondas.
- `Puno`: piedra.
- `Mano abierta`: papel.
- `Tijera`: tijera.
- La ronda muestra un conteo grande de 3 a 1 antes de revelar jugadas.
- Si no se muestra una jugada valida, se pierde esa ronda.
- La IA siempre muestra su eleccion en pantalla.
- Si ganas aparece confeti de celebracion.
- Si perdes, la IA se burla de vos.
- Dificultad `Facil`: juega casi al azar.
- Dificultad `Medio`: mezcla azar con lectura de patrones.
- Dificultad `Dificil`: intenta responder contra tu patron reciente.

## Mouse virtual nativo

Ejecutar:

```text
iniciar-mouse-virtual-python.bat
```

Controles:

- Indice levantado: mover cursor real de Windows.
- Bajar un poco el indice: click izquierdo.
- Pinza indice + pulgar: click izquierdo.
- `ESPACIO`: pausar o reanudar.
- `Q`: salir.

## Scripts utiles

```powershell
pnpm run test
pnpm run build
```

## Notas

- La deteccion de objetos usa clases generales. Para reconocer `mate` como categoria exacta haria falta entrenar o integrar un modelo especifico con fotos de mates.
- Si los modelos no cargan, revisar la consola del navegador y la conexion a internet.
- Si una version vieja queda en cache, refrescar con `Ctrl + F5`.

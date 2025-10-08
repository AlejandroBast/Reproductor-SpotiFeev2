# Reproductor-SpotiFeev2

Aplicación web de reproducción de música (React + Vite + TypeScript) con integración de búsqueda en Audius y un patrón de lista doblemente enlazada para la gestión de la playlist.

Este README explica la arquitectura, cómo ejecutar el proyecto localmente, cómo desplegarlo (GitHub Pages), y soluciones a problemas comunes (por ejemplo, CORS en streams de Audius y la página que muestra README en vez del `index.html`).

---

## Características principales

- Reproductor de audio con controles: play/pause, siguiente/previo, shuffle, repeat.
- Playlist local inicial (`src/data.tsx`) con recursos incluidos en `ASSETS/`.
- Búsqueda de pistas y lista trending usando la API pública de Audius (cliente en `src/api/audius.ts`).
- Clase reutilizable `DoublyLinkedList` (`src/utils/DoublyLinkedList.ts`) usada para navegación robusta (prev/next) y shuffle.
- Añadir / eliminar canciones en la playlist desde la UI.
- Despliegue automático a GitHub Pages con script `npm run deploy` (usa `gh-pages`).

---

## Estructura del proyecto (resumen)

- `src/`
  - `App.tsx` — Componente principal: UI, lógica de reproducción y administración de playlist.
  - `data.tsx` — Playlist inicial con assets locales.
  - `api/audius.ts` — Cliente ligero para consultar Audius (search / trending).
  - `utils/DoublyLinkedList.ts` — Implementación simple de lista doblemente enlazada.
  - `Loader.tsx`, `index.css`, `App.css`, etc. — Helpers y estilos.
- `dist/` — Carpeta de salida de build (se publica a `gh-pages`).
- `ASSETS/` — Imágenes y archivos de audio incluidos para demo/local.
- `package.json` — Scripts útiles: `dev`, `build`, `deploy`.

---

## Requisitos

- Node.js >= 18 y npm (o equivalente). Recomendado usar la versión estable más reciente.

---

## Instalación y ejecución local

1. Clona el repositorio y entra en la carpeta del proyecto:

```bash
git clone https://github.com/AlejandroBast/Reproductor-SpotiFeev2.git
cd Reproductor-SpotiFeev2
```

2. Instala dependencias:

```bash
npm install
```

3. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre `http://localhost:5173` (o la URL que muestre Vite) en tu navegador.

---

## Scripts útiles

- `npm run dev` — Levanta servidor de desarrollo (Vite).
- `npm run build` — Compila la app para producción (genera `dist/`).
- `npm run preview` — Sirve una versión de `dist` localmente.
- `npm run deploy` — Publica `dist/` en la rama `gh-pages` usando `gh-pages`.

---

## Despliegue a GitHub Pages

El proyecto contiene el script `deploy` que usa `gh-pages`. Flujo recomendado:

```bash
npm run build
npm run deploy
```

Notas y solución al problema común "aparece README en vez de tu app":

- Asegúrate en la configuración del repositorio (Settings → Pages) que la fuente (Source) está configurada a la rama `gh-pages` y carpeta `/ (root)`.
- GitHub Pages puede ejecutar Jekyll por defecto en `gh-pages`. Para forzar que sirva archivos estáticos tal cual (evitar que Jekyll convierta `README.md` en HTML), añade un archivo vacío `.nojekyll` en la raíz de `dist` antes de desplegar. El comando `gh-pages -d dist` normalmente sube todo; si Jekyll sigue transformando, añade `touch dist/.nojekyll` y redeploy.
- Si tras el deploy sigues viendo el README: fuerza recarga (Ctrl+F5), prueba en modo incógnito o añade `?no-cache` a la URL.

---

## Integración con Audius (notas técnicas)

- `src/api/audius.ts` implementa funciones `searchTracks(query)` y `getTrending(limit)` que consumen el discovery provider público de Audius y normalizan la respuesta a la forma interna de la app: `{ id, song, artist, src, cover }`.
- Limitaciones:
  - Audius puede aplicar CORS o requisitos adicionales para servir streams directamente al navegador. Si al reproducir una pista desde Audius ves errores de CORS o 403, lo habitual es crear un pequeño proxy en backend que reemplace o reenvíe el stream.
  - Las URLs de stream generadas por la API pública no siempre son reproducibles desde cualquier origen. El helper es "best-effort".

Recomendación para producción: crea un endpoint de servidor que haga fetch a Audius, valide y reenvíe el contenido (o añada las cabeceras necesarias), o usa APIs oficiales con credenciales y firma cuando estén disponibles.

---

## Diseño interno y por qué la lista doblemente enlazada

- `DoublyLinkedList` es una estructura pequeña usada para: navegar (next/prev) sin recalcular índices constantemente y para facilitar operaciones de shuffle que preserven la canción actual en cabeza.
- API disponible:
  - `DoublyLinkedList.fromArray(items)` — construir desde un array.
  - `toArray()` — recuperar array.
  - `nextIndex(i)` / `prevIndex(i)` — obtener índices vecinos.
  - `shuffle(preserveIndex?)` — devuelve una nueva instancia con el orden aleatorizado, opcionalmente preservando la canción actual.

Esta estructura mejora la claridad del código de navegación y facilita preservar el elemento actual al reordenar la lista.

---

## Buenas prácticas y sugerencias

- No incluyas archivos muy grandes en la rama (audio pesados y imágenes aumentan el repo). Para producción usa un CDN o almacenamiento separado.
- Para la API de Audius, implementa un servidor intermedio si necesitas estabilidad y evitar CORS.
- Habilita monitorización de errores (Sentry u otra) en producción si desplegas públicamente.

---

## Problemas conocidos y soluciones rápidas

- Problema: GitHub Pages muestra README.md en lugar de la aplicación.
  - Causa: Pages está sirviendo desde la rama `main` o Jekyll está transformando el contenido.
  - Solución rápida: configurar Pages para usar `gh-pages`/root y asegurarte de que `dist/index.html` existe. Añade `dist/.nojekyll` antes de deploy para evitar transformación.

- Problema: Pistas de Audius no reproducen por CORS.
  - Solución: crear un proxy backend que reenvíe la petición de stream (añade cabeceras CORS o sirve el archivo), o usar el discovery provider oficialmente documentado con credenciales si aplica.

---

## Contribuciones

Si quieres colaborar: fork, crea una rama, desarrollos y PR. Prioridades útiles:

- Manejo robusto de errores y toasts en la UI.
- Tests unitarios para `DoublyLinkedList` y para el adaptador de Audius.
- Mejora de accesibilidad y responsive UI.

[![By: AlejandroBast](https://img.shields.io/badge/By-AlejandroBast-6b9cff)](https://github.com/AlejandroBast)
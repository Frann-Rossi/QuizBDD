# Quiz BDD

Aplicación web educativa de cuestionarios de opción múltiple para aprender y repasar **Bases de Datos**.

Cada pregunta tiene cuatro opciones y una única respuesta correcta. Al responder, la aplicación muestra la explicación del concepto, por qué la opción elegida es correcta o incorrecta, y el material de estudio relacionado.

## Stack

- [Astro](https://astro.build) 7 — framework y generación del sitio estático.
- [Tailwind CSS](https://tailwindcss.com) 4 — estilos, integrado mediante el plugin de Vite.
- [TypeScript](https://www.typescriptlang.org) 6 — en modo `strictest`.
- [Vitest](https://vitest.dev) 5 — tests unitarios.
- [Playwright](https://playwright.dev) 1.64 — tests de interfaz (end-to-end).

## Requisitos

- Node.js **22.12 o superior** (probado con Node 24).
- npm 9.6.5 o superior.

## Instalación y ejecución

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo en http://localhost:4321
```

## Comandos disponibles

| Comando               | Descripción                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`         | Inicia el servidor de desarrollo con recarga en caliente.                    |
| `npm run build`       | Genera el sitio de producción en `dist/`.                                    |
| `npm run preview`     | Sirve localmente el build de `dist/`.                                        |
| `npm run check`       | Verifica tipos de TypeScript y archivos `.astro` (`astro check`).            |
| `npm test`            | Ejecuta los tests unitarios una vez.                                         |
| `npm run test:watch`  | Ejecuta los tests unitarios en modo observación.                             |
| `npm run test:e2e`    | Tests de interfaz con Playwright (escritorio y celular) sobre el build.      |
| `npm run test:e2e:ui` | Abre la interfaz de Playwright para ver y depurar los tests de interfaz.     |
| `npm run verify`      | Ejecuta `check`, `test`, `build` y `test:e2e`. Útil antes de subir cambios.  |
| `npm run astro`       | Acceso directo a la CLI de Astro (p. ej. `npm run astro -- --help`).         |

Los tests de interfaz usan el Google Chrome instalado en la máquina (no descargan navegadores) y simulan dos dispositivos: escritorio y un celular (Pixel 7). Cubren el inicio, el tema claro/oscuro, el cuestionario completo, la posición de la respuesta correcta, el modo juego (configuración, votación, revelación, orden de jugadores y ranking) y que ninguna pantalla desborde en el celular.

## Estructura del proyecto

```text
QuizBDD/
├── materialEstudio/              # Material de estudio, una carpeta por unidad
│   ├── unidad-05-subconsultas/
│   ├── unidad-06-cte/
│   └── unidad-07-vistas/
├── public/                       # Recursos estáticos servidos tal cual (favicon, imágenes)
├── src/
│   ├── components/               # Componentes reutilizables de interfaz
│   ├── content/
│   │   └── preguntas/            # Banco de preguntas: un JSON por unidad
│   ├── layouts/                  # Estructuras HTML base de las páginas
│   ├── lib/
│   │   ├── quiz/                 # Reglas del cuestionario: esquemas, evaluación, mezcla de opciones
│   │   └── juego/                # Reglas del modo juego: jugadores, votos, puntos y ranking
│   ├── pages/                    # Rutas: cada archivo es una página
│   │   ├── index.astro           # Inicio: modos y unidades
│   │   ├── quiz/[modo].astro     # /quiz/todas/ y /quiz/unidad-N/
│   │   ├── juego.astro           # /juego/ (votación multijugador)
│   │   └── material/[...ruta].ts # Publica materialEstudio/ en /material/...
│   ├── scripts/                  # Código del navegador: cuestionario, juego y utilidades de DOM
│   ├── services/                 # Acceso a datos (colecciones de contenido)
│   ├── styles/                   # Estilos globales y tokens de Tailwind
│   ├── types/                    # Tipos e interfaces TypeScript del dominio
│   ├── utils/                    # Funciones auxiliares puras
│   └── content.config.ts         # Definición y validación de las colecciones de contenido
├── tests/
│   ├── unit/                     # Tests unitarios (Vitest)
│   └── e2e/                      # Tests de interfaz (Playwright)
├── astro.config.mjs
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

### Responsabilidades

- **`src/types`**: el modelo del dominio (`Pregunta`, `Opcion`, `BancoPreguntas`, …). No depende de nada.
- **`src/lib/quiz`** y **`src/lib/juego`**: reglas del cuestionario y del juego, sin dependencias de la interfaz y cubiertas por tests.
- **`src/scripts`**: controladores del navegador; solo manejan el DOM y delegan las reglas en `src/lib`.
- **`src/services`**: obtiene los datos (hoy, desde las colecciones de contenido de Astro). Si en el futuro los datos vienen de otro origen, solo cambia esta capa.
- **`src/components`, `src/layouts`, `src/pages`**: presentación.

El alias `@/` apunta a `src/` (p. ej. `import { evaluarRespuesta } from '@/lib/quiz/evaluar'`).

## Uso

- **Todas las unidades mezcladas** (`/quiz/todas/`): repaso general con las preguntas de todas las unidades.
- **Por unidad** (`/quiz/unidad-5/`, `/quiz/unidad-6/`, …): practicar tema por tema.

- **Modo juego** (`/juego/`): votación de 2 a 8 jugadores en el mismo dispositivo. Se elige tema y cantidad de preguntas. En cada opción aparecen los nombres de los jugadores: cada uno toca su nombre en la opción que elige (tocar otra opción mueve el voto; tocar el mismo nombre lo quita), así se ve quién votó cada respuesta. Cuando votaron todos se habilita «Revelar respuesta», que muestra quién acertó y la explicación. Los jugadores mantienen siempre su orden (el jugador 1 primero). Al final, ranking con empates.

En cada intento se mezclan las preguntas y sus opciones. La respuesta correcta nunca vuelve a aparecer en la misma posición que la última vez que se vio esa pregunta (se recuerda en el navegador), tanto en el quiz individual como en el modo juego.

**Tema visual:** estilo pixel art con detalles SQL, en modo claro y oscuro (paleta "arcade": turquesa, naranja/ámbar y violeta, con contraste WCAG AA). El selector del encabezado tiene dos opciones, ☀ Claro y ☾ Oscuro; la elección se recuerda y, si nunca se eligió, se usa la del sistema. Al responder se muestra si la respuesta es correcta, la explicación de cada opción involucrada y enlaces a la sección exacta del material. Al final se muestra el puntaje y la lista de preguntas para repasar.

## Agregar contenido

### Material de estudio

Colocar los documentos en `materialEstudio/`, dentro de una carpeta por unidad con el formato `unidad-NN-tema` (p. ej. `materialEstudio/unidad-08-indices/indices.html`).

### Preguntas

Crear un archivo JSON por unidad en `src/content/preguntas/` con este formato:

```json
{
  "unidad": 5,
  "titulo": "Subconsultas",
  "preguntas": [
    {
      "id": "u05-identificador-unico",
      "tema": "Subconsultas escalares",
      "enunciado": "¿…?",
      "opciones": [
        { "id": "a", "texto": "…", "explicacion": "Por qué es correcta o incorrecta" },
        { "id": "b", "texto": "…", "explicacion": "…" },
        { "id": "c", "texto": "…", "explicacion": "…" },
        { "id": "d", "texto": "…", "explicacion": "…" }
      ],
      "respuestaCorrecta": "a",
      "explicacion": "Explicación general del concepto.",
      "material": [
        {
          "titulo": "Unidad 5 · Subconsultas escalares",
          "ruta": "unidad-05-subconsultas/subconsultas.html",
          "seccion": "escalares"
        }
      ]
    }
  ]
}
```

Reglas validadas automáticamente:

- Exactamente cuatro opciones, con identificadores `a`, `b`, `c` y `d` sin repetir.
- Sin textos vacíos y con al menos una referencia de material.
- Identificadores de pregunta únicos en todo el banco y un solo archivo por unidad.
- La `ruta` del material debe existir dentro de `materialEstudio/` y la `seccion` debe ser un `id` presente en ese HTML (p. ej. `<section id="escalares">`).
- En cada banco, las respuestas correctas se reparten entre las cuatro letras.

Astro valida el esquema durante `dev` y `build`; los tests (`npm test`) verifican además la unicidad global y que el material referenciado exista.

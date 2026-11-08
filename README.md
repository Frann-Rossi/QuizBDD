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

Los tests de interfaz usan el Google Chrome instalado en la máquina (no descargan navegadores) y simulan dos dispositivos: escritorio y un celular (Pixel 7). Cubren el inicio, el tema claro/oscuro, el cuestionario completo, la posición de la respuesta correcta, el modo juego (configuración, votación, revelación, orden de jugadores y ranking), la página `/crear/` (armado de una pregunta, descarga del JSON validado contra el esquema del banco, errores en español y visibilidad de la pestaña en escritorio y celular) y que ninguna pantalla desborde en el celular.

## Estructura del proyecto

```text
QuizBDD/
├── autoria/                      # Servidor de autoría (solo con npm run dev): subir material y guardar bancos
├── materialEstudio/              # Material de estudio, una carpeta por unidad (HTML y PDF)
│   ├── unidad-01-introduccion/
│   ├── unidad-02-consultasBasicas/
│   ├── unidad-03-JoinUnion/
│   ├── unidad-04-funcionesDeAgrupacionAgregacion/
│   ├── unidad-05-subconsultas/
│   ├── unidad-06-cte/
│   └── unidad-07-vistas/
├── public/                       # Recursos estáticos servidos tal cual (favicon, imágenes)
├── src/
│   ├── components/               # Componentes reutilizables: cabecera, volver al inicio, cuestionario, juego, tarjetas
│   ├── content/
│   │   └── preguntas/            # Banco de preguntas: un JSON por unidad
│   ├── layouts/                  # Estructura HTML base, menú y tema
│   ├── lib/
│   │   ├── quiz/                 # Reglas del cuestionario: esquemas, evaluación, mezcla, selección de unidades
│   │   ├── juego/                # Reglas del modo juego: jugadores, votos, puntos y ranking
│   │   └── crear/                # Armado y validación de preguntas (formulario de Crear)
│   ├── pages/                    # Rutas: cada archivo es una página
│   │   ├── index.astro           # Inicio: modos y unidades
│   │   ├── quiz/[modo].astro     # /quiz/todas/ y /quiz/unidad-N/
│   │   ├── juego.astro           # /juego/ (votación multijugador)
│   │   ├── seleccion.astro       # /seleccion/ (elegir varias unidades para repasar)
│   │   ├── crear.astro           # /crear/ (solo desarrollo)
│   │   ├── preguntas.astro       # /preguntas/ (solo desarrollo: ver, editar y eliminar)
│   │   └── material/[...ruta].ts # Publica materialEstudio/ (HTML y PDF) en /material/...
│   ├── scripts/                  # Código del navegador: cuestionario, juego, Crear, Preguntas, utilidades de DOM
│   ├── services/                 # Acceso a datos: colecciones de contenido y lista de material
│   ├── styles/                   # Estilos globales y tokens de Tailwind
│   ├── types/                    # Tipos e interfaces TypeScript del dominio
│   ├── utils/                    # Funciones auxiliares puras
│   └── content.config.ts         # Definición y validación de las colecciones de contenido
├── tests/
│   ├── unit/                     # Tests unitarios (Vitest)
│   └── e2e/                      # Tests de interfaz (Playwright)
├── astro.config.mjs              # Integraciones: servidor de autoría (dev) y limpieza del build
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

### Responsabilidades

- **`src/types`**: el modelo del dominio (`Pregunta`, `Opcion`, `BancoPreguntas`, …). No depende de nada.
- **`src/lib/quiz`**, **`src/lib/juego`** y **`src/lib/crear`**: reglas del cuestionario, del juego y del armado de preguntas, sin dependencias de la interfaz y cubiertas por tests.
- **`src/scripts`**: controladores del navegador; solo manejan el DOM y delegan las reglas en `src/lib`.
- **`src/services`**: obtiene los datos (colecciones de contenido de Astro y la lista de material).
- **`autoria/`**: escrituras en disco (material y bancos). Solo existe con `astro dev`, y solo acepta peticiones desde esta PC.
- **`src/components`, `src/layouts`, `src/pages`**: presentación.

El alias `@/` apunta a `src/` (p. ej. `import { evaluarRespuesta } from '@/lib/quiz/evaluar'`).

## Uso

- **Todas las unidades mezcladas** (`/quiz/todas/`): repaso general con las preguntas de todas las unidades.
- **Por unidad** (`/quiz/unidad-5/`, `/quiz/unidad-6/`, …): practicar tema por tema.
- **Preguntas** (`/preguntas/`, solo en desarrollo): lista las preguntas de cada unidad, con buscador. Cada una se puede **editar** (abre el formulario de Crear ya cargado y, al guardar, la pregunta se reemplaza en su banco; si cambia de unidad, pasa al banco de la nueva) o **eliminar** (con confirmación). Los cambios se escriben en `src/content/preguntas/`, validados con el mismo esquema que usa el build. En Crear, «Guardar en el banco» agrega una pregunta nueva directamente.
- **Elegir unidades** (`/seleccion/`, tarjeta en el inicio): marcar las unidades que se quieren repasar, por ejemplo la 2 y la 3, o la 1, la 3 y la 4. Las preguntas de todas ellas se mezclan en un solo cuestionario, en `/quiz/todas/?unidades=…`, y el título indica la selección. Sin selección, el modo «todas» sigue mostrando todo el banco.
- **Crear pregunta** (`/crear/`, solo en desarrollo; la pregunta puede tener 2, 3 o 4 opciones, y la explicación general y el material son opcionales: con `npm run dev` aparece la pestaña «Crear» del menú, también en celular; en el build de producción no se genera la página ni el enlace): formulario para cargar una pregunta nueva sin editar el JSON a mano. Permite elegir la unidad, escribir el enunciado, las cuatro opciones con su explicación, la explicación general y un resumen opcional, y agregar material de estudio eligiendo documento y sección (el enlace se arma solo). «Vista previa» valida la pregunta con las mismas reglas del banco y muestra los errores en español. «Descargar JSON de la unidad» baja el archivo de esa unidad con la pregunta agregada, listo para reemplazar el archivo en `src/content/preguntas/`. En desarrollo, además, se puede subir un PDF o HTML desde la PC a la carpeta de una unidad de `materialEstudio/`: queda disponible como documento y, para un PDF, se referencia por página (el enlace abre el PDF en esa página). El servidor de autoría (`autoria/servidor.mjs`) solo existe con `npm run dev`; el sitio publicado no puede escribir archivos, así que el JSON de la unidad sigue descargándose para reemplazarlo.

- **Modo juego** (`/juego/`): votación de 2 a 8 jugadores en el mismo dispositivo. Se elige tema y cantidad de preguntas. En cada opción aparecen los nombres de los jugadores: cada uno toca su nombre en la opción que elige (tocar otra opción mueve el voto; tocar el mismo nombre lo quita), así se ve quién votó cada respuesta. Cuando votaron todos se habilita «Revelar respuesta», que muestra quién acertó y la explicación. Los jugadores mantienen siempre su orden (el jugador 1 primero). Al final, ranking con empates.

En cada intento se mezclan las preguntas y sus opciones. La respuesta correcta nunca vuelve a aparecer en la misma posición que la última vez que se vio esa pregunta (se recuerda en el navegador), tanto en el quiz individual como en el modo juego.

**Tema visual:** estilo pixel art con detalles SQL, en modo claro y oscuro (paleta "arcade": turquesa, naranja/ámbar y violeta, con contraste WCAG AA). El selector del encabezado tiene dos opciones, ☀ Claro y ☾ Oscuro; la elección se recuerda y, si nunca se eligió, se usa la del sistema. Al responder se muestra si la respuesta es correcta, la explicación de cada opción involucrada y enlaces a la sección exacta del material. Al final se muestra el puntaje y la lista de preguntas para repasar.

## Agregar contenido

### Material de estudio

Colocar los documentos en `materialEstudio/`, dentro de una carpeta por unidad con el formato `unidad-NN-tema` (p. ej. `materialEstudio/unidad-08-indices/indices.html`).

### Preguntas

Crear un archivo JSON por unidad en `src/content/preguntas/` con este formato (o armar la pregunta desde `/crear/`, que genera el mismo formato):

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
      "resumen": "Idea breve para recordar (opcional).",
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

- Entre dos y cuatro opciones, con identificadores `a`, `b`, `c` y `d` sin repetir, y la respuesta correcta debe ser una de ellas.
- Sin textos vacíos en el enunciado, las opciones y su explicación.
- La explicación general y el material de estudio son opcionales.
- `resumen` es opcional; si se incluye, no puede estar vacío.
- Identificadores de pregunta únicos en todo el banco y un solo archivo por unidad.
- La `ruta` del material debe existir dentro de `materialEstudio/` y la `seccion` debe ser un `id` presente en ese HTML (p. ej. `<section id="escalares">`).
- En cada banco, las respuestas correctas se reparten entre las cuatro letras.

Astro valida el esquema durante `dev` y `build`; los tests (`npm test`) verifican además la unicidad global y que el material referenciado exista.

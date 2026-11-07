/**
 * Controlador del cuestionario en el navegador. Solo maneja el DOM: las reglas
 * (mezclar, evaluar, resumir) viven en `src/lib/quiz` y están testeadas aparte.
 */
import { evaluarRespuesta } from '@/lib/quiz/evaluar';
import { prepararCuestionario, resumirResultados } from '@/lib/quiz/cuestionario';
import { posicionCorrecta } from '@/lib/quiz/mezclar';
import { filtrarPorUnidades, unidadesDesdeBusqueda } from '@/lib/quiz/seleccion';
import type { OpcionId, PreguntaCuestionario, ResultadoRespuesta } from '@/types/quiz';
import { pluralizar } from '@/utils/formato';
import {
  LETRAS,
  aplicarEstadoOpcion,
  comportamientoScroll,
  crear,
  crearBloque,
  crearBotonOpcion,
  crearEnlaceMaterial,
  guardarPosicion,
  leerDatos,
  leerPosicionesPrevias,
  nodosSql,
  renderizarSql,
  requerir,
} from './dom';

interface RespuestaRegistrada {
  pregunta: PreguntaCuestionario;
  resultado: ResultadoRespuesta;
}

function mensajeFinal(porcentaje: number): string {
  if (porcentaje === 100) return '¡Excelente! Respondiste todo correctamente.';
  if (porcentaje >= 80) return '¡Muy bien! Dominás la mayoría de los conceptos.';
  if (porcentaje >= 50) return 'Vas por buen camino. Repasá las preguntas que fallaste y volvé a intentarlo.';
  return 'Conviene repasar el material antes de volver a intentarlo. Abajo tenés las secciones recomendadas.';
}

export function iniciarCuestionario(raiz: HTMLElement): void {
  const preguntasOriginales = leerDatos<PreguntaCuestionario[]>(raiz, '[data-preguntas]');
  // Con selección de unidades en la URL se repasan solo esas; si ninguna pregunta coincide, se usa todo el banco.
  const seleccion = raiz.dataset['permiteSeleccion'] === 'si' ? unidadesDesdeBusqueda(window.location.search) : null;
  const preguntasElegidas = seleccion ? filtrarPorUnidades(preguntasOriginales, seleccion) : [];
  const preguntasBase = preguntasElegidas.length > 0 ? preguntasElegidas : preguntasOriginales;
  const mostrarUnidad = raiz.dataset['mostrarUnidad'] === 'si';

  const zonaProgreso = requerir<HTMLElement>(raiz, '[data-zona-progreso]');
  const progreso = requerir<HTMLElement>(raiz, '[data-progreso]');
  const puntaje = requerir<HTMLElement>(raiz, '[data-puntaje]');
  const segmentos = requerir<HTMLElement>(raiz, '[data-segmentos]');

  const vistaPregunta = requerir<HTMLElement>(raiz, '[data-vista-pregunta]');
  const etiqueta = requerir<HTMLElement>(raiz, '[data-etiqueta]');
  const enunciado = requerir<HTMLElement>(raiz, '[data-enunciado]');
  const listaOpciones = requerir<HTMLOListElement>(raiz, '[data-opciones]');

  const retro = requerir<HTMLElement>(raiz, '[data-retro]');
  const retroEstado = requerir<HTMLElement>(raiz, '[data-retro-estado]');
  const retroTitulo = requerir<HTMLElement>(raiz, '[data-retro-titulo]');
  const retroCuerpo = requerir<HTMLElement>(raiz, '[data-retro-cuerpo]');
  const retroEnlaces = requerir<HTMLUListElement>(raiz, '[data-retro-enlaces]');
  const botonSiguiente = requerir<HTMLButtonElement>(raiz, '[data-siguiente]');
  const botonAnterior = requerir<HTMLButtonElement>(raiz, '[data-anterior]');

  const vistaResultado = requerir<HTMLElement>(raiz, '[data-vista-resultado]');
  const resultadoTitulo = requerir<HTMLElement>(raiz, '[data-resultado-titulo]');
  const resultadoPuntaje = requerir<HTMLElement>(raiz, '[data-resultado-puntaje]');
  const resultadoPorcentaje = requerir<HTMLElement>(raiz, '[data-resultado-porcentaje]');
  const resultadoMensaje = requerir<HTMLElement>(raiz, '[data-resultado-mensaje]');
  const repaso = requerir<HTMLElement>(raiz, '[data-repaso]');
  const repasoLista = requerir<HTMLUListElement>(raiz, '[data-repaso-lista]');
  const botonReintentar = requerir<HTMLButtonElement>(raiz, '[data-reintentar]');

  let preguntas: PreguntaCuestionario[] = [];
  let indice = 0;
  /** Respuestas en el orden de las preguntas: `respuestas[i]` corresponde a `preguntas[i]`. */
  let respuestas: RespuestaRegistrada[] = [];

  function renderizarSegmentos(): void {
    segmentos.replaceChildren(
      ...preguntas.map((_, i) => {
        const respuesta = respuestas[i];
        const color = respuesta
          ? respuesta.resultado.esCorrecta
            ? 'bg-ok'
            : 'bg-error'
          : i === indice
            ? 'bg-acento'
            : 'bg-panel-2';
        // Al revisar una pregunta ya respondida, se recuadra su segmento.
        const actual = respuesta && i === indice ? ' outline-2 outline-offset-1 outline-acento' : '';
        return crear('span', `min-w-0 flex-1 ${color}${actual}`);
      }),
    );
    segmentos.setAttribute('aria-valuemax', String(preguntas.length));
    segmentos.setAttribute('aria-valuenow', String(respuestas.length));
  }

  function actualizarProgreso(): void {
    const correctas = respuestas.filter((r) => r.resultado.esCorrecta).length;
    progreso.textContent = `Pregunta ${Math.min(indice + 1, preguntas.length)}/${preguntas.length}`;
    puntaje.textContent = `${pluralizar(correctas, 'correcta', 'correctas')} de ${respuestas.length}`;
    renderizarSegmentos();
  }

  function mostrarPregunta(): void {
    const pregunta = preguntas[indice];
    if (!pregunta) return;
    const previa = respuestas[indice];

    // Recordar dónde quedó la correcta: la próxima vez no se repite esa posición.
    if (!previa) guardarPosicion(pregunta.id, posicionCorrecta(pregunta));

    etiqueta.textContent = mostrarUnidad
      ? `Unidad ${pregunta.unidad} · ${pregunta.tituloUnidad} — ${pregunta.tema}`
      : pregunta.tema;
    renderizarSql(enunciado, pregunta.enunciado);

    listaOpciones.replaceChildren(
      ...pregunta.opciones.map((opcion, posicion) => {
        const item = crear('li');
        const boton = crearBotonOpcion(opcion.id, posicion, opcion.texto);
        boton.addEventListener('click', () => responder(pregunta, opcion.id));
        item.append(boton);
        return item;
      }),
    );

    botonAnterior.classList.toggle('hidden', indice === 0);

    if (previa) {
      // Pregunta ya respondida: se muestra tal como quedó, sin poder cambiar la respuesta.
      mostrarRetroalimentacion(pregunta, previa.resultado);
    } else {
      retro.classList.add('hidden');
      botonSiguiente.classList.add('hidden');
    }
    actualizarProgreso();
    enunciado.focus();
  }

  function responder(pregunta: PreguntaCuestionario, opcionId: OpcionId): void {
    if (respuestas[indice]) return;
    const resultado = evaluarRespuesta(pregunta, opcionId);
    respuestas[indice] = { pregunta, resultado };

    mostrarRetroalimentacion(pregunta, resultado);
    actualizarProgreso();
    botonSiguiente.focus({ preventScroll: true });
    retro.scrollIntoView({ behavior: comportamientoScroll(), block: 'nearest' });
  }

  /** Bloquea las opciones, marca la correcta y la elegida, y muestra la explicación. */
  function mostrarRetroalimentacion(pregunta: PreguntaCuestionario, resultado: ResultadoRespuesta): void {
    listaOpciones.querySelectorAll<HTMLButtonElement>('button[data-opcion]').forEach((boton) => {
      const id = boton.dataset['opcion'];
      boton.disabled = true;
      if (id === resultado.opcionCorrecta.id) aplicarEstadoOpcion(boton, 'correcta');
      else if (id === resultado.opcionSeleccionada.id) aplicarEstadoOpcion(boton, 'incorrecta');
      else aplicarEstadoOpcion(boton, 'descartada');
    });

    const letraCorrecta = LETRAS[posicionCorrecta(pregunta)] ?? '';

    if (resultado.esCorrecta) {
      retro.className = 'caja-pixel mt-5 border-ok bg-ok-suave shadow-pixel-ok';
      retroEstado.className = 'border-b-[3px] border-ok bg-ok px-4 py-2 text-xs font-bold text-panel sm:px-6';
      retroEstado.textContent = '✔ Query OK, 1 row affected';
      retroTitulo.className = 'font-pixel text-2xl font-bold text-ok';
      retroTitulo.textContent = '¡Correcto!';
      retroCuerpo.replaceChildren(
        crearBloque('Por qué es correcta', resultado.opcionSeleccionada.explicacion),
        crearBloque('Para reforzar el concepto', resultado.explicacion),
      );
    } else {
      retro.className = 'caja-pixel mt-5 border-error bg-error-suave shadow-pixel-error';
      retroEstado.className = 'border-b-[3px] border-error bg-error px-4 py-2 text-xs font-bold text-panel sm:px-6';
      retroEstado.textContent = '✖ ERROR: la respuesta no coincide';
      retroTitulo.className = 'font-pixel text-2xl font-bold text-error';
      retroTitulo.textContent = 'Incorrecto';
      retroCuerpo.replaceChildren(
        crearBloque(`La respuesta correcta es la ${letraCorrecta}`, resultado.opcionCorrecta.texto),
        crearBloque('Por qué tu respuesta no es correcta', resultado.opcionSeleccionada.explicacion),
        crearBloque(`Por qué la ${letraCorrecta} es correcta`, resultado.opcionCorrecta.explicacion),
        crearBloque('Para repasar el concepto', resultado.explicacion),
      );
    }

    retroEnlaces.replaceChildren(...resultado.material.map(crearEnlaceMaterial));
    botonSiguiente.textContent = indice === preguntas.length - 1 ? 'Ver resultado ▶' : 'Siguiente ▶';
    botonSiguiente.classList.remove('hidden');
  }

  function mostrarResultado(): void {
    const resumen = resumirResultados(respuestas.map((r) => r.resultado));

    vistaPregunta.classList.add('hidden');
    zonaProgreso.classList.add('hidden');
    vistaResultado.classList.remove('hidden');

    resultadoPuntaje.textContent = `${resumen.correctas}/${resumen.total}`;
    resultadoPorcentaje.textContent = `${resumen.porcentaje}% de respuestas correctas · ${pluralizar(resumen.incorrectas, 'error', 'errores')}`;
    resultadoMensaje.textContent = mensajeFinal(resumen.porcentaje);

    const falladas = respuestas.filter((r) => !r.resultado.esCorrecta);
    repaso.classList.toggle('hidden', falladas.length === 0);
    repasoLista.replaceChildren(
      ...falladas.map(({ pregunta }) => {
        const item = crear('li', 'caja-pixel bg-panel p-4');
        const tema = mostrarUnidad ? `Unidad ${pregunta.unidad} · ${pregunta.tema}` : pregunta.tema;
        const texto = crear('p', 'mt-2 text-sm leading-relaxed text-tinta wrap-anywhere');
        texto.append(...nodosSql(pregunta.enunciado));
        const enlaces = crear('ul', 'mt-3 space-y-1');
        enlaces.append(...pregunta.material.map(crearEnlaceMaterial));
        item.append(crear('p', 'text-xs uppercase tracking-wide text-primario', tema), texto, enlaces);
        return item;
      }),
    );

    resultadoTitulo.focus();
    window.scrollTo({ top: 0, behavior: comportamientoScroll() });
  }

  function comenzar(): void {
    preguntas = prepararCuestionario(preguntasBase, Math.random, leerPosicionesPrevias());
    indice = 0;
    respuestas = [];

    vistaResultado.classList.add('hidden');
    zonaProgreso.classList.remove('hidden');
    vistaPregunta.classList.remove('hidden');
    mostrarPregunta();
  }

  botonSiguiente.addEventListener('click', () => {
    if (indice < preguntas.length - 1) {
      indice++;
      mostrarPregunta();
      window.scrollTo({ top: 0, behavior: comportamientoScroll() });
    } else {
      mostrarResultado();
    }
  });

  botonAnterior.addEventListener('click', () => {
    if (indice === 0) return;
    indice--;
    mostrarPregunta();
    window.scrollTo({ top: 0, behavior: comportamientoScroll() });
  });

  botonReintentar.addEventListener('click', comenzar);

  comenzar();
}

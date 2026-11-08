/**
 * Controlador del modo juego: votación en el mismo dispositivo.
 * Todos ven la pregunta; cada jugador toca su nombre en la opción que elige.
 * Solo maneja el DOM: las reglas de la partida viven en `src/lib/juego/partida.ts`.
 */
import {
  LARGO_MAXIMO_NOMBRE,
  alternarVoto,
  calcularRanking,
  evaluarRonda,
  seleccionarPreguntas,
  sumarPuntos,
  todosRespondieron,
  validarJugadores,
  votantesDe,
} from '@/lib/juego/partida';
import { mezclarOpciones, posicionCorrecta } from '@/lib/quiz/mezclar';
import type { Jugador } from '@/types/juego';
import type { OpcionId, PreguntaCuestionario } from '@/types/quiz';
import { pluralizar } from '@/utils/formato';
import {
  LETRAS,
  aplicarEstadoOpcion,
  comportamientoScroll,
  crear,
  crearBloque,
  crearEnlaceMaterial,
  crearTarjetaOpcion,
  guardarLocal,
  guardarPosicion,
  leerDatos,
  leerLocal,
  leerPosicionesPrevias,
  renderizarSql,
  requerir,
} from './dom';

interface Configuracion {
  jugadores: Jugador[];
  unidad: number | null;
  cantidad: number | null;
}

const CLAVE_NOMBRES = 'quiz-bdd:jugadores';

const CLASES_VOTO = {
  base: 'max-w-40 truncate border-[3px] px-2 py-1 text-xs font-semibold transition-transform',
  libre: 'cursor-pointer border-borde/40 bg-panel-2 text-tenue hover:border-borde hover:text-tinta active:translate-y-0.5',
  elegido:
    'cursor-pointer border-primario bg-primario text-sobre-primario shadow-[2px_2px_0_0_var(--sombra)] active:translate-y-0.5',
  acerto: 'border-ok bg-ok text-panel',
  fallo: 'border-error bg-error text-panel',
};

function unirNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

function leerNombresGuardados(): string[] {
  const guardado = leerLocal<unknown>(CLAVE_NOMBRES, []);
  return Array.isArray(guardado) ? guardado.filter((n): n is string => typeof n === 'string') : [];
}

export function iniciarJuego(raiz: HTMLElement): void {
  const todasLasPreguntas = leerDatos<PreguntaCuestionario[]>(raiz, '[data-preguntas]');
  const minJugadores = Number(raiz.dataset['minJugadores']);
  const maxJugadores = Number(raiz.dataset['maxJugadores']);

  // Configuración
  const vistaConfig = requerir<HTMLFormElement>(raiz, '[data-vista-config]');
  const listaJugadores = requerir<HTMLOListElement>(raiz, '[data-lista-jugadores]');
  const contadorJugadores = requerir<HTMLElement>(raiz, '[data-contador-jugadores]');
  const botonAgregar = requerir<HTMLButtonElement>(raiz, '[data-agregar-jugador]');
  const errorConfig = requerir<HTMLElement>(raiz, '[data-error-config]');

  // Ronda
  const vistaRonda = requerir<HTMLElement>(raiz, '[data-vista-ronda]');
  const rondaProgreso = requerir<HTMLElement>(raiz, '[data-ronda-progreso]');
  const marcador = requerir<HTMLUListElement>(raiz, '[data-marcador]');
  const etiqueta = requerir<HTMLElement>(raiz, '[data-etiqueta]');
  const enunciado = requerir<HTMLElement>(raiz, '[data-enunciado]');
  const listaOpciones = requerir<HTMLOListElement>(raiz, '[data-opciones]');
  const panelVotacion = requerir<HTMLElement>(raiz, '[data-panel-votacion]');
  const votacionConteo = requerir<HTMLElement>(raiz, '[data-votacion-conteo]');
  const votacionFaltan = requerir<HTMLElement>(raiz, '[data-votacion-faltan]');
  const botonRevelar = requerir<HTMLButtonElement>(raiz, '[data-revelar]');
  const revelacion = requerir<HTMLElement>(raiz, '[data-revelacion]');
  const revelacionTitulo = requerir<HTMLElement>(raiz, '[data-revelacion-titulo]');
  const resultadosRonda = requerir<HTMLUListElement>(raiz, '[data-resultados-ronda]');
  const explicacion = requerir<HTMLElement>(raiz, '[data-explicacion]');
  const enlaces = requerir<HTMLUListElement>(raiz, '[data-enlaces]');
  const botonSiguiente = requerir<HTMLButtonElement>(raiz, '[data-siguiente]');

  // Final
  const vistaFinal = requerir<HTMLElement>(raiz, '[data-vista-final]');
  const ganador = requerir<HTMLElement>(raiz, '[data-ganador]');
  const finalDetalle = requerir<HTMLElement>(raiz, '[data-final-detalle]');
  const ranking = requerir<HTMLOListElement>(raiz, '[data-ranking]');
  const botonRevancha = requerir<HTMLButtonElement>(raiz, '[data-revancha]');
  const botonVolverConfig = requerir<HTMLButtonElement>(raiz, '[data-volver-config]');

  // Estado de la partida
  let config: Configuracion | null = null;
  let preguntas: PreguntaCuestionario[] = [];
  let indice = 0;
  let pregunta: PreguntaCuestionario | null = null;
  let votos = new Map<string, OpcionId>();
  let puntos = new Map<string, number>();
  let revelada = false;

  function mostrarVista(vista: 'config' | 'ronda' | 'final'): void {
    vistaConfig.classList.toggle('hidden', vista !== 'config');
    vistaRonda.classList.toggle('hidden', vista !== 'ronda');
    vistaFinal.classList.toggle('hidden', vista !== 'final');
    window.scrollTo({ top: 0, behavior: comportamientoScroll() });
  }

  // ---------- Configuración ----------

  function inputsJugadores(): HTMLInputElement[] {
    return [...listaJugadores.querySelectorAll<HTMLInputElement>('input[data-nombre]')];
  }

  function actualizarListaJugadores(): void {
    const items = [...listaJugadores.children] as HTMLLIElement[];
    items.forEach((item, i) => {
      const input = requerir<HTMLInputElement>(item, 'input');
      input.placeholder = `Jugador ${i + 1}`;
      input.setAttribute('aria-label', `Nombre del jugador ${i + 1}`);
      const quitar = requerir<HTMLButtonElement>(item, 'button');
      quitar.disabled = items.length <= minJugadores;
      quitar.setAttribute('aria-label', `Quitar jugador ${i + 1}`);
      requerir<HTMLElement>(item, '[data-numero]').textContent = String(i + 1);
    });
    botonAgregar.disabled = items.length >= maxJugadores;
    contadorJugadores.textContent = `${items.length}/${maxJugadores}`;
  }

  function agregarJugador(nombre = ''): HTMLInputElement {
    const item = crear('li', 'flex items-center gap-2');
    const numero = crear(
      'span',
      'flex size-10 shrink-0 items-center justify-center border-[3px] border-borde bg-acento font-pixel text-lg font-bold text-sobre-acento',
    );
    numero.dataset['numero'] = '';
    numero.setAttribute('aria-hidden', 'true');

    const input = crear(
      'input',
      'h-10 min-w-0 flex-1 border-[3px] border-borde bg-panel px-3 text-tinta placeholder:text-tenue/70 focus:border-primario focus:outline-none',
    );
    input.type = 'text';
    input.maxLength = LARGO_MAXIMO_NOMBRE;
    input.autocomplete = 'off';
    input.value = nombre;
    input.dataset['nombre'] = '';

    const quitar = crear(
      'button',
      'flex size-10 shrink-0 items-center justify-center border-[3px] border-borde bg-panel font-pixel text-xl text-tenue transition hover:bg-error hover:text-panel disabled:invisible',
      '×',
    );
    quitar.type = 'button';
    quitar.addEventListener('click', () => {
      item.remove();
      actualizarListaJugadores();
      inputsJugadores().at(-1)?.focus();
    });

    item.append(numero, input, quitar);
    listaJugadores.append(item);
    actualizarListaJugadores();
    return input;
  }

  function prepararConfiguracion(): void {
    listaJugadores.replaceChildren();
    const guardados = leerNombresGuardados().slice(0, maxJugadores);
    const iniciales = guardados.length >= minJugadores ? guardados : Array.from({ length: minJugadores }, () => '');
    iniciales.forEach((nombre) => agregarJugador(nombre));
    errorConfig.classList.add('hidden');
  }

  botonAgregar.addEventListener('click', () => {
    agregarJugador().focus();
  });

  vistaConfig.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const validacion = validarJugadores(inputsJugadores().map((input) => input.value));
    if (!validacion.ok) {
      errorConfig.textContent = `✖ ${validacion.error}`;
      errorConfig.classList.remove('hidden');
      return;
    }

    const datos = new FormData(vistaConfig);
    const tema = String(datos.get('tema') ?? 'todas');
    const cantidad = String(datos.get('cantidad') ?? 'todas');

    config = {
      jugadores: validacion.jugadores,
      unidad: tema === 'todas' ? null : Number(tema),
      cantidad: cantidad === 'todas' ? null : Number(cantidad),
    };
    guardarLocal(CLAVE_NOMBRES, inputsJugadores().map((input) => input.value.trim()));
    errorConfig.classList.add('hidden');
    comenzarPartida();
  });

  // ---------- Partida ----------

  function comenzarPartida(): void {
    if (!config) return;
    preguntas = seleccionarPreguntas(todasLasPreguntas, config.unidad, config.cantidad);
    puntos = new Map(config.jugadores.map((j) => [j.id, 0]));
    indice = 0;
    mostrarVista('ronda');
    mostrarRonda();
  }

  /** Marcador siempre en el orden de carga: el jugador 1 primero. */
  function renderizarMarcador(): void {
    if (!config) return;
    marcador.replaceChildren(
      ...config.jugadores.map((jugador) => {
        const item = crear('li', 'border-[3px] border-borde bg-panel px-2 py-1 text-xs text-tinta');
        item.append(
          crear('span', 'font-semibold', jugador.nombre),
          crear('span', 'ml-2 font-pixel text-sm text-sql-numero', String(puntos.get(jugador.id) ?? 0)),
        );
        item.setAttribute('aria-label', `${jugador.nombre}: ${pluralizar(puntos.get(jugador.id) ?? 0, 'punto', 'puntos')}`);
        return item;
      }),
    );
  }

  function mostrarRonda(): void {
    const base = preguntas[indice];
    if (!config || !base) return;

    // La correcta no se repite en la posición donde estuvo la última vez que se vio esta pregunta.
    const actual = mezclarOpciones(base, leerPosicionesPrevias().get(base.id));
    guardarPosicion(actual.id, posicionCorrecta(actual));
    pregunta = actual;
    votos = new Map();
    revelada = false;

    rondaProgreso.textContent = `Pregunta ${indice + 1}/${preguntas.length}`;
    etiqueta.textContent = `Unidad ${actual.unidad} · ${actual.tituloUnidad} — ${actual.tema}`;
    renderizarSql(enunciado, actual.enunciado);

    const jugadores = config.jugadores;
    listaOpciones.replaceChildren(
      ...actual.opciones.map((opcion, posicion) => {
        const tarjeta = crearTarjetaOpcion(opcion.id, posicion, opcion.texto);
        const zona = requerir<HTMLElement>(tarjeta, '[data-zona-votos]');
        zona.append(
          ...jugadores.map((jugador) => {
            const chip = crear('button');
            chip.type = 'button';
            chip.dataset['jugador'] = jugador.id;
            chip.dataset['voto'] = opcion.id;
            chip.addEventListener('click', () => votar(jugador.id, opcion.id));
            return chip;
          }),
        );
        const item = crear('li');
        item.append(tarjeta);
        return item;
      }),
    );

    panelVotacion.classList.remove('hidden');
    revelacion.classList.add('hidden');
    renderizarMarcador();
    actualizarVotacion();
    enunciado.focus();
  }

  function votar(jugadorId: string, opcionId: OpcionId): void {
    if (revelada) return;
    votos = alternarVoto(votos, jugadorId, opcionId);
    actualizarVotacion();
  }

  /** Actualiza los botones de voto y el estado sin recrearlos (así no se pierde el foco). */
  function actualizarVotacion(): void {
    if (!config) return;
    const nombres = new Map(config.jugadores.map((j) => [j.id, j.nombre]));
    const letraDe = (id: string): string => LETRAS[pregunta?.opciones.findIndex((o) => o.id === id) ?? -1] ?? '';

    listaOpciones.querySelectorAll<HTMLButtonElement>('button[data-jugador]').forEach((chip) => {
      const jugadorId = chip.dataset['jugador'] ?? '';
      const opcionId = chip.dataset['voto'] ?? '';
      const nombre = nombres.get(jugadorId) ?? '';
      const elegido = votos.get(jugadorId) === opcionId;
      chip.className = `${CLASES_VOTO.base} ${elegido ? CLASES_VOTO.elegido : CLASES_VOTO.libre}`;
      chip.textContent = elegido ? `✔ ${nombre}` : nombre;
      chip.setAttribute('aria-pressed', String(elegido));
      chip.setAttribute('aria-label', `${nombre} vota la opción ${letraDe(opcionId)}`);
    });

    const faltan = config.jugadores.filter((j) => !votos.has(j.id)).map((j) => j.nombre);
    votacionConteo.textContent = `Votaron ${votos.size}/${config.jugadores.length}`;
    votacionFaltan.textContent =
      faltan.length === 0 ? '¡Votaron todos! Ya pueden revelar la respuesta.' : `Falta votar: ${unirNombres(faltan)}`;
    botonRevelar.disabled = !todosRespondieron(config.jugadores, votos);
  }

  function revelar(): void {
    const actual = pregunta;
    if (!config || !actual || !todosRespondieron(config.jugadores, votos)) return;
    revelada = true;

    const resultados = evaluarRonda(actual, config.jugadores, votos);
    puntos = sumarPuntos(puntos, resultados);

    const letraDe = (id: OpcionId): string => LETRAS[actual.opciones.findIndex((o) => o.id === id)] ?? '';
    const opcionCorrecta = actual.opciones.find((o) => o.id === actual.respuestaCorrecta);
    const letraCorrecta = letraDe(actual.respuestaCorrecta);

    // Colorear las opciones y dejar a la vista quién votó cada una.
    const jugadores = config.jugadores;
    listaOpciones.querySelectorAll<HTMLElement>('[data-opcion]').forEach((tarjeta) => {
      const opcionId = tarjeta.dataset['opcion'] as OpcionId;
      const esCorrecta = opcionId === actual.respuestaCorrecta;
      const votantes = votantesDe(jugadores, votos, opcionId);
      aplicarEstadoOpcion(tarjeta, esCorrecta ? 'correcta' : votantes.length > 0 ? 'incorrecta' : 'descartada');

      const zona = requerir<HTMLElement>(tarjeta, '[data-zona-votos]');
      zona.replaceChildren(
        ...(votantes.length > 0
          ? votantes.map((j) =>
              crear('span', `${CLASES_VOTO.base} ${esCorrecta ? CLASES_VOTO.acerto : CLASES_VOTO.fallo}`, `${esCorrecta ? '✔' : '✖'} ${j.nombre}`),
            )
          : [crear('span', 'text-xs text-tenue', 'Sin votos')]),
      );
    });

    const acertaron = resultados.filter((r) => r.esCorrecta).map((r) => r.jugador.nombre);
    revelacionTitulo.textContent =
      acertaron.length === resultados.length
        ? '¡Acertaron todos!'
        : acertaron.length === 0
          ? 'Nadie acertó esta vez'
          : `${acertaron.length === 1 ? 'Acertó' : 'Acertaron'} ${unirNombres(acertaron)}`;

    resultadosRonda.replaceChildren(
      ...resultados.map(({ jugador, opcion, esCorrecta }) => {
        const item = crear(
          'li',
          `flex items-center gap-3 border-[3px] px-3 py-2 ${esCorrecta ? 'border-ok bg-ok-suave' : 'border-error bg-error-suave'}`,
        );
        item.append(
          crear(
            'span',
            `flex size-8 shrink-0 items-center justify-center border-[3px] font-pixel text-base font-bold text-panel ${esCorrecta ? 'border-ok bg-ok' : 'border-error bg-error'}`,
            esCorrecta ? '✔' : '✖',
          ),
          crear('span', 'min-w-0 flex-1 truncate font-semibold text-tinta', jugador.nombre),
          crear('span', 'text-sm text-tenue', `votó la ${letraDe(opcion.id)}`),
        );
        item.setAttribute('aria-label', `${jugador.nombre}: ${esCorrecta ? 'correcto' : 'incorrecto'}, votó la ${letraDe(opcion.id)}`);
        return item;
      }),
    );

    const bloques = [crearBloque(`La respuesta correcta es la ${letraCorrecta}`, opcionCorrecta?.texto ?? '')];
    if (opcionCorrecta) bloques.push(crearBloque('Por qué es correcta', opcionCorrecta.explicacion));
    // Explicar cada opción incorrecta que alguien votó, en el orden en que aparecen.
    for (const opcion of actual.opciones) {
      if (opcion.id !== actual.respuestaCorrecta && votantesDe(config.jugadores, votos, opcion.id).length > 0) {
        bloques.push(crearBloque(`Por qué la ${letraDe(opcion.id)} no es correcta`, opcion.explicacion));
      }
    }
    if (actual.explicacion) bloques.push(crearBloque('Para repasar el concepto', actual.explicacion));
    if (actual.resumen) bloques.push(crearBloque('Resumen', actual.resumen));
    explicacion.replaceChildren(...bloques);
    enlaces.replaceChildren(...actual.material.map(crearEnlaceMaterial));
    // El material es opcional: sin referencias no se muestra el bloque.
    enlaces.parentElement?.classList.toggle('hidden', actual.material.length === 0);

    botonSiguiente.textContent = indice === preguntas.length - 1 ? 'Ver ranking ▶' : 'Siguiente ▶';

    panelVotacion.classList.add('hidden');
    revelacion.classList.remove('hidden');
    renderizarMarcador();
    revelacionTitulo.focus({ preventScroll: true });
    revelacion.scrollIntoView({ behavior: comportamientoScroll(), block: 'start' });
  }

  function mostrarFinal(): void {
    if (!config) return;
    const filas = calcularRanking(config.jugadores, puntos);
    const ganadores = filas.filter((f) => f.posicion === 1).map((f) => f.jugador.nombre);
    const mejorPuntaje = filas[0]?.puntos ?? 0;

    ganador.textContent =
      ganadores.length === 1 ? `¡Ganó ${ganadores[0]}!` : `¡Empate entre ${unirNombres(ganadores)}!`;
    finalDetalle.textContent = `${pluralizar(mejorPuntaje, 'respuesta correcta', 'respuestas correctas')} de ${preguntas.length}.`;

    const medallas = ['🥇', '🥈', '🥉'];
    ranking.replaceChildren(
      ...filas.map(({ posicion, jugador, puntos: puntosJugador }) => {
        const esPrimero = posicion === 1;
        const item = crear('li', `flex items-center gap-3 px-4 py-3 ${esPrimero ? 'bg-aviso-suave' : ''}`);
        const porcentaje = preguntas.length === 0 ? 0 : Math.round((puntosJugador / preguntas.length) * 100);
        item.append(
          crear('span', 'w-8 text-center font-pixel text-xl', medallas[posicion - 1] ?? `${posicion}.`),
          crear('span', 'min-w-0 flex-1 truncate font-pixel text-lg font-semibold text-tinta', jugador.nombre),
          crear('span', 'text-sm text-tenue', `${porcentaje}%`),
          crear('span', 'w-14 text-right font-pixel text-xl text-sql-numero', `${puntosJugador}/${preguntas.length}`),
        );
        return item;
      }),
    );

    mostrarVista('final');
    ganador.focus();
  }

  botonRevelar.addEventListener('click', revelar);

  botonSiguiente.addEventListener('click', () => {
    if (indice < preguntas.length - 1) {
      indice++;
      mostrarRonda();
      window.scrollTo({ top: 0, behavior: comportamientoScroll() });
    } else {
      mostrarFinal();
    }
  });

  botonRevancha.addEventListener('click', comenzarPartida);
  botonVolverConfig.addEventListener('click', () => {
    prepararConfiguracion();
    mostrarVista('config');
  });

  prepararConfiguracion();
  mostrarVista('config');
}

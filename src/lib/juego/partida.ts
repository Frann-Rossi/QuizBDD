import type { FilaRanking, Jugador, RespuestasRonda, ResultadoJugador, ValidacionJugadores } from '@/types/juego';
import type { OpcionId, Pregunta, PreguntaCuestionario } from '@/types/quiz';
import { prepararCuestionario } from '@/lib/quiz/cuestionario';
import type { Aleatorio } from '@/lib/quiz/mezclar';

export const MIN_JUGADORES = 2;
export const MAX_JUGADORES = 8;
export const LARGO_MAXIMO_NOMBRE = 20;

/**
 * Elige las preguntas de la partida, ya mezcladas.
 * @param unidad número de unidad, o `null` para usar todas.
 * @param cantidad máximo de preguntas, o `null` para usar todas las disponibles.
 */
export function seleccionarPreguntas<P extends PreguntaCuestionario>(
  preguntas: readonly P[],
  unidad: number | null,
  cantidad: number | null,
  aleatorio: Aleatorio = Math.random,
): P[] {
  const delTema = unidad === null ? preguntas : preguntas.filter((p) => p.unidad === unidad);
  const mezcladas = prepararCuestionario(delTema, aleatorio);
  return cantidad === null ? mezcladas : mezcladas.slice(0, cantidad);
}

/**
 * Valida y normaliza los nombres cargados en el formulario.
 * Los nombres vacíos se reemplazan por "Jugador N".
 */
export function validarJugadores(nombres: readonly string[]): ValidacionJugadores {
  if (nombres.length < MIN_JUGADORES) {
    return { ok: false, error: `Se necesitan al menos ${MIN_JUGADORES} jugadores.` };
  }
  if (nombres.length > MAX_JUGADORES) {
    return { ok: false, error: `Pueden jugar como máximo ${MAX_JUGADORES} jugadores.` };
  }

  const jugadores = nombres.map((nombre, i) => ({
    id: `j${i + 1}`,
    nombre: nombre.trim().slice(0, LARGO_MAXIMO_NOMBRE) || `Jugador ${i + 1}`,
  }));

  const vistos = new Set<string>();
  for (const { nombre } of jugadores) {
    const clave = nombre.toLocaleLowerCase('es');
    if (vistos.has(clave)) return { ok: false, error: `El nombre "${nombre}" está repetido.` };
    vistos.add(clave);
  }

  return { ok: true, jugadores };
}

/**
 * Registra el voto de un jugador. Cada jugador tiene un único voto:
 * votar otra opción lo mueve, y votar de nuevo la misma lo quita. Devuelve un mapa nuevo.
 */
export function alternarVoto(respuestas: RespuestasRonda, jugadorId: string, opcionId: OpcionId): Map<string, OpcionId> {
  const nuevas = new Map(respuestas);
  if (nuevas.get(jugadorId) === opcionId) nuevas.delete(jugadorId);
  else nuevas.set(jugadorId, opcionId);
  return nuevas;
}

/** Jugadores que votaron una opción, en el orden fijo de la partida (jugador 1 primero). */
export function votantesDe(jugadores: readonly Jugador[], respuestas: RespuestasRonda, opcionId: OpcionId): Jugador[] {
  return jugadores.filter((jugador) => respuestas.get(jugador.id) === opcionId);
}

export function todosRespondieron(jugadores: readonly Jugador[], respuestas: RespuestasRonda): boolean {
  return jugadores.every((jugador) => respuestas.has(jugador.id));
}

/** Evalúa la respuesta de cada jugador. Exige que todos hayan respondido. */
export function evaluarRonda(
  pregunta: Pregunta,
  jugadores: readonly Jugador[],
  respuestas: RespuestasRonda,
): ResultadoJugador[] {
  return jugadores.map((jugador) => {
    const opcionId = respuestas.get(jugador.id);
    const opcion = pregunta.opciones.find((o) => o.id === opcionId);
    if (!opcion) throw new Error(`Falta la respuesta de ${jugador.nombre}.`);
    return { jugador, opcion, esCorrecta: opcion.id === pregunta.respuestaCorrecta };
  });
}

/** Suma un punto a cada jugador que respondió correctamente. Devuelve un mapa nuevo. */
export function sumarPuntos(
  puntos: ReadonlyMap<string, number>,
  resultados: readonly ResultadoJugador[],
): Map<string, number> {
  const nuevos = new Map(puntos);
  for (const { jugador, esCorrecta } of resultados) {
    nuevos.set(jugador.id, (nuevos.get(jugador.id) ?? 0) + (esCorrecta ? 1 : 0));
  }
  return nuevos;
}

/** Ranking de mayor a menor puntaje; los empatados comparten posición (1, 1, 3). */
export function calcularRanking(jugadores: readonly Jugador[], puntos: ReadonlyMap<string, number>): FilaRanking[] {
  const ordenados = jugadores
    .map((jugador, orden) => ({ jugador, orden, puntos: puntos.get(jugador.id) ?? 0 }))
    .sort((a, b) => b.puntos - a.puntos || a.orden - b.orden);

  return ordenados.map((fila, i) => {
    const primeroConMismoPuntaje = ordenados.findIndex((otra) => otra.puntos === fila.puntos);
    return { posicion: (primeroConMismoPuntaje === -1 ? i : primeroConMismoPuntaje) + 1, jugador: fila.jugador, puntos: fila.puntos };
  });
}

import type { Opcion, OpcionId } from './quiz';

export interface Jugador {
  id: string;
  nombre: string;
}

/** Respuesta de un jugador en una ronda, ya evaluada. */
export interface ResultadoJugador {
  jugador: Jugador;
  opcion: Opcion;
  esCorrecta: boolean;
}

/** Respuestas registradas en la ronda actual: id de jugador → opción elegida. */
export type RespuestasRonda = ReadonlyMap<string, OpcionId>;

export interface FilaRanking {
  /** Posición con empates compartidos: 1, 1, 3, … */
  posicion: number;
  jugador: Jugador;
  puntos: number;
}

export type ValidacionJugadores = { ok: true; jugadores: Jugador[] } | { ok: false; error: string };

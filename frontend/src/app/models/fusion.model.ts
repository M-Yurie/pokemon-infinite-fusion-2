import { Pokemon } from './pokemon.model';

/** Unified display card for both base Pokémon and fusions */
export interface DisplayCard {
  id: string;          // "1" for base, "1.4" for fusion
  name: string;        // "Bulbasaur" or "Bulbasaur/Charmander"
  isFusion: boolean;
  types: string[];
  head: Pokemon;       // for base cards: the pokemon itself; for fusions: the head
  body: Pokemon | null; // null for base cards
  isLegendary: boolean;
}

export type FusionPosition = 'either' | 'head' | 'body';
export type SortOption = 'dex' | 'age' | 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'total';

export interface DexFilters {
  selectedPokemon: Pokemon[];
  position: FusionPosition;
  types: string[];
  mono: boolean;           // show only single-type entries
  ability: string | null;
  sh
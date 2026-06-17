export interface Ability {
  name: string;
  description: string;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  total: number;
}

export interface EvolutionEntry {
  dexNumber: number;
  name: string;
  evolvesAtLevel?: number;
}

export interface Pokemon {
  id: number;
  name: string;
  slug: string;
  types: string[];
  stats: Stats;
  abilities: Ability[];
  hiddenAbility: Ability | null;
  isLegendary: boolean;
  evolutionChain: EvolutionEntry[];
}

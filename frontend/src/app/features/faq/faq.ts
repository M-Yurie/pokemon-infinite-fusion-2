import { Component, signal } from '@angular/core';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  labelColor: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-faq',
  imports: [],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  readonly expandedId = signal<string | null>(null);

  readonly categories: FaqCategory[] = [
    {
      id: 'general',
      label: 'General FAQ',
      labelColor: '#79DFFF',
      items: [
        {
          question: 'What type of file is this game?',
          answer:
            "This game is a standalone .exe file, not a ROM. It can't be run on an emulator. Unzip it before launching the game.",
        },
        {
          question: 'Which Pokémon are available?',
          answer:
            'All Gen 1–2 Pokémon are in the game. Select Pokémon from Gen 3+ are also available — check the wiki or Discord for the full list.',
        },
        {
          question: 'Which game mechanics are used?',
          answer:
            'Pokémon Infinite Fusion mostly uses Generation 5 mechanics and Generation 7 learnsets. Fusions will learn moves from both halves as they normally level up.',
        },
        {
          question: 'Is there a wiki?',
          answer:
            'Yes! The community wiki is available at https://infinitefusion.fandom.com/ — if you find inaccuracies, report them in the Wiki Editing/Discussion thread on Discord.',
        },
        {
          question: 'What is Randomized Mode?',
          answer:
            'Randomized mode is only available if you already have a save file, so players experience classic mode first. Wild Pokémon are replaced species-per-species. You can also configure how much the Base Stat Total (BST) of randomized Pokémon may differ from the original.',
        },
        {
          question: 'What is Remix Mode?',
          answer:
            'Remix Mode changes all wild encounters and trainer Pokémon to include more Pokémon from later generations. It does not add new Pokémon to the game.',
        },
        {
          question: 'What is New Game+?',
          answer:
            'NG+ is unlocked after beating the Elite 4. It lets you transfer your Pokémon and outfits from your current save to a brand new save file.',
        },
      ],
    },
    {
      id: 'fusion',
      label: 'Fusion FAQ',
      labelColor: '#FF8BCF',
      items: [
        {
          question: 'Can I choose which Pokémon is the head and which is the body?',
          answer:
            'Yes. When fusing two Pokémon, you can pick which one will be the head and which will be the body. You can also fuse two of the same Pokémon.',
        },
        {
          question: 'What ID and Nature does a fusion inherit?',
          answer:
            'The fusion inherits the Trainer ID and Nature of the first selected Pokémon. If the first Pokémon was traded, the fusion will count as traded.',
        },
        {
          question: "How is a fusion's level determined?",
          answer:
            "The fusion's level is roughly the average of the two Pokémon's levels. IVs are also averaged from both Pokémon.",
        },
        {
          question: 'How do abilities work in fusions?',
          answer:
            'When fusing, you choose which ability the fusion will have — either the ability of the head Pokémon or the ability of the body Pokémon.',
        },
        {
          question: 'What moves does a fusion learn?',
          answer:
            'A fusion learns all moves either half would learn according to their Gen 7 movepools (Sun/Moon).',
        },
        {
          question: 'How does evolution work for fusions?',
          answer:
            'Each half evolves according to its own evolutionary method separately. If both halves evolve with the same method, you can pick which to evolve first. Most trade-based evolutions may differ — ask in #ask-a-bot on Discord.',
        },
        {
          question: "How are a fusion's types determined?",
          answer:
            "A fusion's types are the head's primary type and the body's secondary type. If the body has no secondary type, or if the body's secondary type matches the head's primary type, the body's primary type is used instead.",
        },
        {
          question: "How are a fusion's stats calculated?",
          answer:
            'Stats use a weighted average: (2/3) × Body + (1/3) × Head for Atk, Def, and Speed. (2/3) × Head + (1/3) × Body for HP, Sp.Atk, and Sp.Def. This means a Pokémon with high Atk/Def/Speed is more effective as a body.',
        },
        {
          question: 'Do held items work on fusions?',
          answer:
            "Yes. Items that provide bonuses to specific Pokémon (like Pikachu's Light Ball or Marowak's Thick Club) also work on fusions that contain that Pokémon.",
        },
      ],
    },
  ];

  toggle(id: string): void {
    this.expandedId.update((v) => (v === id ? null : id));
  }

  itemId(categoryId: string, i: number): string {
    return `${categoryId}-${i}`;
  }
}

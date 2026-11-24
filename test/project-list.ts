import list from './projects.json' with { type: 'json' };

/**
 * A project that extends the layer, checked out next to this repository.
 * test/projects.json is the one list: `pnpm test:projects`, the token test
 * and the contrast spec read it.
 */
export interface Project {
  /** The folder next to cardan-ui */
  folder: string;
  /** Short name, in test titles */
  name: string;
  /** Tokens its main.css lacks on purpose (the token test) */
  allow?: { why: string; tokens: string[] };
  /** Contrast failures of its main.css that are known (the contrast spec) */
  contrast?: { why: string; known: string[] };
}

export const projects: Project[] = list;

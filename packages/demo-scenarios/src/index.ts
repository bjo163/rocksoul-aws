export type DemoScenarioName = 'basic' | 'review' | 'full';

export interface DemoEntity {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface DemoScenario {
  name: DemoScenarioName;
  description: string;
  entities: DemoEntity[];
  commands: Array<{
    command: string;
    payload: Record<string, unknown>;
  }>;
}

const basic: DemoScenario = {
  name: 'basic',
  description: 'A minimal representative universe with one primary entity.',
  entities: [
    {
      id: 'DEMO-ENTITY-001',
      type: 'DEMO_SUBJECT',
      payload: { name: 'Demo Subject', status: 'active' },
    },
  ],
  commands: [
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-ENTITY-001',
        type: 'DEMO_SUBJECT',
        payload: { name: 'Demo Subject', status: 'active' },
      },
    },
  ],
};

const review: DemoScenario = {
  name: 'review',
  description: 'A review-oriented scenario with a subject and evidence payload.',
  entities: [
    {
      id: 'DEMO-CASE-001',
      type: 'CASE',
      payload: {
        title: 'Demo Review Case',
        state: 'review-pending',
      },
    },
    {
      id: 'DEMO-EVIDENCE-001',
      type: 'EVIDENCE',
      payload: {
        caseId: 'DEMO-CASE-001',
        source: 'demo',
        text: 'Representative evidence for review.',
      },
    },
  ],
  commands: [
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-CASE-001',
        type: 'CASE',
        payload: { title: 'Demo Review Case', state: 'review-pending' },
      },
    },
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-EVIDENCE-001',
        type: 'EVIDENCE',
        payload: {
          caseId: 'DEMO-CASE-001',
          source: 'demo',
          text: 'Representative evidence for review.',
        },
      },
    },
  ],
};

const full: DemoScenario = {
  name: 'full',
  description: 'The showcase scenario used as the canonical API/UI demo journey.',
  entities: [
    {
      id: 'DEMO-CASE-001',
      type: 'CASE',
      payload: {
        title: 'Cosmic Demo Case',
        state: 'draft',
      },
    },
    {
      id: 'DEMO-SUBJECT-001',
      type: 'SUBJECT',
      payload: {
        name: 'Demo Subject',
        caseId: 'DEMO-CASE-001',
      },
    },
    {
      id: 'DEMO-EVIDENCE-001',
      type: 'EVIDENCE',
      payload: {
        caseId: 'DEMO-CASE-001',
        source: 'demo',
        text: 'Evidence attached to the demo case.',
      },
    },
  ],
  commands: [
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-CASE-001',
        type: 'CASE',
        payload: { title: 'Cosmic Demo Case', state: 'draft' },
      },
    },
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-SUBJECT-001',
        type: 'SUBJECT',
        payload: { name: 'Demo Subject', caseId: 'DEMO-CASE-001' },
      },
    },
    {
      command: 'CREATE_ENTITY',
      payload: {
        id: 'DEMO-EVIDENCE-001',
        type: 'EVIDENCE',
        payload: {
          caseId: 'DEMO-CASE-001',
          source: 'demo',
          text: 'Evidence attached to the demo case.',
        },
      },
    },
  ],
};

const scenarios: Record<DemoScenarioName, DemoScenario> = { basic, review, full };

export function getDemoScenario(name: DemoScenarioName): DemoScenario {
  return scenarios[name];
}

export function listDemoScenarios(): DemoScenario[] {
  return Object.values(scenarios);
}

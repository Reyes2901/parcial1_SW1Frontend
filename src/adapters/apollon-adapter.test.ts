import { describe, it, expect } from 'vitest';
import { toApollon, fromApollon } from './apollon-adapter';
import type { UMLModel } from '../domain/uml-model';
import type { UMLModel as ApollonUMLModel } from '@tumaet/apollon';

describe('apollon-adapter', () => {
  const sampleMCU: UMLModel = {
    id: 'diagram-1',
    name: 'Test Model',
    version: 1,
    classes: [
      {
        id: 'c1',
        name: 'User',
        kind: 'class',
        attributes: [
          {
            id: 'a1',
            name: 'id',
            type: 'Long',
            visibility: 'private',
            isPrimaryKey: true,
            isRequired: true,
            isUnique: true,
          },
        ],
        methods: [],
        position: { x: 100, y: 100 },
        width: 250,
        height: 150,
      },
      {
        id: 'c2',
        name: 'Order',
        kind: 'class',
        attributes: [
          {
            id: 'a2',
            name: 'total',
            type: 'Double',
            visibility: 'public',
            isPrimaryKey: false,
            isRequired: true,
            isUnique: false,
          },
        ],
        methods: [
          {
            id: 'm1',
            name: 'calculateTotal',
            returnType: 'Double',
            parameters: [],
            visibility: 'public',
          },
        ],
        position: { x: 300, y: 100 },
        width: 220,
        height: 128,
      },
    ],
    relations: [
      {
        id: 'r1',
        kind: 'association',
        sourceClassId: 'c1',
        targetClassId: 'c2',
        sourceCardinality: '1',
        targetCardinality: '0..*',
        name: 'places',
        sourceHandle: 'bottom',
        targetHandle: 'top',
      },
    ],
  };

  it('toApollon produces an object with nodes and edges', () => {
    const apollonModel = toApollon(sampleMCU);
    expect(apollonModel.type).toBe('ClassDiagram');
    expect(apollonModel.id).toBe('diagram-1');
    expect(Array.isArray(apollonModel.nodes)).toBe(true);
    expect(Array.isArray(apollonModel.edges)).toBe(true);
    expect(apollonModel.nodes.length).toBe(2);
    expect(apollonModel.edges.length).toBe(1);
    expect((apollonModel as unknown as Record<string, unknown>).classes).toBeUndefined();
    expect((apollonModel as unknown as Record<string, unknown>).relations).toBeUndefined();
  });

  it('fromApollon removes type and restores MCU (round-trip test)', () => {
    const apollonModel = toApollon(sampleMCU);
    const mcu = fromApollon(apollonModel);
    expect((mcu as unknown as Record<string, unknown>).type).toBeUndefined();
    expect(mcu).toEqual(sampleMCU);
  });

  it('fromApollon throws Error if diagram type is not ClassDiagram', () => {
    const invalidModel = {
      ...sampleMCU,
      type: 'ActivityDiagram',
    } as unknown as ApollonUMLModel;

    expect(() => fromApollon(invalidModel)).toThrow(
      'Unsupported diagram type: ActivityDiagram. This platform only supports ClassDiagram.',
    );
  });

  it('preserves width and height through toApollon -> fromApollon', () => {
    const customMCU: UMLModel = {
      ...sampleMCU,
      classes: [
        {
          ...sampleMCU.classes[0],
          width: 300,
          height: 180,
        },
      ],
      relations: [],
    };
    const apollon = toApollon(customMCU);
    expect(apollon.nodes[0].width).toBe(300);
    expect(apollon.nodes[0].height).toBe(180);

    const mcu = fromApollon(apollon);
    expect(mcu.classes[0].width).toBe(300);
    expect(mcu.classes[0].height).toBe(180);
  });

  it('preserves sourceHandle and targetHandle through toApollon -> fromApollon', () => {
    const customMCU: UMLModel = {
      ...sampleMCU,
      relations: [
        {
          ...sampleMCU.relations[0],
          sourceHandle: 'top',
          targetHandle: 'bottom',
        },
      ],
    };
    const apollon = toApollon(customMCU);
    expect(apollon.edges[0].sourceHandle).toBe('top');
    expect(apollon.edges[0].targetHandle).toBe('bottom');

    const mcu = fromApollon(apollon);
    expect(mcu.relations[0].sourceHandle).toBe('top');
    expect(mcu.relations[0].targetHandle).toBe('bottom');
  });

  it('calculates initial width/height when not present in MCU', () => {
    const noSizeMCU: UMLModel = {
      ...sampleMCU,
      classes: [
        {
          id: 'c1',
          name: 'Simple',
          kind: 'class',
          attributes: [{ id: 'a1', name: 'x', type: 'String', visibility: 'public', isPrimaryKey: false, isRequired: false, isUnique: false }],
          methods: [{ id: 'm1', name: 'doWork', returnType: 'void', parameters: [], visibility: 'public' }],
          position: { x: 0, y: 0 },
        },
      ],
      relations: [],
    };
    const apollon = toApollon(noSizeMCU);
    expect(apollon.nodes[0].width).toBe(220);
    expect(apollon.nodes[0].height).toBe(80 + 1 * 24 + 1 * 24); // 128
  });

  it('uses default handles (right/left) when not present in MCU relation', () => {
    const noHandleMCU: UMLModel = {
      ...sampleMCU,
      relations: [
        {
          id: 'r1',
          kind: 'association',
          sourceClassId: 'c1',
          targetClassId: 'c2',
          sourceCardinality: '1',
          targetCardinality: '1',
        },
      ],
    };
    const apollon = toApollon(noHandleMCU);
    expect(apollon.edges[0].sourceHandle).toBe('right');
    expect(apollon.edges[0].targetHandle).toBe('left');
  });
});

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
});

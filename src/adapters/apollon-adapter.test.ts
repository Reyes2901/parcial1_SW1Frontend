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
    ],
    relations: [],
  };

  it('toApollon injects type: ClassDiagram', () => {
    const apollonModel = toApollon(sampleMCU);
    expect(apollonModel.type).toBe('ClassDiagram');
    expect(apollonModel.id).toBe('diagram-1');
  });

  it('fromApollon removes type and restores MCU', () => {
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

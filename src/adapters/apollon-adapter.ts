// Único archivo que toca tipos internos de @tumaet/apollon
import type { UMLModel as ApollonUMLModel } from '@tumaet/apollon';
import type { UMLModel } from '../domain/uml-model';

const DIAGRAM_TYPE = 'ClassDiagram' as const;

/**
 * Convierte MCU → formato Apollon inyectando type: 'ClassDiagram'.
 * El MCU del backend NO tiene 'type'.
 */
export function toApollon(model: UMLModel): ApollonUMLModel {
  return {
    ...(model as unknown as ApollonUMLModel),
    type: DIAGRAM_TYPE,
  };
}

/**
 * Convierte formato Apollon → MCU eliminando 'type'.
 * Lanza si el tipo no es ClassDiagram.
 */
export function fromApollon(apollonModel: ApollonUMLModel): UMLModel {
  if (apollonModel.type !== DIAGRAM_TYPE) {
    throw new Error(
      `Unsupported diagram type: ${apollonModel.type}. This platform only supports ClassDiagram.`,
    );
  }
  const copy = { ...apollonModel } as Record<string, unknown>;
  delete copy.type;
  return copy as unknown as UMLModel;
}

// Único archivo que toca tipos internos de @tumaet/apollon
import type { UMLModel as ApollonUMLModel, ApollonNode, ApollonEdge, DiagramEdgeType } from '@tumaet/apollon';
import type {
  UMLModel,
  UMLClass,
  UMLAttribute,
  UMLMethod,
  UMLRelation,
  RelationKind,
  ClassKind,
  Visibility,
  Cardinality,
} from '../domain/uml-model';

const DIAGRAM_TYPE = 'ClassDiagram' as const;

/**
 * Real Apollon v5.3.0 types (from node_modules/@tumaet/apollon/dist/index.d.ts):
 *
 * export declare type UMLModel = {
 *     version: `4.${number}.${number}`;
 *     id: string;
 *     title: string;
 *     type: UMLDiagramType; // 'ClassDiagram'
 *     nodes: ApollonNode[];
 *     edges: ApollonEdge[];
 *     assessments: {
 *         [id: string]: Assessment;
 *     };
 *     interactive?: InteractiveElements;
 * };
 *
 * export declare type ApollonNode = {
 *     id: string;
 *     width: number;
 *     height: number;
 *     type: DiagramNodeType; // 'class'
 *     position: { x: number; y: number };
 *     data: { [key: string]: unknown };
 *     measured: { width: number; height: number };
 * };
 *
 * export declare type ApollonEdge = {
 *     id: string;
 *     source: string;
 *     target: string;
 *     type: DiagramEdgeType;
 *     sourceHandle: string;
 *     targetHandle: string;
 *     data: OrthogonalEdgeData;
 * };
 */

function visibilitySymbol(v: Visibility): string {
  switch (v) {
    case 'public': return '+';
    case 'private': return '-';
    case 'protected': return '#';
    case 'package': return '~';
    default: return '+';
  }
}

function formatAttributeName(attr: UMLAttribute): string {
  return `${visibilitySymbol(attr.visibility)} ${attr.name}: ${attr.type}`;
}

function formatMethodName(m: UMLMethod): string {
  const params = (m.parameters || []).map((p) => `${p.name}: ${p.type}`).join(', ');
  return `${visibilitySymbol(m.visibility)} ${m.name}(${params}): ${m.returnType}`;
}

function mapKindToEdgeType(kind: RelationKind): DiagramEdgeType {
  switch (kind) {
    case 'aggregation': return 'ClassAggregation' as DiagramEdgeType;
    case 'composition': return 'ClassComposition' as DiagramEdgeType;
    case 'inheritance': return 'ClassInheritance' as DiagramEdgeType;
    case 'realization': return 'ClassRealization' as DiagramEdgeType;
    case 'dependency': return 'ClassDependency' as DiagramEdgeType;
    case 'association':
    default:
      return 'ClassBidirectional' as DiagramEdgeType;
  }
}

function mapEdgeTypeToKind(type: string): RelationKind {
  switch (type) {
    case 'ClassAggregation': return 'aggregation';
    case 'ClassComposition': return 'composition';
    case 'ClassInheritance': return 'inheritance';
    case 'ClassRealization': return 'realization';
    case 'ClassDependency': return 'dependency';
    case 'ClassUnidirectional':
    case 'ClassBidirectional':
    default:
      return 'association';
  }
}

function parseAttr(formatted?: string): { name: string; type: string; visibility: Visibility } {
  if (!formatted) return { name: 'attribute', type: 'String', visibility: 'private' };
  let visibility: Visibility = 'private';
  let str = formatted.trim();
  if (str.startsWith('+')) { visibility = 'public'; str = str.slice(1).trim(); }
  else if (str.startsWith('-')) { visibility = 'private'; str = str.slice(1).trim(); }
  else if (str.startsWith('#')) { visibility = 'protected'; str = str.slice(1).trim(); }
  else if (str.startsWith('~')) { visibility = 'package'; str = str.slice(1).trim(); }

  const parts = str.split(':');
  const name = parts[0]?.trim() || 'attribute';
  const type = parts[1]?.trim() || 'String';
  return { name, type, visibility };
}

function parseMethod(formatted?: string): { name: string; returnType: string; visibility: Visibility } {
  if (!formatted) return { name: 'method', returnType: 'void', visibility: 'public' };
  let visibility: Visibility = 'public';
  let str = formatted.trim();
  if (str.startsWith('+')) { visibility = 'public'; str = str.slice(1).trim(); }
  else if (str.startsWith('-')) { visibility = 'private'; str = str.slice(1).trim(); }
  else if (str.startsWith('#')) { visibility = 'protected'; str = str.slice(1).trim(); }
  else if (str.startsWith('~')) { visibility = 'package'; str = str.slice(1).trim(); }

  const parenIdx = str.indexOf('(');
  const name = parenIdx !== -1 ? str.substring(0, parenIdx).trim() : str;
  const colonIdx = str.lastIndexOf(':');
  const returnType = colonIdx !== -1 ? str.substring(colonIdx + 1).trim() : 'void';
  return { name: name || 'method', returnType, visibility };
}

/**
 * Convierte MCU → formato Apollon inyectando type: 'ClassDiagram' y estructurando nodes/edges.
 */
export function toApollon(model: UMLModel): ApollonUMLModel {
  const nodes: ApollonNode[] = (model.classes || []).map((cls) => {
    const attrCount = cls.attributes?.length || 0;
    const methodCount = cls.methods?.length || 0;
    const height = 100 + Math.max(0, attrCount * 25 + methodCount * 25);

    return {
      id: cls.id,
      type: 'class' as ApollonNode['type'],
      width: 160,
      height,
      position: { x: cls.position?.x ?? 100, y: cls.position?.y ?? 100 },
      data: {
        name: cls.name,
        isAbstract: cls.kind === 'abstract',
        stereotype: cls.kind === 'interface' ? 'interface' : cls.kind === 'enumeration' ? 'enumeration' : undefined,
        attributes: (cls.attributes || []).map((attr) => ({
          id: attr.id,
          name: formatAttributeName(attr),
          _mcuAttribute: attr,
        })),
        methods: (cls.methods || []).map((m) => ({
          id: m.id,
          name: formatMethodName(m),
          _mcuMethod: m,
        })),
        _mcuClass: cls,
      },
      measured: { width: 160, height },
    };
  });

  const edges: ApollonEdge[] = (model.relations || []).map((rel) => ({
    id: rel.id,
    source: rel.sourceClassId,
    target: rel.targetClassId,
    type: mapKindToEdgeType(rel.kind),
    sourceHandle: 'bottom',
    targetHandle: 'top',
    data: {
      label: rel.name || '',
      sourceMultiplicity: rel.sourceCardinality || '',
      targetMultiplicity: rel.targetCardinality || '',
      sourceRole: rel.sourceRole || '',
      targetRole: rel.targetRole || '',
      points: [],
      _mcuRelation: rel,
    } as unknown as ApollonEdge['data'],
  }));

  return {
    id: model.id,
    title: model.name,
    version: '4.0.0' as ApollonUMLModel['version'],
    type: DIAGRAM_TYPE,
    nodes,
    edges,
    assessments: {},
  };
}

/**
 * Convierte formato Apollon → MCU invirtiendo la conversión sin perder información.
 * Lanza si el tipo no es ClassDiagram.
 */
export function fromApollon(apollonModel: ApollonUMLModel): UMLModel {
  if (apollonModel.type !== DIAGRAM_TYPE) {
    throw new Error(
      `Unsupported diagram type: ${apollonModel.type}. This platform only supports ClassDiagram.`,
    );
  }

  const rawNodes = apollonModel.nodes || [];
  const rawEdges = apollonModel.edges || [];

  const classes: UMLClass[] = rawNodes.map((node) => {
    const data = (node.data || {}) as Record<string, unknown>;
    const mcuClass = data._mcuClass as UMLClass | undefined;

    const kind: ClassKind = data.isAbstract
      ? 'abstract'
      : (data.stereotype === 'interface' || data.stereotype === 'Interface')
      ? 'interface'
      : (data.stereotype === 'enumeration' || data.stereotype === 'Enumeration')
      ? 'enumeration'
      : mcuClass?.kind || 'class';

    const rawAttrs = (data.attributes || []) as Array<Record<string, unknown>>;
    const attributes: UMLAttribute[] = rawAttrs.map((attrObj) => {
      const mcuAttr = attrObj._mcuAttribute as UMLAttribute | undefined;
      if (mcuAttr) {
        return { ...mcuAttr, id: (attrObj.id as string) || mcuAttr.id };
      }
      const parsed = parseAttr(attrObj.name as string | undefined);
      return {
        id: (attrObj.id as string) || crypto.randomUUID(),
        name: parsed.name,
        type: parsed.type,
        visibility: parsed.visibility,
        isPrimaryKey: false,
        isRequired: false,
        isUnique: false,
      };
    });

    const rawMethods = (data.methods || []) as Array<Record<string, unknown>>;
    const methods: UMLMethod[] = rawMethods.map((mObj) => {
      const mcuMethod = mObj._mcuMethod as UMLMethod | undefined;
      if (mcuMethod) {
        return { ...mcuMethod, id: (mObj.id as string) || mcuMethod.id };
      }
      const parsed = parseMethod(mObj.name as string | undefined);
      return {
        id: (mObj.id as string) || crypto.randomUUID(),
        name: parsed.name,
        returnType: parsed.returnType,
        parameters: [],
        visibility: parsed.visibility,
      };
    });

    return {
      id: node.id,
      name: String(data.name || mcuClass?.name || 'Class'),
      kind,
      attributes,
      methods,
      position: { x: node.position?.x ?? 0, y: node.position?.y ?? 0 },
    };
  });

  const relations: UMLRelation[] = rawEdges.map((edge) => {
    const data = (edge.data || {}) as Record<string, unknown>;
    const mcuRel = data._mcuRelation as UMLRelation | undefined;

    return {
      id: edge.id,
      kind: mapEdgeTypeToKind(edge.type),
      sourceClassId: edge.source,
      targetClassId: edge.target,
      sourceCardinality: ((data.sourceMultiplicity as string) || mcuRel?.sourceCardinality || '1') as Cardinality,
      targetCardinality: ((data.targetMultiplicity as string) || mcuRel?.targetCardinality || '1') as Cardinality,
      sourceRole: (data.sourceRole as string) || mcuRel?.sourceRole,
      targetRole: (data.targetRole as string) || mcuRel?.targetRole,
      name: (data.label as string) || mcuRel?.name,
      attributes: mcuRel?.attributes,
    };
  });

  const rawModel = apollonModel as unknown as Record<string, unknown>;

  return {
    id: apollonModel.id,
    name: apollonModel.title || 'Diagrama',
    version: typeof rawModel.version === 'number' ? rawModel.version : 1,
    classes,
    relations,
  };
}


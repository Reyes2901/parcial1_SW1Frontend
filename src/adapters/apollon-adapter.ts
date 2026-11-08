// Único archivo que toca tipos internos de @besser/wme
import type {
  UMLModel as BesserUMLModel,
  UMLElement,
  UMLRelationship,
  UMLClassifier,
  UMLClassifierMember,
  UMLAssociation,
  Selection,
} from '@besser/wme';
import { UMLDiagramType, UMLElementType, UMLRelationshipType } from '@besser/wme';
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

// Re-export types needed by other files
export type { BesserUMLModel, Selection };

const DIAGRAM_TYPE = UMLDiagramType.ClassDiagram;

// ─── Visibility helpers ──────────────────────────────────────────────

function visibilitySymbol(v: Visibility): string {
  switch (v) {
    case 'public': return '+';
    case 'private': return '-';
    case 'protected': return '#';
    case 'package': return '~';
    default: return '+';
  }
}

function symbolToVisibility(sym: string): Visibility {
  switch (sym) {
    case '+': return 'public';
    case '-': return 'private';
    case '#': return 'protected';
    case '~': return 'package';
    default: return 'public';
  }
}

// ─── Name formatting ─────────────────────────────────────────────────

function formatAttributeName(attr: UMLAttribute): string {
  return `${visibilitySymbol(attr.visibility)} ${attr.name}: ${attr.type}`;
}

function formatMethodName(m: UMLMethod): string {
  const params = (m.parameters || []).map((p) => `${p.name}: ${p.type}`).join(', ');
  return `${visibilitySymbol(m.visibility)} ${m.name}(${params}): ${m.returnType}`;
}

// ─── Parse UML strings back to structured data ──────────────────────

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

// ─── Kind ↔ Element/Relationship type mappings ───────────────────────

function classKindToElementType(kind: ClassKind): string {
  switch (kind) {
    case 'abstract': return 'AbstractClass';
    case 'interface': return 'Interface';
    case 'enumeration': return 'Enumeration';
    case 'class':
    default:
      return 'Class';
  }
}

function elementTypeToClassKind(type: string): ClassKind {
  switch (type) {
    case 'AbstractClass': return 'abstract';
    case 'Interface': return 'interface';
    case 'Enumeration': return 'enumeration';
    case 'Class':
    default:
      return 'class';
  }
}

function mapKindToRelType(kind: RelationKind): string {
  switch (kind) {
    case 'aggregation': return 'ClassAggregation';
    case 'composition': return 'ClassComposition';
    case 'inheritance': return 'ClassInheritance';
    case 'realization': return 'ClassRealization';
    case 'dependency': return 'ClassDependency';
    case 'association':
    default:
      return 'ClassBidirectional';
  }
}

function relTypeToKind(type: string): RelationKind {
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

function handleToDirection(handle?: string): string {
  switch (handle) {
    case 'top': return 'Up';
    case 'right': return 'Right';
    case 'bottom': return 'Down';
    case 'left': return 'Left';
    default: return 'Right';
  }
}

function directionToHandle(dir: string): string {
  switch (dir) {
    case 'Up': return 'top';
    case 'Right': return 'right';
    case 'Down': return 'bottom';
    case 'Left': return 'left';
    default: return 'right';
  }
}

/**
 * Convierte MCU → formato BESSER WME (UMLModel con elements/relationships dicts).
 * El modelo resultante se puede asignar con `editor.model = toApollon(model)`.
 */
export function toApollon(model: UMLModel): BesserUMLModel {
  const elements: Record<string, UMLElement> = {};
  const relationships: Record<string, UMLRelationship> = {};

  for (const cls of model.classes || []) {
    const attrCount = cls.attributes?.length || 0;
    const methodCount = cls.methods?.length || 0;
    const width = cls.width ?? 220;
    const height = cls.height ?? (80 + attrCount * 24 + methodCount * 24);

    // El elemento clase padre
    const classElement: UMLClassifier = {
      id: cls.id,
      name: cls.name,
      type: classKindToElementType(cls.kind) as UMLElement['type'],
      owner: null,
      bounds: { x: cls.position?.x ?? 100, y: cls.position?.y ?? 100, width, height },
      attributes: (cls.attributes || []).map((a) => a.id),
      methods: (cls.methods || []).map((m) => m.id),
    };
    elements[cls.id] = classElement;

    // Atributos como elementos hijos
    for (const attr of cls.attributes || []) {
      const memberElement: UMLClassifierMember = {
        id: attr.id,
        name: formatAttributeName(attr),
        type: 'ClassAttribute' as UMLElement['type'],
        owner: cls.id,
        bounds: { x: 0, y: 0, width, height: 24 },
        visibility: attr.visibility as UMLClassifierMember['visibility'],
      };
      elements[attr.id] = memberElement;
    }

    // Métodos como elementos hijos
    for (const m of cls.methods || []) {
      const memberElement: UMLClassifierMember = {
        id: m.id,
        name: formatMethodName(m),
        type: 'ClassMethod' as UMLElement['type'],
        owner: cls.id,
        bounds: { x: 0, y: 0, width, height: 24 },
        visibility: m.visibility as UMLClassifierMember['visibility'],
      };
      elements[m.id] = memberElement;
    }
  }

  for (const rel of model.relations || []) {
    const assocRel = {
      id: rel.id,
      name: rel.name || '',
      type: mapKindToRelType(rel.kind) as UMLRelationship['type'],
      owner: null,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      path: [{ x: 0, y: 0 }, { x: 0, y: 0 }] as UMLRelationship['path'],
      source: {
        element: rel.sourceClassId,
        direction: handleToDirection(rel.sourceHandle) as UMLRelationship['source']['direction'],
        multiplicity: rel.sourceCardinality || '1',
        role: rel.sourceRole || '',
      },
      target: {
        element: rel.targetClassId,
        direction: handleToDirection(rel.targetHandle) as UMLRelationship['target']['direction'],
        multiplicity: rel.targetCardinality || '1',
        role: rel.targetRole || '',
      },
    } as unknown as UMLAssociation;
    relationships[rel.id] = assocRel;
  }

  return {
    version: '3.0.0',
    type: DIAGRAM_TYPE,
    size: { width: 2000, height: 2000 },
    elements,
    interactive: { elements: {}, relationships: {} },
    relationships,
    assessments: {},
  };
}

/**
 * Convierte formato BESSER WME → MCU invirtiendo la conversión sin perder información.
 * Lanza si el tipo no es ClassDiagram.
 */
export function fromApollon(besserModel: BesserUMLModel): UMLModel {
  if (besserModel.type !== DIAGRAM_TYPE) {
    throw new Error(
      `Unsupported diagram type: ${besserModel.type}. This platform only supports ClassDiagram.`,
    );
  }

  const elements = besserModel.elements || {};
  const rels = besserModel.relationships || {};

  // Recolectar IDs de atributos y métodos (hijos con owner != null)
  const childIds = new Set<string>();
  for (const el of Object.values(elements)) {
    if (el.owner) childIds.add(el.id);
  }

  const classes: UMLClass[] = [];

  for (const el of Object.values(elements)) {
    // Solo elementos de nivel superior (clases, interfaces, etc.)
    if (el.owner) continue;

    const type = el.type;
    if (type !== 'Class' && type !== 'AbstractClass' && type !== 'Interface' && type !== 'Enumeration') {
      continue;
    }

    const classifier = el as UMLClassifier;
    const kind = elementTypeToClassKind(type);

    const attributes: UMLAttribute[] = (classifier.attributes || [])
      .map((attrId): UMLAttribute | null => {
        const attrEl = elements[attrId] as UMLClassifierMember | undefined;
        if (!attrEl) return null;
        const parsed = parseAttr(attrEl.name);
        const visibility = (attrEl.visibility as Visibility) || parsed.visibility;
        const result: UMLAttribute = {
          id: attrEl.id,
          name: parsed.name,
          type: parsed.type,
          visibility,
          isPrimaryKey: !!(attrEl as Record<string, unknown>).isId,
          isRequired: false,
          isUnique: false,
        };
        const defaultValue = (attrEl as Record<string, unknown>).defaultValue;
        if (typeof defaultValue === 'string') {
          result.defaultValue = defaultValue;
        }
        return result;
      })
      .filter((a): a is UMLAttribute => a !== null);

    const methods: UMLMethod[] = (classifier.methods || [])
      .map((methodId): UMLMethod | null => {
        const methodEl = elements[methodId] as UMLClassifierMember | undefined;
        if (!methodEl) return null;
        const parsed = parseMethod(methodEl.name);
        const visibility = (methodEl.visibility as Visibility) || parsed.visibility;
        return {
          id: methodEl.id,
          name: parsed.name,
          returnType: parsed.returnType,
          parameters: [] as { name: string; type: string }[],
          visibility,
        };
      })
      .filter((m): m is UMLMethod => m !== null);
    classes.push({
      id: el.id,
      name: el.name || 'Class',
      kind,
      attributes,
      methods,
      position: { x: el.bounds?.x ?? 0, y: el.bounds?.y ?? 0 },
      width: el.bounds?.width,
      height: el.bounds?.height,
    });
  }

  const relations: UMLRelation[] = Object.values(rels).map((rel) => {
    const assoc = rel as unknown as UMLAssociation;
    return {
      id: rel.id,
      kind: relTypeToKind(rel.type),
      sourceClassId: rel.source.element,
      targetClassId: rel.target.element,
      sourceCardinality: ((assoc.source as UMLAssociation['source']).multiplicity || '1') as Cardinality,
      targetCardinality: ((assoc.target as UMLAssociation['target']).multiplicity || '1') as Cardinality,
      sourceRole: (assoc.source as UMLAssociation['source']).role || undefined,
      targetRole: (assoc.target as UMLAssociation['target']).role || undefined,
      name: rel.name || undefined,
      sourceHandle: directionToHandle(rel.source.direction as string),
      targetHandle: directionToHandle(rel.target.direction as string),
    };
  });

  return {
    id: 'diagram',
    name: 'Diagrama',
    version: 1,
    classes,
    relations,
  };
}

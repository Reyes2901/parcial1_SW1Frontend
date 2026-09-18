import type { UMLModel } from '../domain/uml-model';
import type { UMLCommand } from '../domain/uml-command';

export function applyCommand(model: UMLModel, command: UMLCommand): UMLModel {
  switch (command.type) {
    case 'setModel':
      return { ...command.payload };

    case 'addClass': {
      // Avoid duplicate classes
      const exists = model.classes.some((c) => c.id === command.payload.id);
      if (exists) return model;
      return {
        ...model,
        classes: [...model.classes, command.payload],
      };
    }

    case 'updateClass': {
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === command.payload.id ? { ...c, ...command.payload } : c,
        ),
      };
    }

    case 'deleteClass': {
      const classId = command.payload.id;
      return {
        ...model,
        classes: model.classes.filter((c) => c.id !== classId),
        relations: model.relations.filter(
          (r) => r.sourceClassId !== classId && r.targetClassId !== classId,
        ),
      };
    }

    case 'addRelation': {
      const exists = model.relations.some((r) => r.id === command.payload.id);
      if (exists) return model;
      return {
        ...model,
        relations: [...model.relations, command.payload],
      };
    }

    case 'updateRelation': {
      return {
        ...model,
        relations: model.relations.map((r) =>
          r.id === command.payload.id ? { ...r, ...command.payload } : r,
        ),
      };
    }

    case 'deleteRelation': {
      return {
        ...model,
        relations: model.relations.filter((r) => r.id !== command.payload.id),
      };
    }

    case 'addAttribute': {
      const { classId, attribute } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId
            ? { ...c, attributes: [...c.attributes, attribute] }
            : c,
        ),
      };
    }

    case 'updateAttribute': {
      const { classId, attribute } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId
            ? {
                ...c,
                attributes: c.attributes.map((a) =>
                  a.id === attribute.id ? { ...a, ...attribute } : a,
                ),
              }
            : c,
        ),
      };
    }

    case 'deleteAttribute': {
      const { classId, attributeId } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId
            ? {
                ...c,
                attributes: c.attributes.filter((a) => a.id !== attributeId),
              }
            : c,
        ),
      };
    }

    case 'addMethod': {
      const { classId, method } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId ? { ...c, methods: [...c.methods, method] } : c,
        ),
      };
    }

    case 'updateMethod': {
      const { classId, method } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId
            ? {
                ...c,
                methods: c.methods.map((m) =>
                  m.id === method.id ? { ...m, ...method } : m,
                ),
              }
            : c,
        ),
      };
    }

    case 'deleteMethod': {
      const { classId, methodId } = command.payload;
      return {
        ...model,
        classes: model.classes.map((c) =>
          c.id === classId
            ? {
                ...c,
                methods: c.methods.filter((m) => m.id !== methodId),
              }
            : c,
        ),
      };
    }

    default:
      return model;
  }
}

export function applyCommands(model: UMLModel, commands: UMLCommand[]): UMLModel {
  return commands.reduce((acc, cmd) => applyCommand(acc, cmd), model);
}

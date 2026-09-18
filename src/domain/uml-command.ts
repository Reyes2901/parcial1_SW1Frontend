import type { UMLModel, UMLClass, UMLRelation, UMLAttribute, UMLMethod } from './uml-model';

export type UMLCommandType =
  | 'addClass'
  | 'updateClass'
  | 'deleteClass'
  | 'addRelation'
  | 'updateRelation'
  | 'deleteRelation'
  | 'addAttribute'
  | 'updateAttribute'
  | 'deleteAttribute'
  | 'addMethod'
  | 'updateMethod'
  | 'deleteMethod'
  | 'setModel';

export interface UMLCommandBase {
  type: UMLCommandType;
  requiresConfirmation?: boolean;
  description?: string;
}

export interface AddClassCommand extends UMLCommandBase {
  type: 'addClass';
  payload: UMLClass;
}

export interface UpdateClassCommand extends UMLCommandBase {
  type: 'updateClass';
  payload: Partial<UMLClass> & { id: string };
}

export interface DeleteClassCommand extends UMLCommandBase {
  type: 'deleteClass';
  payload: { id: string };
}

export interface AddRelationCommand extends UMLCommandBase {
  type: 'addRelation';
  payload: UMLRelation;
}

export interface UpdateRelationCommand extends UMLCommandBase {
  type: 'updateRelation';
  payload: Partial<UMLRelation> & { id: string };
}

export interface DeleteRelationCommand extends UMLCommandBase {
  type: 'deleteRelation';
  payload: { id: string };
}

export interface AddAttributeCommand extends UMLCommandBase {
  type: 'addAttribute';
  payload: { classId: string; attribute: UMLAttribute };
}

export interface UpdateAttributeCommand extends UMLCommandBase {
  type: 'updateAttribute';
  payload: { classId: string; attribute: Partial<UMLAttribute> & { id: string } };
}

export interface DeleteAttributeCommand extends UMLCommandBase {
  type: 'deleteAttribute';
  payload: { classId: string; attributeId: string };
}

export interface AddMethodCommand extends UMLCommandBase {
  type: 'addMethod';
  payload: { classId: string; method: UMLMethod };
}

export interface UpdateMethodCommand extends UMLCommandBase {
  type: 'updateMethod';
  payload: { classId: string; method: Partial<UMLMethod> & { id: string } };
}

export interface DeleteMethodCommand extends UMLCommandBase {
  type: 'deleteMethod';
  payload: { classId: string; methodId: string };
}

export interface SetModelCommand extends UMLCommandBase {
  type: 'setModel';
  payload: UMLModel;
}

export type UMLCommand =
  | AddClassCommand
  | UpdateClassCommand
  | DeleteClassCommand
  | AddRelationCommand
  | UpdateRelationCommand
  | DeleteRelationCommand
  | AddAttributeCommand
  | UpdateAttributeCommand
  | DeleteAttributeCommand
  | AddMethodCommand
  | UpdateMethodCommand
  | DeleteMethodCommand
  | SetModelCommand;

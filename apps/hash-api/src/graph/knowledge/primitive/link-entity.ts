import {
  Entity,
  EntityId,
  EntityMetadata,
  EntityPropertiesObject,
  EntityTypeWithMetadata,
  LinkData,
  OwnedById,
} from "@local/hash-subgraph";
import { LinkEntity } from "@local/hash-subgraph/type-system-patch";

import { ImpureGraphFunction } from "../..";
import { isEntityTypeLinkEntityType } from "../../ontology/primitive/entity-type";
import { getLatestEntityById } from "./entity";

export type CreateLinkEntityParams = {
  ownedById: OwnedById;
  properties?: EntityPropertiesObject;
  linkEntityType: EntityTypeWithMetadata;
  leftEntityId: EntityId;
  leftToRightOrder?: number;
  rightEntityId: EntityId;
  rightToLeftOrder?: number;
};

export const isEntityLinkEntity = (entity: Entity): entity is LinkEntity =>
  !!entity.linkData;

/**
 * Create a link entity between a left and a right entity.
 *
 * @param params.ownedById - the id of the account who owns the new link entity
 * @param params.linkEntityType - the link entity type of the link entity
 * @param params.leftEntityId - the ID of the left entity
 * @param params.leftToRightOrder (optional) - the left to right order of the link entity
 * @param params.rightEntityId - the ID of the right entity
 * @param params.rightToLeftOrder (optional) - the right to left order of the link entity
 * @param params.actorId - the id of the account that is creating the link
 */
export const createLinkEntity: ImpureGraphFunction<
  CreateLinkEntityParams,
  Promise<LinkEntity>
> = async (context, authentication, params) => {
  const {
    ownedById,
    linkEntityType,
    leftEntityId,
    leftToRightOrder,
    rightEntityId,
    rightToLeftOrder,
    properties = {},
  } = params;

  if (
    !(await isEntityTypeLinkEntityType(
      context,
      authentication,
      linkEntityType.schema,
    ))
  ) {
    throw new Error(
      `Entity type with ID "${linkEntityType.schema.$id}" is not a link entity type.`,
    );
  }

  const linkData: LinkData = {
    leftEntityId,
    leftToRightOrder,
    rightEntityId,
    rightToLeftOrder,
  };

  const { data: metadata } = await context.graphApi.createEntity(
    authentication.actorId,
    {
      ownedById,
      linkData,
      entityTypeId: linkEntityType.schema.$id,
      properties,
    },
  );

  return {
    metadata: metadata as EntityMetadata,
    properties,
    linkData,
  };
};

/**
 * Update a link entity.
 *
 * @param params.linkEntity - the link entity being updated
 * @param params.properties (optional) - the updated properties object of the link entity
 * @param params.leftToRightOrder (optional) - the updated left to right order of the link entity
 * @param params.rightToLeftOrder (optional) - the updated right to left order of the link entity
 * @param params.actorId - the id of the account that is updating the entity
 */
export const updateLinkEntity: ImpureGraphFunction<
  {
    linkEntity: LinkEntity;
    properties?: EntityPropertiesObject;
    leftToRightOrder?: number;
    rightToLeftOrder?: number;
  },
  Promise<LinkEntity>
> = async ({ graphApi }, { actorId }, params) => {
  const { leftToRightOrder, rightToLeftOrder, linkEntity } = params;

  const properties = params.properties ?? linkEntity.properties;

  const { data: metadata } = await graphApi.updateEntity(actorId, {
    entityId: linkEntity.metadata.recordId.entityId,
    entityTypeId: linkEntity.metadata.entityTypeId,
    properties,
    archived: linkEntity.metadata.archived,
    leftToRightOrder,
    rightToLeftOrder,
  });

  return {
    metadata: metadata as EntityMetadata,
    properties,
    linkData: {
      ...linkEntity.linkData,
      leftToRightOrder,
      rightToLeftOrder,
    },
  };
};

/**
 * Get the right entity of a link entity.
 *
 * @param params.linkEntity - the link entity
 */
export const getLinkEntityRightEntity: ImpureGraphFunction<
  { linkEntity: LinkEntity },
  Promise<Entity>
> = async (ctx, authentication, { linkEntity }) => {
  const rightEntity = await getLatestEntityById(ctx, authentication, {
    entityId: linkEntity.linkData.rightEntityId,
  });

  return rightEntity;
};

/**
 * Get the left entity of a link entity.
 *
 * @param params.linkEntity - the link entity
 */
export const getLinkEntityLeftEntity: ImpureGraphFunction<
  { linkEntity: LinkEntity },
  Promise<Entity>
> = async (ctx, authentication, { linkEntity }) => {
  const leftEntity = await getLatestEntityById(ctx, authentication, {
    entityId: linkEntity.linkData.leftEntityId,
  });

  return leftEntity;
};

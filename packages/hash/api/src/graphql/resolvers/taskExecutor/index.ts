import { JsonObject } from "@blockprotocol/core";
import { ApolloError } from "apollo-server-express";
import { upperFirst, camelCase } from "lodash";
import { singular } from "pluralize";
import { EntityType } from "@blockprotocol/type-system-web";
import { PropertyObject } from "@hashintel/hash-subgraph";
import { CachedEntityTypes, Task } from "../../../task-execution";
import {
  MutationExecuteGithubCheckTaskArgs,
  MutationExecuteGithubDiscoverTaskArgs,
  MutationExecuteGithubReadTaskArgs,
  ResolverFn,
} from "../../apiTypes.gen";
import { GraphQLContext, LoggedInGraphQLContext } from "../../context";
import { EntityModel } from "../../../model";

export const executeDemoTask: ResolverFn<
  Promise<string>,
  {},
  GraphQLContext,
  {}
> = async (_, __, { dataSources: { taskExecutor } }) => {
  if (!taskExecutor) {
    throw new ApolloError(
      "A task-executor wasn't started, so external tasks can't be started",
    );
  } else {
    return await taskExecutor
      .runTask(Task.Demo)
      .then((res) => res.toString())
      .catch((err) => {
        throw new ApolloError(`Task-execution failed: ${err}`);
      });
  }
};

export const executeGithubSpecTask: ResolverFn<
  Promise<string>,
  {},
  GraphQLContext,
  {}
> = async (_, __, { dataSources: { taskExecutor } }) => {
  if (!taskExecutor) {
    throw new ApolloError(
      "A task-executor wasn't started, so external tasks can't be started",
    );
  } else {
    return await taskExecutor
      .runTask(Task.GithubSpec)
      .then((res) => JSON.stringify(res))
      .catch((err: any) => {
        throw new ApolloError(`Task-execution failed: ${err}`);
      });
  }
};

export const executeGithubCheckTask: ResolverFn<
  Promise<string>,
  {},
  GraphQLContext,
  MutationExecuteGithubCheckTaskArgs
> = async (_, { config }, { dataSources: { taskExecutor } }) => {
  if (!taskExecutor) {
    throw new ApolloError(
      "A task-executor wasn't started, so external tasks can't be started",
    );
  } else {
    return await taskExecutor
      .runTask(Task.GithubCheck, config)
      .then((res) => JSON.stringify(res))
      .catch((err) => {
        throw new ApolloError(`Task-execution failed: ${err}`);
      });
  }
};

/** @todo - Make Airbyte types available in api package */
type AirbyteCatalog = Array<{
  name?: string;
  json_schema?: JsonObject;
}>;

type AirbyteRecords = Array<{
  /**
   * the name of this record's stream
   */
  stream: string;
  /**
   * the record data
   */
  data: {
    [k: string]: unknown;
  };
  /**
   * when the data was emitted from the source. epoch in millisecond.
   */
  emitted_at: number;
  /**
   * the namespace of this record's stream
   */
  namespace?: string;
  [k: string]: unknown;
}>;

const streamNameToEntityTypeName = (name: string) => {
  const sanitizedName = singular(upperFirst(camelCase(name)));
  return `Github${sanitizedName}`;
};

export const executeGithubDiscoverTask: ResolverFn<
  Promise<string>,
  {},
  LoggedInGraphQLContext,
  MutationExecuteGithubDiscoverTaskArgs
> = async (
  _,
  { config },
  { dataSources: { graphApi, taskExecutor }, userModel, logger },
) => {
  if (!taskExecutor) {
    throw new ApolloError(
      "A task-executor wasn't started, so external tasks can't be started",
    );
  } else {
    try {
      const catalog: AirbyteCatalog = await taskExecutor.runTask(
        Task.GithubDiscover,
        config,
      );

      const existingEntityChecker = await CachedEntityTypes(
        graphApi,
        userModel,
      );

      for (const message of catalog) {
        if (!message.name || !message.json_schema) {
          continue;
        }

        const entityTypeName = streamNameToEntityTypeName(message.name);

        if (existingEntityChecker.getExisting(entityTypeName) === undefined) {
          await existingEntityChecker.createNew(
            entityTypeName,
            /** @todo - this cast is unsafe, we need to update the logic to convert the JSON schema to a valid
             *    entity type
             */
            message.json_schema as unknown as EntityType,
          );
          logger.debug(`Created a new EntityType: ${entityTypeName}`);
        }
      }

      return JSON.stringify(catalog);
    } catch (err: any) {
      throw new ApolloError(`Task-execution failed: ${err}`);
    }
  }
};

export const executeGithubReadTask: ResolverFn<
  Promise<string>,
  {},
  LoggedInGraphQLContext,
  MutationExecuteGithubReadTaskArgs
> = async (
  _,
  { config },
  { dataSources: { graphApi, taskExecutor }, userModel, logger },
) => {
  if (!taskExecutor) {
    throw new ApolloError(
      "A task-executor wasn't started, so external tasks can't be started",
    );
  } else {
    const createdEntities = [];
    try {
      const airbyteRecords: AirbyteRecords = await taskExecutor.runTask(
        Task.GithubRead,
        config,
      );
      logger.debug(`Received ${airbyteRecords.length} records from Github`);

      const existingEntityChecker = await CachedEntityTypes(
        graphApi,
        userModel,
      );
      for (const record of airbyteRecords) {
        const entityTypeName = streamNameToEntityTypeName(record.stream);
        /** @todo - Check if entity already exists */
        const entityTypeModel =
          existingEntityChecker.getExisting(entityTypeName);
        if (!entityTypeModel) {
          throw new Error(
            `Couldn't find EntityType for ingested data with name: ${entityTypeName}`,
          );
        }

        /** @todo - check primary key to see if entity already exists */
        // Insert the entity
        const entityModel = await EntityModel.create(graphApi, {
          ownedById: userModel.entityUuid,
          actorId: userModel.entityUuid,
          entityTypeModel,
          properties: record.data as PropertyObject,
        });

        createdEntities.push(entityModel.baseId);
      }

      logger.debug(`Inserted ${createdEntities.length} entities from Github`);
      return JSON.stringify({ createdEntities });
    } catch (err: any) {
      throw new ApolloError(`Task-execution failed: ${err}`);
    }
  }
};

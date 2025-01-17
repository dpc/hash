import { deleteKratosIdentity } from "@apps/hash-api/src/auth/ory-kratos";
import {
  ensureSystemGraphIsInitialized,
  ImpureGraphContext,
} from "@apps/hash-api/src/graph";
import { createEntity } from "@apps/hash-api/src/graph/knowledge/primitive/entity";
import {
  Block,
  createBlock,
  getBlockById,
  getBlockData,
  updateBlockDataEntity,
} from "@apps/hash-api/src/graph/knowledge/system-types/block";
import { User } from "@apps/hash-api/src/graph/knowledge/system-types/user";
import { createEntityType } from "@apps/hash-api/src/graph/ontology/primitive/entity-type";
import { systemUser } from "@apps/hash-api/src/graph/system-user";
import { generateSystemEntityTypeSchema } from "@apps/hash-api/src/graph/util";
import { TypeSystemInitializer } from "@blockprotocol/type-system";
import { Logger } from "@local/hash-backend-utils/logger";
import { generateTypeId } from "@local/hash-isomorphic-utils/ontology-types";
import {
  Entity,
  EntityTypeWithMetadata,
  OwnedById,
} from "@local/hash-subgraph";

import { resetGraph } from "../../../test-server";
import { createTestImpureGraphContext, createTestUser } from "../../../util";

jest.setTimeout(60000);

const logger = new Logger({
  mode: "dev",
  level: "debug",
  serviceName: "integration-tests",
});

const graphContext: ImpureGraphContext = createTestImpureGraphContext();

describe("Block", () => {
  let testUser: User;

  let testBlock: Block;

  const testBlockComponentId = "test-component-id";

  let testBlockDataEntity: Entity;

  let dummyEntityType: EntityTypeWithMetadata;

  beforeAll(async () => {
    await TypeSystemInitializer.initialize();
    await ensureSystemGraphIsInitialized({ logger, context: graphContext });

    testUser = await createTestUser(graphContext, "blockTest", logger);
    const authentication = { actorId: testUser.accountId };

    /**
     * @todo: rename to something more representative of a real-world use-case,
     * once the exact role of the block data entity's entity type is known.
     */
    dummyEntityType = await createEntityType(graphContext, authentication, {
      ownedById: testUser.accountId as OwnedById,
      schema: generateSystemEntityTypeSchema({
        entityTypeId: generateTypeId({
          namespace: testUser.shortname!,
          kind: "entity-type",
          title: "Dummy",
        }),
        title: "Dummy",
        properties: [],
        outgoingLinks: [],
      }),
    });

    testBlockDataEntity = await createEntity(graphContext, authentication, {
      ownedById: testUser.accountId as OwnedById,
      properties: {},
      entityTypeId: dummyEntityType.schema.$id,
    });
  });

  afterAll(async () => {
    await deleteKratosIdentity({
      kratosIdentityId: testUser.kratosIdentityId,
    });
    await deleteKratosIdentity({
      kratosIdentityId: systemUser.kratosIdentityId,
    });

    await resetGraph();
  });

  it("can create a Block", async () => {
    const authentication = { actorId: testUser.accountId };

    testBlock = await createBlock(graphContext, authentication, {
      ownedById: testUser.accountId as OwnedById,
      componentId: testBlockComponentId,
      blockData: testBlockDataEntity,
    });
  });

  it("can get a block by its entity id", async () => {
    const authentication = { actorId: testUser.accountId };

    const fetchedBlock = await getBlockById(graphContext, authentication, {
      entityId: testBlock.entity.metadata.recordId.entityId,
    });

    expect(fetchedBlock).not.toBeNull();

    expect(fetchedBlock.entity).toEqual(testBlock.entity);
  });

  it("can get the block's data entity", async () => {
    const authentication = { actorId: testUser.accountId };

    const fetchedBlockData = await getBlockData(graphContext, authentication, {
      block: testBlock,
    });

    expect(fetchedBlockData).toEqual(testBlockDataEntity);
  });

  it("can update the block data entity", async () => {
    const authentication = { actorId: testUser.accountId };

    const newBlockDataEntity = await createEntity(
      graphContext,
      authentication,
      {
        ownedById: testUser.accountId as OwnedById,
        properties: {},
        entityTypeId: dummyEntityType.schema.$id,
      },
    );

    expect(testBlockDataEntity).not.toEqual(newBlockDataEntity);
    expect(
      await getBlockData(graphContext, authentication, { block: testBlock }),
    ).toEqual(testBlockDataEntity);

    await updateBlockDataEntity(graphContext, authentication, {
      block: testBlock,
      newBlockDataEntity,
    });

    expect(
      await getBlockData(graphContext, authentication, { block: testBlock }),
    ).toEqual(newBlockDataEntity);
  });

  it("cannot update the block data entity to the same data entity", async () => {
    const authentication = { actorId: testUser.accountId };

    const currentDataEntity = await getBlockData(graphContext, authentication, {
      block: testBlock,
    });

    await expect(
      updateBlockDataEntity(graphContext, authentication, {
        block: testBlock,
        newBlockDataEntity: currentDataEntity,
      }),
    ).rejects.toThrow(/already has a linked block data entity with entity id/);
  });
});

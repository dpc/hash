import { getRequiredEnv } from "@hashintel/hash-backend-utils/environment";
import { createGraphClient } from "@hashintel/hash-api/src/graph";
import { Logger } from "@hashintel/hash-backend-utils/logger";

import { PropertyType } from "@blockprotocol/type-system-web";
import {
  DataTypeModel,
  PropertyTypeModel,
} from "@hashintel/hash-api/src/model";
import { createTestUser } from "../../util";

jest.setTimeout(60000);

const logger = new Logger({
  mode: "dev",
  level: "debug",
  serviceName: "integration-tests",
});

const graphApiHost = getRequiredEnv("HASH_GRAPH_API_HOST");
const graphApiPort = parseInt(getRequiredEnv("HASH_GRAPH_API_PORT"), 10);

const graphApi = createGraphClient(logger, {
  host: graphApiHost,
  port: graphApiPort,
});

let ownedById: string;
let textDataTypeModel: DataTypeModel;
let propertyTypeSchema: Omit<PropertyType, "$id">;

beforeAll(async () => {
  const testUser = await createTestUser(graphApi, "property-type-test", logger);

  ownedById = testUser.entityId;

  textDataTypeModel = await DataTypeModel.create(graphApi, {
    ownedById,
    schema: {
      kind: "dataType",
      title: "Text",
      type: "string",
    },
  });

  propertyTypeSchema = {
    kind: "propertyType",
    title: "A property type",
    pluralTitle: "Multiple property types",
    oneOf: [
      {
        $ref: textDataTypeModel.schema.$id,
      },
    ],
  };
});

describe("Property type CRU", () => {
  let createdPropertyTypeModel: PropertyTypeModel;

  it("can create a property type", async () => {
    createdPropertyTypeModel = await PropertyTypeModel.create(graphApi, {
      ownedById,
      schema: propertyTypeSchema,
    });
  });

  it("can read a property type", async () => {
    const fetchedPropertyType = await PropertyTypeModel.get(graphApi, {
      propertyTypeId: createdPropertyTypeModel.schema.$id,
    });

    expect(fetchedPropertyType.schema).toEqual(createdPropertyTypeModel.schema);
  });

  const updatedTitle = "New test!";

  it("can update a property type", async () => {
    await createdPropertyTypeModel
      .update(graphApi, {
        schema: {
          ...propertyTypeSchema,
          title: updatedTitle,
        },
      })
      .catch((err) => Promise.reject(err.data));
  });
});
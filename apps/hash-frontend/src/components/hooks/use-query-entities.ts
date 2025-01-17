import { useQuery } from "@apollo/client";
import { VersionedUrl } from "@blockprotocol/type-system";
import {
  EntityRootType,
  GraphResolveDepths,
  Subgraph,
} from "@local/hash-subgraph";
import { useMemo } from "react";

import {
  QueryEntitiesQuery,
  QueryEntitiesQueryVariables,
} from "../../graphql/api-types.gen";
import { queryEntitiesQuery } from "../../graphql/queries/knowledge/entity.queries";

export const useQueryEntities = ({
  excludeEntityTypeIds,
  includeEntityTypeIds,
  graphResolveDepths,
}: {
  excludeEntityTypeIds?: VersionedUrl[];
  includeEntityTypeIds?: VersionedUrl[];
  graphResolveDepths?: Partial<GraphResolveDepths>;
}) => {
  if (excludeEntityTypeIds && includeEntityTypeIds) {
    throw new Error(
      "Passing both excludeEntityTypeIds and includeEntityTypeIds is currently unsupported because the query syntax only supports a single AND or OR operator across all filters.",
    );
  }

  const response = useQuery<QueryEntitiesQuery, QueryEntitiesQueryVariables>(
    queryEntitiesQuery,
    {
      variables: {
        operation: {
          multiFilter: {
            filters: [
              ...(excludeEntityTypeIds ?? []).map((entityTypeId) => ({
                field: ["metadata", "entityTypeId"],
                operator: "DOES_NOT_EQUAL" as const,
                value: entityTypeId,
              })),
              ...(includeEntityTypeIds ?? []).map((entityTypeId) => ({
                field: ["metadata", "entityTypeId"],
                operator: "EQUALS" as const,
                value: entityTypeId,
              })),
            ],
            operator:
              excludeEntityTypeIds || !includeEntityTypeIds?.length
                ? "AND"
                : "OR",
          },
        },
        constrainsValuesOn: { outgoing: 0 },
        constrainsPropertiesOn: { outgoing: 0 },
        constrainsLinksOn: { outgoing: 0 },
        constrainsLinkDestinationsOn: { outgoing: 0 },
        inheritsFrom: { outgoing: 255 },
        isOfType: { outgoing: 1 },
        hasLeftEntity: { incoming: 0, outgoing: 0 },
        hasRightEntity: { incoming: 0, outgoing: 0 },
        ...graphResolveDepths,
      },
      fetchPolicy: "cache-and-network",
    },
  );

  return useMemo(
    () => ({
      entitiesSubgraph: response.data?.queryEntities as
        | Subgraph<EntityRootType>
        | undefined,
      ...response,
    }),
    [response],
  );
};

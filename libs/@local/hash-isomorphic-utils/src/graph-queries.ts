import { GraphResolveDepths } from "@blockprotocol/graph";
import { VersionedUrl } from "@blockprotocol/type-system";
import {
  DataTypeQueryToken,
  EntityQueryToken,
  EntityTypeQueryToken,
  Filter,
  PropertyTypeQueryToken,
  Selector,
} from "@local/hash-graph-client";
import { QueryTemporalAxesUnresolved } from "@local/hash-subgraph";
import { componentsFromVersionedUrl } from "@local/hash-subgraph/type-system-patch";

export const zeroedGraphResolveDepths: GraphResolveDepths = {
  inheritsFrom: { outgoing: 0 },
  constrainsValuesOn: { outgoing: 0 },
  constrainsPropertiesOn: { outgoing: 0 },
  constrainsLinksOn: { outgoing: 0 },
  constrainsLinkDestinationsOn: { outgoing: 0 },
  isOfType: { outgoing: 0 },
  hasLeftEntity: { incoming: 0, outgoing: 0 },
  hasRightEntity: { incoming: 0, outgoing: 0 },
};

/**
 * Slices the datastore across this instant of time.
 *
 * Used to be passed as `temporalAxes` to structural queries.
 */
export const currentTimeInstantTemporalAxes: QueryTemporalAxesUnresolved = {
  pinned: {
    axis: "transactionTime",
    timestamp: null,
  },
  variable: {
    axis: "decisionTime",
    interval: {
      start: null,
      end: null,
    },
  },
};

/**
 * According to the database's most up-to-date knowledge (transaction time),
 * return the full history of entities and the times at which those decisions
 * were made.
 *
 * Used to be passed as `temporalAxes` to structural queries.
 */
export const fullDecisionTimeAxis: QueryTemporalAxesUnresolved = {
  pinned: {
    axis: "transactionTime",
    timestamp: null,
  },
  variable: {
    axis: "decisionTime",
    interval: {
      start: {
        kind: "unbounded",
      },
      end: null,
    },
  },
};

/**
 * Generates a query filter to match a type, given its versionedUrl.
 *
 * @param versionedUrl
 * @param [options] configuration of the returned filter
 * @param [options.ignoreParents] don't check the type's parents for a match against the versionedUrl
 * @param [options.pathPrefix] the path to the thing to match the type of, if it's not the root of the query
 *     @example ["outgoingLinks", "rightEntity"] to filter query results to things with a linked entity of the given type
 */
export const generateVersionedUrlMatchingFilter = (
  versionedUrl: VersionedUrl,
  options?: {
    ignoreParents?: boolean;
    pathPrefix?: (
      | DataTypeQueryToken
      | EntityQueryToken
      | EntityTypeQueryToken
      | PropertyTypeQueryToken
      | Selector
    )[];
  },
): Filter => {
  const { ignoreParents = false, pathPrefix = [] } = options ?? {};

  const { baseUrl, version } = componentsFromVersionedUrl(versionedUrl);

  const basePath = [
    ...pathPrefix,
    ignoreParents ? "type(inheritanceDepth = 0)" : "type",
  ];

  return {
    all: [
      {
        equal: [{ path: [...basePath, "baseUrl"] }, { parameter: baseUrl }],
      },
      {
        equal: [{ path: [...basePath, "version"] }, { parameter: version }],
      },
    ],
  };
};

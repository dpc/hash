import { updateEntityProperties } from "../../../../graph/knowledge/primitive/entity";
import {
  getPageById,
  getPageFromEntity,
} from "../../../../graph/knowledge/system-types/page";
import { SYSTEM_TYPES } from "../../../../graph/system-types";
import { MutationUpdatePageArgs, ResolverFn } from "../../../api-types.gen";
import { LoggedInGraphQLContext } from "../../../context";
import { dataSourcesToImpureGraphContext } from "../../util";
import { mapPageToGQL, UnresolvedPageGQL } from "../graphql-mapping";

export const updatePageResolver: ResolverFn<
  Promise<UnresolvedPageGQL>,
  {},
  LoggedInGraphQLContext,
  MutationUpdatePageArgs
> = async (
  _,
  { entityId, updatedProperties },
  { dataSources, authentication },
) => {
  const context = dataSourcesToImpureGraphContext(dataSources);

  const page = await getPageById(context, authentication, { entityId });

  const updatedPageEntity = await updateEntityProperties(
    context,
    authentication,
    {
      entity: page.entity,
      updatedProperties: Object.entries(updatedProperties).map(
        ([propertyName, value]) => ({
          propertyTypeBaseUrl:
            SYSTEM_TYPES.propertyType[
              propertyName as keyof MutationUpdatePageArgs["updatedProperties"]
            ].metadata.recordId.baseUrl,
          value: value ?? undefined,
        }),
      ),
    },
  );

  return mapPageToGQL(getPageFromEntity({ entity: updatedPageEntity }));
};

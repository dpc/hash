import { useQuery } from "@apollo/client";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@hashintel/design-system";
import {
  GetPageQuery,
  GetPageQueryVariables,
} from "@local/hash-graphql-shared/graphql/api-types.gen";
import { getPageQuery } from "@local/hash-graphql-shared/queries/page.queries";
import { HashBlock } from "@local/hash-isomorphic-utils/blocks";
import { types } from "@local/hash-isomorphic-utils/ontology-types";
import {
  OrgProperties,
  UserProperties,
} from "@local/hash-isomorphic-utils/system-types/shared";
import { isSafariBrowser } from "@local/hash-isomorphic-utils/util";
import {
  Entity,
  EntityId,
  entityIdFromOwnedByIdAndEntityUuid,
  EntityMetadata,
  EntityRootType,
  extractEntityUuidFromEntityId,
  extractOwnedByIdFromEntityId,
  OwnedById,
  Subgraph,
} from "@local/hash-subgraph";
import { getRoots } from "@local/hash-subgraph/stdlib";
import { Box, Collapse, Container, Typography } from "@mui/material";
import { formatDistance } from "date-fns";
import { keyBy } from "lodash";
import { GetServerSideProps } from "next";
import { Router, useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlockLoadedProvider } from "../../blocks/on-block-loaded";
// import { useCollabPositionReporter } from "../../blocks/page/collab/use-collab-position-reporter";
// import { useCollabPositions } from "../../blocks/page/collab/use-collab-positions";
// import { useCollabPositionTracking } from "../../blocks/page/collab/use-collab-position-tracking";
import { PageBlock } from "../../blocks/page/page-block";
import {
  PageContextProvider,
  usePageContext,
} from "../../blocks/page/page-context";
import {
  PageSectionContainer,
  PageSectionContainerProps,
} from "../../blocks/page/page-section-container";
import { PageTitle } from "../../blocks/page/page-title/page-title";
import { UserBlocksProvider } from "../../blocks/user-blocks";
import {
  AccountPagesInfo,
  useAccountPages,
} from "../../components/hooks/use-account-pages";
import { useArchivePage } from "../../components/hooks/use-archive-page";
import { usePageComments } from "../../components/hooks/use-page-comments";
import { useUsers } from "../../components/hooks/use-users";
import { PageIcon, pageIconVariantSizes } from "../../components/page-icon";
import { PageIconButton } from "../../components/page-icon-button";
import { PageLoadingState } from "../../components/page-loading-state";
import { CollabPositionProvider } from "../../contexts/collab-position-context";
import { QueryEntitiesQuery } from "../../graphql/api-types.gen";
import { queryEntitiesQuery } from "../../graphql/queries/knowledge/entity.queries";
import { apolloClient } from "../../lib/apollo-client";
import { constructPageRelativeUrl } from "../../lib/routes";
import {
  constructMinimalOrg,
  constructMinimalUser,
  MinimalOrg,
  MinimalUser,
} from "../../lib/user-and-org";
import { entityHasEntityTypeByVersionedUrlFilter } from "../../shared/filters";
import { BoxArchiveIcon } from "../../shared/icons/box-archive-icon";
import { CalendarIcon } from "../../shared/icons/calendar-icon";
import { UserIcon } from "../../shared/icons/user-icon";
import { getLayoutWithSidebar, NextPageWithLayout } from "../../shared/layout";
import { HEADER_HEIGHT } from "../../shared/layout/layout-with-header/page-header";
import { useIsReadonlyModeForResource } from "../../shared/readonly-mode";
import {
  isPageParsedUrlQuery,
  parsePageUrlQueryParams,
} from "../../shared/routing/route-page-info";
import { Link } from "../../shared/ui";
import { Button } from "../../shared/ui/button";
import {
  TOP_CONTEXT_BAR_HEIGHT,
  TopContextBar,
} from "../shared/top-context-bar";
import { CanvasPageBlock } from "./[page-slug].page/canvas-page";

type PageProps = {
  pageWorkspace: MinimalUser | MinimalOrg;
  pageEntityId: EntityId;
  blocks: HashBlock[];
};

/**
 * This is used to fetch the metadata associated with blocks that're preloaded
 * ahead of time so that the client doesn't need to
 *
 * @todo Include blocks present in the document in this, and remove fetching of these in canvas-page
 */
export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  req,
  params,
}) => {
  // Fetching block metadata can significantly slow down the server render, so disabling for now
  // const fetchedBlocks = await Promise.all(
  //   defaultBlockComponentIds.map((componentId) => fetchBlock(componentId)),
  // );

  if (!params || !isPageParsedUrlQuery(params)) {
    throw new Error(
      "Invalid page URL query params passed to `getServerSideProps`.",
    );
  }

  const { workspaceShortname, pageEntityUuid } =
    parsePageUrlQueryParams(params);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- @todo improve logic or types to remove this comment
  const { cookie } = req.headers ?? {};

  const workspacesSubgraph = (await apolloClient
    .query<QueryEntitiesQuery>({
      query: queryEntitiesQuery,
      variables: {
        operation: {
          multiFilter: {
            filters: [
              entityHasEntityTypeByVersionedUrlFilter(
                types.entityType.user.entityTypeId,
              ),
              entityHasEntityTypeByVersionedUrlFilter(
                types.entityType.org.entityTypeId,
              ),
            ],
            operator: "OR",
          },
        },
        constrainsValuesOn: { outgoing: 0 },
        constrainsPropertiesOn: { outgoing: 0 },
        constrainsLinksOn: { outgoing: 0 },
        constrainsLinkDestinationsOn: { outgoing: 0 },
        isOfType: { outgoing: 0 },
        hasLeftEntity: { incoming: 0, outgoing: 0 },
        hasRightEntity: { incoming: 0, outgoing: 0 },
      },
      context: { headers: { cookie } },
    })
    .then(({ data }) => data.queryEntities)) as Subgraph<EntityRootType>;

  const workspaces = getRoots(workspacesSubgraph).map((entity) =>
    entity.metadata.entityTypeId === types.entityType.user.entityTypeId
      ? constructMinimalUser({
          userEntity: entity as Entity<UserProperties>,
        })
      : constructMinimalOrg({
          orgEntity: entity as Entity<OrgProperties>,
        }),
  );

  /**
   * @todo: filtering all workspaces by their shortname should not be happening
   * client side. This could be addressed by exposing structural querying
   * to the frontend.
   *
   * @see https://app.asana.com/0/1201095311341924/1202863271046362/f
   */
  const pageWorkspace = workspaces.find(
    (workspace) => workspace.shortname === workspaceShortname,
  );

  if (!pageWorkspace) {
    throw new Error(
      `Could not find page workspace with shortname "${workspaceShortname}".`,
    );
  }

  const pageOwnedById = pageWorkspace.accountId as OwnedById;

  const pageEntityId = entityIdFromOwnedByIdAndEntityUuid(
    pageOwnedById,
    pageEntityUuid,
  );

  return {
    props: {
      pageWorkspace,
      blocks: [],
      pageEntityId,
    },
  };
};

export const PageNotificationBanner = ({
  archived = false,
  pageMetadata,
  onUnarchived,
}: {
  archived: boolean;
  pageMetadata: EntityMetadata;
  onUnarchived: () => void;
}) => {
  const { pageEntityId } = usePageContext();
  const { unarchivePage } = useArchivePage();

  const { provenance, temporalVersioning } = pageMetadata;

  const { users } = useUsers();

  const archivedByAccountId = provenance.recordCreatedById;

  const archivedByUser = users?.find(
    ({ accountId }) => archivedByAccountId === accountId,
  );

  const archivedAt = useMemo(
    () => new Date(temporalVersioning.decisionTime.start.limit),
    [temporalVersioning],
  );

  const timeSinceArchived = useMemo(
    () => formatDistance(archivedAt, new Date()),
    [archivedAt],
  );

  const archivedAtTimestamp = useMemo(() => {
    const year = archivedAt.getUTCFullYear();
    const month = String(archivedAt.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(archivedAt.getUTCDate()).padStart(2, "0");
    const hours = String(archivedAt.getUTCHours()).padStart(2, "0");
    const minutes = String(archivedAt.getUTCMinutes()).padStart(2, "0");
    const seconds = String(archivedAt.getUTCSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }, [archivedAt]);

  return (
    <Collapse in={archived}>
      <Box
        sx={({ palette }) => ({
          background: palette.gray[10],
        })}
      >
        <Container
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            maxWidth: {
              md: 860,
            },
          }}
        >
          <Typography sx={{ fontSize: 14 }}>
            <BoxArchiveIcon
              sx={{
                fontSize: 14,
                position: "relative",
                top: 1,
                marginRight: 1.5,
                color: ({ palette }) => palette.gray[60],
              }}
            />
            <strong>This page was archived</strong>
            {archivedByUser ? (
              <>
                {" by "}
                <Link
                  href={`/@${archivedByUser.shortname}`}
                  sx={{
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <UserIcon
                    sx={{
                      fontSize: 14,
                      position: "relative",
                      top: 1,
                      marginRight: 0.75,
                    }}
                  />
                  {archivedByUser.preferredName}
                </Link>
              </>
            ) : null}
            {" at "}
            <Box component="span">
              <CalendarIcon
                sx={{
                  fontSize: 14,
                  position: "relative",
                  top: 1,
                  marginRight: 0.75,
                }}
              />
              <strong>{archivedAtTimestamp}</strong> ({timeSinceArchived} ago).
            </Box>
          </Typography>
          <Button
            variant="secondary"
            sx={({ palette }) => ({
              marginLeft: 1.5,
              minWidth: 0,
              minHeight: 0,
              paddingY: 0.5,
              paddingX: 2,
              background: palette.common.white,
              borderColor: palette.gray[30],
              color: palette.common.black,
              fontWeight: 400,
              fontSize: 14,
              "&:hover": {
                background: palette.blue[20],
                borderColor: palette.blue[50],
                color: palette.blue[100],
                "& svg": {
                  color: palette.blue[50],
                },
              },
            })}
            startIcon={
              <FontAwesomeIcon
                sx={{ fontSize: 14, color: ({ palette }) => palette.gray[50] }}
                icon={faRotateRight}
              />
            }
            onClick={async () => {
              await unarchivePage(pageEntityId);
              onUnarchived();
            }}
          >
            Restore
          </Button>
        </Container>
      </Box>
    </Collapse>
  );
};

const generateCrumbsFromPages = ({
  pages = [],
  pageEntityId,
  ownerShortname,
}: {
  pageEntityId: EntityId;
  pages: AccountPagesInfo["data"];
  ownerShortname: string;
}) => {
  const pageMap = new Map(
    pages.map((page) => [page.metadata.recordId.entityId, page]),
  );

  let currentPage = pageMap.get(pageEntityId);
  let arr = [];

  while (currentPage) {
    const currentPageEntityId = currentPage.metadata.recordId.entityId;

    const pageEntityUuid = extractEntityUuidFromEntityId(currentPageEntityId);
    arr.push({
      title: currentPage.title,
      href: constructPageRelativeUrl({
        workspaceShortname: ownerShortname,
        pageEntityUuid,
      }),
      id: currentPageEntityId,
      icon: <PageIcon icon={currentPage.icon} size="small" />,
    });

    if (currentPage.parentPage) {
      currentPage = pageMap.get(
        currentPage.parentPage.metadata.recordId.entityId,
      );
    } else {
      break;
    }
  }

  arr = arr.reverse();

  return arr;
};

const Page: NextPageWithLayout<PageProps> = ({
  blocks,
  pageEntityId,
  pageWorkspace,
}) => {
  const pageOwnedById = extractOwnedByIdFromEntityId(pageEntityId);

  const { asPath, query } = useRouter();
  const canvasPage = query.canvas;

  const routeHash = asPath.split("#")[1] ?? "";

  const { data: accountPages } = useAccountPages(pageOwnedById, true);

  const blocksMap = useMemo(() => {
    return keyBy(blocks, (block) => block.meta.componentId);
  }, [blocks]);

  const [pageState, setPageState] = useState<"normal" | "transferring">(
    "normal",
  );

  const [displayPageRestoredMessage, setDisplayPageRestoredMessage] =
    useState(false);

  const { data, error, loading } = useQuery<
    GetPageQuery,
    GetPageQueryVariables
  >(getPageQuery, { variables: { entityId: pageEntityId } });

  const pageHeaderRef = useRef<HTMLElement>();
  const isReadonlyMode = useIsReadonlyModeForResource(pageOwnedById);

  // Collab position tracking is disabled.
  // const collabPositions = useCollabPositions(accountId, pageEntityId);
  // const reportPosition = useCollabPositionReporter(accountId, pageEntityId);
  // useCollabPositionTracking(reportPosition);

  useEffect(() => {
    const handleRouteChange = () => {
      if (pageState !== "normal") {
        setPageState("normal");
      }
    };

    Router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      Router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [pageState]);

  const scrollToTop = () => {
    if (!pageHeaderRef.current) {
      return;
    }
    pageHeaderRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const { data: pageComments } = usePageComments(pageEntityId);

  const pageSectionContainerProps: PageSectionContainerProps = {
    pageComments,
    readonly: isReadonlyMode,
  };

  if (pageState === "transferring") {
    return (
      <PageSectionContainer {...pageSectionContainerProps}>
        <h1>Transferring you to the new page...</h1>
      </PageSectionContainer>
    );
  }

  if (loading) {
    return (
      <PageSectionContainer {...pageSectionContainerProps}>
        <PageLoadingState />
      </PageSectionContainer>
    );
  }

  if (error) {
    return (
      <PageSectionContainer {...pageSectionContainerProps}>
        <h1>Error: {error.message}</h1>
      </PageSectionContainer>
    );
  }

  if (!data) {
    return (
      <PageSectionContainer {...pageSectionContainerProps}>
        <h1>No data loaded.</h1>
      </PageSectionContainer>
    );
  }

  const { title, icon, archived, contents, metadata } = data.page;

  const isSafari = isSafariBrowser();
  const pageTitle = isSafari && icon ? `${icon} ${title}` : title;

  return (
    <>
      <NextSeo
        key={pageEntityId}
        title={pageTitle || "Untitled"}
        additionalLinkTags={
          icon
            ? [
                {
                  rel: "icon",
                  href: `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>
          ${icon}</text></svg>`,
                },
              ]
            : []
        }
      />

      <PageContextProvider pageEntityId={pageEntityId}>
        <Box
          sx={({ palette, zIndex }) => ({
            position: "sticky",
            top: 0,
            zIndex: zIndex.appBar,
            backgroundColor: palette.white,
          })}
        >
          <TopContextBar
            crumbs={generateCrumbsFromPages({
              pages: accountPages,
              pageEntityId: data.page.metadata.recordId.entityId,
              ownerShortname: pageWorkspace.shortname!,
            })}
            displayPageRestoredMessage={displayPageRestoredMessage}
            isBlockPage
            scrollToTop={scrollToTop}
          />
          <PageNotificationBanner
            archived={!!archived}
            pageMetadata={metadata}
            onUnarchived={() => {
              setDisplayPageRestoredMessage(true);
              setTimeout(() => {
                setDisplayPageRestoredMessage(false);
              }, 5000);
            }}
          />
        </Box>

        {!canvasPage && (
          <PageSectionContainer {...pageSectionContainerProps}>
            <Box position="relative">
              <PageIconButton
                entityId={pageEntityId}
                icon={icon}
                readonly={isReadonlyMode}
                sx={({ breakpoints }) => ({
                  mb: 2,
                  [breakpoints.up(pageComments.length ? "xl" : "lg")]: {
                    position: "absolute",
                    top: 0,
                    right: "calc(100% + 24px)",
                  },
                })}
              />
              <Box
                component="header"
                ref={pageHeaderRef}
                sx={{
                  scrollMarginTop:
                    HEADER_HEIGHT +
                    TOP_CONTEXT_BAR_HEIGHT +
                    pageIconVariantSizes.medium.container,
                }}
              >
                <PageTitle
                  value={title}
                  pageEntityId={pageEntityId}
                  readonly={isReadonlyMode}
                />
                {/*
            Commented out Version Dropdown and Transfer Page buttons.
            They will most likely be added back when new designs
            for them have been added
          */}
                {/* <div style={{"marginRight":"1rem"}}>
            <label>Version</label>
            <div>
              <VersionDropdown
                value={data.page.entityVersionId}
                versions={data.page.history ?? []}
                onChange={(changedVersionId) => {
                  void router.push(
                    `/@${ownerShortname}/${pageEntityId}?version=${changedVersionId}`,
                  );
                }}
              />
            </div>
          </div>
          <div>
            <label>Transfer Page</label>
            <div>
              <PageTransferDropdown
                accountId={accountId}
                pageEntityId={pageEntityId}
                setPageState={setPageState}
              />
            </div>
          </div> */}
              </Box>
            </Box>
          </PageSectionContainer>
        )}

        <CollabPositionProvider value={[]}>
          <UserBlocksProvider value={blocksMap}>
            <BlockLoadedProvider routeHash={routeHash}>
              {canvasPage ? (
                <CanvasPageBlock contents={contents} />
              ) : (
                <PageBlock
                  accountId={pageWorkspace.accountId}
                  contents={contents}
                  pageComments={pageComments}
                  entityId={pageEntityId}
                />
              )}
            </BlockLoadedProvider>
          </UserBlocksProvider>
        </CollabPositionProvider>
      </PageContextProvider>
    </>
  );
};

Page.getLayout = (page) =>
  getLayoutWithSidebar(page, {
    fullWidth: true,
    grayBackground: false,
  });

export default Page;

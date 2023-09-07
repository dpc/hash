//! Web routes for CRU operations on entities.

use std::sync::Arc;

use authorization::AuthorizationApi;
use axum::{http::StatusCode, routing::post, Extension, Router};
use futures::TryFutureExt;
use graph_types::{
    knowledge::{
        entity::{
            Entity, EntityEditionId, EntityId, EntityMetadata, EntityProperties, EntityRecordId,
            EntityTemporalMetadata, EntityUuid,
        },
        link::{EntityLinkOrder, LinkData, LinkOrder},
    },
    provenance::OwnedById,
};
use serde::{Deserialize, Serialize};
use type_system::url::VersionedUrl;
use utoipa::{OpenApi, ToSchema};

use crate::{
    api::rest::{
        api_resource::RoutedResource, json::Json, report_to_status_code,
        utoipa_typedef::subgraph::Subgraph, AuthenticatedUserHeader,
    },
    knowledge::EntityQueryToken,
    store::{
        error::{EntityDoesNotExist, RaceConditionOnUpdate},
        EntityStore, StorePool,
    },
    subgraph::query::{EntityStructuralQuery, StructuralQuery},
};

#[derive(OpenApi)]
#[openapi(
    paths(
        create_entity,
        get_entities_by_query,
        update_entity,
    ),
    components(
        schemas(
            CreateEntityRequest,
            UpdateEntityRequest,
            EntityQueryToken,
            EntityStructuralQuery,

            Entity,
            EntityUuid,
            EntityId,
            EntityEditionId,
            EntityMetadata,
            EntityLinkOrder,
            EntityProperties,
            EntityRecordId,
            EntityTemporalMetadata,
            EntityQueryToken,
            LinkData,
            LinkOrder,
        )
    ),
    tags(
        (name = "Entity", description = "entity management API")
    )
)]
pub struct EntityResource;

impl RoutedResource for EntityResource {
    /// Create routes for interacting with entities.
    fn routes<P: StorePool + Send + 'static, A: AuthorizationApi + Send + Sync + 'static>() -> Router
    {
        // TODO: The URL format here is preliminary and will have to change.
        Router::new().nest(
            "/entities",
            Router::new()
                .route("/", post(create_entity::<P>).put(update_entity::<P>))
                .route("/query", post(get_entities_by_query::<P, A>)),
        )
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct CreateEntityRequest {
    properties: EntityProperties,
    #[schema(value_type = SHARED_VersionedUrl)]
    entity_type_id: VersionedUrl,
    owned_by_id: OwnedById,
    #[schema(nullable = false)]
    entity_uuid: Option<EntityUuid>,
    // TODO: this could break invariants if we don't move to fractional indexing
    //  https://app.asana.com/0/1201095311341924/1202085856561975/f
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    link_data: Option<LinkData>,
}

#[utoipa::path(
    post,
    path = "/entities",
    request_body = CreateEntityRequest,
    tag = "Entity",
    params(
        ("X-Authenticated-User-Actor-Id" = AccountId, Header, description = "The ID of the actor which is used to authorize the request"),
    ),
    responses(
        (status = 200, content_type = "application/json", description = "The metadata of the created entity", body = EntityMetadata),
        (status = 422, content_type = "text/plain", description = "Provided request body is invalid"),

        (status = 404, description = "Entity Type URL was not found"),
        (status = 500, description = "Store error occurred"),
    ),
)]
#[tracing::instrument(level = "info", skip(pool))]
async fn create_entity<P: StorePool + Send>(
    AuthenticatedUserHeader(actor_id): AuthenticatedUserHeader,
    pool: Extension<Arc<P>>,
    body: Json<CreateEntityRequest>,
) -> Result<Json<EntityMetadata>, StatusCode> {
    let Json(CreateEntityRequest {
        properties,
        entity_type_id,
        owned_by_id,
        entity_uuid,
        link_data,
    }) = body;

    let mut store = pool.acquire().await.map_err(|report| {
        tracing::error!(error=?report, "Could not acquire store");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    store
        .create_entity(
            actor_id,
            owned_by_id,
            entity_uuid,
            None,
            false,
            entity_type_id,
            properties,
            link_data,
        )
        .await
        .map_err(|report| {
            tracing::error!(error=?report, "Could not create entity");

            // Insertion/update errors are considered internal server errors.
            StatusCode::INTERNAL_SERVER_ERROR
        })
        .map(Json)
}

#[utoipa::path(
    post,
    path = "/entities/query",
    request_body = EntityStructuralQuery,
    tag = "Entity",
    params(
        ("X-Authenticated-User-Actor-Id" = AccountId, Header, description = "The ID of the actor which is used to authorize the request"),
    ),
    responses(
        (status = 200, content_type = "application/json", body = Subgraph, description = "A subgraph rooted at entities that satisfy the given query, each resolved to the requested depth."),
        (status = 422, content_type = "text/plain", description = "Provided query is invalid"),
        (status = 500, description = "Store error occurred"),
    )
)]
#[tracing::instrument(level = "info", skip(pool, authorization_api))]
async fn get_entities_by_query<P: StorePool + Send, A: AuthorizationApi + Send + Sync>(
    AuthenticatedUserHeader(actor_id): AuthenticatedUserHeader,
    pool: Extension<Arc<P>>,
    authorization_api: Extension<Arc<A>>,
    Json(query): Json<serde_json::Value>,
) -> Result<Json<Subgraph>, StatusCode> {
    pool.acquire()
        .map_err(|error| {
            tracing::error!(?error, "Could not acquire access to the store");
            StatusCode::INTERNAL_SERVER_ERROR
        })
        .and_then(|store| async move {
            let mut query = StructuralQuery::deserialize(&query).map_err(|error| {
                tracing::error!(?error, "Could not deserialize query");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            query.filter.convert_parameters().map_err(|error| {
                tracing::error!(?error, "Could not validate query");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            store.get_entity(
                actor_id,
                &query,
                &**authorization_api
            ).await.map_err(|report| {
                tracing::error!(error=?report, ?query, "Could not read entities from the store");
                report_to_status_code(&report)
            })
        })
        .await
        .map(|subgraph| Json(subgraph.into()))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct UpdateEntityRequest {
    properties: EntityProperties,
    entity_id: EntityId,
    #[schema(value_type = SHARED_VersionedUrl)]
    entity_type_id: VersionedUrl,
    #[serde(flatten)]
    order: EntityLinkOrder,
    archived: bool,
}

#[utoipa::path(
    put,
    path = "/entities",
    tag = "Entity",
    params(
        ("X-Authenticated-User-Actor-Id" = AccountId, Header, description = "The ID of the actor which is used to authorize the request"),
    ),
    responses(
        (status = 200, content_type = "application/json", description = "The metadata of the updated entity", body = EntityMetadata),
        (status = 422, content_type = "text/plain", description = "Provided request body is invalid"),
        (status = 423, content_type = "text/plain", description = "The entity that should be updated was unexpectedly updated at the same time"),

        (status = 404, description = "Entity ID or Entity Type URL was not found"),
        (status = 500, description = "Store error occurred"),
    ),
    request_body = UpdateEntityRequest,
)]
#[tracing::instrument(level = "info", skip(pool))]
async fn update_entity<P: StorePool + Send>(
    AuthenticatedUserHeader(actor_id): AuthenticatedUserHeader,
    pool: Extension<Arc<P>>,
    body: Json<UpdateEntityRequest>,
) -> Result<Json<EntityMetadata>, StatusCode> {
    let Json(UpdateEntityRequest {
        properties,
        entity_id,
        entity_type_id,
        order,
        archived,
    }) = body;

    let mut store = pool.acquire().await.map_err(|report| {
        tracing::error!(error=?report, "Could not acquire store");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    store
        .update_entity(
            actor_id,
            entity_id,
            None,
            archived,
            entity_type_id,
            properties,
            order,
        )
        .await
        .map_err(|report| {
            tracing::error!(error=?report, "Could not update entity");

            if report.contains::<EntityDoesNotExist>() {
                StatusCode::NOT_FOUND
            } else if report.contains::<RaceConditionOnUpdate>() {
                StatusCode::LOCKED
            } else {
                // Insertion/update errors are considered internal server errors.
                StatusCode::INTERNAL_SERVER_ERROR
            }
        })
        .map(Json)
}

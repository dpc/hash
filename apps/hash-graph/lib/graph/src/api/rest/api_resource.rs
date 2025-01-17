use authorization::AuthorizationApiPool;
use axum::Router;

use crate::{api::rest::RestApiStore, store::StorePool};

/// With REST, we define resources that can be acted on. These resources are defined through
/// routes and HTTP methods.
///
/// This trait encapsulates a way to define related resource operations
/// through a `Router`, making it explicitly clear we want to provide `OpenApi` specification as
/// documentation for the routes.
pub(super) trait RoutedResource: utoipa::OpenApi {
    fn routes<S, A>() -> Router
    where
        S: StorePool + Send + Sync + 'static,
        A: AuthorizationApiPool + Send + Sync + 'static,
        for<'pool> S::Store<'pool>: RestApiStore;

    fn documentation() -> utoipa::openapi::OpenApi {
        Self::openapi()
    }
}

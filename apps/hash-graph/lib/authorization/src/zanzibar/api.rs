use error_stack::{Result, ResultExt};
use graph_types::{
    account::{AccountGroupId, AccountId},
    knowledge::entity::EntityId,
    web::WebId,
};

use crate::{
    backend::{CheckError, CheckResponse, ModifyRelationError, ZanzibarBackend},
    schema::{
        AccountGroupPermission, AccountGroupRelation, EntityPermission, EntityRelation, OwnerId,
        WebPermission, WebRelation,
    },
    zanzibar::{Consistency, Zookie},
    AuthorizationApi, VisibilityScope,
};

#[derive(Debug, Clone)]
pub struct ZanzibarClient<B> {
    backend: B,
}

impl<B> ZanzibarClient<B> {
    pub const fn new(backend: B) -> Self {
        Self { backend }
    }
}

impl<B> AuthorizationApi for ZanzibarClient<B>
where
    B: ZanzibarBackend + Send + Sync,
{
    async fn add_account_group_admin(
        &mut self,
        member: AccountId,
        account_group: AccountGroupId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(self
            .backend
            .create_relations([(account_group, AccountGroupRelation::DirectAdmin, member)])
            .await
            .change_context(ModifyRelationError)?
            .written_at)
    }

    async fn remove_account_group_admin(
        &mut self,
        member: AccountId,
        account_group: AccountGroupId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(self
            .backend
            .delete_relations([(account_group, AccountGroupRelation::DirectAdmin, member)])
            .await
            .change_context(ModifyRelationError)?
            .deleted_at)
    }

    async fn add_web_owner(
        &mut self,
        owner: OwnerId,
        web: WebId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(match owner {
            OwnerId::Account(account) => {
                self.backend
                    .create_relations([(web, WebRelation::DirectOwner, account)])
                    .await
            }
            OwnerId::AccountGroup(account_group) => {
                self.backend
                    .create_relations([(
                        web,
                        WebRelation::DirectOwner,
                        account_group,
                        AccountGroupPermission::Member,
                    )])
                    .await
            }
        }
        .change_context(ModifyRelationError)?
        .written_at)
    }

    async fn remove_web_owner(
        &mut self,
        owner: OwnerId,
        web: WebId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(match owner {
            OwnerId::Account(account) => {
                self.backend
                    .delete_relations([(web, WebRelation::DirectOwner, account)])
                    .await
            }
            OwnerId::AccountGroup(account_group) => {
                self.backend
                    .delete_relations([(
                        web,
                        WebRelation::DirectOwner,
                        account_group,
                        AccountGroupPermission::Member,
                    )])
                    .await
            }
        }
        .change_context(ModifyRelationError)?
        .deleted_at)
    }

    async fn can_add_group_members(
        &self,
        actor: AccountId,
        account_group: AccountGroupId,
        consistency: Consistency<'_>,
    ) -> Result<CheckResponse, CheckError> {
        self.backend
            .check(
                &(account_group, AccountGroupPermission::AddMember, actor),
                consistency,
            )
            .await
    }

    async fn can_remove_group_members(
        &self,
        actor: AccountId,
        account_group: AccountGroupId,
        consistency: Consistency<'_>,
    ) -> Result<CheckResponse, CheckError> {
        self.backend
            .check(
                &(account_group, AccountGroupPermission::RemoveMember, actor),
                consistency,
            )
            .await
    }

    async fn add_account_group_member(
        &mut self,
        member: AccountId,
        account_group: AccountGroupId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(self
            .backend
            .create_relations([(account_group, AccountGroupRelation::DirectMember, member)])
            .await
            .change_context(ModifyRelationError)?
            .written_at)
    }

    async fn remove_account_group_member(
        &mut self,
        member: AccountId,
        account_group: AccountGroupId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(self
            .backend
            .delete_relations([(account_group, AccountGroupRelation::DirectMember, member)])
            .await
            .change_context(ModifyRelationError)?
            .deleted_at)
    }

    async fn add_entity_owner(
        &mut self,
        scope: VisibilityScope,
        entity: EntityId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(match scope {
            VisibilityScope::Public => unimplemented!(),
            VisibilityScope::Account(account) => {
                self.backend
                    .create_relations([(entity, EntityRelation::DirectOwner, account)])
                    .await
            }
            VisibilityScope::AccountGroup(account_group) => {
                self.backend
                    .create_relations([(
                        entity,
                        EntityRelation::DirectOwner,
                        account_group,
                        AccountGroupPermission::Member,
                    )])
                    .await
            }
        }
        .change_context(ModifyRelationError)?
        .written_at)
    }

    async fn remove_entity_owner(
        &mut self,
        scope: VisibilityScope,
        entity: EntityId,
    ) -> Result<Zookie<'static>, ModifyRelationError> {
        Ok(match scope {
            VisibilityScope::Public => unimplemented!(),
            VisibilityScope::Account(account) => {
                self.backend
                    .delete_relations([(entity, EntityRelation::DirectOwner, account)])
                    .await
            }
            VisibilityScope::AccountGroup(account_group) => {
                self.backend
                    .delete_relations([(
                        entity,
                        EntityRelation::DirectOwner,
                        account_group,
                        AccountGroupPermission::Member,
                    )])
                    .await
            }
        }
        .change_context(ModifyRelationError)?
        .deleted_at)
    }

    async fn can_create_entity(
        &self,
        actor: AccountId,
        web: impl Into<WebId> + Send,
        consistency: Consistency<'_>,
    ) -> Result<CheckResponse, CheckError> {
        self.backend
            .check(
                &(web.into(), WebPermission::CreateEntity, actor),
                consistency,
            )
            .await
    }

    async fn can_update_entity(
        &self,
        actor: AccountId,
        entity: EntityId,
        consistency: Consistency<'_>,
    ) -> Result<CheckResponse, CheckError> {
        self.backend
            .check(&(entity, EntityPermission::Update, actor), consistency)
            .await
    }

    async fn can_view_entity(
        &self,
        actor: AccountId,
        entity: EntityId,
        consistency: Consistency<'_>,
    ) -> Result<CheckResponse, CheckError> {
        self.backend
            .check(&(entity, EntityPermission::View, actor), consistency)
            .await
    }
}

import { print } from "graphql/language/printer";
import { GraphQLClient } from "graphql-request";

import {
  SendLoginCodeMutation,
  SendLoginCodeMutationVariables,
  CreateEntityMutation,
  CreateEntityMutationVariables,
  CreateOrgMutation,
  CreateOrgMutationVariables,
  CreatePageMutation,
  CreatePageMutationVariables,
  CreateUserMutation,
  CreateUserMutationVariables,
  InsertBlocksIntoPageMutation,
  InsertBlocksIntoPageMutationVariables,
  LoginWithLoginCodeMutationVariables,
  LoginWithLoginCodeMutation,
  GetEntityQueryVariables,
  GetEntityQuery,
  UpdateEntityMutationVariables,
  UpdateEntityMutation,
  GetPageQueryVariables,
  GetPageQuery,
  UpdatePageContentsMutation,
  UpdatePageContentsMutationVariables,
  CreateEntityTypeMutation,
  CreateEntityTypeMutationVariables,
} from "../graphql/apiTypes.gen";
import {
  createEntity,
  createEntityType,
  getUnknownEntity,
  updateEntity,
} from "../graphql/queries/entity.queries";
import { createOrg } from "../graphql/queries/org.queries";
import {
  createUser,
  loginWithLoginCode,
  sendLoginCode,
} from "../graphql/queries/user.queries";
import {
  createPage,
  insertBlocksIntoPage,
  getPage,
  updatePageContents,
} from "../graphql/queries/page.queries";

export class ApiClient {
  private client: GraphQLClient;

  constructor(url: string) {
    this.client = new GraphQLClient(url);
  }

  setCookie = (cookie: string) => this.client.setHeader("Cookie", cookie);

  removeCookie = () => this.client.setHeader("Cookie", "");

  /* Sign-up related requests **/

  createUser = async (vars: CreateUserMutationVariables) =>
    this.client
      .request<CreateUserMutation, CreateUserMutationVariables>(
        createUser,
        vars
      )
      .then(({ createUser }) => createUser);

  /* Log-in related requests **/

  async sendLoginCode(vars: SendLoginCodeMutationVariables) {
    return (
      await this.client.request<
        SendLoginCodeMutation,
        SendLoginCodeMutationVariables
      >(sendLoginCode, vars)
    ).sendLoginCode;
  }

  async loginWithLoginCode(vars: LoginWithLoginCodeMutationVariables) {
    const { data, headers } = await this.client.rawRequest<
      LoginWithLoginCodeMutation,
      LoginWithLoginCodeMutationVariables
    >(print(loginWithLoginCode), vars);

    if (!data) {
      throw new Error("loginWithLoginCode mutation did not return data");
    }

    return { user: data.loginWithLoginCode, responseHeaders: headers };
  }

  /* Other requests **/

  getUnknownEntity = async (vars: GetEntityQueryVariables) =>
    this.client
      .request<GetEntityQuery, GetEntityQueryVariables>(getUnknownEntity, vars)
      .then((res) => res.entity);

  updateEntity = async (vars: UpdateEntityMutationVariables) =>
    this.client
      .request<UpdateEntityMutation, UpdateEntityMutationVariables>(
        updateEntity,
        vars
      )
      .then((res) => res.updateEntity);

  async createEntity(vars: CreateEntityMutationVariables) {
    return (
      await this.client.request<
        CreateEntityMutation,
        CreateEntityMutationVariables
      >(createEntity, vars)
    ).createEntity;
  }

  async createOrg(vars: CreateOrgMutationVariables) {
    return (
      await this.client.request<CreateOrgMutation, CreateOrgMutationVariables>(
        createOrg,
        vars
      )
    ).createOrg;
  }

  async createPage(vars: CreatePageMutationVariables) {
    return (
      await this.client.request<
        CreatePageMutation,
        CreatePageMutationVariables
      >(createPage, vars)
    ).createPage;
  }

  async createEntityType(vars: CreateEntityTypeMutationVariables) {
    return (
      await this.client.request<
        CreateEntityTypeMutation,
        CreateEntityTypeMutationVariables
      >(createEntityType, vars)
    ).createEntityType;
  }

  insertBlocksIntoPage = async (vars: InsertBlocksIntoPageMutationVariables) =>
    this.client
      .request<
        InsertBlocksIntoPageMutation,
        InsertBlocksIntoPageMutationVariables
      >(insertBlocksIntoPage, vars)
      .then((res) => res.insertBlocksIntoPage);

  getPage = async (vars: GetPageQueryVariables) =>
    this.client
      .request<GetPageQuery, GetPageQueryVariables>(getPage, vars)
      .then((res) => res.page);

  updatePageContents = async (vars: UpdatePageContentsMutationVariables) =>
    this.client
      .request<UpdatePageContentsMutation, UpdatePageContentsMutationVariables>(
        updatePageContents,
        vars
      )
      .then((res) => res.updatePageContents);
}

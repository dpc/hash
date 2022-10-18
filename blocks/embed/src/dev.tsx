/**
 * This is the entry point for developing and debugging.
 * This file is not bundled with the library during the build process.
 */
import { FunctionComponent, useState } from "react";
import { render } from "react-dom";
import { tw } from "twind";
import { MockBlockDock } from "mock-block-dock";

import Component from "./index";
import variants from "../variants.json";
import { ProviderName } from "./types";

const node = document.getElementById("app");

/** Temporarily leaving this here, till we fix importing it from hash-shared */
const apiGraphQLEndpoint = "http://localhost:5001/graphql";

const getEmbedBlock = async (
  url?: string,
  type?: ProviderName,
): Promise<{
  html: string;
  error?: string;
  height?: number;
  width?: number;
  providerName?: string;
}> => {
  return fetch(apiGraphQLEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: "getEmbedCode",
      variables: { url, type },
      query:
        "query getEmbedCode($url: String!, $type: String) {\n  embedCode(url: $url, type: $type) {\n    html\n    providerName\n     height\n     width\n    __typename\n  }\n}\n",
    }),
  })
    .then((response) => response.json())
    .then((responseData) => ({
      ...responseData.data?.embedCode,
      error: responseData?.errors?.[0]?.message,
    }));
};

// @todo replace typeof variants[number] with type BlockVariant when available
const getVariantProperties = (variant: typeof variants[number]) => {
  return {
    ...variant.properties,
    embedType: variant.properties?.embedType as ProviderName | undefined,
    ...variant.examples?.[0],
  };
};

const initialVariantIndex = 0;

const initialState = getVariantProperties(variants[initialVariantIndex]!);

const AppComponent: FunctionComponent = () => {
  const [selectedVariantIndex, setSelectedVariantIndex] =
    useState(initialVariantIndex);

  return (
    <div className={tw`mt-4 w-1/2 mx-auto`}>
      <select
        value={selectedVariantIndex}
        onChange={(event) =>
          setSelectedVariantIndex(parseInt(event.target.value, 10))
        }
      >
        {variants.map((variant, variantIndex) => (
          <option value={variantIndex} key={variant.name}>
            {variant.name}
          </option>
        ))}
      </select>
      <br />
      <br />
      <MockBlockDock>
        <Component
          accountId="uuid-1234-account"
          entityId="uuid-1234-id"
          entityTypeId="Embed"
          getEmbedBlock={getEmbedBlock}
          {...initialState}
          {...getVariantProperties(variants[selectedVariantIndex]!)}
        />
      </MockBlockDock>
    </div>
  );
};

const App = () => {
  return <AppComponent />;
};

render(<App />, node);
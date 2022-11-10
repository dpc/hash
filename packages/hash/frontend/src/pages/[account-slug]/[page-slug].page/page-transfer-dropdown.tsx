import { ChangeEvent, useEffect, useState, FunctionComponent } from "react";
import { useRouter } from "next/router";
import { useMutation } from "@apollo/client";

import { Box } from "@mui/material";
import { MutationTransferEntityArgs } from "../../../graphql/apiTypes.gen";
import { transferEntityMutation } from "../../../graphql/queries/entityType.queries";
import { getAccountPagesTree } from "../../../graphql/queries/account.queries";
import { useAccounts } from "../../../components/hooks/useAccounts";

type AccountSelectProps = {
  onChange: (account: string) => void;
  value: string;
};

export const AccountSelect: FunctionComponent<AccountSelectProps> = ({
  onChange,
  value,
}) => {
  const { accounts } = useAccounts();

  return (
    <Box
      component="select"
      sx={{
        padding: "8px 15px",
        border: "1px solid lightgray",
        width: 120,
        borderRadius: "4px",
      }}
      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
        onChange(event.target.value)
      }
      value={value}
    >
      {accounts?.map((account) => (
        <option key={account.entityId} value={account.entityId}>
          {account.shortname}
        </option>
      ))}
    </Box>
  );
};

type PageTransferDropdownType = {
  pageEntityId: string;
  accountId: string;
  setPageState: (state: "normal" | "transferring") => void;
};

export const PageTransferDropdown: FunctionComponent<
  PageTransferDropdownType
> = ({ pageEntityId, accountId, setPageState }) => {
  const router = useRouter();

  const [selectedAccountId, setSelectedAccountId] = useState(accountId);

  useEffect(() => {
    setSelectedAccountId(accountId);
  }, [accountId]);

  const [transferEntity] = useMutation<MutationTransferEntityArgs>(
    transferEntityMutation,
  );

  const transferAccount = (newAccountId: string) => {
    setPageState("transferring");

    transferEntity({
      variables: {
        originalAccountId: accountId,
        entityId: pageEntityId,
        newAccountId,
      },
      refetchQueries: [
        { query: getAccountPagesTree, variables: { accountId } },
        { query: getAccountPagesTree, variables: { accountId: newAccountId } },
      ],
    })
      .then(() => {
        return router.replace(`/${newAccountId}/${pageEntityId}`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        setPageState("normal");
      });
  };

  return <AccountSelect value={selectedAccountId} onChange={transferAccount} />;
};

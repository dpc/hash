import { ListItemIcon, ListItemText } from "@mui/material";
import { usePopupState } from "material-ui-popup-state/hooks";
import { useCallback, useState } from "react";

import { useAccountPages } from "../../../../components/hooks/use-account-pages";
import { useCreatePage } from "../../../../components/hooks/use-create-page";
import { useActiveWorkspace } from "../../../../pages/shared/workspace-context";
import { FilesLinesRegularIcon } from "../../../icons/file-lines-regular-icon";
import { MenuItem } from "../../../ui/menu-item";

export const CreateDocumentMenuItem = ({
  onClick,
}: {
  onClick: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const { activeWorkspaceOwnedById, activeWorkspace } = useActiveWorkspace();

  const { lastRootPageIndex } = useAccountPages(activeWorkspaceOwnedById);
  const [createUntitledPage] = useCreatePage({
    shortname: activeWorkspace?.shortname,
    ownedById: activeWorkspaceOwnedById,
  });

  const popupState = usePopupState({
    variant: "popover",
    popupId: "actions-dropdown-menu",
  });

  // @todo handle loading/error states properly
  const addPage = useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      await createUntitledPage(lastRootPageIndex);
    } catch (err) {
      // eslint-disable-next-line no-console -- TODO: consider using logger
      console.error("Could not create page: ", err);
    } finally {
      popupState.close();
      setLoading(false);
    }
  }, [createUntitledPage, loading, popupState, lastRootPageIndex]);

  return (
    <MenuItem
      onClick={() => {
        void addPage();
        onClick();
      }}
    >
      <ListItemIcon>
        <FilesLinesRegularIcon />
      </ListItemIcon>
      <ListItemText primary="Document" />
    </MenuItem>
  );
};

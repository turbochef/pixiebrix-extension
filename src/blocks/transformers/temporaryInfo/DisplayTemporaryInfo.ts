/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Transformer, type UnknownObject } from "@/types";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { expectContext } from "@/utils/expectContext";
import {
  ensureSidebar,
  hideTemporarySidebarPanel,
  PANEL_HIDING_EVENT,
  showTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import { type PanelPayload } from "@/sidebar/types";
import {
  stopWaitingForTemporaryPanels,
  cancelTemporaryPanelsForExtension,
  cancelTemporaryPanels,
  waitForTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { BusinessError, CancelError, PropError } from "@/errors/businessErrors";
import { getThisFrame } from "webext-messenger";
import { showModal } from "@/blocks/transformers/ephemeralForm/modalUtils";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/blocks/rootModeHelpers";
import { showPopover } from "@/blocks/transformers/temporaryInfo/popoverUtils";

type Location = "panel" | "modal" | "popover";

export async function createFrameSource(
  nonce: string,
  mode: Location
): Promise<URL> {
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("ephemeralPanel.html"));
  frameSource.searchParams.set("nonce", nonce);
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", mode);
  return frameSource;
}

class DisplayTemporaryInfo extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/display");
  defaultOutputKey = "infoOutput";

  constructor() {
    super(
      DisplayTemporaryInfo.BLOCK_ID,
      "Display Temporary Information",
      "Display a document in a temporary sidebar panel"
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "A display title for the temporary document, shown in the tab name",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The render pipeline for the temporary document",
      },
      location: {
        type: "string",
        enum: ["panel", "modal", "popover"],
        default: "panel",
        description: "The location of the information (default='panel')",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["body"],
  };

  async transform(
    {
      title,
      body: bodyPipeline,
      location = "panel",
      isRootAware = false,
    }: BlockArg<{
      title: string;
      location: Location;
      body: PipelineExpression;
      isRootAware: boolean;
    }>,
    {
      logger: {
        context: { extensionId },
      },
      root,
      ctxt,
      runPipeline,
      runRendererPipeline,
    }: BlockOptions
  ): Promise<UnknownObject | null> {
    expectContext("contentScript");

    const target = isRootAware ? root : document;

    const nonce = uuidv4();
    const controller = new AbortController();

    const payload = (await runRendererPipeline(
      bodyPipeline?.__value__ ?? [],
      {
        key: "body",
        counter: 0,
      },
      {},
      target
    )) as PanelPayload;

    switch (location) {
      case "panel": {
        await ensureSidebar();

        showTemporarySidebarPanel({
          extensionId,
          nonce,
          heading: title,
          payload,
        });

        window.addEventListener(
          PANEL_HIDING_EVENT,
          () => {
            controller.abort();
          },
          {
            signal: controller.signal,
          }
        );

        controller.signal.addEventListener("abort", () => {
          hideTemporarySidebarPanel(nonce);
          void stopWaitingForTemporaryPanels([nonce]);
        });

        break;
      }

      case "modal": {
        const frameSource = await createFrameSource(nonce, location);
        showModal(frameSource, controller);
        break;
      }

      case "popover": {
        const frameSource = await createFrameSource(nonce, location);
        if (target === document) {
          throw new BusinessError("Target must be an element for popover");
        }

        await cancelTemporaryPanelsForExtension(extensionId);

        const onHide = async () => {
          await cancelTemporaryPanels([nonce]);
        };

        showPopover(frameSource, target as HTMLElement, onHide, controller);

        break;
      }

      default: {
        throw new PropError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for validated value
          `Invalid location: ${location}`,
          this.id,
          "location",
          location
        );
      }
    }

    let result = null;

    try {
      result = await waitForTemporaryPanel(nonce, {
        heading: title,
        extensionId,
        nonce,
        payload,
      });
    } catch (error) {
      if (error instanceof CancelError) {
        // See discussion at: https://github.com/pixiebrix/pixiebrix-extension/pull/4915
        // For temporary forms, we throw the CancelError because typically the form is input to additional bricks.
        // For temporary information, typically the information is displayed as the last brick in the action.
        // Given that this brick doesn't return any values currently, we'll just swallow the error and return normally
        // NOP
      } else {
        throw error;
      }
    } finally {
      controller.abort();
    }

    return result ?? {};
  }
}

export default DisplayTemporaryInfo;
